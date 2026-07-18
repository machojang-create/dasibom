/* ════════ 화투 뒷면 스킨 생성기 — 상점 아이템(코드 렌더, 저작권 우리 것) ════════
   패턴/무늬/동양화/금테두리 등 다양한 뒷면. 각 186×290, img/hwatu/backs/<id>.png.
   앞면(카드 얼굴)은 건드리지 않음 — Macho가 라이선스 확인된 실제 이미지로 교체.
   실행: node scripts/gen_card_backs.js
   ══════════════════════════════════════════════════════════════ */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'img', 'hwatu', 'backs');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const W = 186, H = 290, S = 3, CX = 93, CY = 145;

function wrap(inner) {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${W * S}' height='${H * S}' viewBox='0 0 ${W} ${H}'>
<defs><clipPath id='c'><rect width='${W}' height='${H}' rx='9'/></clipPath></defs>
<g clip-path='url(#c)'>${inner}</g>
<rect x='1.5' y='1.5' width='${W - 3}' height='${H - 3}' rx='7.5' fill='none' stroke='rgba(0,0,0,.35)' stroke-width='3'/></svg>`;
}
// 브랜드 메달(선택) — 가운데 '봄'. subtle
function medal(stroke, txt) {
  return `<circle cx='${CX}' cy='${CY}' r='34' fill='none' stroke='${stroke}' stroke-width='2.5' opacity='.9'/>
<circle cx='${CX}' cy='${CY}' r='40' fill='none' stroke='${stroke}' stroke-width='1' opacity='.5'/>
<text x='${CX}' y='${CY + 12}' font-family='Nanum Myeongjo, Batang, serif' font-size='34' font-weight='800' fill='${txt}' text-anchor='middle'>봄</text>`;
}

const SKINS = {};

/* 1. 금테두리 — 짙은 남색 + 이중 금테 + 모서리 문양 (프리미엄 무드) */
SKINS.gold_frame = () => {
  let corners = '';
  const cxs = [[16, 16, 0], [W - 16, 16, 90], [W - 16, H - 16, 180], [16, H - 16, 270]];
  for (const [x, y, r] of cxs) corners += `<path d='M0 22 Q0 0 22 0' fill='none' stroke='#D9B24A' stroke-width='2.5' transform='translate(${x},${y}) rotate(${r})'/>`;
  return wrap(`<rect width='${W}' height='${H}' fill='#12233F'/>
<rect x='10' y='10' width='${W - 20}' height='${H - 20}' rx='7' fill='none' stroke='#D9B24A' stroke-width='2.5'/>
<rect x='16' y='16' width='${W - 32}' height='${H - 32}' rx='5' fill='none' stroke='#8C6E24' stroke-width='1'/>
${corners}${medal('#D9B24A', '#E7C766')}`);
};

/* 2. 동양화 — 먹 산수 + 달 (수묵 담채) */
SKINS.ink_wash = () => {
  return wrap(`<rect width='${W}' height='${H}' fill='#EDE7D6'/>
<circle cx='128' cy='70' r='30' fill='#F6F1E2'/><circle cx='128' cy='70' r='30' fill='none' stroke='#C9B48A' stroke-width='1'/>
<path d='M-6 210 Q40 150 78 186 Q120 226 200 176 L200 292 L-6 292 Z' fill='#3A4750' opacity='.92'/>
<path d='M-6 244 Q60 206 120 236 Q170 262 200 232 L200 292 L-6 292 Z' fill='#20303A'/>
<path d='M20 150 q6 -40 2 -70 M20 108 q-14 6 -24 -2 M20 120 q16 6 28 -2 M20 96 q-12 4 -20 -4 M20 132 q14 4 24 -4' stroke='#2A3A32' stroke-width='2.4' fill='none' stroke-linecap='round'/>
<text x='36' y='60' font-family='Nanum Myeongjo, Batang, serif' font-size='16' fill='#7A2A22' opacity='.7'>再春</text>`);
};

/* 3. 색동 — 한국 전통 오방색 줄무늬 (경사) */
SKINS.saekdong = () => {
  const cols = ['#C8102E', '#F0A500', '#1E7A46', '#1B4F9C', '#F2EFE6', '#6B2E8A'];
  let s = '';
  for (let i = 0; i < 20; i++) s += `<rect x='${i * 12 - 40}' y='-40' width='6.5' height='380' fill='${cols[i % 6]}' opacity='.9' transform='rotate(20 ${CX} ${CY})'/>`;
  return wrap(`<rect width='${W}' height='${H}' fill='#7A0C1B'/>${s}
<circle cx='${CX}' cy='${CY}' r='42' fill='#7A0C1B' opacity='.9'/>${medal('#F0D483', '#F0D483')}`);
};

/* 4. 청화백자 — 크림 바탕 + 청화(파랑) 매화 넝쿨 */
SKINS.porcelain = () => {
  let vines = '';
  const put = (x, y, r) => flowerBlue(x, y, r);
  vines += `<path d='M20 280 Q60 200 40 130 Q26 80 70 20' stroke='#2E5AA8' stroke-width='2.4' fill='none'/>`;
  vines += `<path d='M166 280 Q120 210 150 140 Q170 90 120 24' stroke='#2E5AA8' stroke-width='2.4' fill='none'/>`;
  const pts = [[40, 130], [58, 70], [150, 140], [130, 76], [46, 200], [140, 210]];
  for (const [x, y] of pts) vines += put(x, y, 12);
  return wrap(`<rect width='${W}' height='${H}' fill='#F3EFE2'/>${vines}${medal('#2E5AA8', '#2E5AA8')}`);
  function flowerBlue(x, y, r) {
    let p = '';
    for (let i = 0; i < 5; i++) p += `<ellipse cx='0' cy='${-r}' rx='${r * 0.6}' ry='${r}' fill='#3B6BC2' opacity='.85' transform='rotate(${i * 72})'/>`;
    return `<g transform='translate(${x},${y})'>${p}<circle r='${r * 0.42}' fill='#1C4E9C'/></g>`;
  }
};

/* 5. 청해파(전통 물결 문양) — 겹겹 반원 */
SKINS.seigaiha = () => {
  const c1 = '#0E5A6B', c2 = '#177E92', c3 = '#7FC8D4', bg = '#0A3B47';
  let s = '';
  const step = 26, rMax = 22;
  for (let row = -1; row < 13; row++) {
    for (let col = -1; col < 9; col++) {
      const x = col * step + (row % 2 ? step / 2 : 0), y = row * (step * 0.62);
      for (let k = 0; k < 3; k++) {
        const r = rMax - k * 6, col3 = [c3, c2, c1][k];
        s += `<path d='M${x - r} ${y} A${r} ${r} 0 0 1 ${x + r} ${y}' fill='none' stroke='${col3}' stroke-width='2.6'/>`;
      }
    }
  }
  return wrap(`<rect width='${W}' height='${H}' fill='${bg}'/>${s}`);
};

/* 6. 매화 — 짙은 배경에 홍매 가지 (동양화, 여백의 미) */
SKINS.plum = () => {
  let blooms = '';
  const pts = [[60, 60], [96, 96], [130, 60], [150, 120], [80, 150], [120, 180], [56, 210], [150, 220]];
  for (const [x, y] of pts) {
    let p = '';
    for (let i = 0; i < 5; i++) p += `<ellipse cx='0' cy='-7' rx='4.4' ry='7' fill='#D9294A' transform='rotate(${i * 72})'/>`;
    blooms += `<g transform='translate(${x},${y})'>${p}<circle r='2.6' fill='#F0D483'/></g>`;
  }
  return wrap(`<rect width='${W}' height='${H}' fill='#1B1418'/>
<path d='M-6 286 Q50 200 40 120 Q34 70 96 20 M40 120 Q90 110 150 70 M40 160 Q100 170 168 210' stroke='#EDE7D6' stroke-width='3' fill='none' stroke-linecap='round' opacity='.9'/>
${blooms}${medal('rgba(240,212,131,.8)', '#F0D483')}`);
};

/* 7. 전통 격자 문양 — 완자(卍) 연속 무늬(기하) */
SKINS.lattice = () => {
  const bg = '#5A0E1A', line = '#D9B24A';
  let s = '';
  const g = 30;
  for (let y = -g; y < H + g; y += g) for (let x = -g; x < W + g; x += g) {
    s += `<path d='M${x} ${y + g / 2} h${g / 2} v${g / 2} M${x + g / 2} ${y} v${g / 2} h${g / 2}' fill='none' stroke='${line}' stroke-width='2' opacity='.55'/>`;
  }
  return wrap(`<rect width='${W}' height='${H}' fill='${bg}'/>${s}
<rect x='12' y='12' width='${W - 24}' height='${H - 24}' rx='5' fill='none' stroke='${line}' stroke-width='2' opacity='.8'/>${medal(line, '#E7C766')}`);
};

/* 8. 나전(자개) 느낌 — 흑칠 + 무지개빛 조각 */
SKINS.najeon = () => {
  let flecks = '';
  const cols = ['#7FD0C4', '#C9A0E0', '#8FB6E8', '#EAD98A', '#E39AB8'];
  for (let i = 0; i < 60; i++) {
    const x = (i * 53) % (W - 20) + 10, y = (i * 97) % (H - 20) + 10, r = 2 + (i % 4);
    flecks += `<path d='M0 -${r} L${r * .7} 0 L0 ${r} L-${r * .7} 0 Z' fill='${cols[i % 5]}' opacity='.75' transform='translate(${x},${y}) rotate(${i * 33})'/>`;
  }
  // 자개 꽃 하나
  let petal = '';
  for (let i = 0; i < 6; i++) petal += `<ellipse cx='0' cy='-20' rx='9' ry='20' fill='#9FE0D6' opacity='.5' transform='rotate(${i * 60})'/>`;
  return wrap(`<rect width='${W}' height='${H}' fill='#141018'/>${flecks}
<g transform='translate(${CX},${CY})'>${petal}<circle r='9' fill='#EAD98A' opacity='.6'/></g>`);
};

/* 9. 단색 프리미엄 — 짙은 먹빛 + 엠보싱 링(무지·고급) */
SKINS.noir = () => {
  return wrap(`<rect width='${W}' height='${H}' fill='#20242B'/>
<circle cx='${CX}' cy='${CY}' r='58' fill='none' stroke='#2C313A' stroke-width='10'/>
<circle cx='${CX}' cy='${CY}' r='58' fill='none' stroke='#0E1116' stroke-width='2'/>
<rect x='14' y='14' width='${W - 28}' height='${H - 28}' rx='6' fill='none' stroke='#2C313A' stroke-width='2'/>${medal('#4A515C', '#8A93A0')}`);
};

/* 10. 봄 벚꽃 — 브랜드 결(핑크 벚꽃, 밝음) */
SKINS.spring = () => {
  let s = '';
  for (let i = 0; i < 30; i++) {
    const x = (i * 61) % (W - 16) + 8, y = (i * 89) % (H - 16) + 8, r = 4 + (i % 3);
    let p = '';
    for (let k = 0; k < 5; k++) p += `<ellipse cx='0' cy='${-r}' rx='${r * .6}' ry='${r}' fill='#F5B8CA' opacity='.7' transform='rotate(${k * 72})'/>`;
    s += `<g transform='translate(${x},${y})'>${p}</g>`;
  }
  return wrap(`<rect width='${W}' height='${H}' fill='#B3123A'/>${s}${medal('rgba(255,255,255,.85)', '#fff')}`);
};

(async () => {
  const names = Object.keys(SKINS);
  const bufs = [];
  for (const id of names) {
    const buf = await sharp(Buffer.from(SKINS[id]())).resize(W, H).png().toBuffer();
    fs.writeFileSync(path.join(OUT, id + '.png'), buf);
    bufs.push({ id, buf });
  }
  // 대조 시트(가로 5개씩)
  const per = 5, gap = 16, cols = Math.min(per, bufs.length), rows = Math.ceil(bufs.length / per);
  const cw = W + gap, ch = H + gap + 22;
  const sheet = sharp({ create: { width: cw * cols + gap, height: ch * rows + gap, channels: 4, background: '#EFEAE0' } });
  const comps = [];
  bufs.forEach((b, i) => {
    const c = i % per, r = Math.floor(i / per);
    comps.push({ input: b.buf, left: gap + c * cw, top: gap + r * ch });
    comps.push({ input: Buffer.from(`<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='20'><text x='${W / 2}' y='15' font-family='Malgun Gothic' font-size='14' font-weight='700' fill='#3A3020' text-anchor='middle'>${b.id}</text></svg>`), left: gap + c * cw, top: gap + r * ch + H + 2 });
  });
  await sheet.composite(comps).png().toFile(path.join(__dirname, '..', 'back_skins_preview.png'));
  console.log('생성 완료:', names.length + '종 →', 'img/hwatu/backs/  + 미리보기 back_skins_preview.png');
})().catch(e => { console.error('실패:', e.message); process.exit(1); });
