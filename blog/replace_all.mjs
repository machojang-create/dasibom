#!/usr/bin/env node
/**
 * 이미 예약해 둔 글을 지금 원고·이미지로 다시 채운다.
 *
 *   node replace_all.mjs --dry-run     무엇을 언제 자리로 다시 올릴지 표만
 *   node replace_all.mjs               실제로 덮어씁니다
 *   node replace_all.mjs --skip B06    이미 끝낸 것은 건너뛰기
 *
 * 예약 글은 지울 필요가 없습니다. 목록에서 열어 내용을 비우고 다시 채운 뒤 발행하면
 * 같은 글이 덮어써지고 예약 시각도 그대로 남습니다(글이 새로 늘지 않습니다).
 *
 * 쓰는 때: 이미지를 다시 만들었는데 이미 예약이 걸려 있을 때.
 *          (2026-08-06 로고를 옛것으로 만들어 올렸다가 전부 다시 올린 일)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadConfig, loadQueue, paths } from './lib/queue.mjs';

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : null;
};
const flagAll = (n) => args.reduce((acc, a, i) => (a === `--${n}` ? [...acc, args[i + 1]] : acc), []);

const skip = new Set(flagAll('skip').filter(Boolean));
const config = loadConfig();
const queue = loadQueue();

let targets = queue.topics
  .filter((t) => t.reserved_for && !skip.has(t.id))
  .map((t) => {
    const file = t.draft_file ? path.join(paths.out, t.draft_file) : null;
    return { ...t, file };
  })
  .filter((t) => t.file && fs.existsSync(t.file))
  .sort((a, b) => a.reserved_for.localeCompare(b.reserved_for));

// --start 를 주면 그 날부터 격일로 날짜를 다시 매깁니다(순서는 지금 예약 순서 그대로).
const startArg = flag('start');
if (startArg) {
  const interval = config.schedule.interval_days ?? 2;
  const hh = String(config.schedule.publish_hour ?? 9).padStart(2, '0');
  const mm = String(config.schedule.publish_minute ?? 0).padStart(2, '0');
  const pad = (n) => String(n).padStart(2, '0');
  const base = new Date(`${startArg}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    console.error(`--start 날짜를 못 읽었습니다: ${startArg} (예: 2026-08-15)`);
    process.exit(1);
  }
  targets = targets.map((t, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + interval * i);
    return {
      ...t,
      new_when: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hh}:${mm}`,
    };
  });
}

if (!targets.length) {
  console.error('덮어쓸 예약 글이 없습니다.');
  process.exit(1);
}

const W = ['일', '월', '화', '수', '목', '금', '토'];
const dow = (s) => W[new Date(`${s.replace(' ', 'T')}:00`).getDay()];

console.log(`예약 글 다시 올리기 — ${targets.length}편\n`);
console.table(
  targets.map((t, i) => {
    const row = { 순서: i + 1, 지금: `${t.reserved_for.slice(0, 10)} (${dow(t.reserved_for)})` };
    if (t.new_when) row['바꿀 날짜'] = `${t.new_when.slice(0, 10)} (${dow(t.new_when)})`;
    row.제목 = t.title.slice(0, 28);
    return row;
  }),
);

if (has('dry-run')) {
  console.log('\n--dry-run: 계획만 보여드렸습니다.\n');
  process.exit(0);
}

console.log('\n한 편에 1~2분 걸립니다. 예약 시각은 그대로 유지됩니다.\n');
let ok = 0;
const failed = [];
for (const [i, t] of targets.entries()) {
  const when = t.new_when ?? t.reserved_for;
  console.log(`───── ${i + 1}/${targets.length}  [${t.id}] ${t.title}`);
  if (t.new_when) console.log(`       ${t.reserved_for} → ${when}`);
  try {
    execFileSync(
      'node',
      [path.join(paths.root, 'publish_naver.mjs'), '--post', t.file, '--replace', '--reserve', when],
      { stdio: 'inherit', cwd: paths.root, timeout: 8 * 60000 },
    );
    ok++;
  } catch {
    console.error(`  ✗ 실패: ${t.id}`);
    failed.push(t.id);
  }
}

console.log(`\n다시 올리기 완료 ${ok}/${targets.length}편`);
if (failed.length) {
  console.log(`실패: ${failed.join(', ')}`);
  console.log(`끝난 것을 빼고 다시 돌리려면: node replace_all.mjs ${targets.filter((t) => !failed.includes(t.id)).map((t) => `--skip ${t.id}`).join(' ')}`);
}
