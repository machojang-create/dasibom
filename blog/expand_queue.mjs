#!/usr/bin/env node
/**
 * 주제 큐 확장기 — 큐가 마르기 전에 새 주제를 채운다.
 *
 *   node expand_queue.mjs --category hobby_pet --count 15
 *   node expand_queue.mjs --category care_policy --count 8 --dry-run
 *   node expand_queue.mjs --auto        # 소진 임박한 카테고리를 알아서 채움
 *
 * 기존 큐의 모든 제목·키워드를 프롬프트에 넣어 중복을 피합니다.
 * 발행된 글까지 포함해서 비교하므로, 오래 운영해도 같은 주제가 다시 나오지 않습니다.
 *
 * 인터뷰 카테고리(elder_voice)는 실제 취재가 필요해서 확장하지 않습니다.
 */
import path from 'node:path';
import { loadConfig, loadQueue, saveQueue, getCategory, queueStats } from './lib/queue.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const has = (name) => args.includes(`--${name}`);

const config = loadConfig();
const queue = loadQueue();

/** 카테고리별 남은 편수를 주 단위로 환산. 목표 비중만큼만 소비된다고 봅니다. */
function weeksLeft(catKey) {
  const cat = getCategory(config, catKey);
  const pending = queue.topics.filter(
    (t) => t.category === catKey && t.status === 'pending' && !t.manual
  ).length;
  const perWeek = config.schedule.posts_per_week * (cat.weight / 100);
  return perWeek === 0 ? Infinity : pending / perWeek;
}

let targets = [];
if (has('auto')) {
  const threshold = Number(flag('threshold') ?? 8); // 8주 미만이면 채운다
  targets = config.categories
    .filter((c) => !c.manual_only && weeksLeft(c.key) < threshold)
    .map((c) => ({ key: c.key, count: Number(flag('count') ?? 12) }));
  if (targets.length === 0) {
    console.log(`모든 카테고리가 ${threshold}주 이상 남았습니다. 채울 게 없습니다.`);
    console.table(
      config.categories.map((c) => ({
        카테고리: c.name,
        '남은 주수': c.manual_only ? '수동(취재)' : weeksLeft(c.key).toFixed(1),
      }))
    );
    process.exit(0);
  }
} else {
  const key = flag('category');
  if (!key) {
    console.error('--category <키> 또는 --auto 가 필요합니다.');
    console.error('사용 가능한 키: ' + config.categories.map((c) => c.key).join(', '));
    process.exit(1);
  }
  targets = [{ key, count: Number(flag('count') ?? 12) }];
}

const schema = {
  type: 'object',
  properties: {
    topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '검색 키워드가 앞쪽에 오는 제목. 32자 이내' },
          keyword: { type: 'string', description: '실제로 검색될 만한 말. 2~4단어' },
          angle: { type: 'string', description: '이 글이 다른 글과 다른 지점. 한 문장' },
        },
        required: ['title', 'keyword', 'angle'],
        additionalProperties: false,
      },
    },
  },
  required: ['topics'],
  additionalProperties: false,
};

// dry-run 에서는 SDK 없이도 확인할 수 있도록 필요할 때만 로드합니다.
const client = has('dry-run') ? null : new (await import('@anthropic-ai/sdk')).default();

