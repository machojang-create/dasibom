#!/usr/bin/env node
/**
 * 원고 검수기 — 발행 전에 규칙 위반을 잡는다.
 *
 *   node lint_post.mjs --post out/A01_....json
 *   node lint_post.mjs --all              # out/ 의 모든 원고
 *   node lint_post.mjs --post ... --json  # 결과를 JSON 으로 (자동화용)
 *
 * 변동성 규칙은 프롬프트로 넣지만, 모델이 지켰는지는 별개입니다.
 * 발행되고 나서 발견하면 늦으니 여기서 걸러냅니다.
 *
 * error 가 하나라도 있으면 exit 1 → run.mjs 가 발행을 중단합니다.
 * warn 은 사람이 판단할 문제라 발행을 막지 않습니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, paths } from './lib/queue.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const has = (name) => args.includes(`--${name}`);

const config = loadConfig();
const w = config.writing;

// 본문에서 서비스 이름을 써도 되는 카테고리 (config.categories[].allow_brand)
const allowBrand = new Set(config.categories.filter((c) => c.allow_brand).map((c) => c.key));

/**
 * 검사 규칙.
 *  level: 'error' 는 발행 차단, 'warn' 은 알림만.
 *  검사 대상은 본문 + 제목이며, 마지막에 붙는 CTA 줄은 제외하고 봅니다.
 */
