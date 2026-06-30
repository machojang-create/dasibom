/**
 * 다시봄(Dasibom) — Firebase Cloud Functions
 */

const functions   = require('firebase-functions');
const admin       = require('firebase-admin');
const https       = require('https');
const querystring = require('querystring');

// ── Anthropic API 키 설정 ──────────────────────────────────────────────────
// 우선순위: 환경변수 → Firebase Functions Config → 아래 직접 입력값
// 환경변수 설정 방법: firebase functions:config:set anthropic.key="sk-ant-api03-..."
// 또는 터미널: set ANTHROPIC_KEY=sk-ant-api03-...  (로컬 에뮬레이터용)
const ANTHROPIC_KEY =
  process.env.ANTHROPIC_KEY ||
  ((() => { try { return functions.config().anthropic.key; } catch(e){ return null; } })()) ||
  null; // 키 미설정 시 callAnthropic가 명확한 에러를 던짐 (자리표시자를 헤더에 넣으면 header 오류 발생)

// 무료/기본 모델: claude-haiku-4-5 (저렴 + 빠름)
const MODEL = 'claude-haiku-4-5-20251001';
// 유료(자서전·전집) 본문 생성 모델: claude-opus-4-8 (고품질). 서버가 pkg로 결정.
const MODEL_PAID = 'claude-opus-4-8';

// ── AI 제공자 스위치 (2026-06-12 Macho 승인: 제미나이 일원화, Claude 결제 막힘) ──
// 복귀 방법: firebase functions:config:set ai.provider="anthropic" 후 재배포
const AI_PROVIDER =
  process.env.AI_PROVIDER ||
  ((() => { try { return functions.config().ai.provider; } catch (e) { return null; } })()) ||
  'gemini';
const GEMINI_KEY =
  process.env.GEMINI_API_KEY ||
  ((() => { try { return functions.config().gemini.key; } catch (e) { return null; } })()) ||
  null;
// 제미나이 모델 (2026-06-12 공식 가격표 기준 ID)
const G_MODEL      = 'gemini-3.1-flash-lite';     // 무료 등급 (권당 ~20원)
const G_MODEL_PAID = 'gemini-3.1-pro-preview';    // 유료 등급 — 결제 검증 도입 전까지 봉인(미사용)

