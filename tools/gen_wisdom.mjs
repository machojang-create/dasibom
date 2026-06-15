/* 오늘의 지혜(명언) 배경 이미지 생성기 — 명언 분위기에 맞는 카드뉴스 배경.
   사용: node tools/gen_wisdom.mjs --from 0 --to 2   (샘플)
         node tools/gen_wisdom.mjs --from 0 --to 29  (전체)
   키: 환경변수 GEMINI_API_KEY 또는 tools/gemini.key. 출력: img/wisdom/w_{N}.jpg (sharp 압축).
   인덱스는 index.html FALLBACK 배열 순서와 1:1. */
import fs from 'node:fs';
import path from 'node:path';

const KEY_FILE = path.resolve(import.meta.dirname, 'gemini.key');
const KEY = (process.env.GEMINI_API_KEY || (fs.existsSync(KEY_FILE) ? fs.readFileSync(KEY_FILE, 'utf8') : '')).trim();
if (!KEY) { console.error('❌ Gemini 키 없음 (tools/gemini.key 또는 GEMINI_API_KEY)'); process.exit(1); }

let sharp = null; try { sharp = (await import('sharp')).default; } catch (e) {}

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'img', 'wisdom');
const MODEL = 'gemini-2.5-flash-image';
const args = process.argv.slice(2);
function opt(n, d) { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; }
const FROM = parseInt(opt('from', '0'), 10), TO = parseInt(opt('to', '999'), 10);
const FORCE = args.includes('--force');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 명언별 분위기 장면(스크림 위 흰 글씨가 얹히므로 — 차분·여백 있는 분위기)
const SCENES = [
  'a single small tree sapling growing in soft golden morning light, dewy garden',
  'an open old book on a wooden desk by a sunlit window, warm cozy light, dust motes',
  'a warm glowing home window at dusk, soft lamplight, cozy family warmth',
  'a winding mountain path leading upward toward a bright sunrise',
  'a dreamy starry night sky over a quiet silhouetted landscape',
  'dawn light breaking over calm rolling hills, soft hopeful glow',
  'a calm wooden workbench with simple tools in soft morning light',
  'a joyful silhouette with open arms in a spring flower field at golden hour',
  'a warm lantern glowing on a misty path at dawn',
  'a peaceful sunrise over a dewy meadow, serene',
  'delicate blossoms in soft focus, petals drifting in warm light',
  'a serene nature walking path through green trees in morning light',
  'a close-up dewdrop on a green leaf at sunrise, soft bokeh',
  'a long path stretching to the horizon at dawn',
  'a warm golden sunset over calm still water',
  'an open book beside soft candlelight in a quiet room',
  'two old trees with intertwined branches in warm light',
  'a warm autumn harvest field at golden hour',
  'a bright cheerful sunny morning over a blooming meadow',
  'fresh spring cherry blossoms in full bloom',
  'a quiet country road winding through fields at golden hour',
  'layered misty mountains at dawn, serene depth',
  'a bright sunrise over a calm open field, a new day',
  'a tiny seed sprouting through soil into soft light',
  'a blooming flower opening in a sunlit garden',
  'a warm village at dusk with glowing windows',
  'a calm bright sky after the rain, a path forward',
  'a cozy warm library with shelves of old books, soft reading light',
  'a serene calm morning in nature, still water and soft light',
  'a lone figure standing on a hilltop facing a golden sunrise'
];
const STYLE = ', cinematic atmospheric storybook scene, soft warm light, serene evocative mood, rich muted colors, gentle and calm, fills the entire frame edge to edge, immersive wide full-bleed view, no picture frame, no border, no canvas, no wall, no matting, no vignette, no text, no letters, no watermark';

async function callGemini(model, body, tries = 4) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  for (let t = 1; t <= tries; t++) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });
    if (res.status === 429) throw new Error('429 한도/결제 → ' + (await res.text()).replace(/\s+/g, ' ').slice(0, 400));
    if (res.status >= 500) { await sleep(12000 * t); continue; }
    if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (await res.text()).replace(/\s+/g, ' ').slice(0, 400));
    return res.json();
  }
  throw new Error('재시도 한도 초과');
}

fs.mkdirSync(OUT, { recursive: true });
let done = 0, skip = 0, fail = 0;
for (let i = FROM; i <= TO && i < SCENES.length; i++) {
  const file = path.join(OUT, `w_${i}.jpg`);
  if (!FORCE && fs.existsSync(file)) { skip++; continue; }
  try {
    const j = await callGemini(MODEL, { contents: [{ parts: [{ text: SCENES[i] + STYLE }] }] });
    const part = (j.candidates?.[0]?.content?.parts || []).find(p => p.inlineData?.data);
    if (!part) throw new Error('이미지 응답 없음: ' + JSON.stringify(j).slice(0, 160));
    const raw = Buffer.from(part.inlineData.data, 'base64');
    if (sharp) await sharp(raw).resize({ width: 1000, withoutEnlargement: true }).jpeg({ quality: 78 }).toFile(file);
    else fs.writeFileSync(file, raw);
    done++; console.log(`✅ w_${i} (${Math.round(fs.statSync(file).size / 1024)}KB) · ${SCENES[i].slice(0, 40)}`);
  } catch (e) { fail++; console.log(`❌ w_${i}: ${e.message}`); if (String(e.message).includes('429')) break; }
  await sleep(6500);
}
console.log(`\n끝! 생성 ${done} · 건너뜀 ${skip} · 실패 ${fail}`);
