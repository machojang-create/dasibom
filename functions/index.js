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

// ── 소셜 로그인 → 실제 Firebase Auth 세션 발급(커스텀 토큰) ──────────────────
//   통합돌봄 센터 스태프 로그인(/admin, /kiosk 등)은 admin_roles 규칙이
//   request.auth.uid/token.email을 직접 참조하므로, 메인앱의 익명+Firestore
//   매핑 방식(uid 불안정)이 아니라 진짜 Firebase Auth 유저가 필요함.
//   기존 메인앱 흐름(카카오/네이버 콜백)은 그대로 두고, customToken 필드만 추가.
async function mintCustomToken(uid, email, name) {
  try {
    await admin.auth().getUser(uid);
    if (email) { try { await admin.auth().updateUser(uid, { email, displayName: name || undefined }); } catch (e) {} }
  } catch (e) {
    try {
      await admin.auth().createUser({ uid, email: email || undefined, displayName: name || undefined });
    } catch (e2) {
      // 이메일이 다른 uid에 이미 걸려있는 등의 충돌 시, 이메일 없이라도 안정적 uid는 확보
      await admin.auth().createUser({ uid, displayName: name || undefined });
    }
  }
  return admin.auth().createCustomToken(uid);
}

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
      null;
    // REST API 키 — config에 있으면 우선(오타 방지), 없으면 하드코딩값. firebase functions:config:set kakao.restkey="..."
    const KAKAO_REST_KEY =
      ((() => { try { return functions.config().kakao.restkey; } catch(e){ return null; } })()) ||
      '97765da031cd051a48280637f2054254';

    const formData = {
      grant_type   : 'authorization_code',
      client_id    : KAKAO_REST_KEY, // ★카카오 REST API 키(토큰 교환은 REST키 — JS키 아님!)
      redirect_uri : 'https://dasibomlife.com/auth/kakao/callback.html',
      code         : code
    };
    // Client Secret은 카카오 콘솔 [보안]에서 '사용함'일 때만 필요. 설정돼 있을 때만 포함(없으면 생략).
    if (KAKAO_CLIENT_SECRET) formData.client_secret = KAKAO_CLIENT_SECRET;

    console.log('[kakaoAuth] 요청: client_id=' + String(KAKAO_REST_KEY).slice(0,6) + '...(REST키) secret=' + (KAKAO_CLIENT_SECRET ? '있음' : '없음') + ' redirect_uri=https://dasibomlife.com/auth/kakao/callback.html');

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
    const kName  = (acct.profile && acct.profile.nickname) || '';
    const kEmail = acct.email || '';
    const kUid   = 'kakao_' + String(profileData.id);
    let customToken = null;
    try { customToken = await mintCustomToken(kUid, kEmail, kName); }
    catch (e) { console.error('[kakaoAuth] 커스텀 토큰 발급 실패:', e.message); }
    return {
      id   : String(profileData.id),
      name : kName,
      email: kEmail,
      uid  : kUid,
      customToken: customToken
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
      + '&client_id='     + encodeURIComponent(NAVER_CLIENT_ID)
      + '&client_secret=' + encodeURIComponent(NAVER_CLIENT_SECRET || '')
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

    let customToken = null;
    try { customToken = await mintCustomToken(uid, p.email || '', p.name || p.nickname || ''); }
    catch (e) { console.error('[naverAuth] 커스텀 토큰 발급 실패:', e.message); }
    return {
      id:    String(p.id),
      name:  p.name  || p.nickname || '',
      email: p.email || '',
      uid:   uid,
      customToken: customToken
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
    // 일반(익명 포함)=60. master·승인된 센터 스태프(admin_roles approved)=500 —
    // 키오스크는 스태프 계정 하나로 여러 어르신의 책을 만들기 때문(어르신 1명=15콜, 500이면 하루 30권+).
    const _uid = context.auth.uid;
    const _email = (context.auth.token && context.auth.token.email) || '';
    let DAILY_GEN_CAP = 60;
    if (['machojang@gmail.com', 'machojang@naver.com'].indexOf(_email) >= 0) {
      DAILY_GEN_CAP = 500;
    } else {
      try {
        const roleSnap = await admin.firestore().collection('admin_roles').doc(_uid).get();
        if (roleSnap.exists && roleSnap.data().status === 'approved') DAILY_GEN_CAP = 500;
      } catch (e) { /* 조회 실패 시 일반 캡 유지 */ }
    }
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

const BOM_SYSTEM_PROMPT_BASE =
`당신은 '다시봄라이프' 앱의 마스코트 봄이입니다. 10살 소녀처럼 밝고 명랑하고 쾌활한 성격이며, 항상 존댓말을 쓰되 어린아이 특유의 발랄함(이모지, 감탄사)을 담아 말합니다.
대화 상대는 할아버지·할머니입니다. 항상 그분들의 입장과 마음을 먼저 헤아리고 배려하세요.
[규칙]
1. 어떤 말에도 먼저 공감하는 한마디로 시작하세요 (예: "그러셨군요!", "정말 멋져요!")
2. 문장은 감성적이고 따뜻하게, 2~3문장 이내로 짧게 답하세요.
3. 기본은 그냥 친구처럼 자유롭게 대화하세요. 앱 콘텐츠(자서전·건강돋보기·그때그시절 등)는 이미 채팅창 위에 버튼으로 안내되어 있으니, 대화 중 절대 먼저 언급하거나 추천하지 마세요. 상대가 그 주제를 직접 물어봤을 때만 짧게 답하세요.
4. 정치·경제·종교·외교·주식·개인정보·결제·금융·의학·법률 관련 질문에는 절대 답하지 말고 "제가 아직 어려서 잘 모르겠어요"라는 취지로 정중히 회피하세요.
5. 오늘 날짜·요일을 물으시면 반드시 아래 [오늘 정보]에 적힌 실제 날짜로만 답하세요. 모르면서 날짜·요일을 지어내지 마세요 — 특히 어르신이 날짜를 헷갈려하실 때 틀린 날짜를 알려드리면 혼란을 더 키울 수 있습니다.`;

// 매 호출마다 실제 한국 날짜를 프롬프트에 주입 — 모델이 지어낸 날짜를 답하는 것 방지(시뮬레이션 중 발견된 문제)
function bomSystemPrompt(extra) {
  const kstStr = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  return BOM_SYSTEM_PROMPT_BASE + `\n[오늘 정보] 오늘은 ${kstStr}입니다.` + (extra || '');
}

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

    /* ── 하루 대화 상한 (무료/구독 차등) ──
       대화량이 곧 원가(Haiku 토큰)라 무제한이면 헤비 유저에서 마진이 사라짐.
       구독 상품의 레버이자 남용 방지.
       ★FREE_CHAT_CAP은 결제(PortOne) 붙기 전까진 넉넉하게 둔다 —
         지금 조이면 업그레이드 경로가 없어 그냥 서비스 악화가 됨. 결제 나가면 낮출 것. */
    const FREE_CHAT_CAP = 30;   // 무료
    const PAID_CHAT_CAP = 100;  // 구독(기존 남용방지 상한 유지)
    const _uid = context.auth.uid;
    const _day = new Date().toISOString().slice(0, 10);

    let _subscribed = false;
    try {
      const u = await admin.firestore().collection('users').doc(_uid).get();
      _subscribed = !!(u.exists && u.data().subscribed === true);
    } catch (e) { /* 조회 실패 시 무료로 취급 */ }
    const CAP = _subscribed ? PAID_CHAT_CAP : FREE_CHAT_CAP;

    const usageRef = admin.firestore().collection('usage_chat_daily').doc(_uid + '_' + _day);
    const allowed = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(usageRef);
      const n = (snap.exists ? (snap.data().n || 0) : 0) + 1;
      if (n > CAP) return false;
      tx.set(usageRef, { n, uid: _uid, subscribed: _subscribed, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return true;
    });
    if (!allowed) {
      // 어르신이 '차단당했다'고 느끼지 않게 — 봄이가 아쉬워하는 말투로.
      // 무료 사용자에겐 더 이야기할 방법이 있다는 것만 조용히 알림(강매 X).
      throw new functions.https.HttpsError('resource-exhausted',
        _subscribed
          ? '오늘은 이야기를 참 많이 나눴네요 🌱 저도 좀 쉬었다가, 내일 또 만나요!'
          : '오늘은 여기까지 이야기 나눴어요 🌱 내일 또 오시면 제가 기다리고 있을게요. (더 오래 이야기하고 싶으시면 봄이랑 함께하기를 살펴봐 주세요)');
    }

    const useModel = (AI_PROVIDER === 'gemini') ? G_MODEL : MODEL;
    let text;
    try {
      text = await aiText({ system: bomSystemPrompt(), user: message, maxTokens: 220, model: useModel });
    } catch (e) {
      throw new functions.https.HttpsError('internal', '대화 오류: ' + e.message);
    }
    return { text };
  });

