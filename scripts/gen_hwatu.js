/* ════════ 화투 스프라이트 생성기 — 자체 제작(저작권 우리 것) ════════
   기존 핀터레스트 출처 이미지를 대체(release_blockers #6).
   레이아웃은 게임(matgo.html cardStyle)과 동일: 4열×12행, 1월이 맨 위,
   열 = MONTH_DEF 순서(광/열끗 → 띠/특수 → 피 → 피). 카드 186×290, 시트 744×3480.

   스타일 원칙(시니어 인지 최우선):
   - 전통 화투의 '구도와 색'을 지키되 극단순 평면 벡터(어르신은 구도·색으로 인지)
   - 큰 월 숫자(우상단 원) + 광 배지(좌하단) = 기존 덱의 장점 계승
   - 홍단='홍단' 글자, 청단='청단' 글자, 초단·비단=글자 없는 빨간 띠(전통 그대로)
   - 쌍피엔 금색 '쌍피' 칩(시니어 명시성)

   실행: node scripts/gen_hwatu.js  →  img/hwatu/allcard.png + back.png 덮어씀
   ══════════════════════════════════════════════════════════════ */
const sharp = require('sharp');
const path = require('path');
const OUT = path.join(__dirname, '..', 'img', 'hwatu');

const W = 186, H = 290, S = 2; // 2배 렌더 후 축소(선명)

/* ── 팔레트 ── */
const P = {
  bg: '#F5EFDF', frame: '#5A0E0E', ink: '#221C16',
  red: '#C8102E', deepRed: '#9C1220', pink: '#F2A7BC',
  green: '#2E6B3E', leaf: '#3E7D4A', blue: '#1C4E9C',
  gold: '#E2AE3C', brown: '#8B5A2B', sky: '#B94A4A',
  grey: '#D8D3C6', white: '#FBF8F0'
};

/* ── 공용 부품 ── */
const numCircle = (m) =>
  `<circle cx='158' cy='30' r='22' fill='${P.white}' stroke='${P.ink}' stroke-width='2.5'/>` +
  `<text x='158' y='42' font-family='Malgun Gothic' font-size='34' font-weight='800' fill='${P.ink}' text-anchor='middle'>${m}</text>`;

const kwangBadge = () =>
  `<g transform='translate(30,252)'>` +
  `<circle r='24' fill='${P.deepRed}'/>` +
  Array.from({ length: 12 }, (_, i) => `<rect x='-3' y='-30' width='6' height='9' rx='2' fill='${P.deepRed}' transform='rotate(${i * 30})'/>`).join('') +
  `<text y='11' font-family='Malgun Gothic' font-size='27' font-weight='800' fill='#fff' text-anchor='middle'>광</text></g>`;

const ssangChip = () =>
  `<g transform='translate(128,246)'><rect width='50' height='30' rx='8' fill='${P.gold}' stroke='#9C7A22' stroke-width='2'/>` +
  `<text x='25' y='22' font-family='Malgun Gothic' font-size='17' font-weight='800' fill='#3A2A08' text-anchor='middle'>쌍피</text></g>`;

// 띠: 대각 리본. kind = hong(글자) | chung(파랑+글자) | plain(글자없는 빨강 = 초단·비단)
// 글자는 전통대로 세로쓰기(위→아래), 글자 자체는 똑바로 — 회전시키면 깨져 보임
function ribbon(kind) {
  const fill = kind === 'chung' ? P.blue : P.red;
  const label = kind === 'hong' ? '홍단' : kind === 'chung' ? '청단' : '';
  let t = '';
  if (label) t =
    `<text x='17' y='68' font-family='Malgun Gothic' font-size='25' font-weight='800' fill='#fff' text-anchor='middle'>${label[0]}</text>` +
    `<text x='19' y='112' font-family='Malgun Gothic' font-size='25' font-weight='800' fill='#fff' text-anchor='middle'>${label[1]}</text>`;
  return `<g transform='translate(58,66) rotate(12)'>` +
    `<path d='M0 0 Q12 -9 26 0 L34 148 Q18 159 2 150 Z' fill='${fill}' stroke='${P.ink}' stroke-width='2'/>${t}</g>`;
}

const flower = (cx, cy, r, col, core, n = 5) =>
  `<g transform='translate(${cx},${cy})'>` +
  Array.from({ length: n }, (_, i) => `<ellipse cx='0' cy='${-r}' rx='${r * 0.62}' ry='${r}' fill='${col}' transform='rotate(${i * (360 / n)})'/>`).join('') +
  `<circle r='${r * 0.5}' fill='${core}'/></g>`;