for (const target of targets) {
  const cat = getCategory(config, target.key);
  if (cat.manual_only) {
    console.log(`[${cat.name}] 은 직접 취재하는 카테고리라 건너뜁니다.`);
    continue;
  }

  // 중복 회피용 — 전체 큐의 제목과 키워드를 모두 보여줍니다.
  const existing = queue.topics
    .map((t) => `- ${t.title} (키워드: ${t.keyword})`)
    .join('\n');

  const SYSTEM = `당신은 '다시봄라이프' 블로그의 콘텐츠 기획자입니다.
다시봄라이프는 은퇴 이후 세대를 위한 콘텐츠 공간입니다. 쓰는 사람은 60대 본인이고,
인공지능 '봄이'와 나눈 이야기가 자서전으로 쌓입니다. 건강·일자리·추억·취미도 다룹니다.
네이버에서 검색해 들어올 사람을 잡는 주제를 뽑습니다.

# 이 카테고리
${cat.name}
읽는 사람: ${cat.reader}
목적: ${cat.goal}

# 좋은 주제의 조건
- 실제로 검색창에 칠 법한 말이 제목 앞쪽에 들어간다.
- 답이 뻔하지 않다. "이런 각도로는 안 봤네" 싶은 지점이 하나 있다.
- 한 편으로 끝난다. 시리즈로 이어져야 하는 주제는 쪼갠다.
- 시간이 지나도 유효하다. 특정 시점의 제도·가격·통계에 기대지 않는다.

# 나쁜 주제
- "○○ 총정리", "○○ 베스트 10" 같은 나열형
- 다시봄라이프 기능 설명이 목적인 주제
- 이미 큐에 있는 것과 각도가 겹치는 주제`;

  const USER = `이미 큐에 있는 주제입니다. 이것들과 겹치지 않는 새 주제 ${target.count}개를 뽑아주세요.

${existing}

주의:
- 위 목록과 키워드가 같거나, 각도만 살짝 바꾼 주제는 제외하세요.
- 제목에 이모지를 쓰지 마세요.
- angle 은 한 문장으로, 구체적으로 적어주세요. "도움이 되는 정보" 같은 말은 쓰지 마세요.`;

  if (has('dry-run')) {
    console.log(`\n=== [${cat.name}] ${target.count}개 요청 (dry-run) ===`);
    console.log(`기존 큐 ${queue.topics.length}편을 중복 회피용으로 전달합니다.`);
    continue;
  }

  const response = await client.messages.create({
    model: config.writing.model,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: 'high', format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: USER }],
  });

  if (response.stop_reason === 'refusal') {
    console.error('모델이 요청을 거절했습니다:', response.stop_details);
    process.exit(1);
  }

  const text = response.content.find((b) => b.type === 'text')?.text;
  if (!text) {
    console.error('응답을 받지 못했습니다. stop_reason =', response.stop_reason);
    process.exit(1);
  }

  const { topics } = JSON.parse(text);

  // id 자동 채번 — 같은 접두사 중 가장 큰 번호 다음부터
  const prefix = cat.id_prefix ?? cat.key.slice(0, 1).toUpperCase();
  const used = queue.topics
    .filter((t) => t.id.startsWith(prefix))
    .map((t) => Number(t.id.slice(prefix.length)))
    .filter((n) => !Number.isNaN(n));
  let next = (used.length ? Math.max(...used) : 0) + 1;

  const added = [];
  for (const t of topics) {
    // 키워드가 완전히 같으면 버립니다 (모델이 놓칠 수 있으니 코드에서 한 번 더).
    if (queue.topics.some((x) => x.keyword === t.keyword)) continue;
    const topic = {
      id: `${prefix}${String(next++).padStart(2, '0')}`,
      category: cat.key,
      title: t.title,
      keyword: t.keyword,
      angle: t.angle,
      status: 'pending',
      added_at: new Date().toISOString().slice(0, 10),
    };
    queue.topics.push(topic);
    added.push(topic);
  }

  saveQueue(queue);

  console.log(`\n[${cat.name}] ${added.length}개 추가 (요청 ${target.count}, 중복 제외 ${topics.length - added.length})`);
  for (const t of added) console.log(`  ${t.id}  ${t.title}`);
}

console.log('\n현황:');
console.table(queueStats(config, loadQueue()));
console.log('\n추가된 주제의 angle 을 한 번 훑어보세요. 뻔한 각도면 직접 고치는 게 낫습니다.');
console.log(`파일: ${path.relative(process.cwd(), path.join(process.cwd(), 'topic_queue.json'))}`);