const RULES = [
  {
    id: 'relative-time',
    level: 'error',
    label: '상대적 시간 표현',
    why: '시간이 지나면 틀린 문장이 됩니다.',
    // '요즘말 사전' 처럼 앱 이름에 들어간 경우는 제외
    test: (text) =>
      matchAll(text, /올해|작년|재작년|내년|요즘(?!말)|최근 들어|현재로서는|지금까지는/g),
  },
  {
    id: 'unsourced-stat',
    level: 'error',
    label: '출처 없는 통계·비율',
    why: '지어낸 숫자일 가능성이 큽니다. 출처를 댈 수 없으면 빼세요.',
    test: (text) => {
      const hits = matchAll(text, /\d+(?:\.\d+)?\s?(?:%|퍼센트|배 (?:높|낮|많|적))/g);
      // 출처가 같은 문장 안에 있으면 통과
      return hits.filter((h) => {
        const sentence = sentenceAround(text, h.index);
        return !/(조사|통계청|보건복지부|자료|보고서|연구|출처|에 따르면)/.test(sentence);
      });
    },
  },
  {
    id: 'ranking',
    level: 'error',
    label: '순위 표현',
    why: '근거를 댈 수 없는 순위입니다.',
    test: (text) => matchAll(text, /\d+\s?위(?:를|가|는|입니다|이며)|가장 많은 비율/g),
  },
  {
    id: 'money',
    level: 'error',
    label: '금액·가격',
    why: '가격과 지원금은 변동됩니다. 액수 대신 확인처를 안내하세요.',
    test: (text) => matchAll(text, /\d[\d,]*\s?(?:만\s?)?원(?![^\s]*[가-힣]*(?:칙|형|판|룸))/g),
  },
  {
    id: 'absolute',
    level: 'error',
    label: '단정 표현',
    why: '근거 없는 단정입니다.',
    test: (text) => matchAll(text, /최고의|유일한|100\s?%|절대적으로|무조건|반드시 낫|완치/g),
  },
  {
    id: 'medical-claim',
    level: 'error',
    label: '의학적 단정',
    why: '진단·처방을 단정하면 안 됩니다. "전문의와 상의" 로 마무리하세요.',
    // '낫다' 는 "더 낫다" 로도 흔히 쓰여서, 앞에 증상·질환이 오는 경우만 잡습니다.
    test: (text) =>
      matchAll(
        text,
        /치료됩니다|(?:병|증상|통증|치매|우울증|불면증|관절염)[이가은는]?\s*(?:나아집니다|낫습니다|사라집니다)|효과가 (?:확실|입증)|복용하세요|드시면 (?:낫|좋아집니다)/g
      ),
  },
  {
    id: 'financial-advice',
    level: 'error',
    label: '금융상품 추천·판단',
    why: '무자격 금융 조언입니다. 앱의 봄이도 이 주제는 답하지 않습니다. 판단 기준과 확인처만 쓰세요.',
    test: (text) =>
      matchAll(
        text,
        /(?:연금저축|펀드|예금|적금|보험|주식|채권|ETF)[^.\n]{0,12}(?:추천|가입하세요|드는 게 (?:좋|유리)|유리합니다)|수익률이 (?:높|좋)|비과세 혜택을 받으려면 반드시/g
      ),
  },
  {
    id: 'financial-figure',
    level: 'error',
    label: '연금·요율 수치',
    why: '제도가 바뀌면 바로 틀린 글이 됩니다. 액수 대신 계산하는 방법과 확인처를 쓰세요.',
    test: (text) =>
      matchAll(text, /(?:수령액|연금액|보험료|공제율|세율|이자율)[^.\n]{0,10}\d|월 \d[\d,]*\s?만/g),
  },
  {
    id: 'forbidden-phrase',
    level: 'error',
    label: '금지 표현',
    why: 'config.json 의 forbidden_phrases 에 등록된 표현입니다.',
    test: (text) => {
      const out = [];
      for (const p of w.forbidden_phrases) {
        const needle = p.replace(/^~/, '');
        let i = text.indexOf(needle);
        while (i >= 0) {
          out.push({ text: needle, index: i });
          i = text.indexOf(needle, i + 1);
        }
      }
      return out;
    },
  },
  {
    id: 'markdown',
    level: 'error',
    label: '마크다운 기호',
    why: '네이버 에디터에 그대로 들어가면 기호가 노출됩니다.',
    test: (text) => matchAll(text, /^\s*#{1,6}\s|\*\*[^*]+\*\*|^\s*[-*+]\s+/gm),
  },
  {
    id: 'bare-url',
    level: 'error',
    label: '본문 속 링크',
    why: '링크는 발행기가 마지막에 한 번만 붙입니다. 본문에 있으면 CTA 가 둘이 됩니다.',
    test: (text) => matchAll(text, /https?:\/\/\S+|dasibomlife\.com/g),
  },
  {
    id: 'third-person-senior',
    level: 'error',
    label: '독자를 3인칭으로 부름',
    why: '이 글의 독자는 시니어 본인입니다. 옆에서 설명하는 말투가 되면 읽는 사람이 대상화됩니다.',
    // 실무자 대상(care_policy)만 예외입니다. 그 글의 독자는 시니어 본인이 아닙니다.
    categories: (key) => key !== 'care_policy',
    test: (text) =>
      matchAll(text, /어르신(?:은|이|께|들|분)|부모님(?:은|이|께|의|과|을|도)|고령자(?:는|가|의)/g),
  },
  {
    id: 'caretaking-tone',
    level: 'error',
    label: '돌봄 대상 취급',
    why: '독자가 스스로 하는 일입니다. 누가 대신 해주는 말투로 쓰지 마세요.',
    categories: (key) => key !== 'care_policy',
    test: (text) =>
      matchAll(text, /해\s?드리세요|챙겨\s?드리|도와\s?드리세요|권해\s?드리세요|모시고|보살펴/g),
  },
  {
    id: 'age-as-limit',
    level: 'warn',
    label: '나이를 한계로 서술',
    why: '나이 때문에 못 한다가 아니라, 방법을 바꾸는 이야기로 써야 합니다.',
    categories: (key) => key !== 'care_policy',
    test: (text) => matchAll(text, /나이가 들면 (?:어렵|힘들|못)|이 나이에는 무리|연세가 있으[시]?니/g),
  },
  {
    id: 'brand-in-body',
    level: 'error',
    label: '본문에 서비스 이름',
    why: '본문은 순수 정보입니다. 링크는 발행기가 글 끝에 카드로 붙입니다. 본문에서 언급하면 광고가 됩니다.',
    // allow_brand: true 인 카테고리(자서전과 기록)만 예외입니다.
    categories: (key) => !allowBrand.has(key),
    test: (text) => matchAll(text, /다시봄라이프|다시봄|봄이(?:와|가|는|를|에게|의)/g),
  },
  {
    id: 'brand-overuse',
    level: 'error',
    label: '브랜드 반복 언급',
    why: '언급이 허용된 카테고리라도 글 전체에서 한 번입니다. 두 번 넘어가면 광고문이 됩니다.',
    categories: (key) => allowBrand.has(key),
    test: (text) => {
      const hits = matchAll(text, /다시봄라이프|다시봄/g);
      return hits.length > 2 ? hits : [];
    },
  },
  {
    id: 'soft-sell',
    level: 'error',
    categories: (key) => !allowBrand.has(key),
    label: '다른 데로 넘기려는 마무리',
    why: '이 글은 정보로 끝나야 합니다.',
    test: (text) =>
      matchAll(text, /더 알아보(?:려면|시려면)|도움이 필요하시(?:면|다면)|서비스를 (?:이용|활용)해|앱을 (?:설치|이용)해/g),
  },
  {
    id: 'brand-recommend',
    level: 'warn',
    label: '특정 제품·병원 추천 가능성',
    why: '브랜드나 병원 이름을 특정하지 않았는지 확인하세요.',
    test: (text) => matchAll(text, /추천(?:합니다|드립니다|해\s?드리)|제품을 고르|병원을 고르/g),
  },
];

function matchAll(text, re) {
  const out = [];
  let m;
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = r.exec(text)) !== null) {
    out.push({ text: m[0], index: m.index });
    if (m[0] === '') r.lastIndex++;
  }
  return out;
}