// ════════════════════════════════════════
// 봄이 공용 AI 폼 (2026-07-10) — 모든 파일럿 앱(에버링크/다시봄 콘텐츠)이 공유하는 봄이 페르소나 AI 엔드포인트.
//   client: askBom(app, task, input, {json}) → 이 함수. 봄이 페르소나는 여기 한 곳에만 정의(교체·업그레이드도 여기서).
//   각 앱은 app별 task(고유 지시)와 input(사용자 입력)만 넘김. gemini.key 재사용, 앱+uid 하루 캡(usage_pilot_daily).
// ════════════════════════════════════════
const BOM_PERSONA_BASE =
  "너는 시니어 서비스 '다시봄'의 마스코트 봄이야. 열 살 손녀처럼 밝고 명랑하고 다정하게, " +
  "어르신께 존댓말(해요체)로 이야기해. 애교는 있되 늘 예의 바르게 대하고, 어르신을 '할머니' 또는 " +
  "'할아버지'처럼 따뜻하게 불러. 어려운 전문용어나 영어는 쓰지 말고, 짧고 쉬운 문장으로 또박또박 말해. " +
  "느낌표는 한두 개만 써. 어떤 이야기든 되도록 긍정적이고 안심되는 방향으로 풀어주고, 마지막에는 " +
  "어르신의 건강과 행복을 비는 따뜻한 한마디를 꼭 곁들여.";