const bird = (x, y, s, body, belly) =>
  `<g transform='translate(${x},${y}) scale(${s})'>` +
  `<ellipse cx='0' cy='0' rx='26' ry='16' fill='${body}'/>` +
  `<circle cx='22' cy='-10' r='11' fill='${body}'/>` +
  `<path d='M30 -12 l12 3 -12 4z' fill='${P.gold}'/>` +
  `<path d='M-8 -4 q-12 -14 -26 -10 q10 12 18 14z' fill='${body}'/>` +
  (belly ? `<ellipse cx='4' cy='6' rx='16' ry='8' fill='${belly}'/>` : '') +
  `<circle cx='24' cy='-12' r='2.4' fill='${P.white}'/>` +
  `<path d='M-24 2 l-12 8 M-24 6 l-10 12' stroke='${body}' stroke-width='4' stroke-linecap='round'/></g>`;

const pineNeedle = (x, y, s, rot = 0) =>
  `<g transform='translate(${x},${y}) rotate(${rot}) scale(${s})'>` +
  Array.from({ length: 9 }, (_, i) => `<line x1='0' y1='0' x2='${Math.cos((i / 8) * Math.PI) * 30}' y2='${-Math.sin((i / 8) * Math.PI) * 30}' stroke='${P.green}' stroke-width='4' stroke-linecap='round'/>`).join('') +
  `</g>`;

/* ── 월별 장면 ──
   각 함수는 (variant) → svg 내부. variant: 0=특수(광/열끗), 'pi1'|'pi2'=피 */

// 1월 송학 — 광: 해+학+소나무 / 피: 소나무
function m1(v) {
  const pine = `<path d='M-10 292 L60 200 L130 292 Z' fill='${P.ink}'/>` +
    pineNeedle(34, 208, 1.2, -15) + pineNeedle(92, 196, 1.3, 10) + pineNeedle(140, 224, 1.1, 25);
  if (v === 0) return `<rect width='186' height='290' fill='${P.sky}'/>` +
    `<circle cx='56' cy='78' r='38' fill='${P.red}' stroke='${P.deepRed}' stroke-width='3'/>` +
    // 학: 몸통 크게 + S자 목 + 붉은 정수리(단정학) — 인식 핵심은 흰 몸/긴 목/검은 꼬리
    `<g transform='translate(100,142)'>` +
    `<ellipse rx='36' ry='22' fill='${P.white}' stroke='${P.ink}' stroke-width='2.5'/>` +
    `<path d='M-30 8 q-20 0 -30 16 q18 6 34 -4z' fill='${P.ink}'/>` +
    `<path d='M28 -8 Q46 -18 44 -44' stroke='${P.white}' stroke-width='11' fill='none' stroke-linecap='round'/>` +
    `<path d='M28 -8 Q46 -18 44 -44' stroke='${P.ink}' stroke-width='2' fill='none' opacity='.25'/>` +
    `<circle cx='44' cy='-48' r='11' fill='${P.white}' stroke='${P.ink}' stroke-width='2.5'/>` +
    `<path d='M40 -58 q4 -7 10 -2 z' fill='${P.red}'/>` +
    `<path d='M54 -50 l16 5 -16 6z' fill='${P.gold}'/>` +
    `<circle cx='47' cy='-50' r='2.4' fill='${P.ink}'/>` +
    `<line x1='-6' y1='20' x2='-8' y2='52' stroke='${P.ink}' stroke-width='4'/>` +
    `<line x1='10' y1='20' x2='12' y2='52' stroke='${P.ink}' stroke-width='4'/></g>` + pine + kwangBadge();
  return pineNeedle(48, 92, 1.5, v === 'pi1' ? -10 : 170) + pineNeedle(120, 150, 1.4, v === 'pi1' ? 20 : 200) +
    `<path d='M20 290 L70 180 L120 290 Z' fill='${P.ink}'/>` + pineNeedle(70, 190, 1.2, 0);
}

