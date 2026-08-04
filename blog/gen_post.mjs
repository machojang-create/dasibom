#!/usr/bin/env node
/**
 * 글 생성기 — 주제 하나를 받아 네이버 블로그용 원고를 만든다.
 *
 *   node gen_post.mjs                 # 큐에서 다음 주제 자동 선택
 *   node gen_post.mjs --id A03        # 특정 주제 지정
 *   node gen_post.mjs --category care_policy
 *   node gen_post.mjs --dry-run       # 프롬프트만 출력하고 API 호출 안 함
 *
 * 결과: out/<id>_<제목>.json  (title, body, tags, cta)
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  loadConfig,
  loadQueue,
  saveQueue,
  getCategory,
  pickNext,
  markTopic,
  slugify,
  ensureOutDir,
} from './lib/queue.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const has = (name) => args.includes(`--${name}`);

const config = loadConfig();
const queue = loadQueue();

const topic = flag('id')
  ? queue.topics.find((t) => t.id === flag('id'))
  : pickNext(config, queue, { category: flag('category') });

if (!topic) {
  console.error('쓸 주제가 없습니다. topic_queue.json 에 pending 항목을 추가하세요.');
  process.exit(1);
}
if (topic.manual) {
  console.error(`[${topic.id}] 는 직접 작성해야 하는 인터뷰 글입니다. 자동 생성하지 않습니다.`);
  process.exit(1);
}

const category = getCategory(config, topic.category);
const w = config.writing;

// 목차 템플릿 — 카테고리 기본값. 주제에 template 이 있으면 그 카테고리의 목차를 빌려 씁니다.
// (팬카페 가입·문자투표처럼 순서가 핵심인 글은 취미 목차 대신 디지털 목차를 씁니다.)
const tplCat = topic.template ? getCategory(config, topic.template) : category;
const template = tplCat.template ?? [];
const borrowed = topic.template && topic.template !== topic.category;

const SYSTEM = `당신은 시니어 정보 블로그의 편집자입니다. 네이버 블로그에 올릴 글을 씁니다.
이 블로그는 은퇴 이후 세대가 검색해서 찾아오는 정보 블로그입니다.
읽고 나서 '쓸모 있었다'로 끝나면 그것으로 충분합니다.
${
  category.allow_brand
    ? ''
    : "어떤 서비스나 앱도 권하지 않습니다. 정보로 시작해 정보로 끝냅니다.\n"
}
# 읽는 사람
${category.reader}

# 글의 목차 — 이 순서로 씁니다${borrowed ? ` (${tplCat.name} 목차를 빌려 씁니다)` : ''}
${template.map((s, i) => `${i + 1}. ${s}`).join('\n')}

소제목은 위 항목을 그대로 옮기지 말고, 그 자리에 맞는 자연스러운 문장으로 바꿔 답니다.
항목을 빠뜨리거나 순서를 바꾸지 마세요. 내용이 없는 항목은 짧게라도 채웁니다.
첫 항목(서론)에는 소제목을 달지 않습니다. 제목 다음에 바로 본문이 시작됩니다.

# 제목 짓는 법
${tplCat.title_hint ?? '검색 키워드가 앞쪽에 오도록'}

# 이 카테고리를 쓰는 법
${category.guide}

# 읽는 사람을 대하는 법
${w.reader_rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

# 문체
${w.tone}
- 소제목은 3~4개. 소제목도 문장처럼 자연스럽게.
- 한 문단은 3~4줄. 문단 사이는 비웁니다.
- 목록은 꼭 필요할 때만. 글 전체가 목록이 되면 안 됩니다.
- 결론을 앞에 두고, 근거를 뒤에 둡니다.
- 독자를 가르치려 들지 않습니다. 같은 고민을 해본 사람의 말투로 씁니다.

# 절대 지키는 규칙 (변동성 처리)
${w.volatility_rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

# 쓰지 않는 표현
${w.forbidden_phrases.join(', ')}

# 마무리
${
  category.allow_brand
    ? `이 카테고리에서는 '다시봄라이프' 를 본문에 언급해도 됩니다. 다만 글 전체에서 한 번뿐이고,
광고문이 아니라 "이런 방법도 있습니다" 정도의 담담한 소개여야 합니다.
링크 주소는 쓰지 마세요. 서비스 이름만 씁니다.
언급이 어색하면 넣지 않아도 됩니다 — 정보로 끝나는 편이 나을 때가 많습니다.`
    : `마지막 문단은 앞의 내용을 한 번 정리하거나, 오늘 해볼 만한 것 하나로 끝냅니다.
"더 알아보려면", "도움이 필요하시면" 같이 다른 데로 넘기는 문장은 쓰지 않습니다.`
}

# 하지 말 것
- 제목에 이모지를 넣지 않습니다.
- 본문에 링크 주소를 쓰지 않습니다.
- 특정 제품·병원을 권하지 않습니다.`;

const USER = `아래 주제로 블로그 글을 써주세요.

제목(초안): ${topic.title}
검색 키워드: ${topic.keyword}
글의 각도: ${topic.angle}

요구사항:
- 본문 분량 ${w.target_chars[0]}~${w.target_chars[1]}자 (공백 포함)
- 제목은 초안을 그대로 쓰지 말고, 검색 키워드가 앞쪽에 들어가도록 다듬어주세요. 32자 이내.
- 태그는 5~7개. 검색될 만한 말로. 해시(#) 없이 단어만.
- 본문은 순수 텍스트로. 마크다운 기호(#, **, - )를 쓰지 마세요. 소제목은 그냥 한 줄로 두고 앞뒤를 비워주세요.

그림 자리도 같이 정해주세요. 글에 그림이 없으면 아무도 끝까지 읽지 않습니다.

illustrations 3개 — 본문에 넣을 그림입니다.
- after: 그 그림을 넣을 위치. 본문에 실제로 있는 줄을 글자 그대로 옮겨 적으세요. 소제목 줄이 가장 좋습니다.
- prompt: 그릴 장면을 한국어 한 문장으로. 인물의 나이대와 장소, 하는 동작, 분위기를 씁니다.
  글자나 숫자가 들어가는 장면은 안 됩니다. 특정 상표나 실제 인물도 안 됩니다.

figures 2개 — 본문 내용을 그대로 옮긴 정보 카드입니다. 아래 다섯 중에서 주제에 맞는 것으로 고르세요.
- checklist: 준비물, 서류, 증상 확인처럼 한 줄에 하나인 것. { type, after, title, items[] }
- steps: 순서가 있는 것. { type, after, title, items[] }
- compare: 되는 것과 안 되는 것. { type, after, title, left:{label,items[]}, right:{label,items[]} }
- note: 하면 안 되는 것, 위험한 것. { type, after, title, items[] }
- summary: 세 줄 요약. { type, after, title, items[] }
카드의 items 는 한 줄에 25자 안쪽으로 짧게 씁니다. 본문에 없는 내용을 새로 만들지 마세요.`;

const outDir = ensureOutDir();
const slug = slugify(topic.id, topic.title);
const outFile = path.join(outDir, `${slug}.json`);

if (has('dry-run')) {
  console.log('=== SYSTEM ===\n' + SYSTEM + '\n\n=== USER ===\n' + USER);
  console.log(`\n(dry-run) 저장 예정 경로: ${outFile}`);
  process.exit(0);
}

// dry-run 에서는 SDK 없이도 프롬프트를 확인할 수 있도록 여기서 로드합니다.
const { default: Anthropic } = await import('@anthropic-ai/sdk');
const client = new Anthropic();

const schema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '32자 이내, 이모지 없음' },
    body: { type: 'string', description: '순수 텍스트 본문. 마크다운 기호 없음.' },
    tags: { type: 'array', items: { type: 'string' }, description: '5~7개, # 없이' },
    summary: { type: 'string', description: '네이버 블로그 요약본용 2~3문장' },
    illustrations: {
      type: 'array',
      description: '본문 삽입 그림 3개',
      items: {
        type: 'object',
        properties: {
          after: { type: 'string', description: '본문에 실제로 있는 줄. 글자 그대로.' },
          prompt: { type: 'string', description: '그릴 장면. 한국어 한 문장.' },
        },
        required: ['after', 'prompt'],
        additionalProperties: false,
      },
    },
    figures: {
      type: 'array',
      description: '본문 삽입 정보 카드 2개',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['checklist', 'steps', 'compare', 'note', 'summary'] },
          after: { type: 'string', description: '본문에 실제로 있는 줄. 글자 그대로.' },
          title: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
          left: {
            type: 'object',
            properties: { label: { type: 'string' }, items: { type: 'array', items: { type: 'string' } } },
            required: ['label', 'items'],
            additionalProperties: false,
          },
          right: {
            type: 'object',
            properties: { label: { type: 'string' }, items: { type: 'array', items: { type: 'string' } } },
            required: ['label', 'items'],
            additionalProperties: false,
          },
        },
        required: ['type', 'after', 'title'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'body', 'tags', 'summary', 'illustrations', 'figures'],
  additionalProperties: false,
};

const response = await client.messages.create({
  model: w.model,
  max_tokens: 16000,
  system: SYSTEM,
  output_config: {
    effort: 'high',
    format: { type: 'json_schema', schema },
  },
  messages: [{ role: 'user', content: USER }],
});

if (response.stop_reason === 'refusal') {
  console.error('모델이 요청을 거절했습니다:', response.stop_details);
  process.exit(1);
}

const text = response.content.find((b) => b.type === 'text')?.text;
if (!text) {
  console.error('본문을 받지 못했습니다. stop_reason =', response.stop_reason);
  process.exit(1);
}

const draft = JSON.parse(text);

/** after 가 본문의 어느 줄과도 안 맞으면 버립니다. 조용히 안 들어가는 것보다 낫습니다. */
function keepPlaceable(list, body, label) {
  const lines = new Set(body.split('\n').map((l) => l.trim()));
  const kept = (list ?? []).filter((it) => lines.has((it.after ?? '').trim()));
  const dropped = (list ?? []).length - kept.length;
  if (dropped) console.log(`  (${label} ${dropped}개는 본문에 없는 위치라 뺐습니다)`);
  return kept;
}

const post = {
  id: topic.id,
  category: topic.category,
  category_name: category.name,
  naver_category: config.naver.category_map[topic.category],
  keyword: topic.keyword,
  title: draft.title,
  body: draft.body,
  summary: draft.summary,
  tags: [...new Set([...draft.tags, ...config.naver.tag_common])],
  // after 가 본문에 없으면 발행기가 그 그림을 못 넣습니다. 여기서 미리 걸러냅니다.
  illustrations: keepPlaceable(draft.illustrations, draft.body, 'illustrations'),
  figures: keepPlaceable(draft.figures, draft.body, 'figures'),
  cta: null, // 링크는 발행기가 붙이는 고정 카드뿐입니다
  generated_at: new Date().toISOString(),
  usage: response.usage,
};

fs.writeFileSync(outFile, JSON.stringify(post, null, 2) + '\n', 'utf8');

markTopic(queue, topic.id, { status: 'drafted', draft_file: path.basename(outFile) });
saveQueue(queue);

console.log(`[${topic.id}] ${post.title}`);
console.log(`  분량 ${post.body.length}자 / 태그 ${post.tags.length}개`);
console.log(`  저장: ${outFile}`);
