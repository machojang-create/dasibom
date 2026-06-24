import sharp from 'sharp';
import { existsSync, unlinkSync } from 'fs';

const items = [
  ['card-apple.jpg', null],
  ['card-orange.jpg', null],
  ['card-scissors.jpg', null],
  ['card-key.png', 'card-key.jpg'],
  ['card-bulb.jpg', null],
  ['card-cherryblossom.jpg', null],
  ['card-hibiscus.jpg', null],
  ['card-rose.jpg', null],
  ['card-tulip.jpg', null],
  ['card-daisy.jpg', null],
];

const dir = 'img';
for (const [src, renameTo] of items) {
  const inPath = `${dir}/${src}`;
  const outName = renameTo || src;
  const outPath = `${dir}/${outName}`;
  const tmpPath = `${dir}/_tmp_${outName}`;
  await sharp(inPath)
    .resize(240, 240, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(tmpPath);
  if (renameTo && existsSync(inPath)) unlinkSync(inPath);
  if (existsSync(outPath)) unlinkSync(outPath);
  const { renameSync } = await import('fs');
  renameSync(tmpPath, outPath);
  console.log('done:', outPath);
}
