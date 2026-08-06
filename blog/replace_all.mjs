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
import { loadQueue, paths } from './lib/queue.mjs';

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flagAll = (n) => args.reduce((acc, a, i) => (a === `--${n}` ? [...acc, args[i + 1]] : acc), []);

const skip = new Set(flagAll('skip').filter(Boolean));
const queue = loadQueue();

const targets = queue.topics
  .filter((t) => t.reserved_for && !skip.has(t.id))
  .map((t) => {
    const file = t.draft_file ? path.join(paths.out, t.draft_file) : null;
    return { ...t, file };
  })
  .filter((t) => t.file && fs.existsSync(t.file))
  .sort((a, b) => a.reserved_for.localeCompare(b.reserved_for));

if (!targets.length) {
  console.error('덮어쓸 예약 글이 없습니다.');
  process.exit(1);
}

console.log(`예약 글 다시 올리기 — ${targets.length}편\n`);
console.table(
  targets.map((t, i) => ({ 순서: i + 1, 예약: t.reserved_for, 제목: t.title.slice(0, 30) })),
);

if (has('dry-run')) {
  console.log('\n--dry-run: 계획만 보여드렸습니다.\n');
  process.exit(0);
}

console.log('\n한 편에 1~2분 걸립니다. 예약 시각은 그대로 유지됩니다.\n');
let ok = 0;
const failed = [];
for (const [i, t] of targets.entries()) {
  console.log(`───── ${i + 1}/${targets.length}  [${t.id}] ${t.title}`);
  try {
    execFileSync(
      'node',
      [path.join(paths.root, 'publish_naver.mjs'), '--post', t.file, '--replace', '--reserve', t.reserved_for],
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
