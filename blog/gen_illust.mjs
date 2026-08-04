#!/usr/bin/env node
/**
 * 일러스트 생성기 — Gemini 로 본문에 넣을 그림을 만든다.
 *
 *   export GEMINI_API_KEY=...
 *   node gen_illust.mjs --post out/B01_....json
 *   node gen_illust.mjs --all
 *   node gen_illust.mjs --post out/B01_....json --force   # 이미 있어도 다시 만들기
 *
 * 원고 JSON 의 illustrations 배열을 읽습니다.
 *
 *   "illustrations": [
 *     { "after": "본문에서 이 줄 다음에 넣습니다", "prompt": "그릴 장면", "alt": "설명" }
 *   ]
 *
 * 사람 사진을 쓰지 않는 이유:
 * - 남의 사진을 자동으로 가져다 쓰면 저작권과 초상권이 걸립니다. 자동 발행이라 사람이
 *   한 장씩 걸러낼 수 없으니 애초에 만들어 씁니다.
 * - 그림체를 고정해 두면 글이 쌓일수록 블로그가 한 사람이 쓴 것처럼 보입니다.
 *
 * 만든 그림은 out/illust/<id>_<n>.png 로 저장하고, 이미 있으면 건너뜁니다(호출 비용).
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { loadConfig, ensureOutDir } from './lib/queue.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const has = (name) => args.includes(`--${name}`);

const config = loadConfig();
const ill = config.illustration ?? {};
const KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

if (!KEY) {
  console.error('GEMINI_API_KEY 가 없습니다.\n');
  console.error('  1. https://aistudio.google.com/apikey 에서 키를 만드세요.');
  console.error('  2. blog/.env 에 GEMINI_API_KEY=... 를 넣거나, 셸에서 export 하세요.');
  console.error('     (.env 는 .gitignore 에 있습니다. 절대 커밋하지 마세요.)\n');
  console.error('키 없이 발행하려면 gen_figures.mjs 로 만든 카드 이미지만 들어갑니다.');
  process.exit(1);
}

const MODEL = ill.model ?? 'gemini-2.5-flash-image';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/**
 * 그림체를 매번 똑같이 붙입니다. 이게 없으면 글마다 화풍이 달라져
 * 블로그가 여러 사람이 쓴 것처럼 보입니다.
 */
function buildPrompt(scene) {
  return [
    ill.style ??
      '따뜻한 파스텔 톤의 손그림 일러스트. 부드러운 수채화 질감, 굵고 단순한 윤곽선, 흰 배경.',
    `주조색은 ${config.brand.primary} 계열의 초록과 크림색.`,
    '한국의 60~70대 인물과 생활 공간. 인물은 밝고 건강하며 편안한 표정.',
    '글자, 문자, 숫자, 로고, 워터마크를 절대 넣지 마세요.',
    '사진처럼 사실적으로 그리지 마세요. 실제 인물처럼 보이면 안 됩니다.',
    '가로로 긴 구도. 가장자리에 여백을 두세요.',
    '',
    `그릴 장면: ${scene}`,
  ].join('\n');
}

async function generate(scene, outFile) {
  const res = await fetch(`${ENDPOINT}?key=${KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(scene) }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const image = parts.find((p) => p.inlineData?.data);
  if (!image) {
    const reason = json.candidates?.[0]?.finishReason ?? '알 수 없음';
    throw new Error(`이미지가 안 왔습니다 (finishReason: ${reason})`);
  }

  // 네이버 본문 폭에 맞춰 줄입니다. 원본이 크면 업로드가 느려집니다.
  await sharp(Buffer.from(image.inlineData.data, 'base64'))
    .resize({ width: ill.width ?? 800, withoutEnlargement: true })
    .png()
    .toFile(outFile);
}

async function buildOne(postPath) {
  const post = JSON.parse(fs.readFileSync(postPath, 'utf8'));
  const list = post.illustrations ?? [];
  if (!list.length) return 0;

  const dir = ensureOutDir('illust');
  let made = 0;

  for (let i = 0; i < list.length; i++) {
    const file = path.join(dir, `${post.id}_${i + 1}.png`);
    if (fs.existsSync(file) && !has('force')) {
      console.log(`  [${post.id}] ${i + 1}장 건너뜀 (이미 있음)`);
      continue;
    }
    try {
      await generate(list[i].prompt, file);
      console.log(`  [${post.id}] ${i + 1}장 완료`);
      made++;
    } catch (err) {
      console.error(`  [${post.id}] ${i + 1}장 실패 — ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, ill.delay_ms ?? 1500)); // 호출 간격
  }
  return made;
}

const outDir = ensureOutDir();
const targets = has('all')
  ? fs
      .readdirSync(outDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.join(outDir, f))
  : [flag('post')].filter(Boolean);

if (!targets.length) {
  console.error('--post out/xxx.json 또는 --all 이 필요합니다.');
  process.exit(1);
}

let total = 0;
for (const t of targets) total += await buildOne(t);

console.log(`\n일러스트 ${total}장 생성 · ${path.join(outDir, 'illust')}`);
if (total) console.log('그림이 어색하면 원고의 illustrations[].prompt 를 고치고 --force 로 다시 뽑으세요.');
