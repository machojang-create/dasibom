#!/usr/bin/env node
/**
 * 대표 이미지 생성기 — 원고 JSON 을 받아 800x800 썸네일 PNG 를 만든다.
 *
 *   node gen_image.mjs --post out/A01_....json
 *   node gen_image.mjs --title "직접 넣은 제목" --out out/test.png
 *
 * 색과 로고는 앱의 manifest.json / logo.svg 값을 그대로 씁니다 (lib/brand.mjs).
 *
 * 한글 폰트가 시스템에 있어야 합니다. 없으면 네모(두부)로 나옵니다.
 *   Ubuntu/Debian:  sudo apt install fonts-nanum && fc-cache -fv
 *   macOS:          config.json 의 brand.font_family 를 "AppleSDGothicNeo" 로
 *   Windows:        "Malgun Gothic"
 * 설치된 한글 폰트 확인:  fc-list :lang=ko family
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

const config = loadConfig();
const b = config.brand;
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

const lines = wrap(title, 11).slice(0, 4);
const fontSize = lines.length >= 4 ? 50 : lines.length === 3 ? 56 : 62;
const lineHeight = Math.round(fontSize * 1.5);
const blockHeight = lines.length * lineHeight;
const startY = Math.round((img.height - blockHeight) / 2) + fontSize - 10;

const svg = `<svg width="${img.width}" height="${img.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${img.width}" height="${img.height}" fill="${b.bg}"/>

  <!-- 상단 브랜드 바 -->
  <rect x="0" y="0" width="${img.width}" height="10" fill="${b.primary}"/>

  <!-- 로고 + 카테고리 -->
  ${logoMark(b, { x: 68, y: 74, size: 52, withPlate: false })}
  <text x="132" y="112" font-family="${b.font_family}" font-size="29" font-weight="bold"
        fill="${b.primary}">${esc(label)}</text>

  <!-- 제목 -->
  ${lines
    .map(
      (line, i) =>
        `<text x="68" y="${startY + i * lineHeight}" font-family="${b.font_family}" font-size="${fontSize}" font-weight="bold" fill="${b.text}">${esc(line)}</text>`
    )
    .join('\n  ')}

  <!-- 하단 -->
  <line x1="68" y1="${img.height - 118}" x2="${68 + 90}" y2="${img.height - 118}"
        stroke="${b.sprout}" stroke-width="5" stroke-linecap="round"/>
  <text x="68" y="${img.height - 66}" font-family="${b.font_family}" font-size="27"
        fill="${b.text}" opacity="0.5">dasibomlife.com</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(outFile);

console.log(`이미지 생성: ${outFile}`);
console.log(`  제목 ${lines.length}줄 / 폰트 ${b.font_family} ${fontSize}px`);
console.log('  글자가 네모로 나오면 한글 폰트가 없는 것입니다. 파일 상단 주석을 보세요.');
