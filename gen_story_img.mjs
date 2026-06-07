import https from 'https';
import fs from 'fs';

const prompt = encodeURIComponent(
  "A warm spring garden in Korea, elderly Korean couple walking on a stone path surrounded by cherry blossoms and spring flowers, golden afternoon light, soft bokeh background, nostalgic and hopeful atmosphere, film photography style, warm tones"
);
const url = `https://image.pollinations.ai/prompt/${prompt}?model=gptimage&width=1024&height=1120&nologo=true&seed=20260430`;
const dest = 'img/story.jpg';

console.log('Generating story image...');
const file = fs.createWriteStream(dest);
const req = https.get(url, res => {
  if (res.statusCode === 301 || res.statusCode === 302) {
    file.close(); fs.unlinkSync(dest);
    const file2 = fs.createWriteStream(dest);
    https.get(res.headers.location, r2 => {
      r2.pipe(file2);
      file2.on('finish', () => { file2.close(); console.log('Done:', fs.statSync(dest).size, 'bytes'); });
    });
    return;
  }
  res.pipe(file);
  file.on('finish', () => { file.close(); console.log('Done:', fs.statSync(dest).size, 'bytes'); });
});
req.setTimeout(90000, () => { req.destroy(); console.log('Timeout'); });
req.on('error', console.error);
