/* ════════ 봄이 음성 전수 점검 ════════
   사이트의 모든 봄이 '고정 대사'(가이드 환영·투어, 케어 인사)를 긁어모아
   ① clean() 통과 후 고아 서러게이트(=TTS 400 무음의 원인)가 없는지 검사하고
   ② --tts 옵션이면 브라우저에서 쓸 '실합성 체크 코드'를 출력한다.

   사용: node scripts/check_voice_texts.js        (오프라인 검사 + 대사 목록)
        node scripts/check_voice_texts.js --json  (합성 체크용 JSON만 출력)

   배포 전에 이걸 돌려서 무음 후보를 잡는다 — "이 카드만 소리가 안 나요"를
   Macho가 발견하기 전에. (2026-07-16, 반복되는 음성 사고 끝에 도입)
   ═══════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// bom_voice.js clean()과 반드시 동일해야 함(캐시 키가 문자열 그 자체라서)
function clean(text) {
  return String(text || '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ' ')
    .replace(/[\uD800-\uDFFF]/g, ' ')
    .replace(/[☀-➿️‍✦→·]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// 가이드 설정(BOM_GUIDE/BOM_TUT)에서 '실제로 소리내는' 문자열만 추출
//  - 환영: name + '. ' + welcome 로 합쳐 발화됨 (action은 화면 표시만)
//  - tour: 각 항목('문자열' 또는 {text:'...'})이 개별 발화됨
function extractFromGuide(src, file) {
  const out = [];
  const block = src.match(/window\.(?:BOM_GUIDE|BOM_TUT)\s*=\s*\{[\s\S]*?\};/);
  if (!block) return out;
  const b = block[0];
  const g = (re) => { const m = b.match(re); return m ? m[1] : ''; };
  const name = g(/name\s*:\s*'([^']*)'/);
  const welcome = g(/welcome\s*:\s*'([^']*)'/);
  if (welcome) out.push({ file, kind: '환영', text: (name ? name + '. ' : '') + welcome });
  const tour = b.match(/tour\s*:\s*\[([\s\S]*?)\]/);
  if (tour) {
    // {text:'...'} 형태 먼저, 그다음 남은 단독 '...' 항목
    const seen = new Set();
    (tour[1].match(/text\s*:\s*'([^']*)'/g) || []).forEach((m) => {
      const t = m.match(/'([^']*)'/)[1]; seen.add(t);
      out.push({ file, kind: '투어', text: t });
    });
    (tour[1].match(/(?:^|[,\[]\s*)'([^']{8,})'/g) || []).forEach((m) => {
      const t = m.match(/'([^']*)'/)[1];
      if (!seen.has(t) && !/text\s*:/.test(m)) out.push({ file, kind: '투어', text: t });
    });
  }
  return out;
}

// caregreet: 발화 문자열('...' 안에 한글 12자 이상) 전부
function extractQuoted(src, file, kind) {
  return (src.match(/'[^'\n]{12,}'/g) || [])
    .map((m) => m.slice(1, -1))
    .filter((t) => /[가-힣]{5,}/.test(t) && !/function|return|http/.test(t))
    .map((text) => ({ file, kind, text }));
}

const targets = [];
['arcade', 'game', 'health_magnifier', 'letter', 'library', 'matgo', 'nostalgia', 'people', 'trendy']
  .forEach((f) => targets.push([f + '.html', 'guide']));
['debate', 'dream', 'gag', 'maeum', 'maeumlab']
  .forEach((d) => targets.push([d + '/index.html', 'guide']));
targets.push(['dasibom-caregreet.js', 'quoted']);

let all = [];
for (const [rel, mode] of targets) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { console.log('⚠️ 없음:', rel); continue; }
  const src = fs.readFileSync(p, 'utf8');
  all = all.concat(mode === 'guide' ? extractFromGuide(src, rel) : extractQuoted(src, rel, '케어인사'));
}

// {호칭} 치환(실발화와 동일하게) 후 clean 검사
let bad = 0;
const cleaned = all.map((e) => {
  const spoken = e.text.replace(/\{호칭\}/g, '어르신');
  const c = clean(spoken);
  const orphan = /[\uD800-\uDFFF]/.test(c);
  if (orphan) { bad++; console.log('❌ 고아 서러게이트:', e.file, '—', spoken.slice(0, 40)); }
  if (!c) { console.log('⚠️ 정규화 후 빈 문자열:', e.file, '—', e.text.slice(0, 40)); }
  return { file: e.file, kind: e.kind, text: c };
});

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(cleaned));
} else {
  const byFile = {};
  cleaned.forEach((e) => { byFile[e.file] = (byFile[e.file] || 0) + 1; });
  console.log('── 파일별 대사 수 ──');
  Object.keys(byFile).sort().forEach((f) => console.log('  ' + f + ': ' + byFile[f] + '개'));
  console.log('총 ' + cleaned.length + '개 대사, 고아 서러게이트 ' + bad + '건');
  console.log(bad ? '❌ 실패 — 위 문구는 TTS가 거부함(무음)' : '✅ 오프라인 검사 통과');
}
process.exit(bad ? 1 : 0);
