#!/usr/bin/env node
/**
 * 일러스트 생성기 — Gemini 로 본문에 넣을 그림을 만든다.
 *
 *   node gen_illust.mjs --post out/B01_....json
 *   node gen_illust.mjs --all
 *   node gen_illust.mjs --all --force        # 이미 있어도 다시 만들기
 *
 * 키는 `그때그시절` 생성기(tools/gen_nostalgia.mjs)와 같은 자리에서 읽습니다.
 * 환경변수 GEMINI_API_KEY 가 우선이고, 없으면 저장소의 tools/gemini.key 파일을 씁니다.
 * (tools/gemini.key 는 .gitignore 에 있습니다. 키를 새로 만드실 필요 없습니다.)
 *
 * 원고 JSON 의 illustrations 배열을 읽습니다.
 *
 *   "illustrations": [
 *     { "after": "본문에서 이 줄 다음에 넣습니다", "prompt": "그릴 장면" }
 *   ]
 *
 * 사람 사진을 쓰지 않는 이유:
 * - 남의 사진을 자동으로 가져다 쓰면 저작권과 초상권이 걸립니다. 자동 발행이라 사람이
 *   한 장씩 걸러낼 수 없으니 애초에 만들어 씁니다.
 * - 그림체를 고정해 두면 글이 쌓일수록 블로그가 한 사람이 쓴 것처럼 보입니다.
 *
 * 만든 그림은 out/illust/<id>_<n>.jpg 로 저장하고, 이미 있으면 건너뜁니다.
 * 중간에 끊겨도 같은 명령으로 이어 돌리면 됩니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { loadConfig, ensureOutDir, paths } from './lib/queue.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const has = (name) => args.includes(`--${name}`);

const config = loadConfig();
const ill = config.illustration ?? {};

// 키 — 환경변수 우선, 없으면 tools/gemini.key (그때그시절 생성기와 같은 파일)
const KEY_FILE = path.join(paths.root, '..', 'tools', 'gemini.key');
const KEY = (
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  (fs.existsSync(KEY_FILE) ? fs.readFileSync(KEY_FILE, 'utf8') : '')
).trim();

if (!KEY) {
  console.error('Gemini 키가 없습니다.\n');
  console.error(`  환경변수 GEMINI_API_KEY 를 설정하거나, ${path.resolve(KEY_FILE)} 에 키 한 줄만 넣으세요.`);
  console.error('  (그때그시절 이미지 생성기와 같은 키 파일입니다. 이미 쓰고 계시면 그대로 잡힙니다.)\n');
  console.error('키 없이 발행하려면 gen_figures.mjs 로 만든 카드 이미지만 들어갑니다.');
  process.exit(1);
}

const MODEL = flag('model') ?? ill.model ?? 'gemini-2.5-flash-image';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 그림체를 매번 똑같이 붙입니다. 이게 없으면 글마다 화풍이 달라져
 * 블로그가 여러 사람이 쓴 것처럼 보입니다.
 *
 * 일본풍을 명시적으로 막는 이유: 프롬프트에 '한국' 만 쓰면 기모노와 다다미가 섞여
 * 나옵니다. tools/gen_nostalgia.mjs 에서 겪고 넣은 문구를 그대로 씁니다.
 */
function buildPrompt(scene) {
  return [
    scene,
    ill.style ??
      '따뜻한 파스텔 톤의 손그림 일러스트. 부드러운 수채화 질감, 굵고 단순한 윤곽선, 흰 배경.',
    `주조색은 ${config.brand.primary} 계열의 초록과 크림색. 가로로 긴 구도, 가장자리에 여백.`,
    '한국의 60~70대 인물과 한국 생활 공간. 표정은 밝고 편안하게.',
    'authentic South Korean scene with Korean people and natural Korean faces,',
    'Korean everyday clothing, Korean apartment or hanok interiors,',
    'NEVER Japanese kimono, NEVER tatami or torii or Japanese architecture,',
    'warm cohesive Korean storybook illustration, soft rounded shapes, clean composition,',
    'no text, no letters, no numbers, no logo, no watermark,',
    'not photorealistic, must not resemble any real person.',
  ].join('\n');
}

