import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, 'nostalgia_data.json');
const IMG_DIR = path.join(__dirname, 'nostalgia', 'img');
const DELAY_MS = 7000;
const MAX_RETRIES = 3;

const SD_PREFIX = "2D SD chibi illustration, super deformed style, big round head small body, Korean style characters wearing hanbok or traditional Korean clothing, Korean cultural setting with ondol floor or thatched roof or Korean traditional architecture, flat shading, clean thick outlines, soft pastel colors,";
const SD_SUFFIX = "no text, no watermark, no english letters, distinctly Korean not Chinese or Japanese";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const TIMEOUT_MS = 90000;
    const file = fs.createWriteStream(destPath);
    const req = https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        fs.unlinkSync(destPath);
        https.get(response.headers.location, (res2) => {
          const file2 = fs.createWriteStream(destPath);
          res2.pipe(file2);
          file2.on('finish', () => {
            file2.close();
            const stat = fs.statSync(destPath);
            if (stat.size < 1000) {
              fs.unlinkSync(destPath);
              reject(new Error(`File too small: ${stat.size} bytes`));
            } else {
              resolve();
            }
          });
          file2.on('error', (err) => {
            fs.unlinkSync(destPath);
            reject(err);
          });
        }).on('error', reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        const stat = fs.statSync(destPath);
        if (stat.size < 1000) {
          fs.unlinkSync(destPath);
          reject(new Error(`File too small: ${stat.size} bytes`));
        } else {
          resolve();
        }
      });
      file.on('error', (err) => {
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        reject(err);
      });
    });
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy(new Error(`Request timed out after ${TIMEOUT_MS/1000}s`));
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
    });
    req.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

async function generateImage(prompt, destPath, seed) {
  const fullPrompt = `${SD_PREFIX} ${prompt}, ${SD_SUFFIX}`;
  const encoded = encodeURIComponent(fullPrompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?model=gptimage&width=1024&height=1024&nologo=true&seed=${seed}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await downloadImage(url, destPath);
      return true;
    } catch (err) {
      console.log(`  Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        const backoff = attempt * 10000;
        console.log(`  Waiting ${backoff/1000}s before retry...`);
        await sleep(backoff);
      }
    }
  }
  return false;
}

async function main() {
  if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
  }

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  const items = data.items;

  // Find items missing images
  const missing = [];
  for (const item of items) {
    const pastPath = path.join(IMG_DIR, `item_${item.id}_past.jpg`);
    const presentPath = path.join(IMG_DIR, `item_${item.id}_present.jpg`);

    if (!item.past_img || !fs.existsSync(pastPath)) {
      missing.push({ item, type: 'past', destPath: pastPath });
    }
    if (!item.present_img || !fs.existsSync(presentPath)) {
      missing.push({ item, type: 'present', destPath: presentPath });
    }
  }

  console.log(`Total missing images: ${missing.length}`);
  console.log(`Estimated time: ${Math.ceil(missing.length * DELAY_MS / 60000)} minutes\n`);

  let completed = 0;
  let failed = 0;

  for (const { item, type, destPath } of missing) {
    const prompt = type === 'past' ? item.past_img_prompt : item.present_img_prompt;
    const imgField = type === 'past' ? 'past_img' : 'present_img';
    const imgValue = `/nostalgia/img/item_${item.id}_${type}.jpg`;
    const seed = item.id * 1000 + (type === 'past' ? 1 : 2);

    console.log(`[${completed + failed + 1}/${missing.length}] Item ${item.id} (${item.category}) - ${type}`);
    console.log(`  Prompt: ${prompt.substring(0, 60)}...`);

    const success = await generateImage(prompt, destPath, seed);

    if (success) {
      // Update JSON in real-time
      const fresh = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
      const idx = fresh.items.findIndex(i => i.id === item.id);
      if (idx !== -1) {
        fresh.items[idx][imgField] = imgValue;
        fs.writeFileSync(DATA_PATH, JSON.stringify(fresh, null, 2), 'utf-8');
      }
      completed++;
      console.log(`  OK -> ${imgValue}`);
    } else {
      failed++;
      console.log(`  FAILED after ${MAX_RETRIES} attempts`);
    }

    if (completed + failed < missing.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nDone! Completed: ${completed}, Failed: ${failed}`);
}

main().catch(console.error);
