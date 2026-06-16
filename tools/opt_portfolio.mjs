// 포트폴리오 이미지 최적화 + 메타버스 그래픽 생성 + 미사용 파일 정리
// 원본은 Downloads/portfolio_src/public/ 에 보존되어 있으므로 in-place 덮어쓰기 안전.
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';

const DIR = 'C:/Users/USER/Desktop/이전작업/백업/memoir/portfolio';
const kb = (n) => Math.round(n / 1024) + 'KB';

// ── 1) 게임 스크린샷 7장: 1280px 리사이즈 + 팔레트 PNG(화질 유지, 대폭 감량) ──
const games = [
  '카오스배틀히어로.png', '다함께삼국지.png', '서유기전.png',
  '귀혼.png', '킹오브파이터올스타.png', '좀비.png',
];
let beforeSum = 0, afterSum = 0;
for (const f of games) {
  const p = join(DIR, f);
  const before = statSync(p).size;
  const buf = await sharp(p)
    .resize({ width: 1280, withoutEnlargement: true })
    .png({ quality: 84, compressionLevel: 9, effort: 9, palette: true, dither: 0.6 })
    .toBuffer();
  writeFileSync(p, buf);
  beforeSum += before; afterSum += buf.length;
  console.log('  game ', f.padEnd(22), kb(before), '->', kb(buf.length));
}

// ── 2) 프로필 사진: 인물 사진이라 24bit 무손실 유지(1000px 리사이즈만) ──
{
  const f = '프로필사진.png';
  const p = join(DIR, f);
  const before = statSync(p).size;
  const buf = await sharp(p)
    .resize({ width: 1000, withoutEnlargement: true })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();
  writeFileSync(p, buf);
  beforeSum += before; afterSum += buf.length;
  console.log('  photo', f.padEnd(22), kb(before), '->', kb(buf.length));
}

// ── 3) 미사용 파일 정리 ──
const orphan = join(DIR, '마블앤몬스터.png');
if (existsSync(orphan)) {
  const s = statSync(orphan).size;
  unlinkSync(orphan);
  console.log('  removed 마블앤몬스터.png (' + kb(s) + ', 미사용)');
}

// ── 4) 메타버스 그래픽 생성 (스톡사진 대체, 다크+시안 테마) ──
const W = 1200, H = 800;
const VPx = 600, VPy = 360;
let verts = '';
for (let x = -360; x <= 1560; x += 84) verts += `M${x} 800 L${VPx} ${VPy} `;
let horz = '';
for (let i = 0; i < 13; i++) {
  const f = i / 13;
  const yy = VPy + (800 - VPy) * Math.pow(1 - f, 2.3);
  horz += `M0 ${yy.toFixed(1)} L1200 ${yy.toFixed(1)} `;
}
// 와이어프레임 큐브(아이소메트릭) 중심 (600,250)
const cx = 600, cy = 250, a = 120, hh = 132;
const Tt = [cx, cy - a * 0.5], Tr = [cx + a, cy], Tb = [cx, cy + a * 0.5], Tl = [cx - a, cy];
const Bt = [cx, cy - a * 0.5 + hh], Br = [cx + a, cy + hh], Bb = [cx, cy + a * 0.5 + hh], Bl = [cx - a, cy + hh];
const L = (p, q) => `M${p[0]} ${p[1]} L${q[0]} ${q[1]} `;
const cubeBack = L(Tt, Bt) + L(Bt, Br) + L(Bt, Bl); // 뒤쪽 모서리(흐리게)
const cubeFront = L(Tt, Tr) + L(Tr, Tb) + L(Tb, Tl) + L(Tl, Tt) +
  L(Tr, Br) + L(Tb, Bb) + L(Tl, Bl) + L(Br, Bb) + L(Bb, Bl);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a0a0c"/>
      <stop offset="0.55" stop-color="#0b2c3a"/>
      <stop offset="1" stop-color="#061f2a"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="34%" r="58%">
      <stop offset="0" stop-color="#00b7d7" stop-opacity="0.42"/>
      <stop offset="0.5" stop-color="#00b7d7" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#00b7d7" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#081f29" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#081f29" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g stroke="#00b7d7" stroke-opacity="0.20" stroke-width="1.4" fill="none"><path d="${verts}"/></g>
  <g stroke="#00b7d7" stroke-opacity="0.16" stroke-width="1.4" fill="none"><path d="${horz}"/></g>
  <rect x="0" y="${VPy - 8}" width="${W}" height="150" fill="url(#fade)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g fill="none" stroke="#00b7d7" stroke-linejoin="round" stroke-linecap="round">
    <path d="${cubeBack}" stroke-opacity="0.30" stroke-width="2.5"/>
    <path d="${cubeFront}" stroke-opacity="0.92" stroke-width="3.4"/>
  </g>
  <circle cx="${cx}" cy="${cy + hh * 0.5}" r="3.5" fill="#7af0ff" fill-opacity="0.9"/>
  <text x="600" y="560" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700" letter-spacing="6" fill="#eafdff" fill-opacity="0.96">METAVERSE</text>
  <text x="600" y="602" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="21" letter-spacing="9" fill="#00b7d7" fill-opacity="0.95">WEB 3D COMMERCE</text>
</svg>`;
const mv = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(join(DIR, 'metaverse.png'), mv);
console.log('  metaverse.png (생성)', kb(mv.length));

console.log('\n게임+프로필 7장: ' + kb(beforeSum) + ' -> ' + kb(afterSum) +
  '  (절감 ' + Math.round((1 - afterSum / beforeSum) * 100) + '%)');