// 2월 매조 — 열끗: 꾀꼬리+매화 / 피: 매화
function m2(v) {
  const branch = `<path d='M-8 250 Q70 190 180 60' stroke='${P.ink}' stroke-width='9' fill='none' stroke-linecap='round'/>`;
  const blooms = (n, seed) => Array.from({ length: n }, (_, i) => {
    const t = (i + seed) / (n + 1); const x = -8 + 188 * t + ((i * 37) % 3 - 1) * 14; const y = 250 - 190 * t + ((i * 53) % 30) - 14;
    return flower(x, y, 12, P.red, P.gold);
  }).join('');
  if (v === 0) return branch + blooms(5, 0.4) + bird(88, 128, 1.15, '#C8A322', P.white);
  return branch + blooms(v === 'pi1' ? 7 : 6, v === 'pi1' ? 0.15 : 0.55);
}

// 3월 벚꽃 — 광: 만막(장막)+벚꽃 / 피: 벚꽃
function m3(v) {
  const sakura = (n, seed) => Array.from({ length: n }, (_, i) => {
    const x = ((i * 61 + seed * 97) % 168) + 10, y = ((i * 89 + seed * 41) % 150) + 16;
    return flower(x, y, 11, P.pink, P.white);
  }).join('');
  if (v === 0) return sakura(9, 1) +
    `<path d='M-4 190 Q93 160 190 190 L190 292 L-4 292 Z' fill='#7A3B8F'/>` +
    `<path d='M-4 190 Q93 160 190 190' stroke='${P.gold}' stroke-width='6' fill='none'/>` +
    Array.from({ length: 5 }, (_, i) => `<line x1='${18 + i * 38}' y1='${196 - Math.sin((i + 0.5) / 5 * Math.PI) * 16}' x2='${18 + i * 38}' y2='292' stroke='#5B2A6B' stroke-width='7'/>`).join('') +
    kwangBadge();
  return sakura(v === 'pi1' ? 10 : 8, v === 'pi1' ? 2 : 5) +
    `<path d='M-6 260 Q90 230 192 258' stroke='${P.ink}' stroke-width='7' fill='none'/>`;
}

// 4월 흑싸리 — 열끗: 두견새 / 피: 흑싸리(검은 줄기)
function m4(v) {
  const fronds = (flip) => Array.from({ length: 4 }, (_, i) =>
    `<g transform='translate(${26 + i * 42},${flip ? 286 : 4}) ${flip ? 'scale(1,-1)' : ''}'>` +
    `<path d='M0 0 Q6 60 -4 118' stroke='${P.ink}' stroke-width='6' fill='none'/>` +
    Array.from({ length: 5 }, (_, j) => `<ellipse cx='${2 - j}' cy='${20 + j * 20}' rx='9' ry='16' fill='${P.ink}' transform='rotate(${j % 2 ? 24 : -24} ${2 - j} ${20 + j * 20})'/>`).join('') +
    `</g>`).join('');
  if (v === 0) return fronds(false) + `<circle cx='138' cy='196' r='30' fill='${P.gold}' opacity='.9'/>` + bird(96, 200, 1.1, P.ink, P.white);
  return fronds(v === 'pi2');
}

// 5월 난초(창포) — 열끗: 수로(다리) / 피: 창포
function m5(v) {
  const iris = (x, y, s) => `<g transform='translate(${x},${y}) scale(${s})'>` +
    `<path d='M0 0 q-18 -34 -2 -58 q16 24 2 58z' fill='${P.blue}'/>` +
    `<path d='M0 -8 q-26 -8 -36 -32 q26 -2 36 18z' fill='#3B6BC2'/>` +
    `<path d='M0 -8 q26 -8 36 -32 q-26 -2 -36 18z' fill='#3B6BC2'/>` +
    `<circle cx='0' cy='-12' r='6' fill='${P.gold}'/>` +
    `<line x1='0' y1='0' x2='0' y2='78' stroke='${P.leaf}' stroke-width='7'/>` +
    `<path d='M0 34 q-20 8 -28 46 M0 38 q18 10 24 44' stroke='${P.leaf}' stroke-width='6' fill='none'/></g>`;
  if (v === 0) return iris(52, 92, 1.05) + iris(142, 80, .8) +
    // 수로(야츠하시 다리) — 꺾인 널판 두 장, 두껍고 명확하게
    `<path d='M-10 208 L84 192 L90 226 L-10 244 Z' fill='${P.gold}' stroke='${P.ink}' stroke-width='3'/>` +
    `<path d='M80 200 L196 214 L196 252 L86 236 Z' fill='#CE9A2C' stroke='${P.ink}' stroke-width='3'/>` +
    `<line x1='16' y1='214' x2='16' y2='240' stroke='#9C7A22' stroke-width='4'/>` +
    `<line x1='128' y1='222' x2='128' y2='246' stroke='#9C7A22' stroke-width='4'/>`;
  return iris(56, 104, 1.1) + iris(136, 148, .95) + (v === 'pi1' ? iris(96, 226, .75) : '');
}

