#!/usr/bin/env node
/**
 * 본문 삽입 이미지 생성기 — 원고의 figures 배열을 읽어 카드 이미지를 만든다.
 *
 *   node gen_figures.mjs --post out/B01_....json
 *   node gen_figures.mjs --all
 *
 * 글 하나에 그림이 없으면 네이버에서 체류시간이 안 나옵니다. 그렇다고 남의 사진을
 * 가져다 쓸 수는 없으니, 본문 내용을 그대로 카드로 만들어 넣습니다.
 * 스크롤하다 눈에 걸리고, 단톡방에 그림만 따로 퍼지기도 합니다.
 *
 * 원고 JSON 에 이렇게 씁니다.
 *
 *   "figures": [
 *     { "type": "checklist", "after": "한 줄씩 확인해 보십시오.",
 *       "title": "챙겨 갈 서류", "items": ["신분증", "통장 사본"] },
 *     { "type": "steps",  "after": "...", "title": "...", "items": ["...", "..."] },
 *     { "type": "compare","after": "...", "title": "...",
 *       "left": {"label":"되는 것","items":[...]}, "right": {"label":"안 되는 것","items":[...]} },
 *     { "type": "note",   "after": "...", "title": "...", "items": ["..."] },
 *     { "type": "summary","after": "...", "title": "세 줄 요약", "items": ["...","...","..."] }
 *   ]
 *
 * after 는 그 이미지를 넣을 위치입니다. 본문에서 그 줄을 친 직후에 들어갑니다.
 * 발행기(publish_naver.mjs)가 이 값으로 위치를 찾습니다. 본문에 없는 줄이면 무시됩니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { loadConfig, ensureOutDir } from './lib/queue.mjs';
import { logoMark, esc, wrap } from './lib/brand.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const has = (name) => args.includes(`--${name}`);

const config = loadConfig();
const b = config.brand;
const W = 800;
const PAD = 48;
const FONT = b.font_family;

const RED = '#C0392B'; // 주의 카드에만 쓰는 색. 다른 카드에 쓰지 마세요.

/** 카드 공통 껍데기. 안쪽 내용(SVG 조각)과 높이를 받아 완성된 SVG 를 돌려준다. */
function frame(inner, h, accent = b.primary) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}">
  <rect width="${W}" height="${h}" fill="${b.bg}"/>
  <rect x="20" y="20" width="${W - 40}" height="${h - 40}" rx="20" fill="#FFFFFF"/>
  <rect x="20" y="20" width="8" height="${h - 40}" rx="4" fill="${accent}"/>
  ${inner}
  <text x="${W - PAD}" y="${h - 34}" font-family="${FONT}" font-size="20" fill="#B7C3BE" text-anchor="end">dasibomlife.com</text>
</svg>`;
}

function titleBlock(title, accent) {
  return `<text x="${PAD + 16}" y="${PAD + 46}" font-family="${FONT}" font-size="38" font-weight="bold" fill="${accent}">${esc(title)}</text>`;
}

/** 체크 항목 카드 — 서류, 준비물, 증상 확인처럼 '한 줄에 하나' 인 것. */
function checklist(fig) {
  const accent = b.primary;
  const lines = fig.items.map((t) => wrap(t, 24));
  let y = PAD + 116;
  let inner = titleBlock(fig.title, accent);
  for (const ls of lines) {
    const cy = y - 12;
    inner += `<circle cx="${PAD + 32}" cy="${cy}" r="17" fill="${b.bg}" stroke="${accent}" stroke-width="2.5"/>
    <path d="M${PAD + 24} ${cy} l6 7 l12 -14" fill="none" stroke="${accent}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    ls.forEach((line, i) => {
      inner += `<text x="${PAD + 66}" y="${y + i * 40}" font-family="${FONT}" font-size="30" fill="${b.text}">${esc(line)}</text>`;
    });
    y += ls.length * 40 + 26;
  }
  return frame(inner, y + 34, accent);
}

/** 단계 카드 — 순서가 있는 것. 번호가 크게 보여야 따라 하기 쉽습니다. */
function steps(fig) {
  const accent = b.primary;
  let y = PAD + 118;
  let inner = titleBlock(fig.title, accent);
  fig.items.forEach((t, idx) => {
    const ls = wrap(t, 22);
    const cy = y - 12;
    inner += `<circle cx="${PAD + 34}" cy="${cy}" r="24" fill="${accent}"/>
    <text x="${PAD + 34}" y="${cy + 11}" font-family="${FONT}" font-size="30" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${idx + 1}</text>`;
    ls.forEach((line, i) => {
      inner += `<text x="${PAD + 78}" y="${y + i * 40}" font-family="${FONT}" font-size="30" fill="${b.text}">${esc(line)}</text>`;
    });
    const nextY = y + ls.length * 40 + 30;
    if (idx < fig.items.length - 1) {
      inner += `<line x1="${PAD + 34}" y1="${cy + 26}" x2="${PAD + 34}" y2="${nextY - 40}" stroke="${b.sprout_light}" stroke-width="3" stroke-linecap="round"/>`;
    }
    y = nextY;
  });
  return frame(inner, y + 34, accent);
}

