import fs from 'fs';
import path from 'path';

const html = fs.readFileSync('C:\\Users\\note\\Downloads\\_ _Standalone_.html', 'utf-8');

// Extract manifest
const manifestMatch = html.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
if (!manifestMatch) { console.log('No manifest'); process.exit(1); }
const manifest = JSON.parse(manifestMatch[1]);

// Extract template to find image order
const tmplMatch = html.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
const template = JSON.parse(tmplMatch[1]);

// Find all img src="UUID" patterns
const imgMatches = [...template.matchAll(/src="([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/g)];
const imgAlts = [...template.matchAll(/alt="([^"]+)"/g)];

console.log('Images found:');
imgMatches.forEach((m, i) => {
  const uuid = m[1];
  const alt = imgAlts[i] ? imgAlts[i][1] : 'unknown';
  const entry = manifest[uuid];
  if (entry && entry.mime && entry.mime.startsWith('image/')) {
    console.log(`  [${i}] ${alt} → ${uuid} (${entry.mime}, ${entry.data.length} chars)`);
  }
});

// Save all images
const outDir = 'C:\\Users\\note\\Desktop\\memoir\\img_design';
fs.mkdirSync(outDir, { recursive: true });

imgMatches.forEach((m, i) => {
  const uuid = m[1];
  const alt = imgAlts[i] ? imgAlts[i][1].replace(/[^a-zA-Z0-9가-힣]/g, '_').slice(0, 30) : `img_${i}`;
  const entry = manifest[uuid];
  if (!entry || !entry.mime || !entry.mime.startsWith('image/')) return;

  const ext = entry.mime.includes('png') ? 'png' : entry.mime.includes('webp') ? 'webp' : 'jpg';
  const fname = `${String(i).padStart(2,'0')}_${alt}.${ext}`;
  const buf = Buffer.from(entry.data, 'base64');
  fs.writeFileSync(path.join(outDir, fname), buf);
  console.log(`Saved: ${fname} (${Math.round(buf.length/1024)}KB)`);
});