// 6월 모란 — 열끗: 나비 / 피: 모란
function m6(v) {
  const peony = (x, y, s) => `<g transform='translate(${x},${y}) scale(${s})'>` +
    flower(0, 0, 30, P.red, P.deepRed, 6) +   // 큰 겹꽃(바깥)
    flower(0, 0, 18, '#E5495F', P.gold, 5) +  // 안쪽 겹
    `<path d='M-30 22 q-16 18 -8 34 M30 22 q16 18 8 34' stroke='${P.leaf}' stroke-width='6' fill='none'/></g>`;
  if (v === 0) return peony(66, 190, 1.1) +
    `<g transform='translate(118,92) rotate(-14)'>` +
    `<ellipse cx='-16' cy='0' rx='20' ry='26' fill='${P.gold}' stroke='${P.ink}' stroke-width='2'/>` +
    `<ellipse cx='16' cy='0' rx='20' ry='26' fill='${P.gold}' stroke='${P.ink}' stroke-width='2'/>` +
    `<ellipse cx='-12' cy='24' rx='13' ry='16' fill='#CE9A2C'/>` +
    `<ellipse cx='12' cy='24' rx='13' ry='16' fill='#CE9A2C'/>` +
    `<rect x='-3' y='-20' width='6' height='46' rx='3' fill='${P.ink}'/>` +
    `<path d='M-2 -20 q-8 -12 -14 -14 M2 -20 q8 -12 14 -14' stroke='${P.ink}' stroke-width='3' fill='none'/></g>`;
  return peony(60, 120, 1) + peony(128, 220, .85);
}

// 7월 홍싸리 — 열끗: 멧돼지 / 피: 싸리
function m7(v) {
  const bush = (x, flip) => `<g transform='translate(${x},290) scale(${flip ? -1 : 1},1)'>` +
    `<path d='M0 0 Q18 -90 6 -150' stroke='#7A4A22' stroke-width='7' fill='none'/>` +
    Array.from({ length: 6 }, (_, j) => `<ellipse cx='${10 + (j % 2) * 8}' cy='${-34 - j * 20}' rx='10' ry='7' fill='${j % 2 ? P.red : '#A0522D'}'/>`).join('') + `</g>`;
  if (v === 0) return bush(30, false) + bush(166, true) +
    `<g transform='translate(94,176)'>` +
    `<ellipse rx='52' ry='32' fill='${P.brown}'/>` +
    `<circle cx='-46' cy='-10' r='20' fill='${P.brown}'/>` +
    `<path d='M-64 -6 l-10 6 10 7z' fill='#5E3A18'/>` +
    `<circle cx='-50' cy='-16' r='3' fill='${P.ink}'/>` +
    `<path d='M-40 -26 l8 -12 6 12z' fill='#5E3A18'/>` +
    `<rect x='-34' y='26' width='9' height='18' fill='#5E3A18'/><rect x='16' y='26' width='9' height='18' fill='#5E3A18'/>` +
    `<path d='M50 -4 q12 -8 8 -18' stroke='#5E3A18' stroke-width='4' fill='none'/></g>`;
  return bush(36, false) + bush(96, false) + bush(160, true);
}

// 8월 공산 — 광: 보름달+능선 / 열끗: 기러기 / 피: 억새
function m8(v) {
  const hill = `<path d='M-6 240 Q60 196 100 224 Q150 250 192 226 L192 292 L-6 292 Z' fill='${P.ink}'/>`;
  if (v === 0) return `<rect width='186' height='290' fill='${P.sky}'/>` +
    `<circle cx='93' cy='120' r='58' fill='${P.white}'/>` + hill + kwangBadge();
  if (v === 1) return `<rect width='186' height='290' fill='${P.grey}'/>` + hill +
    bird(60, 90, .7, P.ink, '') + bird(110, 120, .8, P.ink, '') + bird(146, 74, .6, P.ink, '');
  // 억새: 능선 위로 길게 솟은 이삭(능선보다 먼저 그려도 위로 충분히 나오게)
  const grass = Array.from({ length: 7 }, (_, i) => {
    const x = 18 + i * 25, lean = i % 2 ? 14 : -10;
    return `<path d='M${x} 260 q6 -70 ${lean} -140' stroke='${v === 'pi1' ? P.ink : '#6B6357'}' stroke-width='5' fill='none' stroke-linecap='round'/>` +
      `<ellipse cx='${x + lean}' cy='${118 + (i % 3) * 10}' rx='7' ry='20' fill='${v === 'pi1' ? P.ink : '#8A8272'}' transform='rotate(${lean} ${x + lean} ${118 + (i % 3) * 10})'/>`;
  }).join('');
  return grass + hill;
}

