#!/usr/bin/env node
/**
 * 이미 써 둔 원고를 격일로 예약 발행한다.
 *
 *   node schedule_all.mjs --dry-run     무엇이 언제 나갈지 표만 보여줍니다
 *   node schedule_all.mjs               실제로 예약합니다
 *   node schedule_all.mjs --from 3      3번째부터 (앞이 이미 예약됐을 때 이어서)
 *   node schedule_all.mjs --start 2026-08-10   시작 날짜 지정
 *
 * run.mjs 와 다른 점: 원고를 새로 만들지 않습니다. out/ 에 있는 것을 그대로 올립니다.
 *
 * 순서를 왜 섞는가.
 *   파일 이름 순서대로 올리면 정책 글 세 편이 연달아 나갑니다. 첫 2주 동안 블로그를 찾은
 *   사람이 한 분야만 보게 되고, 네이버도 이 블로그가 무엇을 다루는지 알기 어렵습니다.
 *   카테고리가 번갈아 나오도록 섞습니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadConfig, loadQueue, paths } from './lib/queue.mjs';

const args = process.argv.slice(2);
const flag = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : null;
};
const has = (n) => args.includes(`--${n}`);

const config = loadConfig();
const interval = config.schedule.interval_days ?? 2;
const hh = String(config.schedule.publish_hour ?? 9).padStart(2, '0');
const mm = String(config.schedule.publish_minute ?? 0).padStart(2, '0');

/** 카테고리가 이어서 나오지 않게 섞습니다. */
function interleave(files) {
  const byCat = new Map();
  for (const f of files) {
    const post = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!byCat.has(post.category)) byCat.set(post.category, []);
    byCat.get(post.category).push({ file: f, post });
  }
  // 편수가 많은 카테고리부터 돌아가며 하나씩 꺼냅니다.
  const lanes = [...byCat.values()].sort((a, b) => b.length - a.length);
  const out = [];
  while (lanes.some((l) => l.length)) {
    for (const lane of lanes) {
      const item = lane.shift();
      if (item) out.push(item);
    }
  }
  return out;
}

const files = fs
  .readdirSync(paths.out)
  .filter((f) => /^[A-Z]\d+_.*\.json$/.test(f))
  .map((f) => path.join(paths.out, f));

if (!files.length) {
  console.error('out/ 에 원고가 없습니다.');
  process.exit(1);
}

// 이미 발행·예약된 글은 건너뜁니다.
const queue = loadQueue();
const done = new Set(
  queue.topics.filter((t) => t.status === 'published' || t.reserved_for).map((t) => t.id),
);

const ordered = interleave(files).filter((x) => !done.has(x.post.id));
const skipped = interleave(files).length - ordered.length;
if (skipped) console.log(`이미 예약·발행된 ${skipped}편은 건너뜁니다.\n`);

const from = Number(flag('from') ?? 1) - 1;
const list = ordered.slice(from);

/** 시작 날짜 — 지정이 없으면 내일부터. */
function startDate() {
  const s = flag('start');
  if (s) return new Date(`${s}T00:00:00`);
  const now = new Date();
  const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
  kst.setHours(0, 0, 0, 0);
  kst.setDate(kst.getDate() + interval);
  return kst;
}

const pad = (n) => String(n).padStart(2, '0');
const base = startDate();
const plan = list.map((x, i) => {
  const d = new Date(base);
  d.setDate(d.getDate() + interval * i);
  return {
    ...x,
    when: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hh}:${mm}`,
    dow: ['일', '월', '화', '수', '목', '금', '토'][d.getDay()],
  };
});

console.log(`격일 발행 계획 — ${plan.length}편 · ${interval}일 간격 · ${hh}:${mm}\n`);
console.table(
  plan.map((p, i) => ({
    순서: i + 1,
    날짜: `${p.when.slice(0, 10)} (${p.dow})`,
    카테고리: p.post.category_name,
    제목: p.post.title.slice(0, 28),
  })),
);

if (has('dry-run')) {
  console.log('\n--dry-run: 계획만 보여드렸습니다. 실제로 예약하려면 --dry-run 을 빼세요.\n');
  process.exit(0);
}

console.log('\n예약을 시작합니다. 한 편에 1~2분 걸립니다.\n');
let ok = 0;
const failed = [];
for (const [i, p] of plan.entries()) {
  console.log(`───── ${i + 1}/${plan.length}  [${p.post.id}] ${p.post.title}`);
  console.log(`       ${p.when}`);
  try {
    execFileSync('node', [path.join(paths.root, 'publish_naver.mjs'), '--post', p.file, '--reserve', p.when], {
      stdio: 'inherit',
      cwd: paths.root,
      timeout: 8 * 60000,
    });
    ok++;
  } catch {
    console.error(`  ✗ 실패: ${p.post.id}`);
    failed.push(p.post.id);
  }
}

console.log(`\n예약 완료 ${ok}/${plan.length}편`);
if (failed.length) {
  console.log(`실패: ${failed.join(', ')}`);
  console.log('실패한 것만 다시 돌리려면 같은 명령을 주시면 됩니다(성공분은 건너뜁니다).');
}