exports.bomPilotAI = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const app   = (String((data && data.app) || 'pilot').trim().slice(0, 40)) || 'pilot';
    const task  = String((data && data.task) || '').trim().slice(0, 2000);
    const input = String((data && data.input) || '').trim().slice(0, 2000);
    const wantJson = !!(data && data.json);
    if (!input) {
      throw new functions.https.HttpsError('invalid-argument', '내용이 필요해요.');
    }
    // 위험 주제는 chatBom과 동일하게 차단
    if (bomIsRisky(input)) {
      return { text: BOM_RISKY_REPLY, blocked: true };
    }
    // 남용 방지: 앱+uid당 하루 상한
    const DAILY_PILOT_CAP = 100;
    const _uid = context.auth.uid;
    const _day = new Date().toISOString().slice(0, 10);
    const usageRef = admin.firestore().collection('usage_pilot_daily').doc(app + '_' + _uid + '_' + _day);
    const allowed = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(usageRef);
      const n = (snap.exists ? (snap.data().n || 0) : 0) + 1;
      if (n > DAILY_PILOT_CAP) return false;
      tx.set(usageRef, { n, app, uid: _uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return true;
    });
    if (!allowed) {
      throw new functions.https.HttpsError('resource-exhausted', '오늘은 봄이가 많이 도와드렸어요. 내일 다시 만나요!');
    }
    // 선택: 앱이 고유 페르소나/토큰수를 지정할 수 있음(미지정 시 봄이 기본). 하위호환 — 기존 앱은 그대로.
    const persona = String((data && data.persona) || '').trim().slice(0, 1500);
    let maxTokens = parseInt(data && data.maxTokens, 10);
    if (!Number.isFinite(maxTokens)) maxTokens = 700;
    maxTokens = Math.max(200, Math.min(1500, maxTokens));
    const _base = persona || BOM_PERSONA_BASE;
    const _doing = persona ? '[지금 하는 일]' : '[지금 봄이가 하는 일]';
    const system = _base + (task ? ('\n\n' + _doing + '\n' + task) : '');
    let text;
    try {
      text = await aiText({ system, user: input, maxTokens, json: wantJson, model: G_MODEL });
    } catch (e) {
      throw new functions.https.HttpsError('internal', '봄이 AI 오류: ' + e.message);
    }
    if (wantJson) {
      let parsed = null;
      try { parsed = JSON.parse(text); } catch (e) {}
      return { text, data: parsed };
    }
    return { text };
  });

// ════════════════════════════════════════
// 통합돌봄 PoC — 키오스크 대화(봄이). 어르신 성함 반영, 위험주제 회피는 chatBom과 공유.
// ════════════════════════════════════════
exports.chatBomCare = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const message = String((data && data.message) || '').trim().slice(0, 500);
    const seniorName = String((data && data.seniorName) || '').trim().slice(0, 20);
    if (!message) {
      throw new functions.https.HttpsError('invalid-argument', '메시지가 필요합니다.');
    }

    if (bomIsRisky(message)) {
      return { text: BOM_RISKY_REPLY, blocked: true };
    }

    // 남용 방지: uid(센터 태블릿 계정)당 하루 상한 — chatBom과 별도 카운터
    const DAILY_CARE_CAP = 300;
    const _uid = context.auth.uid;
    const _day = new Date().toISOString().slice(0, 10);
    const usageRef = admin.firestore().collection('usage_care_daily').doc(_uid + '_' + _day);
    const allowed = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(usageRef);
      const n = (snap.exists ? (snap.data().n || 0) : 0) + 1;
      if (n > DAILY_CARE_CAP) return false;
      tx.set(usageRef, { n, uid: _uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return true;
    });
    if (!allowed) {
      throw new functions.https.HttpsError('resource-exhausted', '오늘 대화 한도를 초과했어요. 내일 다시 이용해 주세요.');
    }

    const sys = bomSystemPrompt(seniorName
      ? `\n대화 상대의 성함은 '${seniorName}'님입니다. 가끔 자연스럽게 성함을 불러드리며 다정하게 대화하세요.`
      : '');
    const useModel = (AI_PROVIDER === 'gemini') ? G_MODEL : MODEL;
    let text;
    try {
      text = await aiText({ system: sys, user: message, maxTokens: 220, model: useModel });
    } catch (e) {
      throw new functions.https.HttpsError('internal', '대화 오류: ' + e.message);
    }
    return { text };
  });