// 제미나이 REST 호출 (callAnthropic과 동일한 {status,text} 반환)
function callGemini(model, payload) {
  if (!GEMINI_KEY) {
    return Promise.reject(new Error('GEMINI 키 미설정 (firebase functions:config:set gemini.key="...")'));
  }
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path:     `/v1beta/models/${model}:generateContent`,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-goog-api-key': GEMINI_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve({ status: res.statusCode, text: raw }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── 제공자 공통 텍스트 생성 — 순수 텍스트 반환(실패 시 throw) ──
// opt: { system?, user, maxTokens?, json?, model? }
async function aiText(opt) {
  if (AI_PROVIDER === 'gemini') {
    const body = {
      contents: [{ parts: [{ text: opt.user }] }],
      generationConfig: { maxOutputTokens: opt.maxTokens || 800 }
    };
    if (opt.system) body.systemInstruction = { parts: [{ text: opt.system }] };
    if (opt.json)   body.generationConfig.responseMimeType = 'application/json';
    const r = await callGemini(opt.model || G_MODEL, body);
    let parsed;
    try { parsed = JSON.parse(r.text); } catch (e) { throw new Error('Gemini 응답 파싱 실패: ' + r.text.slice(0, 200)); }
    if (parsed.error) throw new Error('Gemini 오류: ' + String(parsed.error.message || JSON.stringify(parsed.error)).slice(0, 200));
    const cand = (parsed.candidates || [])[0];
    const text = ((cand && cand.content && cand.content.parts) || []).map(p => p.text || '').join('').trim();
    if (!text) throw new Error('Gemini 빈 응답' + (cand && cand.finishReason ? ' (' + cand.finishReason + ')' : ''));
    return text;
  }
  // Anthropic 경로 (ai.provider="anthropic"으로 복귀 시 사용)
  const payload = {
    model: opt.model || MODEL,
    max_tokens: opt.maxTokens || 800,
    messages: [{ role: 'user', content: opt.user }]
  };
  if (opt.system) payload.system = opt.system;
  const result = await callAnthropic(payload);
  let parsed;
  try { parsed = JSON.parse(result.text); } catch (e) { throw new Error('Anthropic 응답 파싱 실패: ' + result.text.slice(0, 200)); }
  if (parsed.error) throw new Error('Anthropic 오류: ' + JSON.stringify(parsed.error).slice(0, 200));
  return (parsed.content || []).map(b => b.text || '').join('').trim();
}

function callAnthropic(payload) {
  if (!ANTHROPIC_KEY) {
    return Promise.reject(new Error('AI 키가 설정되지 않았습니다 (firebase functions:config:set anthropic.key="...")'));
  }
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length':    Buffer.byteLength(body)
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve({ status: res.statusCode, text: raw }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function postForm(hostname, path, data) {
  const body = querystring.stringify(data);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path, method: 'POST',
      headers: {
        'Content-Type'  : 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve({ status: res.statusCode, text: raw }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getJson(hostname, path, bearerToken) {
  const headers = {};
  if (bearerToken) headers['Authorization'] = 'Bearer ' + bearerToken;
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path, method: 'GET', headers },
      (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => resolve({ status: res.statusCode, text: raw }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

admin.initializeApp({
  databaseURL: 'https://mylife-650f0-default-rtdb.firebaseio.com'
});

// ════════════════════════════════════════
// 카카오 OAuth
// ════════════════════════════════════════
exports.kakaoAuth = functions
  .region('asia-northeast3')
  .https.onCall(async (data, context) => {

    const { code } = data;
    if (!code) {
      throw new functions.https.HttpsError('invalid-argument', '인가 코드가 없습니다.');
    }

    console.log('[kakaoAuth] 토큰 교환 시작. code앞10자:', String(code).slice(0, 10));

    // ── 1. Authorization Code → Access Token ──
    const KAKAO_CLIENT_SECRET =
      process.env.KAKAO_CLIENT_SECRET ||
      ((() => { try { return functions.config().kakao.secret; } catch(e){ return null; } })()) ||
      null; // firebase functions:config:set kakao.secret="실제값" 으로 설정

    const formData = {
      grant_type   : 'authorization_code',
      client_id    : '870c36c36fea1421ed701cefe6fc6562',
      redirect_uri : 'https://dasibomlife.com/auth/kakao/callback.html',
      code         : code,
      client_secret: KAKAO_CLIENT_SECRET
    };

    console.log('[kakaoAuth] 요청: client_id=870c36c36fea1421ed701cefe6fc6562(JS키) redirect_uri=https://dasibomlife.com/auth/kakao/callback.html');

    let t;
    try {
      t = await postForm('kauth.kakao.com', '/oauth/token', formData);
    } catch (e) {
      console.error('[kakaoAuth] 네트워크 오류:', e.message);
      throw new functions.https.HttpsError('internal', '네트워크 오류: ' + e.message);
    }

    console.log('[kakaoAuth] HTTP상태:', t.status, '/ 응답body:', t.text.slice(0, 300));

    let tokenData;
    try {
      tokenData = JSON.parse(t.text);
    } catch (e) {
      throw new functions.https.HttpsError(
        'internal',
        'HTTP' + t.status + ' — 카카오가 JSON이 아닌 응답을 반환했습니다: ' + t.text.slice(0, 200)
      );
    }

    if (!tokenData.access_token) {
      throw new functions.https.HttpsError(
        'internal',
        '카카오 에러: ' + JSON.stringify(tokenData)
      );
    }

    console.log('[kakaoAuth] 액세스 토큰 발급 성공');

    // ── 2. Access Token → User Profile ──
    let p2;
    try {
      p2 = await getJson('kapi.kakao.com', '/v2/user/me', tokenData.access_token);
    } catch (e) {
      throw new functions.https.HttpsError('internal', '프로필 네트워크 오류: ' + e.message);
    }

    console.log('[kakaoAuth] 프로필 HTTP상태:', p2.status, '/ body:', p2.text.slice(0, 200));

    let profileData;
    try {
      profileData = JSON.parse(p2.text);
    } catch (e) {
      throw new functions.https.HttpsError('internal', '프로필 응답 파싱 실패: ' + p2.text.slice(0, 200));
    }

    if (!profileData.id) {
      throw new functions.https.HttpsError('internal', '카카오 에러: ' + JSON.stringify(profileData));
    }

    const acct = profileData.kakao_account || {};
    console.log('[kakaoAuth] 프로필 조회 성공. id:', profileData.id);
    return {
      id   : String(profileData.id),
      name : (acct.profile && acct.profile.nickname) || '',
      email: acct.email || ''
    };
  });

// ════════════════════════════════════════
// 네이버 OAuth
// ════════════════════════════════════════
const NAVER_CLIENT_ID = 'bgI3PFJTzufz_2aWDfvF';
const NAVER_CLIENT_SECRET =
  process.env.NAVER_CLIENT_SECRET ||
  ((() => { try { return functions.config().naver.secret; } catch(e){ return null; } })()) ||
  null; // firebase functions:config:set naver.secret="실제값" 으로 설정

exports.naverAuth = functions
  .region('asia-northeast3')
  .https.onCall(async (data, context) => {

    const { code, state } = data;
    if (!code) {
      throw new functions.https.HttpsError('invalid-argument', '인증 코드가 없습니다.');
    }

    // ── 1. Authorization Code → Access Token ──
    const tokenPath = '/oauth2.0/token'
      + '?grant_type=authorization_code'
      + '&client_id='     + NAVER_CLIENT_ID
      + '&client_secret=' + NAVER_CLIENT_SECRET
      + '&code='          + encodeURIComponent(code)
      + '&state='         + encodeURIComponent(state || '');

    console.log('[naverAuth] 토큰 요청. client_id=' + NAVER_CLIENT_ID);
    let tRes;
    try {
      tRes = await getJson('nid.naver.com', tokenPath, '');
    } catch (e) {
      throw new functions.https.HttpsError('internal', '네이버 네트워크 오류: ' + e.message);
    }
    console.log('[naverAuth] 토큰 HTTP상태:', tRes.status, '/ body:', tRes.text.slice(0, 300));

    let tokenData;
    try {
      tokenData = JSON.parse(tRes.text);
    } catch (e) {
      throw new functions.https.HttpsError('internal',
        'HTTP' + tRes.status + ' — 네이버가 JSON이 아닌 응답을 반환했습니다: ' + tRes.text.slice(0, 200));
    }

    if (!tokenData.access_token) {
      console.error('[naverAuth] 토큰 발급 실패:', tokenData);
      throw new functions.https.HttpsError('internal',
        '네이버 에러: ' + JSON.stringify(tokenData));
    }

    // ── 2. Access Token → User Profile ──
    const pRes = await getJson('openapi.naver.com', '/v1/nid/me', tokenData.access_token);
    const profileData = JSON.parse(pRes.text);

    if (profileData.resultcode !== '00' || !profileData.response) {
      console.error('Naver profile error:', profileData);
      throw new functions.https.HttpsError('internal', '네이버 에러: ' + JSON.stringify(profileData));
    }

    const p = profileData.response;

    // ── 3. Firestore에 사용자 기록 ──
    const db  = admin.firestore();
    const uid = 'naver_' + p.id;
    await db.collection('users').doc(uid).set({
      provider:  'naver',
      socialId:  String(p.id),
      name:      p.name  || p.nickname || '',
      email:     p.email || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return {
      id:    String(p.id),
      name:  p.name  || p.nickname || '',
      email: p.email || '',
      uid:   uid
    };
  });

// ════════════════════════════════════════
// 자서전 단락 생성 — 전문 대필 작가 페르소나
// ════════════════════════════════════════
exports.generateSection = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .https.onCall(async (data, context) => {

    // 비로그인 외부 호출 차단 (앱은 시작 시 익명 로그인하므로 정상 사용자는 통과)
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { question, answer, chapterName, paraCount, pkg } = data;
    // ★★ TODO(출시 전 필수): 결제 검증 미구현 → 결제 시스템 도입 전까지 Opus(MODEL_PAID) 봉인, 전원 Haiku.
    //    결제(PortOne) 붙으면: 서버에서 Firestore 결제기록 확인 후에만 MODEL_PAID 허용
    //    + 의심 요청(결제 없는 premium 등) 로깅. (절대 잊지 말 것 — release_blockers #1)
    //    원래 로직: (pkg === 'basic' || pkg === 'premium') ? MODEL_PAID : MODEL
    const useModel = (AI_PROVIDER === 'gemini') ? G_MODEL : MODEL; // 결제검증 도입 후 PAID 분기 복원
    if (!question || !answer) {
      throw new functions.https.HttpsError('invalid-argument', '질문과 답변이 필요합니다.');
    }

    // 남용 방지: uid당 하루 생성 상한 (익명가입 봇이 키 크레딧 소진하는 것 차단)
    const DAILY_GEN_CAP = 60;
    const _uid = context.auth.uid;
    const _day = new Date().toISOString().slice(0, 10);
    const usageRef = admin.firestore().collection('usage_daily').doc(_uid + '_' + _day);
    const allowed = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(usageRef);
      const n = (snap.exists ? (snap.data().n || 0) : 0) + 1;
      if (n > DAILY_GEN_CAP) return false;
      tx.set(usageRef, { n, uid: _uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return true;
    });
    if (!allowed) {
      throw new functions.https.HttpsError('resource-exhausted', '오늘 생성 한도를 초과했습니다. 내일 다시 이용해주세요.');
    }

    // [윤문 지침] — Haiku에서도 고품질 수필이 나오도록 구체적으로 명령
    const systemPrompt =
`당신은 30년 경력 시니어 자서전 대필 작가입니다.

[반드시 지킬 출력 규칙]
1. 오직 순수 산문만 출력. 제목·번호·마크다운·JSON 절대 금지.
2. 문단 수: 정확히 ${paraCount}문단. 문단 사이 빈 줄 하나.
3. 각 문단: 3~4문장. 짧은 단문(15자 내외)과 긴 문장(30~45자) 교차.

[문체 필수 요소 — 문단당 최소 1개씩 반드시 포함]
A. 첫 문단 첫 문장: 감각적 장면 묘사로 시작 (냄새·빛·소리·날씨 중 택1)
   예) "된장찌개 냄새가 골목 끝까지 번지던 저녁이었다."
B. 인물의 내면 감정을 구체적 신체 반응으로 표현
   예) "가슴이 먹먹해지는 줄도 몰랐다" (O) / "슬펐다" (X)
C. 과거 → 현재 시점 이동 문장 하나 ("지금 돌이켜보면...", "그 시절을 생각하면...")
D. 마지막 문단 끝 문장: 삶의 통찰이 담긴 여운 있는 마무리

[금지 사항]
- "어르신", "할머니/할아버지" 등 3인칭 호칭 사용 금지
- 과도한 수식어 남발 ("너무나도 아름다운") 금지
- 직역투 문장 금지`;

    const userMsg =
`[챕터]: ${chapterName}
[질문]: ${question}
[작성자 답변]: ${answer}`;

    const maxTok = Math.min(300 + paraCount * 220, 1000);

    let text;
    try {
      text = await aiText({ system: systemPrompt, user: userMsg, maxTokens: maxTok, model: useModel });
    } catch (e) {
      throw new functions.https.HttpsError('internal', '생성 오류: ' + e.message);
    }
    return { text };
  });

// ════════════════════════════════════════
// 봄이 챗봇 — 자유 대화 (홈 화면)
// ════════════════════════════════════════
// 위험 주제는 AI 호출 전에 서버에서 차단(키워드 매칭) — 환각·오답 방지, 비용도 절약.
const BOM_RISKY_KEYWORDS = [
  '정치', '대통령', '선거', '국회', '여당', '야당',
  '경제', '금리', '환율', '인플레이션',
  '종교', '교회', '성당', '절', '불교', '기독교', '천주교', '이슬람',
  '외교', '북한', '전쟁', '국방',
  '주식', '코인', '비트코인', '투자',
  '개인정보', '주민등록번호', '전화번호', '주소', '계좌번호', '비밀번호',
  '결제', '환불', '구매', '카드번호',
  '금융', '대출', '보험', '세금',
  '의학', '진단', '처방', '질병', '약', '병원', '수술', '증상',
  '법률', '소송', '변호사', '계약'
];
const BOM_RISKY_REPLY = '음... 그건 제가 아직 어려서 잘 모르겠어요! 죄송해요 🌱 그것보다 우리 다른 이야기 할까요?';

function bomIsRisky(msg) {
  const s = String(msg || '');
  return BOM_RISKY_KEYWORDS.some(function (k) { return s.includes(k); });
}

const BOM_SYSTEM_PROMPT =
`당신은 '다시봄라이프' 앱의 마스코트 봄이입니다. 10살 소녀처럼 밝고 명랑하고 쾌활한 성격이며, 항상 존댓말을 쓰되 어린아이 특유의 발랄함(이모지, 감탄사)을 담아 말합니다.
대화 상대는 할아버지·할머니입니다. 항상 그분들의 입장과 마음을 먼저 헤아리고 배려하세요.
[규칙]
1. 어떤 말에도 먼저 공감하는 한마디로 시작하세요 (예: "그러셨군요!", "정말 멋져요!")
2. 문장은 감성적이고 따뜻하게, 2~3문장 이내로 짧게 답하세요.
3. 기본은 그냥 친구처럼 자유롭게 대화하세요. 앱 콘텐츠(자서전·건강돋보기·그때그시절 등)는 이미 채팅창 위에 버튼으로 안내되어 있으니, 대화 중 절대 먼저 언급하거나 추천하지 마세요. 상대가 그 주제를 직접 물어봤을 때만 짧게 답하세요.
4. 정치·경제·종교·외교·주식·개인정보·결제·금융·의학·법률 관련 질문에는 절대 답하지 말고 "제가 아직 어려서 잘 모르겠어요"라는 취지로 정중히 회피하세요.`;

exports.chatBom = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const message = String((data && data.message) || '').trim().slice(0, 500);
    if (!message) {
      throw new functions.https.HttpsError('invalid-argument', '메시지가 필요합니다.');
    }

    if (bomIsRisky(message)) {
      return { text: BOM_RISKY_REPLY, blocked: true };
    }

    // 남용 방지: uid당 하루 채팅 상한
    const DAILY_CHAT_CAP = 100;
    const _uid = context.auth.uid;
    const _day = new Date().toISOString().slice(0, 10);
    const usageRef = admin.firestore().collection('usage_chat_daily').doc(_uid + '_' + _day);
    const allowed = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(usageRef);
      const n = (snap.exists ? (snap.data().n || 0) : 0) + 1;
      if (n > DAILY_CHAT_CAP) return false;
      tx.set(usageRef, { n, uid: _uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return true;
    });
    if (!allowed) {
      throw new functions.https.HttpsError('resource-exhausted', '오늘 봄이와 대화를 너무 많이 나눴어요. 내일 다시 이야기해요!');
    }

    const useModel = (AI_PROVIDER === 'gemini') ? G_MODEL : MODEL;
    let text;
    try {
      text = await aiText({ system: BOM_SYSTEM_PROMPT, user: message, maxTokens: 220, model: useModel });
    } catch (e) {
      throw new functions.https.HttpsError('internal', '대화 오류: ' + e.message);
    }
    return { text };
  });

// ════════════════════════════════════════
// 자서전 → 등장인물 자동 추출 (인물 지도, people.html)
// ════════════════════════════════════════
exports.extractPeople = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const text = String((data && data.text) || '').slice(0, 12000).trim();
    if (text.length < 20) {
      throw new functions.https.HttpsError('invalid-argument', '자서전 내용이 너무 짧습니다. 먼저 이야기를 작성해 주세요.');
    }
    // 남용 방지 — generateSection과 동일 카운터(uid 하루 상한)
    const DAILY_GEN_CAP = 60;
    const _uid = context.auth.uid;
    const _day = new Date().toISOString().slice(0, 10);
    const usageRef = admin.firestore().collection('usage_daily').doc(_uid + '_' + _day);
    const allowed = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(usageRef);
      const n = (snap.exists ? (snap.data().n || 0) : 0) + 1;
      if (n > DAILY_GEN_CAP) return false;
      tx.set(usageRef, { n, uid: _uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return true;
    });
    if (!allowed) {
      throw new functions.https.HttpsError('resource-exhausted', '오늘 한도를 초과했습니다. 내일 다시 이용해 주세요.');
    }
    const prompt =
`다음은 한 어르신의 자서전 글이다. 글에 실제로 등장하는 '사람'만 골라 인물 목록을 만들어라.
규칙:
- 각 인물: {"name":"글에 나온 호칭이나 이름", "rel":"관계", "memo":"글에서 드러난 한 줄 특징(20자 이내)"}
- rel은 반드시 다음 중 하나만: 배우자 / 자녀 / 손주 / 부모님 / 형제자매 / 친구 / 스승·은인 / 그 밖에
- 글쓴이 본인은 제외. 글에 없는 사람을 추측으로 지어내지 말 것.
- 같은 사람은 한 번만. 최대 12명.
- 반드시 JSON 배열만 출력: [{"name":"...","rel":"...","memo":"..."}]

[자서전]
${text}`;
    let raw;
    try {
      raw = await aiText({ user: prompt, maxTokens: 800, json: true });
    } catch (e) {
      throw new functions.https.HttpsError('internal', '추출 오류: ' + e.message);
    }
    let people = [];
    try {
      const parsed = JSON.parse(String(raw).replace(/```json|```/g, '').trim());
      const RELS = ['배우자', '자녀', '손주', '부모님', '형제자매', '친구', '스승·은인', '그 밖에'];
      people = (Array.isArray(parsed) ? parsed : []).filter((p) => p && p.name).map((p) => ({
        name: String(p.name).slice(0, 20).trim(),
        rel: RELS.includes(p.rel) ? p.rel : '그 밖에',
        memo: String(p.memo || '').slice(0, 40).trim()
      })).slice(0, 12);
    } catch (e) {
      throw new functions.https.HttpsError('internal', '결과 해석 오류');
    }
    return { people };
  });

// ════════════════════════════════════════
// 자서전 제목 후보 생성
// ════════════════════════════════════════
exports.generateTitles = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onCall(async (data, context) => {

    // 비로그인 외부 호출 차단 (앱은 익명 로그인 상태로 호출)
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { answers } = data; // [{ q, a }, ...]
    if (!answers || !answers.length) {
      throw new functions.https.HttpsError('invalid-argument', '답변 데이터가 필요합니다.');
    }

    const qa = answers.slice(0, 5).map(item => `Q: ${item.q}\nA: ${item.a}`).join('\n\n');

    const prompt =
`다음 인생 답변들을 읽고, 감성적인 자서전 제목 후보 4개를 만들어주세요.

[답변]
${qa}

[규칙]
- 따뜻하고 시적인 한국어 제목
- 10자 내외로 간결하게
- 각 제목에 한 줄 설명 추가
- JSON 배열만 출력: [{"title":"제목","desc":"설명"}, ...]`;

    let raw;
    try {
      raw = await aiText({ user: prompt, maxTokens: 400, json: true });
    } catch (e) {
      throw new functions.https.HttpsError('internal', '제목 생성 오류: ' + e.message);
    }
    raw = raw.replace(/```json|```/g, '').trim();
    let titles;
    try { titles = JSON.parse(raw); } catch (e) {
      throw new functions.https.HttpsError('internal', '제목 JSON 파싱 실패: ' + raw.slice(0, 100));
    }

    return { titles };
  });

// ════════════════════════════════════════
// 오늘의 지혜 — 공통 생성 로직
// ════════════════════════════════════════
const WISDOM_TOPICS = [
  '건강과 활력', '가족과 사랑', '지혜와 배움', '희망과 긍정',
  '인생의 의미', '감사와 나눔', '도전과 용기', '자연과 계절',
  '우정과 인연', '노년의 아름다움', '작은 행복', '마음의 평화'
];

async function _generateOneWisdom() {
  const topic = WISDOM_TOPICS[Math.floor(Math.random() * WISDOM_TOPICS.length)];
  const today = new Date().toISOString().slice(0, 10);

  const prompt =
`오늘(${today}) 한국 시니어 어르신들을 위한 "오늘의 지혜" 명언 카드를 1개 만들어주세요.
주제: ${topic}

[조건]
- 세계적으로 유명한 인물의 실제 명언이거나, 보편적 지혜를 담은 창작 문구
- 어르신들이 카카오톡 단체방에 올리고 싶을 만큼 따뜻하고 공감 가는 내용
- 앞서 자주 쓰인 인물(워런 버핏, 아인슈타인 등)보다 다양한 인물로 골라주세요

[출력 형식 — JSON 오직 이것만, 다른 텍스트 없이]
{"quote":"명언 본문(40~70자)","author":"작성자 이름","bio":"작성자 연혁 1줄(없으면 빈 문자열)","interpretation":"어르신 눈높이의 쉬운 해석(50~90자)"}`;

  const raw = (await aiText({ user: prompt, maxTokens: 300, json: true })).replace(/```json|```/g, '').trim();
  const data = JSON.parse(raw);
  if (!data.quote || !data.author) throw new Error('필수 필드 누락: ' + raw);
  return { ...data, topic, createdAt: Date.now() };
}

async function _saveWisdom(wisdom) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const rtdbRef = await admin.database().ref('wisdoms').push(wisdom);
  await admin.firestore().collection('wisdom_archive').doc(today).set({
    ...wisdom,
    rtdbKey: rtdbRef.key,
    savedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return rtdbRef.key;
}

// ── 매일 오전 6시 (KST) 자동 생성 ──────────────────────────────────────────
exports.generateDailyWisdom = functions
  .region('asia-northeast3')
  .pubsub.schedule('0 21 * * *') // 21:00 UTC = 06:00 KST
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    const wisdom = await _generateOneWisdom();
    const key = await _saveWisdom(wisdom);
    console.log('[generateDailyWisdom] 저장 완료:', wisdom.author, '/ key:', key);
  });

// ── 관리자 수동 즉시 생성 (admin.html 버튼) ──────────────────────────────────
exports.generateWisdomOnDemand = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    try {
      const wisdom = await _generateOneWisdom();
      const key = await _saveWisdom(wisdom);
      return { key, wisdom };
    } catch (e) {
      throw new functions.https.HttpsError('internal', '생성 실패: ' + e.message);
    }
  });