// 9월 국화 — 열끗: 국진(술잔) / 피: 국화
function m9(v) {
  const mums = (n, seed) => Array.from({ length: n }, (_, i) => {
    const x = ((i * 67 + seed * 43) % 150) + 20, y = ((i * 97 + seed * 71) % 180) + 30;
    return flower(x, y, 15, i % 2 ? P.red : P.gold, P.white, 8);
  }).join('');
  if (v === 0) return mums(3, 2) +
    `<g transform='translate(93,196)'>` +
    `<path d='M-52 -20 L52 -20 L40 34 Q0 48 -40 34 Z' fill='${P.red}' stroke='${P.deepRed}' stroke-width='3'/>` +
    `<ellipse cx='0' cy='-20' rx='52' ry='12' fill='#E5495F' stroke='${P.deepRed}' stroke-width='3'/>` +
    `<circle cx='0' cy='12' r='17' fill='${P.white}'/>` +
    `<text x='0' y='21' font-family='Malgun Gothic' font-size='22' font-weight='800' fill='${P.deepRed}' text-anchor='middle'>수</text></g>`;
  return mums(v === 'pi1' ? 5 : 4, v === 'pi1' ? 0 : 7) +
    `<path d='M20 290 Q60 240 40 200 M100 290 Q120 250 110 214 M160 290 Q170 250 150 216' stroke='${P.leaf}' stroke-width='5' fill='none'/>`;
}

// 10월 단풍 — 열끗: 사슴 / 피: 단풍
function m10(v) {
  const maple = (x, y, s, col) => `<g transform='translate(${x},${y}) scale(${s})'>` +
    Array.from({ length: 7 }, (_, i) => `<ellipse cx='0' cy='-14' rx='5' ry='15' fill='${col}' transform='rotate(${i * 51 - 154})'/>`).join('') +
    `<circle r='5' fill='${col}'/></g>`;
  const leaves = (n, seed) => Array.from({ length: n }, (_, i) =>
    maple(((i * 71 + seed * 37) % 150) + 20, ((i * 103 + seed * 59) % 210) + 30, .9 + (i % 3) * .2, i % 2 ? P.red : '#E06A1F')).join('');
  if (v === 0) return leaves(3, 3) +
    `<g transform='translate(96,190)'>` +
    `<ellipse rx='42' ry='26' fill='${P.brown}'/>` +
    `<path d='M34 -12 q16 -22 8 -44 q-4 24 -18 32z' fill='${P.brown}'/>` +
    `<circle cx='44' cy='-40' r='13' fill='${P.brown}'/>` +
    `<path d='M50 -50 l4 -18 M56 -48 l12 -14 M52 -49 l-2 -20' stroke='#5E3A18' stroke-width='4' stroke-linecap='round'/>` +
    `<circle cx='48' cy='-44' r='2.6' fill='${P.ink}'/>` +
    `<rect x='-30' y='20' width='8' height='26' fill='#5E3A18'/><rect x='20' y='20' width='8' height='26' fill='#5E3A18'/></g>`;
  return leaves(v === 'pi1' ? 6 : 5, v === 'pi1' ? 0 : 8);
}

