/**
 * 브랜드 자산 — 앱의 logo.svg 를 블로그 이미지에 그대로 쓰기 위한 모듈.
 *
 * 색과 모양은 프로젝트 루트의 logo.svg / manifest.json 에서 가져온 값입니다.
 * 앱 로고가 바뀌면 여기도 같이 바꿔야 합니다. 따로 놀면 브랜드가 두 개가 됩니다.
 */

/** 해 + 새싹 마크. 원본은 44x44 좌표계라 배율로 키워 씁니다. */
export function logoMark(brand, { x = 0, y = 0, size = 44, withPlate = true } = {}) {
  const s = size / 44;
  return `<g transform="translate(${x},${y}) scale(${s})">
    ${withPlate ? `<rect width="44" height="44" rx="12" fill="#FFFDE7"/>` : ''}
    <circle cx="22" cy="13" r="5" fill="${brand.sun}"/>
    <line x1="22" y1="5"  x2="22" y2="3"  stroke="${brand.sun}" stroke-width="2" stroke-linecap="round"/>
    <line x1="22" y1="23" x2="22" y2="21" stroke="${brand.sun}" stroke-width="2" stroke-linecap="round"/>
    <line x1="14" y1="13" x2="12" y2="13" stroke="${brand.sun}" stroke-width="2" stroke-linecap="round"/>
    <line x1="32" y1="13" x2="30" y2="13" stroke="${brand.sun}" stroke-width="2" stroke-linecap="round"/>
    <line x1="16.5" y1="7.5"  x2="15.1" y2="6.1"  stroke="${brand.sun}" stroke-width="2" stroke-linecap="round"/>
    <line x1="28.9" y1="19.9" x2="27.5" y2="18.5" stroke="${brand.sun}" stroke-width="2" stroke-linecap="round"/>
    <line x1="27.5" y1="7.5"  x2="28.9" y2="6.1"  stroke="${brand.sun}" stroke-width="2" stroke-linecap="round"/>
    <line x1="15.1" y1="19.9" x2="16.5" y2="18.5" stroke="${brand.sun}" stroke-width="2" stroke-linecap="round"/>
    <line x1="22" y1="38" x2="22" y2="26" stroke="${brand.sprout}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M22 32 C18 30 15 27 17 24 C19 21 22 26 22 28" fill="${brand.sprout}"/>
    <path d="M22 30 C26 28 29 25 27 22 C25 19 22 24 22 26" fill="${brand.sprout_light}"/>
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