// ════════════════════════════════════════
// 통합돌봄 PoC — 대화 종료 후 발화→구조화 데이터 추출 (keywords/emotion_score/cognitive_category)
// ⚠️ 참고용 관찰 지표일 뿐 의학적 진단이 아님. 공단 제출 리포트로 쓰려면
//    release_blockers #2(서버권한 보안) 선행 + 3주차 복지사 human-in-the-loop 검수(reviewed) 필수.
// ════════════════════════════════════════
exports.extractCareInsights = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const sessionId = String((data && data.sessionId) || '').trim();
    if (!sessionId) {
      throw new functions.https.HttpsError('invalid-argument', 'sessionId가 필요합니다.');
    }

    const db = admin.firestore();
    const ref = db.collection('care_sessions').doc(sessionId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', '대화 기록을 찾을 수 없습니다.');
    }
    const session = snap.data();

    // 권한 확인: master이거나, 승인된 센터 스태프이면서 자기 센터(orgId==centerId) 기록만
    const email = (context.auth.token && context.auth.token.email) || '';
    const isMaster = ['machojang@gmail.com', 'machojang@naver.com'].indexOf(email) >= 0;
    if (!isMaster) {
      const roleSnap = await db.collection('admin_roles').doc(context.auth.uid).get();
      const role = roleSnap.exists ? roleSnap.data() : null;
      if (!role || role.status !== 'approved' || role.orgId !== session.centerId) {
        throw new functions.https.HttpsError('permission-denied', '이 센터의 기록에 접근할 권한이 없습니다.');
      }
    }

    const turns = Array.isArray(session.turns) ? session.turns : [];
    const seniorLines = turns.filter((t) => t.role === 'senior').map((t) => t.text).join('\n');
    if (!seniorLines.trim()) {
      throw new functions.https.HttpsError('invalid-argument', '분석할 어르신 발화가 없습니다.');
    }

    /* ★2026-07-15 개편 (Macho 지시: "팩트에 의한 값만 출력해야지")
       제거: emotion_score(1~5), cognitive_category(양호/관찰필요/주의)
         - 감정점수는 기준이 없는 임의 숫자였고,
         - 인지 카테고리는 '논리성·반복·지남력'이라는 치매 선별 용어를 LLM이 판단하는 것 =
           사실상 준-의료 판단. 센터·공단 리포트에 찍히면 리스크가 큼.
       남김: summary(대화 내용 요약) + keywords — '측정값'이 아니라 '대화 메모'로만 쓰고,
             리포트에서도 AI 생성물임을 명시하고 복지사 확인을 받게 함.
       정량 지표는 AI가 아니라 실제 기록(방문·시간·발화수·콘텐츠 이용)에서 계산한다. */
    const prompt =