function sentenceAround(text, index) {
  const start = Math.max(0, text.lastIndexOf('.', index) + 1, text.lastIndexOf('\n', index) + 1);
  let end = text.indexOf('.', index);
  if (end < 0) end = text.length;
  return text.slice(start, Math.min(end + 1, text.length));
}

function context(text, index, len) {
  const from = Math.max(0, index - 18);
  const to = Math.min(text.length, index + len + 18);
  return (from > 0 ? '…' : '') + text.slice(from, to).replace(/\n/g, ' ') + (to < text.length ? '…' : '');
}

function lint(post) {
  const issues = [];
  const body = post.body ?? '';
  const target = `${post.title}\n${body}`;

  for (const rule of RULES) {
    // 카테고리별로 적용 여부가 다른 규칙이 있습니다 (독자가 다르므로).
    if (rule.categories && !rule.categories(post.category)) continue;
    const hits = rule.test(target);
    for (const hit of hits) {
      issues.push({
        rule: rule.id,
        level: rule.level,
        label: rule.label,
        why: rule.why,
        found: hit.text,
        context: context(target, hit.index, hit.text.length),
      });
    }
  }

  // 목차 — 소제목 개수가 템플릿 단수에 크게 못 미치면 목차를 안 따른 것입니다.
  const cat = config.categories.find((c) => c.key === post.category);
  const want = cat?.template?.length ?? 0;
  if (want) {
    // 소제목 = 빈 줄 두 개 뒤에 오는 짧은 줄. 본문에서 소제목만 이렇게 띄웁니다.
    // (쉼표로 거르지 않습니다. "첫째, 나이가 되셨는지부터" 같은 소제목을 쓰기 때문입니다.)
    const all = body.split('\n').map((l) => l.trim());
    const heads = all.filter(
      (l, i) => l && l.length <= 40 && !/[.!?]$/.test(l) && all[i - 1] === '' && all[i - 2] === '',
    );
    if (heads.length < want - 2) {
      issues.push({
        rule: 'template-skipped',
        level: 'warn',
        label: '목차를 덜 따름',
        why: `소제목이 ${heads.length}개입니다. 이 카테고리 목차는 ${want}단입니다.`,
        found: `${heads.length}/${want}`,
        context: '',
      });
    }
  }

  // 구조 검사
  const len = body.length;
  // 카테고리가 따로 목표를 두면 그쪽을 씁니다 (칼럼은 정보 글보다 짧습니다).
  const [min, max] = cat?.target_chars ?? w.target_chars;
  if (len < min * 0.8) {
    issues.push({
      rule: 'length',
      level: 'error',
      label: '분량 부족',
      why: `${len}자. 목표 ${min}~${max}자의 80% 미만입니다.`,
      found: `${len}자`,
      context: '',
    });
  } else if (len < min || len > max * 1.2) {
    issues.push({
      rule: 'length',
      level: 'warn',
      label: '분량 범위 밖',
      why: `${len}자. 목표는 ${min}~${max}자입니다.`,
      found: `${len}자`,
      context: '',
    });
  }

  // 이미지 검사 — 대표 1장 + 본문 그림. 자리(after)가 본문에 없으면 안 들어갑니다.
  const minImages = w.min_images ?? 0;
  if (minImages) {
    const lines = new Set(body.split('\n').map((l) => l.trim()));
    const placed = [...(post.illustrations ?? []), ...(post.figures ?? [])].filter((it) =>
      lines.has((it.after ?? '').trim()),
    );
    const misplaced =
      (post.illustrations ?? []).length + (post.figures ?? []).length - placed.length;
    const total = placed.length + 1; // 대표 이미지

    if (total < minImages) {
      issues.push({
        rule: 'too-few-images',
        level: 'error',
        label: '이미지 부족',
        why: `대표 1장 + 본문 ${placed.length}장 = ${total}장. 최소 ${minImages}장이 필요합니다. 글에 그림이 없으면 끝까지 안 읽습니다.`,
        found: `${total}장`,
        context: '',
      });
    }
    if (misplaced) {
      issues.push({
        rule: 'image-misplaced',
        level: 'error',
        label: '그림 자리를 못 찾음',
        why: `${misplaced}개의 after 가 본문의 어느 줄과도 안 맞습니다. 그대로 발행하면 조용히 빠집니다.`,
        found: `${misplaced}개`,
        context: '',
      });
    }
  }

  if (post.title && post.title.length > 32) {
    issues.push({
      rule: 'title-length',
      level: 'warn',
      label: '제목이 김',
      why: `${post.title.length}자. 검색 결과에서 잘릴 수 있습니다.`,
      found: post.title,
      context: '',
    });
  }

  if (/\p{Extended_Pictographic}/u.test(post.title ?? '')) {
    issues.push({
      rule: 'title-emoji',
      level: 'error',
      label: '제목에 이모지',
      why: '제목에는 이모지를 넣지 않습니다.',
      found: post.title,
      context: '',
    });
  }

  if (post.keyword && !post.title?.includes(post.keyword.split(' ')[0])) {
    issues.push({
      rule: 'keyword-missing',
      level: 'warn',
      label: '제목에 검색 키워드 없음',
      why: `키워드 "${post.keyword}" 가 제목에 안 보입니다. 검색 노출이 약해집니다.`,
      found: post.title,
      context: '',
    });
  }

  const tagCount = post.tags?.length ?? 0;
  if (tagCount < 5 || tagCount > 12) {
    issues.push({
      rule: 'tag-count',
      level: 'warn',
      label: '태그 개수',
      why: `${tagCount}개. 5~12개가 적당합니다.`,
      found: `${tagCount}개`,
      context: '',
    });
  }

  return issues;
}

