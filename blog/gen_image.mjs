#!/usr/bin/env node
/**
 * 대표 이미지 생성기 — 원고 JSON 을 받아 800x800 썸네일 PNG 를 만든다.
 *
 *   node gen_image.mjs --post out/A01_....json
 *   node gen_image.mjs --title "직접 넣은 제목" --out out/test.png
 *
 * 한글 폰트가 시스템에 있어야 합니다. 없으면 네모(두부)로 나옵니다.
 *   Ubuntu/Debian:  sudo apt install fonts-nanum && fc-cache -fv
 *   macOS:          기본 폰트(AppleSDGothicNeo)로 config.json 의 font_family 를 바꾸세요.
 *   Windows:        'Malgun Gothic'
 * 설치된 한글 폰트 확인:  fc-list :lang=ko family
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { loadConfig, ensureOutDir } from './lib/queue.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};

const config = loadConfig();
const img = config.image;

let title = flag('title');
let outFile = flag('out');
let label = '다시봄라이프';

const postPath = flag('post');
if (postPath) {
  const post = JSON.parse(fs.readFileSync(postPath, 'utf8'));
  title = title ?? post.title;
  label = post.category_name ?? label;
  outFile = outFile ?? path.join(ensureOutDir(), path.basename(postPath, '.json') + '.png');
}

if (!title) {
  console.error('--post 또는 --title 중 하나는 필요합니다.');
  process.exit(1);
}
outFile = outFile ?? path.join(ensureOutDir(), 'thumbnail.png');

/** 글자 수 기준으로 줄바꿈. 한글은 폭이 일정해서 이 정도로 충분합니다. */
function wrap(text, perLine) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const word of words) {
    if (cur && (cur + ' ' + word).length > perLine) {
      lines.push(cur);
      cur = word;
    } else {
      cur = cur ? cur + ' ' + word : word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const lines = wrap(title, 11).slice(0, 4);
const fontSize = lines.length >= 4 ? 52 : lines.length === 3 ? 58 : 64;
const lineHeight = Math.round(fontSize * 1.45);
const blockHeight = lines.length * lineHeight;
const startY = Math.round((img.height - blockHeight) / 2) + fontSize;

const svg = `<svg width="${img.width}" height="${img.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${img.width}" height="${img.height}" fill="${img.bg_color}"/>
  <rect x="0" y="0" width="${img.width}" height="14" fill="${img.brand_color}"/>

  <text x="72" y="128"
        font-family="${img.font_family}" font-size="30" font-weight="bold"
        fill="${img.brand_color}">${esc(label)}</text>

  ${lines
    .map(
      (line, i) =>
        `<text x="72" y="${startY + i * lineHeight}" font-family="${img.font_family}" font-size="${fontSize}" font-weight="bold" fill="${img.text_color}">${esc(line)}</text>`
    )
    .join('\n  ')}

  <text x="72" y="${img.height - 72}"
        font-family="${img.font_family}" font-size="28"
        fill="${img.text_color}" opacity="0.55">dasibomlife.com</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(outFile);

console.log(`이미지 생성: ${outFile}`);
console.log(`  제목 ${lines.length}줄 / 폰트 ${img.font_family} ${fontSize}px`);
console.log('  글자가 네모로 나오면 한글 폰트가 없는 것입니다. 파일 상단 주석을 보세요.');
