/**
 * 브랜드 자산 — 앱 로고를 블로그 이미지에 그대로 쓰기 위한 모듈.
 *
 * 로고는 `img/dasibom_flower_logo.svg`(노란 꽃 다섯 장 + 잎) 입니다.
 * 앱·파비콘·아이콘이 전부 이 꽃이므로 블로그도 같아야 합니다.
 *
 * ⚠️ 루트의 `logo.svg`(해 + 새싹)는 옛 로고입니다. 그걸 쓰면 블로그만 다른 얼굴이 됩니다.
 *    2026-08-06 에 해·새싹으로 만들어 올렸다가 Macho 지적으로 전부 다시 만들었습니다.
 */

/** 꽃 로고 색 — 원본 SVG 의 그라데이션 양 끝값입니다. */
const FLOWER = {
  petal: '#FFC531',
  petalLight: '#FFD95E',
  leaf: '#8FBF2C',
  stem: '#5C9E31',
};

let markSeq = 0;

/**
 * 다시봄 꽃 마크. 원본(img/dasibom_flower_logo.svg)은 512x512 좌표계라 배율로 줄여 씁니다.
 *
 * 원본 그대로 그라데이션을 씁니다. 단색 두 겹으로 흉내내면 꽃잎이 겹쳐 뭉개집니다.
 * 한 그림에 로고가 여러 번 들어갈 수 있어 그라데이션 id 는 부를 때마다 새로 붙입니다.
 */
export function logoMark(brand, { x = 0, y = 0, size = 44, withPlate = true } = {}) {
  const s = size / 512;
  const uid = `f${++markSeq}`;
  const petal =
    'M 0 -10 C -56 -38 -80 -100 -50 -138 C -34 -158 -14 -160 0 -148 C 14 -160 34 -158 50 -138 C 80 -100 56 -38 0 -10 Z';
  const petals = [0, 72, 144, 216, 288]
    .map((deg) => `<path transform="translate(256 232) rotate(${deg})" d="${petal}"/>`)
    .join('');

  return `<g transform="translate(${x},${y}) scale(${s})">
    <defs>
      <linearGradient id="petal_${uid}" x1="0" y1="0" x2="0.9" y2="1">
        <stop offset="0" stop-color="#FFD95E"/>
        <stop offset="0.55" stop-color="#FFC531"/>
        <stop offset="1" stop-color="#F5A800"/>
      </linearGradient>
      <linearGradient id="leaf_${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#AACD3E"/>
        <stop offset="1" stop-color="#7FAF22"/>
      </linearGradient>
    </defs>
    ${withPlate ? `<rect width="512" height="512" rx="140" fill="#FFFDF2"/>` : ''}
    <path d="M 268 296 C 258 372 226 420 172 446" stroke="${FLOWER.stem}" stroke-width="15" fill="none" stroke-linecap="round"/>
    <path d="M 266 382 C 300 344 356 338 384 356 C 370 398 306 416 266 382 Z" fill="url(#leaf_${uid})"/>
    <g transform="rotate(-9 256 232)" fill="url(#petal_${uid})" fill-opacity="0.93">${petals}</g>
  </g>`;
}

export const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** 글자 수 기준 줄바꿈. 한글은 폭이 일정해서 이 정도로 충분합니다. */
export function wrap(text, perLine) {
  const words = String(text).split(/\s+/);
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