// 11월 오동 — 광: 봉황 / 쌍피·피: 오동잎(하트꼴)
function m11(v) {
  const leaf = (x, y, s) => `<g transform='translate(${x},${y}) scale(${s})'>` +
    `<path d='M0 26 C-30 4 -26 -22 0 -10 C26 -22 30 4 0 26 Z' fill='${P.ink}'/>` +
    `<circle cx='0' cy='-20' r='4' fill='${P.blue}'/><circle cx='-10' cy='-26' r='4' fill='${P.blue}'/><circle cx='10' cy='-26' r='4' fill='${P.blue}'/></g>`;
  if (v === 0) return leaf(150, 250, .9) +
    // 전통 오동광 문법: 봉황 '머리 클로즈업'(노란 머리+긴 목, 뒤로 흐르는 붉은 볏, 강한 부리)
    `<g transform='translate(80,128)'>` +
    `<path d='M-48 120 Q-58 30 -8 -6 Q-30 60 -18 120z' fill='${P.gold}' stroke='#9C7A22' stroke-width='3'/>` + // 목
    `<circle cx='8' cy='-24' r='34' fill='${P.gold}' stroke='#9C7A22' stroke-width='3'/>` + // 머리
    `<path d='M-8 -52 Q-30 -78 -60 -74 Q-36 -58 -30 -44z' fill='${P.red}'/>` + // 볏1
    `<path d='M2 -58 Q-8 -92 -40 -98 Q-16 -74 -12 -56z' fill='#E5495F'/>` + // 볏2
    `<path d='M14 -58 Q18 -94 -6 -112 Q12 -84 6 -58z' fill='${P.red}'/>` + // 볏3
    `<path d='M38 -34 L74 -22 L38 -8 Q46 -22 38 -34z' fill='#CE5A1F' stroke='#9C4A12' stroke-width='2'/>` + // 부리
    `<circle cx='18' cy='-30' r='5.5' fill='${P.ink}'/><circle cx='20' cy='-32' r='2' fill='#fff'/>` +
    `<path d='M-14 4 Q10 10 22 2 M-18 22 Q8 30 24 20' stroke='#9C7A22' stroke-width='4' fill='none'/></g>` + // 깃 결
    kwangBadge();
  if (v === 1) return leaf(50, 90, 1.3) + leaf(130, 160, 1.5) + leaf(60, 236, 1.2) + ssangChip();
  return leaf(56, 110, 1.3) + leaf(134, 200, 1.3) + (v === 'pi1' ? leaf(60, 240, 1) : '');
}

// 12월 비 — 광: 비광(우산 쓴 사람) / 열끗: 제비 / 띠: 비단(무지) / 쌍피: 번개
function m12(v) {
  const rain = Array.from({ length: 7 }, (_, i) =>
    `<line x1='${16 + i * 26}' y1='${-8 + (i % 3) * 8}' x2='${8 + i * 26}' y2='${30 + (i % 3) * 8}' stroke='#6B84A8' stroke-width='4' stroke-linecap='round'/>`).join('');
  if (v === 0) return `<rect width='186' height='290' fill='#CFD6CE'/>` + rain +
    `<path d='M10 64 Q50 8 96 10 Q80 30 84 44' stroke='${P.leaf}' stroke-width='6' fill='none'/>` +
    `<path d='M40 80 q30 -10 60 0 M50 110 q26 -8 50 0' stroke='${P.leaf}' stroke-width='5' fill='none'/>` +
    `<g transform='translate(96,170)'>` +
    `<path d='M-52 -34 Q0 -84 52 -34 Z' fill='${P.red}' stroke='${P.deepRed}' stroke-width='3'/>` +
    `<line x1='0' y1='-72' x2='0' y2='-34' stroke='${P.ink}' stroke-width='4'/>` +
    `<circle cx='0' cy='-16' r='15' fill='#F2D8B8'/>` +
    `<path d='M-24 60 Q-26 6 0 2 Q26 6 24 60 Q0 74 -24 60z' fill='${P.blue}'/>` +
    `<line x1='0' y1='-46' x2='26' y2='58' stroke='${P.ink}' stroke-width='5'/>` +
    `<path d='M-30 78 l16 -8 M14 72 l18 6' stroke='${P.ink}' stroke-width='5' stroke-linecap='round'/></g>` +
    `<g transform='translate(146,258)'><ellipse rx='16' ry='11' fill='${P.leaf}'/><circle cx='12' cy='-9' r='7' fill='${P.leaf}'/><circle cx='14' cy='-11' r='2' fill='${P.ink}'/></g>` +
    kwangBadge();
  if (v === 1) return `<rect width='186' height='290' fill='${P.grey}'/>` + rain +
    `<path d='M-6 250 q96 -30 198 0 L192 292 L-6 292z' fill='${P.leaf}' opacity='.7'/>` +
    bird(93, 150, 1.3, '#20324E', P.white);
  if (v === 2) return `<rect width='186' height='290' fill='#CFD6CE'/>` + rain + ribbon('plain');
  return `<rect width='186' height='290' fill='${P.ink}'/>` +
    `<path d='M96 -6 L54 130 L96 122 L64 296 L140 110 L100 122 L138 -6 Z' fill='${P.gold}' stroke='#9C7A22' stroke-width='3'/>` + ssangChip();
}