async function callGemini(body, tries = 4) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  for (let t = 1; t <= tries; t++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify(body),
    });
    if (res.status === 429) {
      // 한도·결제 문제는 기다려도 안 풀립니다. 사유를 그대로 보여주고 멈춥니다.
      throw new Error('429 한도/결제 — ' + (await res.text()).replace(/\s+/g, ' ').slice(0, 400));
    }
    if (res.status >= 500) {
      const wait = 15000 * t;
      console.log(`     ${res.status} — ${wait / 1000}초 대기 후 재시도 (${t}/${tries})`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${(await res.text()).replace(/\s+/g, ' ').slice(0, 400)}`);
    }
    return res.json();
  }
  throw new Error('재시도 한도 초과');
}

// 한도가 소진되면 헛돌지 않고 멈춥니다.
let quotaFails = 0;
function quotaHit(err) {
  if (/429|재시도 한도/.test(String(err.message))) {
    if (++quotaFails >= 3) {
      console.log('\n오늘 한도가 소진된 것 같습니다. 여기까지 저장하고 멈춥니다.');
      console.log('내일 같은 명령으로 이어 돌리시면 됩니다. 이미 만든 그림은 건너뜁니다.');
      return true;
    }
  } else quotaFails = 0;
  return false;
}

async function generate(scene, outFile) {
  const json = await callGemini({ contents: [{ parts: [{ text: buildPrompt(scene) }] }] });
  const part = (json.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data);
  if (!part) {
    const reason = json.candidates?.[0]?.finishReason ?? '알 수 없음';
    throw new Error(`이미지가 안 왔습니다 (finishReason: ${reason})`);
  }
  // 네이버 본문 폭에 맞춰 줄입니다. 원본 그대로면 업로드가 느립니다.
  await sharp(Buffer.from(part.inlineData.data, 'base64'))
    .resize({ width: ill.width ?? 800, withoutEnlargement: true })
    .jpeg({ quality: ill.quality ?? 78 })
    .toFile(outFile);
}

async function buildOne(postPath) {
  const post = JSON.parse(fs.readFileSync(postPath, 'utf8'));
  const list = post.illustrations ?? [];
  if (!list.length) return { made: 0, stop: false };

  const dir = ensureOutDir('illust');
  let made = 0;

  for (let i = 0; i < list.length; i++) {
    const file = path.join(dir, `${post.id}_${i + 1}.jpg`);
    if (fs.existsSync(file) && !has('force')) continue;
    try {
      await generate(list[i].prompt, file);
      made++;
      console.log(`  [${post.id}] ${i + 1}장 (${Math.round(fs.statSync(file).size / 1024)}KB)`);
    } catch (err) {
      console.error(`  [${post.id}] ${i + 1}장 실패 — ${err.message}`);
      if (quotaHit(err)) return { made, stop: true };
    }
    await sleep(ill.delay_ms ?? 6500); // 무료 한도 보호
  }
  return { made, stop: false };
}

const outDir = ensureOutDir();
const targets = has('all')
  ? fs
      .readdirSync(outDir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f) => path.join(outDir, f))
  : [flag('post')].filter(Boolean);

if (!targets.length) {
  console.error('--post out/xxx.json 또는 --all 이 필요합니다.');
  process.exit(1);
}

console.log(`모델 ${MODEL} · 호출 간격 ${(ill.delay_ms ?? 6500) / 1000}초\n`);

let total = 0;
for (const t of targets) {
  const { made, stop } = await buildOne(t);
  total += made;
  if (stop) break;
}

console.log(`\n일러스트 ${total}장 · ${path.join(outDir, 'illust')}`);
if (total) console.log('그림이 어색하면 원고의 illustrations[].prompt 를 고치고 --force 로 다시 뽑으세요.');