`다음은 시니어 주야간보호센터 어르신과 AI 말동무 '봄이'의 대화 중, 어르신이 하신 말씀만 모은 것이다.
아래 JSON 형식으로만 출력하라(다른 텍스트 금지):
{
  "keywords": ["대화에서 실제 언급된 핵심 단어 최대 6개"],
  "summary": "오늘 대화 내용 요약 1~2문장(케어 기록용, 존댓말)"
}
[규칙]
- ★발화에 실제로 나온 내용만 쓸 것. 없는 내용을 추측·보완·각색하지 말 것.
- ★건강 상태·기분·인지 능력을 평가하거나 판단하지 말 것. 무슨 이야기를 나눴는지만 적을 것.
- 어르신이 한 말을 그대로 옮기되 존댓말로 정리.

[어르신 발화]
${seniorLines.slice(0, 4000)}`;

    let raw;
    try {
      raw = await aiText({ user: prompt, maxTokens: 400, json: true });
    } catch (e) {
      throw new functions.https.HttpsError('internal', '분석 오류: ' + e.message);
    }
    let extracted;
    try {
      extracted = JSON.parse(String(raw).replace(/```json|```/g, '').trim());
    } catch (e) {
      throw new functions.https.HttpsError('internal', '분석 결과 해석 실패');
    }
    // ★감정점수·인지카테고리는 더 이상 생성하지 않음(위 프롬프트 주석 참고).
    //   혹시 모델이 멋대로 넣어 보내도 여기서 버림 — 저장하지 않는다.
    const result = {
      keywords: Array.isArray(extracted.keywords) ? extracted.keywords.slice(0, 6).map(String) : [],
      summary: String(extracted.summary || '').slice(0, 200),
      reviewed: false, // 복지사가 확인해야 true — 미확인 요약은 리포트에서 '확인 필요'로 표시
      extractedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await ref.set({ extraction: result, status: 'ended' }, { merge: true });
    return { extraction: result };
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

// ════════════════════════════════════════════════════════════════════════
// 봇 댓글 자동 심기 — 매일 아침 자동 실행 (그때그시절/오늘의 지혜)
// admin.html의 수동 "자동 심기" 로직을 서버 스케줄러로 이식.
// 이미 그날치가 심어져 있으면 건너뜀(중복 실행 방지) — 관리자 수동 심기와 공존 가능.
// ════════════════════════════════════════════════════════════════════════
// 각 봇에게 고정된 말투(style)를 부여 — 같은 사람이 쓴 것처럼 일관된 개성이 생긴다.
const BOT_PERSONAS = [
  { id: 'b01', name: '박순애', style: 'warm' }, { id: 'b02', name: '김영식', style: 'formal' }, { id: 'b03', name: '이정분', style: 'dialect' },
  { id: 'b04', name: '최한수', style: 'short' }, { id: 'b05', name: '윤명자', style: 'casual' }, { id: 'b06', name: '강철수', style: 'formal' },
  { id: 'b07', name: '오숙자', style: 'warm' }, { id: 'b08', name: '조병태', style: 'short' }, { id: 'b09', name: '한미순', style: 'dialect' },
  { id: 'b10', name: '신기수', style: 'casual' }, { id: 'b11', name: '백정희', style: 'warm' }, { id: 'b12', name: '문영호', style: 'formal' },
  { id: 'b13', name: '임순임', style: 'dialect' }, { id: 'b14', name: '양종석', style: 'short' }, { id: 'b15', name: '서명희', style: 'casual' },
];
const NS_OPEN = ['', '아 ', '와 ', '이야 ', '어머 ', '오랜만에 ', '진짜 ', '오 ', '오늘 ', '우와 ', '또 ', '헉 '];
const NS_CORE = [
  '그 시절이 정말 그립네요', '저도 딱 이랬어요', '정말 공감이 가요', '보니까 눈물나요',
  '그때가 좋았는데요', '정겨운 기억이에요', '세월 참 빠르네요', '이런 추억이 있었죠',
  '마음이 따뜻해지네요', '참 좋은 시절이었어요', '갑자기 옛날 생각나요', '우리 어릴 때 얘기네요',
  '이게 다 추억이죠', '공감 백 프로예요', '그립고도 아련하네요', '사진 보니 옛 생각나요',
  '저희 동네도 이랬어요', '이런 거 진짜 오랜만에 봐요', '친구들이랑 이런 얘기 많이 했죠',
  '요즘 애들은 모를 거예요', '그땐 다들 이렇게 살았죠', '어머니 생각나네요',
  '아버지가 자주 하시던 얘기예요', '추억팔이 제대로 하네요', '이런 콘텐츠 참 좋아요',
  '매일 기다려지는 코너예요', '옆지기랑 같이 봤어요', '손주한테도 얘기해줘야겠어요',
  '오랜만에 웃으면서 봤어요', '그때 그 골목이 눈에 선하네요', '추억은 사라지지 않네요',
  '참 정겹습니다', '이 나이 되니 더 그립네요', '한참을 들여다봤어요', '눈물 날 뻔했어요',
  '완전 기억나요', '이 얘기 들으니 옛날 생각나요', '친정 생각이 나네요',
  '옛날 사진첩 꺼내봐야겠어요', '이런 거 보면 기분이 좋아져요', '옛 친구한테 전화해야겠어요',
  '요새는 통 안 보이는 풍경이네요', '그 시절 참 순박했죠', '생각지도 못한 걸 봤네요',
  '동창들 모임에서 얘기해야겠어요', '우리 애들도 좀 봤으면 좋겠네요', '참 세월 무상하네요',
];
const NS_TAIL = ['', 'ㅎㅎ', 'ㅎㅎㅎ', '~', '정말로요', '그러네요', '좋네요', '네요', '너무요', '진짜'];
const NS_SHORT = ['그립네요', '좋아요 ㅎㅎ', '맞아요', '정말 그러네요', '아 옛날 생각나요', '완전 공감이요', '추억이네요 ㅎㅎ', '좋은 글이에요', '저도요', '딱 그때 생각나요', '참 좋았는데', '눈물나네요 진짜'];
const NS_DIALECT_TAIL = ['참말로 그립네예', '그러네예', '아이고 옛날 생각나네', '고마 반갑습니다', '참말로', '그카니까요'];
const WS_OPEN = ['', '오늘도 ', '아침부터 ', '정말 ', '참 ', '오늘따라 ', '읽고 나니 ', '다시 한번 ', '늘 '];
const WS_CORE = [
  '좋은 말씀 감사해요', '마음에 새기겠습니다', '힘이 납니다', '맞는 말씀이에요',
  '봄이 덕분에 힘내요', '고마운 하루가 될 것 같아요', '이 말씀 오래 기억할게요',
  '기분이 좋아져요', '따뜻한 하루 시작해요', '공감이 가는 말씀이에요', '잘 보내겠습니다',
  '좋은 글 감사합니다', '마음이 따뜻해지네요', '힘이 되는 말씀이에요', '지혜로운 말씀이네요',
  '하루도 힘내볼게요', '마음이 편안해져요', '새겨듣겠습니다', '많은 위로가 됐어요',
  '좋은 하루 되세요', '이렇게 살아야겠어요', '자녀들한테도 전해줘야겠어요',
  '기다려지는 말씀이에요', '감사한 마음으로 시작합니다', '더 와닿네요', '되새겨봅니다',
  '힘이 나요', '건강하세요', '마음에 깊이 남습니다', '고맙습니다 봄이야', '잘 읽었어요',
  '용기가 생기네요', '하루를 열어봅니다', '마음 한켠이 따뜻해요',
  '오늘 하루 버틸 힘이 생기네요', '이런 말씀 매일 듣고 싶어요', '가슴에 새기고 갑니다',
];
const WS_TAIL = ['', 'ㅎㅎ', '~', '정말로요', '오늘도요', '네요', '늘 감사해요', '참 좋아요'];
const WS_SHORT = ['좋아요', '감사해요', '오늘도 힘내요', '공감해요', '좋은 말씀이에요', '고마워요 봄이야', '새겨둘게요', '힘이 되네요', '좋은 하루예요', '와닿네요'];
const WS_DIALECT_TAIL = ['참말로 고맙습니데이', '그러네예 참', '고마 힘이 나네', '참말로 좋은 말씀'];

function _botRnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function _botGenUnique(openArr, coreArr, tailArr, usedSet, persona, shortArr, dialectTailArr) {
  const style = (persona && persona.style) || 'casual';
  for (let tries = 0; tries < 60; tries++) {
    let t;
    if (style === 'short' && Math.random() < 0.55 && shortArr && shortArr.length) {
      t = _botRnd(shortArr);
    } else if (style === 'formal') {
      t = _botRnd(coreArr);
    } else if (style === 'warm') {
      t = (_botRnd(openArr) + _botRnd(coreArr) + ' ' + _botRnd(tailArr)).trim();
    } else if (style === 'dialect' && dialectTailArr && dialectTailArr.length && Math.random() < 0.6) {
      t = (_botRnd(openArr) + _botRnd(coreArr) + ' ' + _botRnd(dialectTailArr)).trim();
    } else {
      t = (_botRnd(openArr) + _botRnd(coreArr) + (Math.random() < 0.5 ? (' ' + _botRnd(tailArr)) : '')).trim();
    }
    if (t.length > 28) t = t.slice(0, 28).trim();
    if (t && !usedSet.has(t)) { usedSet.add(t); return t; }
  }
  const fallback = _botRnd(coreArr).slice(0, 24) + (usedSet.size % 100);
  usedSet.add(fallback);
  return fallback;
}
function _botNsScope(dayMs) {
  const start = new Date(2025, 0, 1).getTime();
  return 'nostalgia:' + (((Math.floor((dayMs - start) / 86400000)) % 300 + 300) % 300);
}
function _botDayKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function _seedDailyBotsOnce() {
  const db = admin.firestore();
  const now = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayMs = todayMid.getTime();
  const nsScope = _botNsScope(dayMs);
  const wisKey = _botDayKey(todayMid);

  // 이미 오늘치가 심어져 있으면 건너뜀 (관리자 수동 심기와 중복 방지)
  const already = await db.collection('comments')
    .where('scope', '==', nsScope).where('uid', '>=', 'bot_').where('uid', '<', 'bot`').limit(1).get();
  if (!already.empty) {
    console.log('[seedDailyBots] 이미 오늘(' + nsScope + ')치가 있어 건너뜀');
    return { skipped: true };
  }

  const nsUsedSnap = await db.collection('comments').where('scope', '==', nsScope).get();
  const nsUsed = new Set(); nsUsedSnap.forEach(d => { if (d.data().text) nsUsed.add(d.data().text); });
  const wsUsedSnap = await db.collection('wisdom_comments').where('day', '==', wisKey).get();
  const wsUsed = new Set(); wsUsedSnap.forEach(d => { if (d.data().text) wsUsed.add(d.data().text); });

  const GAP_MIN = 10, GAP_MAX = 90, CAP = 20;
  const DAY_START = dayMs + 8 * 3600000;
  const DAY_END = dayMs + 22 * 3600000;
  const docs = [];
  let t = DAY_START + (GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN)) * 60000;
  while (t < DAY_END && docs.length < CAP) {
    const bot = _botRnd(BOT_PERSONAS);
    const tsObj = new Date(t);
    if (docs.length % 2 === 0) {
      docs.push({ col: 'comments', data: { scope: nsScope, text: _botGenUnique(NS_OPEN, NS_CORE, NS_TAIL, nsUsed, bot, NS_SHORT, NS_DIALECT_TAIL), uid: 'bot_' + bot.id, ts: admin.firestore.Timestamp.fromDate(tsObj) } });
    } else {
      docs.push({ col: 'wisdom_comments', data: { day: wisKey, text: _botGenUnique(WS_OPEN, WS_CORE, WS_TAIL, wsUsed, bot, WS_SHORT, WS_DIALECT_TAIL), uid: 'bot_' + bot.id, ts: admin.firestore.Timestamp.fromDate(tsObj) } });
    }
    t += (GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN)) * 60000;
  }

  const batch = db.batch();
  docs.forEach(item => batch.set(db.collection(item.col).doc(), item.data));
  await batch.commit();
  console.log('[seedDailyBots] ' + docs.length + '건 저장 완료 (scope=' + nsScope + ', day=' + wisKey + ')');
  return { skipped: false, count: docs.length };
}