// ── 실행 ──────────────────────────────────────────────────────────
let files = [];
if (has('all')) {
  // out/ 에는 원고 말고도 통계·정찰 결과 같은 json 이 쌓입니다.
  // 이름이 <글번호>_<제목>.json 인 것만 원고로 봅니다.
  files = fs
    .readdirSync(paths.out)
    .filter((f) => f.endsWith('.json') && /^[A-Z]\d+_/.test(f))
    .map((f) => path.join(paths.out, f));
} else if (flag('post')) {
  files = [flag('post')];
} else {
  console.error('--post out/xxx.json 또는 --all 이 필요합니다.');
  process.exit(1);
}

if (files.length === 0) {
  console.log('검사할 원고가 없습니다.');
  process.exit(0);
}

const report = [];
let errorTotal = 0;

for (const file of files) {
  const post = JSON.parse(fs.readFileSync(file, 'utf8'));
  const issues = lint(post);
  const errors = issues.filter((i) => i.level === 'error');
  const warns = issues.filter((i) => i.level === 'warn');
  errorTotal += errors.length;
  report.push({ file: path.basename(file), id: post.id, title: post.title, issues });

  if (has('json')) continue;

  const mark = errors.length ? '✕' : warns.length ? '△' : '○';
  console.log(`\n${mark} [${post.id}] ${post.title}`);
  console.log(`   ${post.body?.length ?? 0}자 · 태그 ${post.tags?.length ?? 0}개 · → ${post.cta?.url ?? '없음'}`);

  if (issues.length === 0) {
    console.log('   문제 없음');
    continue;
  }

  for (const group of ['error', 'warn']) {
    const list = issues.filter((i) => i.level === group);
    if (list.length === 0) continue;
    console.log(`\n   ${group === 'error' ? '발행 차단' : '확인 권장'} (${list.length})`);

    // 같은 규칙이 여러 번 걸리면 로그가 도배됩니다. 규칙별로 묶고 예시만 보여줍니다.
    const byRule = new Map();
    for (const i of list) {
      if (!byRule.has(i.rule)) byRule.set(i.rule, []);
      byRule.get(i.rule).push(i);
    }

    for (const [, hits] of byRule) {
      const head = hits[0];
      const samples = [...new Set(hits.map((h) => h.found))].slice(0, 4);
      const count = hits.length > 1 ? ` — ${hits.length}곳` : '';
      console.log(`     · ${head.label}${count}: ${samples.map((s) => `"${s}"`).join(', ')}`);
      if (head.context) console.log(`       ${head.context}`);
      console.log(`       ${head.why}`);
    }
  }
}

if (has('json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(
    `\n${files.length}편 검사 · 차단 ${errorTotal}건 · 확인 ${report.reduce((a, r) => a + r.issues.filter((i) => i.level === 'warn').length, 0)}건`
  );
  if (errorTotal) {
    console.log('\n차단 항목은 원고를 고치거나 다시 생성한 뒤 발행하세요.');
    console.log('규칙 자체가 과하면 lint_post.mjs 의 RULES 를 조정하면 됩니다.');
  }
}

process.exit(errorTotal ? 1 : 0);
