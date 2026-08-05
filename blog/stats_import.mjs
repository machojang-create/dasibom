#!/usr/bin/env node
/**
 * 통계 가져오기 — 네이버 블로그 통계를 rebalance.mjs 가 읽을 형식으로 바꾼다.
 *
 *   node stats_import.mjs --csv ~/Downloads/블로그통계.csv
 *   node stats_import.mjs --set "B01=1200,B02=900,P26=4200"
 *   node stats_import.mjs --csv ... --date 2026-09-02
 *
 * 결과: out/stats_YYYY-MM-DD.json → 이어서 node rebalance.mjs
 *
 * 왜 크롤링하지 않는가.
 *   네이버 통계 화면은 로그인 뒤에만 열리고 DOM 이 자주 바뀝니다. 한 달에 한 번 쓰는 일을
 *   깨지기 쉬운 자동화로 만들 이유가 없습니다. 통계 화면에 내려받기 단추가 있으니
 *   그 파일을 넣으시면 됩니다. 없으면 --set 으로 숫자만 불러 주셔도 됩니다.
 *
 * CSV 는 열 이름을 알아서 찾습니다. 제목처럼 보이는 열과 조회수처럼 보이는 열을 잡고,
 * 제목으로 원고를 찾아 글 번호(B01 등)에 붙입니다. 못 찾은 줄은 이유와 함께 알려 줍니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadQueue, paths, ensureOutDir } from './lib/queue.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};

const csvPath = flag('csv');
const setStr = flag('set');
if (!csvPath && !setStr) {
  console.error('--csv <파일> 또는 --set "B01=1200,B02=900" 이 필요합니다.');
  process.exit(1);
}

const queue = loadQueue();

/** 제목 비교용 — 띄어쓰기·기호·따옴표를 지우고 견줍니다. */
const norm = (s) =>
  String(s ?? '')
    .replace(/[\s,·…"'"'`~!@#$%^&*()\-_=+[\]{}<>/\\|?.:;]/g, '')
    .toLowerCase();

/** 큐와 원고에서 (정규화한 제목 → 글 번호) 표를 만듭니다. */
function titleIndex() {
  const map = new Map();
  for (const t of queue.topics) {
    if (t.title) map.set(norm(t.title), t.id);
  }
  const outDir = paths.out;
  if (fs.existsSync(outDir)) {
    for (const f of fs.readdirSync(outDir).filter((x) => x.endsWith('.json'))) {
      if (/^stats_/.test(f)) continue;
      try {
        const p = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'));
        if (p.title && p.id) map.set(norm(p.title), p.id); // 실제 발행 제목이 더 정확합니다
      } catch {
        /* 원고가 아니면 넘어갑니다 */
      }
    }
  }
  return map;
}

/** 따옴표를 감안한 최소한의 CSV 분해. */
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if ((ch === ',' || ch === '\t') && !quoted) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const posts = {};
const misses = [];

if (setStr) {
  for (const pair of setStr.split(',')) {
    const [id, v] = pair.split('=').map((s) => s.trim());
    if (!id) continue;
    const n = Number(String(v).replace(/[^\d]/g, ''));
    if (!Number.isFinite(n)) {
      misses.push(`${id} — 숫자를 못 읽었습니다: ${v}`);
      continue;
    }
    posts[id] = { views: n };
  }
} else {
  const raw = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) {
    console.error('빈 파일입니다.');
    process.exit(1);
  }

  // 머리글 줄 찾기 — 제목/조회 비슷한 말이 함께 있는 첫 줄.
  let headIdx = -1;
  let cols = [];
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const c = splitCsvLine(lines[i]);
    const hasTitle = c.some((x) => /제목|글제목|title/i.test(x));
    const hasViews = c.some((x) => /조회|방문|공감수를제외한|view/i.test(x));
    if (hasTitle && hasViews) {
      headIdx = i;
      cols = c;
      break;
    }
  }
  if (headIdx < 0) {
    console.error('제목 열과 조회수 열을 못 찾았습니다.');
    console.error(`  첫 줄: ${lines[0].slice(0, 120)}`);
    console.error('  --set 으로 직접 넣으시거나, 열 이름을 알려 주시면 맞추겠습니다.');
    process.exit(1);
  }

  const ti = cols.findIndex((x) => /제목|글제목|title/i.test(x));
  const vi = cols.findIndex((x) => /조회|view/i.test(x));
  const index = titleIndex();
  console.log(`열 인식: 제목="${cols[ti]}" / 조회수="${cols[vi]}"\n`);

  for (const line of lines.slice(headIdx + 1)) {
    const c = splitCsvLine(line);
    const title = c[ti];
    if (!title) continue;
    const views = Number(String(c[vi] ?? '').replace(/[^\d]/g, ''));
    if (!Number.isFinite(views)) continue;

    let id = index.get(norm(title));
    if (!id) {
      // 제목이 잘렸거나 뒤에 말이 붙은 경우 — 앞부분이 겹치면 같은 글로 봅니다.
      const n = norm(title);
      for (const [k, v] of index) {
        if (k.length > 8 && (k.startsWith(n.slice(0, 12)) || n.startsWith(k.slice(0, 12)))) {
          id = v;
          break;
        }
      }
    }
    if (!id) {
      misses.push(`"${title.slice(0, 40)}" — 원고를 못 찾았습니다`);
      continue;
    }
    posts[id] = { views: (posts[id]?.views ?? 0) + views, title };
  }
}

if (!Object.keys(posts).length) {
  console.error('가져온 글이 하나도 없습니다.');
  if (misses.length) misses.forEach((m) => console.error(`  ${m}`));
  process.exit(1);
}

const date = flag('date') ?? new Date().toISOString().slice(0, 10);
const outFile = path.join(ensureOutDir(), `stats_${date}.json`);
fs.writeFileSync(
  outFile,
  `${JSON.stringify(
    { collected_at: new Date().toISOString(), source: csvPath ?? '직접 입력', posts },
    null,
    2,
  )}\n`,
);

const total = Object.values(posts).reduce((n, p) => n + p.views, 0);
console.log(`${Object.keys(posts).length}편 · 조회 ${total.toLocaleString()}회`);
for (const [id, p] of Object.entries(posts).sort((a, b) => b[1].views - a[1].views)) {
  console.log(`  ${id.padEnd(4)} ${String(p.views).padStart(7)}회  ${p.title ?? ''}`);
}
if (misses.length) {
  console.log(`\n못 붙인 줄 ${misses.length}개:`);
  misses.forEach((m) => console.log(`  ${m}`));
  console.log('  (블로그에서 제목을 고쳤으면 안 붙습니다. --set 으로 채워 주세요)');
}
console.log(`\n저장: ${path.basename(outFile)}`);
console.log('다음: node rebalance.mjs\n');
