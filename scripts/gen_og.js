const sharp = require('sharp');
const W=1200,H=630, D=420, cx=930, cyTop=105; // 봄이 원 지름/좌상단
const center = cx + D/2;

// 배경 + 금색 링 + 텍스트 (Malgun Gothic 확인됨)
const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F8F4EB"/><stop offset="1" stop-color="#EDE6D6"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.72" cy="0.4" r="0.6">
      <stop offset="0" stop-color="#C9A961" stop-opacity="0.22"/><stop offset="1" stop-color="#C9A961" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <!-- 금색 링 (봄이 뒤) -->
  <circle cx="${center}" cy="${cyTop + D/2}" r="${D/2 + 12}" fill="#C9A961"/>
  <circle cx="${center}" cy="${cyTop + D/2}" r="${D/2 + 4}" fill="#F8F4EB"/>
  <!-- 왼쪽 텍스트 -->
  <text x="92" y="150" font-family="Malgun Gothic" font-size="30" font-weight="800" fill="#A88434" letter-spacing="3">다시봄 · DASIBOM LIFE</text>
  <text x="88" y="272" font-family="Malgun Gothic" font-size="78" font-weight="800" fill="#33492A">다시 오는 봄,</text>
  <text x="88" y="368" font-family="Malgun Gothic" font-size="78" font-weight="800" fill="#33492A">다시 보는 인생</text>
  <rect x="94" y="410" width="64" height="6" rx="3" fill="#C9A961"/>
  <text x="92" y="470" font-family="Malgun Gothic" font-size="34" font-weight="700" fill="#5C6152">어르신을 위한 따뜻한 이야기 공간</text>
  <text x="92" y="522" font-family="Malgun Gothic" font-size="29" fill="#7A8270">봄이와 매일 도란도란, 인생이 한 권의 책이 되는 곳</text>
</svg>`;

(async () => {
  // 봄이 얼굴 원형 마스크
  const bom = await sharp('img/bom_smile.png').resize(D, D, { fit:'cover', position:'top' })
    .composite([{ input: Buffer.from(`<svg width="${D}" height="${D}"><circle cx="${D/2}" cy="${D/2}" r="${D/2}" fill="#fff"/></svg>`), blend:'dest-in' }])
    .png().toBuffer();
  await sharp(Buffer.from(bg))
    .composite([{ input: bom, left: cx, top: cyTop }])
    .png({ quality: 90 }).toFile('og-image.png');
  const meta = await sharp('og-image.png').metadata();
  console.log('생성 완료:', meta.width + 'x' + meta.height, Math.round(require('fs').statSync('og-image.png').size/1024)+'KB');
})().catch(e => console.log('ERR', e.message));
