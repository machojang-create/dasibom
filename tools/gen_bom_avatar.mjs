import sharp from 'sharp';
const JOBS = [['img/bom_wink.png','img/bom_fab.png'], ['img/bom_smile.png','img/bom_face.png']];
const S = 256;
for (const [src, out] of JOBS) {
  const meta = await sharp(src).metadata();
  // 투명 배경 컷아웃 → 흰 배경에 합성(불투명화). cover로 정사각 채우고 위쪽(얼굴) 우선.
  await sharp(src)
    .resize(S, S, { fit: 'cover', position: 'top' })
    .flatten({ background: '#FFFFFF' })
    .png()
    .toFile(out);
  console.log(out, `(src ${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`);
}