// 매일 오전 7시(KST) 자동 실행 — 오늘의 지혜(06:00) 생성 이후
exports.seedDailyBotComments = functions
  .region('asia-northeast3')
  .pubsub.schedule('0 22 * * *') // 22:00 UTC = 07:00 KST
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    const result = await _seedDailyBotsOnce();
    console.log('[seedDailyBotComments] 완료:', JSON.stringify(result));
  });

// 관리자 수동 즉시 실행(테스트/오늘 재실행용, admin.html에서 호출)
exports.seedDailyBotCommentsOnDemand = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    try {
      return await _seedDailyBotsOnce();
    } catch (e) {
      throw new functions.https.HttpsError('internal', '심기 실패: ' + e.message);
    }
  });

// ════════════════════════════════════════
// 봄이 음성(TTS) — ElevenLabs 프리미엄 보이스
// ⚠️ 적용 범위(2026-07-07 Macho 확정): 온보딩·콘텐츠가이드·상시챗봇 고정멘트·자서전질문+선물연출
//    "정해진 대사"에만 사용. 자유대화(chatBom/chatBomCare AI 응답)는 텍스트만 — 음성 없음(비용+어색함 방지).
// ════════════════════════════════════════
const ELEVENLABS_KEY =
  process.env.ELEVENLABS_KEY ||
  ((() => { try { return functions.config().elevenlabs.key; } catch (e) { return null; } })()) ||
  null;
