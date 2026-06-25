// 참고용 기록 — SRC_DIR은 그 세션의 임시 다운로드 캐시라 나중엔 존재하지 않을 수 있음(재실행 보장 안 됨).
// 결과물(img/gameicon-*.jpg, 640x640)이 실제 자산이고 이미 커밋됨.
import sharp from 'sharp';
import { existsSync, unlinkSync, renameSync } from 'fs';

const SRC_DIR = 'C:/Users/USER/.claude/projects/C--Users-USER-Desktop---------memoir/74fda5e9-1e02-4250-a53b-c892bf4ce012/tool-results';

const items = [
  ['webfetch-1782308007779-m94sx0.jpg',  'gameicon-card.jpg',       'centre'],
  ['webfetch-1782308098038-f2n2ig.jpg',  'gameicon-position.jpg',   'centre'],
  ['webfetch-1782308304074-5nm8zt.jpg',  'gameicon-shape.jpg',      'centre'],
  ['webfetch-1782308373534-xgwkzj.jpg',  'gameicon-matchsame.jpg',  'centre'],
  ['webfetch-1782308476350-kq23in.jpg',  'gameicon-number.jpg',     'centre'],
  ['webfetch-1782308579058-g39x09.jpg',  'gameicon-reverse.jpg',    'centre'],
  ['webfetch-1782308655392-c0uets.jpg',  'gameicon-wordbingo.jpg',  'centre'],
  ['webfetch-1782308726115-i5eem1.jpg',  'gameicon-wordcombine.jpg','centre'],
  ['webfetch-1782308788548-n67fvq.jpg',  'gameicon-classify.jpg',   'centre'],
  ['webfetch-1782308936992-d7er14.jpg',  'gameicon-timing.jpg',     'centre'],
  ['webfetch-1782309009642-s66apt.jpg',  'gameicon-math.jpg',       'south'],
  ['webfetch-1782340928808-eoei2o.jpg',  'gameicon-pattern.jpg',    'centre'],
];

const dir = 'img';
for (const [src, outName, pos] of items) {
  const inPath = `${SRC_DIR}/${src}`;
  const outPath = `${dir}/${outName}`;
  const tmpPath = `${dir}/_tmp_${outName}`;
  await sharp(inPath)
    .resize(640, 640, { fit: 'cover', position: pos })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(tmpPath);
  if (existsSync(outPath)) unlinkSync(outPath);
  renameSync(tmpPath, outPath);
  console.log('done:', outPath);
}
