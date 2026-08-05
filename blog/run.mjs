#!/usr/bin/env node
/**
 * 파이프라인 실행기 — 주제 선택 → 글 생성 → 이미지 생성 → 발행.
 *
 *   node run.mjs                    # 다음 주제 1편, 다음 발행 슬롯에 예약
 *   node run.mjs --now              # 예약 대신 즉시 발행
 *   node run.mjs --count 3          # 3편 연속 (예약 슬롯이 차례로 밀립니다)
 *   node run.mjs --no-publish       # 원고와 이미지만 만들고 멈춤 (검토용)
 *   node run.mjs --skip-lint        # 검수를 건너뛰고 발행 (규칙이 과할 때만)
 *   node run.mjs --id B02           # 특정 주제 지정
 *   node run.mjs --status           # 큐 현황만 출력
 *
 * 처음 며칠은 --no-publish 로 원고를 눈으로 확인한 뒤 발행하시길 권합니다.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, loadQueue, pickNext, queueStats, slugify, paths } from './lib/queue.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const has = (name) => args.includes(`--${name}`);

const config = loadConfig();

if (has('categories')) {
  const queue = loadQueue();
  console.log('\n네이버 블로그에 이 이름 그대로 만드세요 (SETUP_NAVER.md 2번):\n');
  for (const cat of config.categories) {
    const mine = queue.topics.filter((t) => t.category === cat.key);
    console.log(`■ ${cat.name}  ${cat.weight}%  (${mine.length}편)`);
    console.log(`   무엇: ${cat.contains ?? '-'}`);
    console.log(`   독자: ${cat.reader}`);
    if (cat.guide) console.log(`   쓰는 법: ${cat.guide.split('\n')[0]}`);
    const sample = mine.filter((t) => t.status === 'pending').slice(0, 3);
    for (const t of sample) console.log(`     · ${t.title}`);
    if (mine.length > sample.length) console.log(`     · … 외 ${mine.length - sample.length}편`);
    if (cat.note) console.log(`   ※ ${cat.note}`);
    console.log('');
  }
  process.exit(0);
}

if (has('status')) {
  const queue = loadQueue();
  const stats = queueStats(config, queue);
  console.table(stats);

  const total = queue.topics.length;
  const done = queue.topics.filter((t) => t.status === 'published').length;
  const left = queue.topics.filter((t) => t.status === 'pending' && !t.manual).length;
  const weeks = (left / config.schedule.posts_per_week).toFixed(1);
  console.log(`\n전체 ${total}편 / 발행 ${done}편 / 자동 발행 가능 ${left}편 (약 ${weeks}주치)`);

  const thin = stats.filter((r) => r.상태);
  if (thin.length) {
    console.log('\n보충이 필요한 카테고리:');
    for (const r of thin) console.log(`  ${r.카테고리} — ${r.주치}주치 (${r.상태})`);
    console.log('\n  node expand_queue.mjs --auto        # 8주 미만인 카테고리를 알아서 채웁니다');
    console.log(`  node expand_queue.mjs --category ${config.categories.find((c) => c.name === thin[0].카테고리)?.key} --count 12`);
  }
  process.exit(0);
}

const pad2 = (n) => String(n).padStart(2, '0');

/** KST 기준 오늘 0시. */
function kstToday() {
  const now = new Date();
  const kstNow = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
  kstNow.setHours(0, 0, 0, 0);
  return kstNow;
}

/**
 * 이미 예약해 둔 글 중 가장 늦은 날짜. 없으면 null.
 * 격일 발행이 여러 번에 나눠 돌려도 겹치지 않게 하려면 이게 기준점이어야 합니다.
 * 예약을 취소하거나 앞당기고 싶으면 topic_queue.json 의 reserved_for 를 지우면 됩니다.
 */
function lastReservedDay(queue) {
  const days = queue.topics
    .map((t) => t.reserved_for)
    .filter(Boolean)
    .map((s) => new Date(`${s.replace(' ', 'T')}:00`))
    .filter((d) => !Number.isNaN(d.getTime()));
  if (!days.length) return null;
  const max = new Date(Math.max(...days.map((d) => d.getTime())));
  max.setHours(0, 0, 0, 0);
  return max;
}

/**
 * 다음 발행 슬롯을 KST 기준으로 계산. skip 만큼 뒤로 민다.
 * schedule.interval_days 가 있으면 격일(N일 간격), 없으면 예전처럼 요일 지정 방식.
 */