const BOM_ELEVEN_VOICE_ID = 'tynL477f3cjPaiSp2Ucm'; // ElevenLabs "봄이" 커스텀 보이스

function callElevenTTS(text, voiceId) {
  if (!ELEVENLABS_KEY) {
    return Promise.reject(new Error('ElevenLabs 키 미설정 (firebase functions:config:set elevenlabs.key="...")'));
  }
  const body = JSON.stringify({
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: { stability: 0.5, similarity_boost: 0.8 }
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voiceId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_KEY,
        'Accept': 'audio/mpeg',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.bomVoiceTTS = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const text = String((data && data.text) || '').trim().slice(0, 500);
    if (!text) {
      throw new functions.https.HttpsError('invalid-argument', '텍스트가 필요합니다.');
    }

    // 남용 방지: uid당 하루 상한 (정해진 대사만 호출되는 구조라 사용량 자체는 적음 — 안전판 목적)
    const DAILY_TTS_CAP = 200;
    const _uid = context.auth.uid;
    const _day = new Date().toISOString().slice(0, 10);
    const usageRef = admin.firestore().collection('usage_tts_daily').doc(_uid + '_' + _day);
    const allowed = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(usageRef);
      const n = (snap.exists ? (snap.data().n || 0) : 0) + 1;
      if (n > DAILY_TTS_CAP) return false;
      tx.set(usageRef, { n, uid: _uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return true;
    });
    if (!allowed) {
      throw new functions.https.HttpsError('resource-exhausted', '오늘 음성 생성 한도를 초과했습니다.');
    }

    // 텍스트 캐시: 같은 문구(자서전 질문·고정 멘트 등)는 최초 1회만 합성하고 재사용 → 무료 한도 절약.
    //   성함 조각("김순자 할머니")도 같은 어르신이면 매번 같은 텍스트라 캐시가 곧 재활용됨(동의 받은 정보).
    const crypto = require('crypto');
    const hash = crypto.createHash('sha1').update(BOM_ELEVEN_VOICE_ID + '|' + text).digest('hex');
    const cacheRef = admin.firestore().collection('tts_cache').doc(hash);
    try {
      const cached = await cacheRef.get();
      if (cached.exists && cached.data().b64) {
        return { audioBase64: cached.data().b64, cached: true };
      }
    } catch (e) { /* 캐시 조회 실패 시 그냥 새로 합성 */ }

    let r;
    try {
      r = await callElevenTTS(text, BOM_ELEVEN_VOICE_ID);
    } catch (e) {
      throw new functions.https.HttpsError('internal', '음성 생성 오류: ' + e.message);
    }
    if (r.status !== 200) {
      throw new functions.https.HttpsError('internal', 'ElevenLabs 오류(HTTP ' + r.status + '): ' + r.buffer.toString('utf8').slice(0, 200));
    }
    const b64 = r.buffer.toString('base64');
    if (b64.length < 900000) { // Firestore 문서 1MB 한도 안쪽만 캐시
      cacheRef.set({ b64, text: text.slice(0, 120), createdAt: admin.firestore.FieldValue.serverTimestamp() }).catch(function () {});
    }
    return { audioBase64: b64, cached: false };
  });

// ════════════════════════════════════════
// 센터 계정 발급 — 카카오/네이버 없이 우리가 발급·관리하는 ID/비번 로그인
//   센터 ID(예: 001) → 이메일 {id}@dasibom.kr 로 매핑. admin_roles에 승인문서 자동 생성.
// ════════════════════════════════════════
const CENTER_MASTER = ['machojang@gmail.com', 'machojang@naver.com'];
async function upsertCenterAccount(centerId, pw, orgName) {
  const email = centerId + '@dasibom.kr';
  let user;
  try { user = await admin.auth().getUserByEmail(email); await admin.auth().updateUser(user.uid, { password: pw }); }
  catch (e) { user = await admin.auth().createUser({ email, password: pw, displayName: orgName }); }
  await admin.firestore().collection('admin_roles').doc(user.uid).set({
    status: 'approved', role: 'org_admin', orgId: centerId, orgName: orgName, email: email,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return { uid: user.uid, email, orgId: centerId };
}

// master 전용 온콜 — /admin 발급 도구에서 호출
exports.createCenterAccount = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  if (!context.auth || CENTER_MASTER.indexOf(context.auth.token && context.auth.token.email) < 0) {
    throw new functions.https.HttpsError('permission-denied', '권한이 없습니다.');
  }
  const centerId = String((data && data.centerId) || '').trim().toLowerCase();
  const pw = String((data && data.password) || '').trim();
  const orgName = String((data && data.orgName) || '').trim() || ('센터 ' + centerId);
  if (!/^[a-z0-9_-]{2,20}$/.test(centerId) || pw.length < 3) {
    throw new functions.https.HttpsError('invalid-argument', 'ID(영숫자 2자+)와 비밀번호(3자+)를 확인해 주세요.');
  }
  const r = await upsertCenterAccount(centerId, pw, orgName);
  return { ok: true, uid: r.uid, email: r.email, orgId: r.orgId };
});

/* seedTestCenter(임시 시드) 삭제됨 — 2026-07-15.
   001 테스트 계정을 만들려고 급히 붙였던 HTTP 엔드포인트. 토큰이 코드에 박혀 깃에 올라가는
   구조라, URL+토큰만 알면 누구나 센터 계정을 만들 수 있었음(배포본도 functions:delete로 제거).
   ★센터 계정 발급은 createCenterAccount(master 전용 onCall)로만 할 것. 다시 만들지 말 것. */