/** 두 칸 비교 카드 — 되는 것 / 안 되는 것처럼 갈리는 지점. */
function compare(fig) {
  const accent = b.primary;
  const colW = (W - PAD * 2 - 24) / 2;
  const L = fig.left;
  const R = fig.right;
  const cell = (side, x, color) => {
    let s = `<rect x="${x}" y="${PAD + 88}" width="${colW}" height="__H__" rx="14" fill="${b.bg}"/>
    <text x="${x + 24}" y="${PAD + 134}" font-family="${FONT}" font-size="28" font-weight="bold" fill="${color}">${esc(side.label)}</text>`;
    let yy = PAD + 186;
    for (const t of side.items) {
      for (const line of wrap(t, 13)) {
        s += `<text x="${x + 24}" y="${yy}" font-family="${FONT}" font-size="26" fill="${b.text}">${esc(line)}</text>`;
        yy += 38;
      }
      yy += 12;
    }
    return { svg: s, bottom: yy };
  };
  const left = cell(L, PAD, accent);
  const right = cell(R, PAD + colW + 24, RED);
  const bottom = Math.max(left.bottom, right.bottom);
  const cellH = bottom - (PAD + 88) - 8;
  const inner =
    titleBlock(fig.title, accent) +
    left.svg.replace('__H__', cellH) +
    right.svg.replace('__H__', cellH);
  return frame(inner, bottom + 46, accent);
}

/** 주의 카드 — 하면 안 되는 것. 이 카드만 붉은색을 씁니다. */
function note(fig) {
  const accent = RED;
  let y = PAD + 116;
  let inner =
    `<text x="${PAD + 16}" y="${PAD + 46}" font-family="${FONT}" font-size="38" font-weight="bold" fill="${accent}">${esc(fig.title)}</text>`;
  for (const t of fig.items) {
    const ls = wrap(t, 24);
    inner += `<text x="${PAD + 20}" y="${y}" font-family="${FONT}" font-size="30" font-weight="bold" fill="${accent}">!</text>`;
    ls.forEach((line, i) => {
      inner += `<text x="${PAD + 50}" y="${y + i * 40}" font-family="${FONT}" font-size="30" fill="${b.text}">${esc(line)}</text>`;
    });
    y += ls.length * 40 + 26;
  }
  return frame(inner, y + 34, accent);
}

/** 요약 카드 — 글 끝에 붙습니다. 로고가 들어가는 유일한 카드. */
function summary(fig) {
  const accent = b.primary;
  let y = PAD + 122;
  let inner =
    logoMark(b, { x: PAD + 12, y: PAD + 8, size: 46, withPlate: false }) +
    `<text x="${PAD + 74}" y="${PAD + 46}" font-family="${FONT}" font-size="36" font-weight="bold" fill="${accent}">${esc(fig.title)}</text>`;
  fig.items.forEach((t, idx) => {
    const ls = wrap(t, 23);
    inner += `<text x="${PAD + 20}" y="${y}" font-family="${FONT}" font-size="30" font-weight="bold" fill="${b.sprout}">${idx + 1}</text>`;
    ls.forEach((line, i) => {
      inner += `<text x="${PAD + 56}" y="${y + i * 40}" font-family="${FONT}" font-size="30" fill="${b.text}">${esc(line)}</text>`;
    });
    y += ls.length * 40 + 26;
  });
  return frame(inner, y + 34, accent);
}

const RENDER = { checklist, steps, compare, note, summary };

async function buildOne(postPath) {
  const post = JSON.parse(fs.readFileSync(postPath, 'utf8'));
  const figs = post.figures ?? [];
  if (!figs.length) return { id: post.id, count: 0 };

  const dir = ensureOutDir('figs');
  const made = [];
  for (let i = 0; i < figs.length; i++) {
    const fig = figs[i];
    const render = RENDER[fig.type];
    if (!render) {
      console.error(`  [${post.id}] 모르는 그림 종류: ${fig.type}`);
      continue;
    }
    const svg = render(fig);
    const file = path.join(dir, `${post.id}_${i + 1}.png`);
    await sharp(Buffer.from(svg)).png().toFile(file);
    made.push(file);
  }
  return { id: post.id, count: made.length, dir };
}

const targets = has('all')
  ? fs
      .readdirSync(ensureOutDir())
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.join(ensureOutDir(), f))
  : [flag('post')].filter(Boolean);

if (!targets.length) {
  console.error('--post out/xxx.json 또는 --all 이 필요합니다.');
  process.exit(1);
}

let total = 0;
for (const t of targets) {
  const r = await buildOne(t);
  if (r.count) {
    console.log(`  [${r.id}] 그림 ${r.count}장`);
    total += r.count;
  }
}
console.log(`\n본문 삽입 이미지 ${total}장 · ${path.join(ensureOutDir(), 'figs')}`);
console.log('글자가 네모로 나오면 한글 폰트가 없는 것입니다. setup.sh 가 알려줍니다.');
