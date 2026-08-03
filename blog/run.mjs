#!/usr/bin/env node
/**
 * 파이프라인 실행기 — 주제 선택 → 글 생성 → 이미지 생성 → 발행.
 *
 *   node run.mjs                    # 다음 주제 1편, 다음 발행 슬롯에 예약
 *   node run.mjs --now              # 예약 대신 즉시 발행
 *   node run.mjs --count 3          # 3편 연속 (예약 슬롯이 차례로 밀립니다)
 *   node run.mjs --no-publish       # 원고와 이미지만 만들고 멈춤 (검토용)
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

/** 다음 발행 슬롯을 KST 기준으로 계산. skip 만큼 뒤로 민다. */
function nextSlot(skip = 0) {
  const { publish_days, publish_hour, publish_minute } = config.schedule;
  const KST = 9 * 60; // UTC+9
  const now = new Date();
  const kstNow = new Date(now.getTime() + (KST + now.getTimezoneOffset()) * 60000);

  let found = 0;
  for (let i = 1; i <= 60; i++) {
    const d = new Date(kstNow);
    d.setDate(d.getDate() + i);
    if (!publish_days.includes(d.getDay())) continue;
    if (found === skip) {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(publish_hour)}:${pad(publish_minute)}`;
    }
    found++;
  }
  throw new Error('발행 슬롯을 계산하지 못했습니다. config.json 의 publish_days 를 확인하세요.');
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

  run('gen_image.mjs', ['--post', outFile]);

  if (has('no-publish')) {
    console.log(`  검토용으로 남겨둡니다: ${outFile}`);
    continue;
  }

  const publishArgs = ['--post', outFile];
  if (!has('now')) publishArgs.push('--reserve', nextSlot(n));
  if (has('headed')) publishArgs.push('--headed');
  run('publish_naver.mjs', publishArgs);
}

console.log('\n완료. 현황:');
console.table(queueStats(config, loadQueue()));