function nextSlot(skip = 0, queue = null) {
  const { interval_days, publish_days, publish_hour, publish_minute } = config.schedule;
  const stamp = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(publish_hour)}:${pad2(publish_minute)}`;

  if (interval_days) {
    const today = kstToday();
    const last = queue ? lastReservedDay(queue) : null;
    // 이미 잡아둔 예약이 있으면 그 뒤로 잇습니다. 이때 skip 은 더하지 않습니다 —
    // 한 편 예약할 때마다 큐에 reserved_for 가 쌓이므로 큐 자체가 진행 상태입니다.
    // 큐에 아무것도 없을 때만(예약 없이 여러 편을 미리 계산할 때) skip 을 씁니다.
    if (last && last >= today) {
      const d = new Date(last);
      d.setDate(d.getDate() + interval_days);
      return stamp(d);
    }
    const d = new Date(today);
    d.setDate(d.getDate() + interval_days * (skip + 1));
    return stamp(d);
  }

  const kstNow = kstToday();
  let found = 0;
  for (let i = 1; i <= 60; i++) {
    const d = new Date(kstNow);
    d.setDate(d.getDate() + i);
    if (!publish_days.includes(d.getDay())) continue;
    if (found === skip) return stamp(d);
    found++;
  }
  throw new Error('발행 슬롯을 계산하지 못했습니다. config.json 의 publish_days 를 확인하세요.');
}

/** 키는 그때그시절 생성기(tools/gemini.key)와 같은 자리를 씁니다. */
function hasGeminiKey() {
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return true;
  return fs.existsSync(path.join(paths.root, '..', 'tools', 'gemini.key'));
}

function run(script, scriptArgs) {
  execFileSync('node', [path.join(HERE, script), ...scriptArgs], {
    stdio: 'inherit',
    cwd: HERE,
  });
}

const count = Number(flag('count') ?? 1);

for (let n = 0; n < count; n++) {
  const queue = loadQueue();
  const topic = flag('id')
    ? queue.topics.find((t) => t.id === flag('id'))
    : pickNext(config, queue, { category: flag('category') });

  if (!topic) {
    console.log('\n남은 주제가 없습니다. topic_queue.json 에 추가하세요.');
    break;
  }

  console.log(`\n───── ${n + 1}/${count}  [${topic.id}] ${topic.title}`);

  run('gen_post.mjs', ['--id', topic.id]);

  const outFile = path.join(paths.out, `${slugify(topic.id, topic.title)}.json`);
  if (!fs.existsSync(outFile)) {
    console.error(`원고 파일이 없습니다: ${outFile}`);
    process.exit(1);
  }

  // 이미지 — 대표 1장 + 본문 카드 + 본문 일러스트.
  // 네이버는 글에 이미지가 없으면 체류시간이 안 나오고 노출도 밀립니다.
  run('gen_image.mjs', ['--post', outFile]);
  run('gen_figures.mjs', ['--post', outFile]);
  if (hasGeminiKey() && !has('no-illust')) {
    try {
      run('gen_illust.mjs', ['--post', outFile]);
    } catch {
      console.error('  (일러스트 생성이 실패했습니다. 카드 이미지만 들어갑니다)');
    }
  } else if (!has('no-illust')) {
    console.log('  (Gemini 키가 없어 일러스트를 건너뜁니다. 카드 이미지만 들어갑니다)');
  }

  // 검수 — 변동성 규칙 위반이 있으면 발행하지 않습니다.
  if (!has('skip-lint')) {
    try {
      run('lint_post.mjs', ['--post', outFile]);
    } catch {
      console.error(`\n[${topic.id}] 검수에서 걸렸습니다. 발행하지 않습니다.`);
      console.error('  원고를 직접 고치거나, 주제의 angle 을 다듬어 다시 생성하세요.');
      console.error(`    node gen_post.mjs --id ${topic.id}`);
      console.error('  검수 결과가 과하다고 판단되면 --skip-lint 로 넘길 수 있습니다.');
      process.exit(1);
    }
  }

  if (has('no-publish')) {
    console.log(`  검토용으로 남겨둡니다: ${outFile}`);
    continue;
  }

  const publishArgs = ['--post', outFile];
  if (!has('now')) publishArgs.push('--reserve', nextSlot(n, queue));
  if (has('headed')) publishArgs.push('--headed');
  run('publish_naver.mjs', publishArgs);
}

console.log('\n완료. 현황:');
console.table(queueStats(config, loadQueue()));
