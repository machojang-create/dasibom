#!/usr/bin/env node
/**
 * 블로그 기본 디자인 자산 생성기 — 타이틀 이미지 / 프로필 / 모바일 커버.
 *
 *   node gen_blog_assets.mjs
 *   node gen_blog_assets.mjs --out assets     # 다른 폴더에
 *
 * 결과는 out/assets/ 에 나옵니다. 네이버 블로그 관리 화면에서 직접 업로드하세요.
 * (스킨 설정은 API 가 없어서 손으로 해야 합니다. SETUP_NAVER.md 참고)
 *
 * 규격은 config.json 의 blog_assets 에 있습니다. 네이버가 권장 크기를 바꾸면
 * 관리 화면에 표시되는 값에 맞춰 config 를 고치고 다시 돌리면 됩니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { loadConfig, paths } from './lib/queue.mjs';
import { logoMark, esc } from './lib/brand.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};

const config = loadConfig();
const b = config.brand;
const a = config.blog_assets;

const outDir = path.join(paths.out, flag('out') ?? 'assets');
fs.mkdirSync(outDir, { recursive: true });

/**
 * 은은한 배경 무늬 — 새싹을 흐리게 흩뿌린다.
 * 좌표는 고정값입니다. 다시 돌려도 같은 그림이 나와야 하고(재현성),
 * 글자가 놓이는 왼쪽 절반은 비워둡니다.
 */
function sprigs(width, height) {
  // [가로 비율, 세로 비율, 크기] — 화면 밖으로 안 나가도록 여백을 둔 값
  const spots = [
    [0.56, 0.62, 30],
    [0.66, 0.2, 38],
    [0.74, 0.68, 26],
    [0.83, 0.28, 34],
    [0.9, 0.6, 30],
    [0.62, 0.88, 22],
  ];
  return spots
    .map(([fx, fy, size]) => {
      const x = Math.round(width * fx);
      const y = Math.round(height * fy - size / 2);
      if (y + size > height || x + size > width) return '';
      return `<g opacity="0.12">${logoMark(b, { x, y, size, withPlate: false })}</g>`;
    })
    .filter(Boolean)
    .join('\n  ');
}

const assets = [
  {
    name: 'title.png',
    what: 'PC 블로그 타이틀 (상단 제목 영역)',
    w: a.title_image.width,
    h: a.title_image.height,
    svg: (w, h) => `
  <rect width="${w}" height="${h}" fill="${b.bg}"/>
  ${sprigs(w, h, 5)}
  <rect x="0" y="0" width="${w}" height="8" fill="${b.primary}"/>
  ${logoMark(b, { x: 60, y: h / 2 - 46, size: 92, withPlate: false })}
  <text x="176" y="${h / 2 - 6}" font-family="${b.font_family}" font-size="46" font-weight="bold"
        fill="${b.text}">다시봄라이프</text>
  <text x="178" y="${h / 2 + 40}" font-family="${b.font_family}" font-size="24"
        fill="${b.primary}">${esc(a.tagline)}</text>
  <text x="${w - 60}" y="${h - 34}" text-anchor="end" font-family="${b.font_family}" font-size="21"
        fill="${b.text}" opacity="0.45">dasibomlife.com</text>`,
  },
  {
    name: 'profile.png',
    what: '프로필 이미지 (정사각)',
    w: a.profile.width,
    h: a.profile.height,
    svg: (w, h) => `
  <rect width="${w}" height="${h}" rx="${Math.round(w * 0.22)}" fill="#FFFDE7"/>
  ${logoMark(b, { x: w * 0.16, y: h * 0.16, size: w * 0.68, withPlate: false })}`,
  },
  {
    name: 'side_banner.png',
    what: '사이드바 배너 위젯 (네이버 관리 → 레이아웃·위젯 → 위젯 직접등록)',
    w: 170,
    h: 220,
    svg: (w, h) => `
  <rect width="${w}" height="${h}" rx="14" fill="${b.bg}" stroke="${b.primary}" stroke-width="2"/>
  ${logoMark(b, { x: w / 2 - 26, y: 22, size: 52, withPlate: false })}
  <text x="${w / 2}" y="103" text-anchor="middle" font-family="${b.font_family}"
        font-size="19" font-weight="bold" fill="${b.text}">다시봄라이프</text>
  <text x="${w / 2}" y="130" text-anchor="middle" font-family="${b.font_family}"
        font-size="12.5" fill="${b.text}" opacity="0.7">은퇴 이후의 하루를</text>
  <text x="${w / 2}" y="148" text-anchor="middle" font-family="${b.font_family}"
        font-size="12.5" fill="${b.text}" opacity="0.7">위한 서비스</text>
  <rect x="26" y="168" width="${w - 52}" height="32" rx="16" fill="${b.primary}"/>
  <text x="${w / 2}" y="189" text-anchor="middle" font-family="${b.font_family}"
        font-size="13" font-weight="bold" fill="#ffffff">둘러보기</text>`,
  },
  {
    name: 'mobile_cover.png',
    what: '모바일 커버 이미지',
    w: a.mobile_cover.width,
    h: a.mobile_cover.height,
    svg: (w, h) => `
  <rect width="${w}" height="${h}" fill="${b.primary}"/>
  <rect x="0" y="${h * 0.55}" width="${w}" height="${h * 0.45}" fill="${b.bg}"/>
  <!-- 초록 배경 위에 초록 새싹은 묻힙니다. 크림색 원을 깔아 대비를 만듭니다. -->
  <circle cx="${w / 2}" cy="${h * 0.3}" r="86" fill="#FFFDE7"/>
  ${logoMark(b, { x: w / 2 - 58, y: h * 0.3 - 58, size: 116, withPlate: false })}
  <text x="${w / 2}" y="${h * 0.72}" text-anchor="middle" font-family="${b.font_family}"
        font-size="54" font-weight="bold" fill="${b.text}">다시봄라이프</text>
  <text x="${w / 2}" y="${h * 0.86}" text-anchor="middle" font-family="${b.font_family}"
        font-size="27" fill="${b.primary}">${esc(a.tagline)}</text>`,
  },
];

console.log(`브랜드: ${b.primary} (앱 theme_color) / 배경 ${b.bg} / 글자 ${b.text}\n`);

for (const asset of assets) {
  const svg = `<svg width="${asset.w}" height="${asset.h}" xmlns="http://www.w3.org/2000/svg">${asset.svg(asset.w, asset.h)}
</svg>`;
  const file = path.join(outDir, asset.name);
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log(`  ${asset.name.padEnd(18)} ${asset.w}x${asset.h}  ${asset.what}`);
}

console.log(`\n저장 위치: ${outDir}`);
console.log('\n네이버 블로그 관리 화면에서 직접 업로드해야 합니다. 순서는 SETUP_NAVER.md 를 보세요.');
console.log('관리 화면에 표시되는 권장 크기가 다르면 config.json 의 blog_assets 를 고치고 다시 실행하세요.');