const SCENES = { 1: m1, 2: m2, 3: m3, 4: m4, 5: m5, 6: m6, 7: m7, 8: m8, 9: m9, 10: m10, 11: m11, 12: m12 };
// 띠 종류(월별): matgo MONTH_DEF와 일치
const TTI = { 1: 'hong', 2: 'hong', 3: 'hong', 4: 'plain', 5: 'plain', 6: 'chung', 7: 'plain', 9: 'chung', 10: 'chung' };

function cardSVG(month, col) {
  const def = {
    1: ['S', 'T', 'p1', 'p2'], 2: ['S', 'T', 'p1', 'p2'], 3: ['S', 'T', 'p1', 'p2'],
    4: ['S', 'T', 'p1', 'p2'], 5: ['S', 'T', 'p1', 'p2'], 6: ['S', 'T', 'p1', 'p2'],
    7: ['S', 'T', 'p1', 'p2'], 8: ['S', 'S2', 'p1', 'p2'], 9: ['S', 'T', 'p1', 'p2'],
    10: ['S', 'T', 'p1', 'p2'], 11: ['S', 'SS', 'p1', 'p2'], 12: ['S', 'S2', 'T', 'SS']
  }[month][col];

  let inner = '';
  const scene = SCENES[month];
  if (def === 'S') inner = scene(0);
  else if (def === 'S2') inner = scene(1);
  else if (def === 'T') inner = (month === 12 ? scene(2) : scene('pi1') + ribbon(TTI[month]));
  else if (def === 'SS') inner = (month === 12 ? scene(3) : scene(1));
  else inner = scene(def === 'p1' ? 'pi1' : 'pi2');

  return `<svg xmlns='http://www.w3.org/2000/svg' width='${W * S}' height='${H * S}' viewBox='0 0 ${W} ${H}'>
<defs><clipPath id='c'><rect width='${W}' height='${H}' rx='8'/></clipPath></defs>
<rect width='${W}' height='${H}' rx='8' fill='${P.frame}'/>
<g clip-path='url(#c)'><g transform='translate(5,5) scale(${(W - 10) / W},${(H - 10) / H})'>
<rect width='${W}' height='${H}' rx='5' fill='${P.bg}'/>${inner}</g></g>
${numCircle(month)}
</svg>`;
}

function backSVG() {
  let deco = '';
  for (let i = 0; i < 12; i++) deco += `<rect x='-30' y='${i * 30}' width='250' height='2' fill='#7A1620' transform='rotate(-18 93 145)'/>`;
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${W * S}' height='${H * S}' viewBox='0 0 ${W} ${H}'>
<defs><clipPath id='c'><rect width='${W}' height='${H}' rx='8'/></clipPath></defs>
<g clip-path='url(#c)'><rect width='${W}' height='${H}' fill='#8B0D1E'/>${deco}
<circle cx='93' cy='145' r='40' fill='none' stroke='${P.gold}' stroke-width='3'/>
<text x='93' y='158' font-family='Malgun Gothic' font-size='32' font-weight='800' fill='${P.gold}' text-anchor='middle'>봄</text></g>
<rect x='1.5' y='1.5' width='${W - 3}' height='${H - 3}' rx='7' fill='none' stroke='#4A0A12' stroke-width='3'/></svg>`;
}

(async () => {
  const cards = [];
  for (let m = 1; m <= 12; m++) for (let c = 0; c < 4; c++) {
    cards.push(await sharp(Buffer.from(cardSVG(m, c))).resize(W, H).png().toBuffer());
  }
  await sharp({ create: { width: W * 4, height: H * 12, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(cards.map((b, i) => ({ input: b, left: (i % 4) * W, top: Math.floor(i / 4) * H })))
    .png().toFile(path.join(OUT, 'allcard.png'));
  await sharp(Buffer.from(backSVG())).resize(W, H).png().toFile(path.join(OUT, 'back.png'));
  console.log('생성 완료: allcard.png(' + (W * 4) + 'x' + (H * 12) + ') + back.png');
})().catch((e) => { console.error('실패:', e.message); process.exit(1); });
