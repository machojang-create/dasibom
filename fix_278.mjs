import https from 'https';
import fs from 'fs';

const prompt = "2D SD chibi illustration, super deformed style, big round head small body, Korean style characters wearing hanbok or traditional Korean clothing, Korean cultural setting, flat shading, clean thick outlines, soft pastel colors, Korean using AI language learning app, speaking to AI tutor, real-time pronunciation feedback, modern language learning, no text, no watermark, no english letters, distinctly Korean not Chinese or Japanese";
const encoded = encodeURIComponent(prompt);
const url = `https://image.pollinations.ai/prompt/${encoded}?model=gptimage&width=1024&height=1024&nologo=true&seed=278002`;
const dest = 'nostalgia/img/item_278_present.jpg';

console.log('Generating item_278_present...');
const file = fs.createWriteStream(dest);
const req = https.get(url, (res) => {
  if (res.statusCode === 301 || res.statusCode === 302) {
    file.close();
    fs.unlinkSync(dest);
    const file2 = fs.createWriteStream(dest);
    https.get(res.headers.location, (r2) => {
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
