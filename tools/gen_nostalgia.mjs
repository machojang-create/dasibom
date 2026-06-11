/* ════════════════════════════════════════════════════════════════
   그때그시절 자동 생성기 (Gemini 나노바나나)
   사용법(프로젝트 루트에서):
     이미지:  node tools/gen_nostalgia.mjs images --from 1 --to 30
     설명보강: node tools/gen_nostalgia.mjs desc --from 1 --to 30
   필수: 환경변수 GEMINI_API_KEY (aistudio.google.com/apikey)
   - 이미지: nostalgia_data.json의 past/present_img_prompt로 생성 →
     nostalgia/img/item_{id}_{past|present}.jpg 저장. 이미 있으면 건너뜀(이어돌리기 OK).
   - desc: past/present_desc를 2문장 따뜻한 톤으로 보강 + talk(말벗 질문 1개) 추가,
     nostalgia_data.json에 기록(원본은 .bak 백업). descV:2 표시로 중복 방지.
   - 무료 키는 분당/일일 한도가 있어 호출 간격을 둠. 429면 대기 후 재시도.
   ════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('❌ GEMINI_API_KEY 환경변수가 없습니다. 가이드(이미지생성_가이드.md) 참고.'); process.exit(1); }

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'nostalgia_data.json');
const IMG_DIR = path.join(ROOT, 'nostalgia', 'img');

const args = process.argv.slice(2);
const mode = args[0];
function opt(name, def) { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; }
const FROM = parseInt(opt('from', '1'), 10);
const TO = parseInt(opt('to', '999'), 10);
const ONLY = opt('only', '');           // past | present (이미지 모드)
const IMG_MODEL = 'gemini-2.5-flash-image';
const TXT_MODEL = 'gemini-2.5-flash';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function callGemini(model, body, tries = 4) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  for (let t = 1; t <= tries; t++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify(body)
    });
    if (res.status === 429 || res.status >= 500) {
      const wait = 20000 * t;
      console.log(`   ⏳ ${res.status} — ${wait / 1000}초 대기 후 재시도(${t}/${tries})`);
      await sleep(wait); continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res.json();
  }
  throw new Error('재시도 한도 초과(한도 초과가 계속되면 내일 이어서 돌리세요)');
}

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const items = data.items.filter(it => it.id >= FROM && it.id <= TO);

if (mode === 'images') {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  let done = 0, skip = 0, fail = 0;
  const STYLE_TAIL = ', clean composition, no text, no letters, no watermark';
  for (const it of items) {
    for (const side of ['past', 'present']) {
      if (ONLY && ONLY !== side) continue;
      const file = path.join(IMG_DIR, `item_${it.id}_${side}.jpg`);
      if (fs.existsSync(file)) { skip++; continue; }
      const prompt = (it[side + '_img_prompt'] || '').trim();
      if (!prompt) { skip++; continue; }
      try {
        const j = await callGemini(IMG_MODEL, { contents: [{ parts: [{ text: prompt + STYLE_TAIL }] }] });
        const part = (j.candidates?.[0]?.content?.parts || []).find(p => p.inlineData?.data);
        if (!part) throw new Error('이미지 응답 없음: ' + JSON.stringify(j).slice(0, 200));
        fs.writeFileSync(file, Buffer.from(part.inlineData.data, 'base64'));
        done++; console.log(`✅ item ${it.id} ${side} (${Math.round(fs.statSync(file).size / 1024)}KB) · 누적 ${done}`);
      } catch (e) { fail++; console.log(`❌ item ${it.id} ${side}: ${e.message}`); }
      await sleep(6500); // 무료 한도 보호
    }
  }
  console.log(`\n끝! 생성 ${done} · 건너뜀 ${skip} · 실패 ${fail}\n→ 생성물 확인 후: git add -A && git commit && git push (자동배포)`);

} else if (mode === 'desc') {
  let done = 0, skip = 0, fail = 0;
  for (const it of items) {
    if (it.descV === 2) { skip++; continue; }
    const instr =
`너는 한국 시니어(60~80대)를 위한 따뜻한 회상 콘텐츠 작가다. 아래 주제의 과거/현재 설명을 각각 2문장(각 90~140자)으로 풍부하게 다시 쓰고, 어르신이 가족·친구와 이야기 나누고 싶어질 "말벗 질문" 1개(40자 이내, 존댓말)를 만들어라.
주제: ${it.topic}
과거(원문): ${it.past_desc}
현재(원문): ${it.present_desc}
JSON으로만 답하라: {"past":"...","present":"...","talk":"..."}`;
    try {
      const j = await callGemini(TXT_MODEL, {
        contents: [{ parts: [{ text: instr }] }],
        generationConfig: { responseMimeType: 'application/json' }
      });
      const out = JSON.parse(j.candidates[0].content.parts[0].text);
      if (!out.past || !out.present || !out.talk) throw new Error('필드 누락');
      it.past_desc = out.past.trim(); it.present_desc = out.present.trim(); it.talk = out.talk.trim();
      it.descV = 2; done++;
      console.log(`✅ item ${it.id} 설명 보강 · 누적 ${done}`);
      if (done % 10 === 0) saveData(); // 중간 저장
    } catch (e) { fail++; console.log(`❌ item ${it.id}: ${e.message}`); }
    await sleep(2200);
  }
  saveData();
  console.log(`\n끝! 보강 ${done} · 건너뜀 ${skip} · 실패 ${fail}\n→ git add -A && git commit && git push`);
} else {
  console.log('사용법: node tools/gen_nostalgia.mjs images|desc [--from N] [--to M] [--only past|present]');
}

function saveData() {
  if (!fs.existsSync(DATA + '.bak')) fs.copyFileSync(DATA, DATA + '.bak');
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2), 'utf8');
}
