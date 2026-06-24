import sharp from 'sharp';
import { existsSync, unlinkSync, renameSync } from 'fs';

const items = [
  ['gameicon-card.jpg', 'centre'],
  ['gameicon-position.jpg', 'centre'],
  ['gameicon-shape.jpg', 'centre'],
  ['gameicon-matchsame.jpg', 'centre'],
  ['gameicon-number.jpg', 'centre'],
  ['gameicon-reverse.jpg', 'centre'],
  ['gameicon-wordbingo.jpg', 'centre'],
  ['gameicon-wordcombine.jpg', 'centre'],
  ['gameicon-classify.jpg', 'centre'],
  ['gameicon-timing.jpg', 'centre'],
  ['gameicon-math.jpg', 'south'],
  ['gameicon-pattern.jpg', 'centre'],
];

const dir = 'img';
for (const [name, pos] of items) {
  const inPath = `${dir}/${name}`;
  const tmpPath = `${dir}/_tmp_${name}`;
  await sharp(inPath)
    .resize(160, 160, { fit: 'cover', position: pos })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(tmpPath);
  unlinkSync(inPath);
  renameSync(tmpPath, inPath);
  console.log('done:', inPath);
}
