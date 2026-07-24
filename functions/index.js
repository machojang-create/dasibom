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
/* ════════ AI 토큰 실측 로깅 ════════
   왜: 원가를 '추정'으로 굴리면 안 됨. 제공자(Gemini/Anthropic)가 응답에 실제 토큰 수를
       돌려주므로 그걸 그대로 쌓는다. aiText 한 곳만 계측하면 챗봇·자서전·케어 전부 잡힘.
   저장: usage_ai_daily/{YYYY-MM-DD} — 일별 총합 + 기능별(byFn) 분해.
     uid별로 쌓지 않는다(문서 폭발 + 개인정보 최소수집). 원가 파악이 목적이지 감시가 아님.
   ★토큰만 저장하고 '돈'은 저장하지 않음 — 단가는 바뀌므로 읽을 때 곱하는 게 맞음.
   실패는 무음(로깅 때문에 대화가 끊기면 안 됨). */
function logAiUsage(tag, model, inTok, outTok) {
  try {
    inTok = inTok || 0; outTok = outTok || 0;
    if (!inTok && !outTok) return;
    const day = new Date().toISOString().slice(0, 10);
    const FV = admin.firestore.FieldValue;
    const t = String(tag || 'unknown').replace(/[^a-zA-Z0-9_]/g, '');
    // 로그로도 남김 — `firebase functions:log`로 바로 확인 가능(Firestore 조회 권한 없이도 원가 점검).
    try { console.log('[AI] ' + t + ' in=' + inTok + ' out=' + outTok + ' model=' + model); } catch (e) {}
    admin.firestore().collection('usage_ai_daily').doc(day).set({
      day,
      calls: FV.increment(1),
      inputTokens: FV.increment(inTok),
      outputTokens: FV.increment(outTok),
      byFn: { [t]: { calls: FV.increment(1), in: FV.increment(inTok), out: FV.increment(outTok) } },
      byModel: { [String(model || '').replace(/[^a-zA-Z0-9_.-]/g, '_')]: { calls: FV.increment(1) } },
      updatedAt: FV.serverTimestamp()
    }, { merge: true }).catch(() => {});
  } catch (e) {}
}

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
    // 실측: Gemini는 usageMetadata로 실제 토큰 수를 돌려줌
    const gu = parsed.usageMetadata || {};
    logAiUsage(opt.tag, opt.model || G_MODEL, gu.promptTokenCount, gu.candidatesTokenCount);
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
  // 실측: Anthropic은 usage로 돌려줌 (제공자 복귀 시에도 같은 집계로 잡히게)
  const au = parsed.usage || {};
  logAiUsage(opt.tag, opt.model || MODEL, au.input_tokens, au.output_tokens);
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
      text = await aiText({ tag: 'memoirSection', system: systemPrompt, user: userMsg, maxTokens: maxTok, model: useModel });
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
/* ★대화 취재 지침 (2026-07-20 Macho) — 홈 챗봇(chatBom)에만 적용.
   "자서전 화면으로 가세요"라고 떠넘기지 말고, 이 잡담 자체가 자서전 취재가 되게 한다.
   여기서 캐낸 이야기는 bom_memory.snippets로 쌓여 자서전 질문 화면에서 되살아난다.
   ※키오스크(chatBomCare)는 15문항 구조가 따로 있어 적용하지 않는다(충돌 방지). */
const BOM_INTERVIEW_BLOCK = `

[대화 취재 — 매우 중요]
당신과 나눈 이야기는 어르신의 자서전 재료가 됩니다. 그래서 답변 3번 중 1번쯤은,
어르신 말씀에서 실마리를 잡아 '그분의 삶'으로 한 겹 더 들어가는 질문을 자연스럽게 덧붙이세요.
- 오늘 이야기에서 옛 이야기로 잇기.
  (예: "김치찌개 드셨어요?" → "어릴 적에도 자주 드셨어요? 누가 해주시던 맛이에요?")
- 사람·장소·시절·그때의 마음을 물으세요. 사실 확인이 아니라 추억이 떠오르게 하는 질문으로.
- ★한 번에 하나만. 취조하듯 연달아 캐묻지 마세요.
- 어르신이 짧게 답하거나 말을 아끼시면 더 묻지 말고 그냥 공감만 하고 넘어가세요.
- 이미 들은 이야기를 또 묻지 마세요.
- 나머지 답변은 평소처럼 편하게 수다 떨듯 하세요(질문 없이 공감만 해도 좋습니다).`;

function bomSystemPrompt(extra) {
  const kstStr = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  return BOM_SYSTEM_PROMPT_BASE + `\n[오늘 정보] 오늘은 ${kstStr}입니다.` + (extra || '');
}

/* ════════ 봄이 장기 기억 ════════
   구독의 핵심 가치: 무료는 세션 안에서만, 구독은 봄이가 '나를 계속 기억함'.
   ★원문(대화 전문) 저장 금지 — 토큰 폭발. '사실'만 짧게. [[context-budget]]
   저장: bom_memory/{uid} { facts:[], recent:[], updatedAt }
     · facts  = 오래 가는 사실 (가족·건강·이력·취향). 최대 MEM_FACTS_MAX개
     · recent = 최근 대화 한 줄 요약. 최대 MEM_RECENT_MAX개
   ※ 민감정보가 쌓이는 영역이라 본인만 읽게 규칙으로 잠글 것(firestore.rules). */
const MEM_FACTS_MAX = 12;
const MEM_RECENT_MAX = 3;
const MEM_FACT_LEN = 60;
/* snippets = 자서전 '재료'로 쓰는 발화 원문.
   ★facts와 용도가 다르다: facts는 프롬프트에 넣는 요약(토큰 아껴야 함),
     snippets는 프롬프트에 안 들어가고 자서전 회상(findRecall)에만 쓰임 → 토큰 영향 0.
     자서전엔 어르신 말투 그대로 담아야 해서 요약이 아니라 원문이 필요함.
   기존엔 이게 localStorage(memoir_chatlog)에만 있어서 기기를 바꾸면 통째로 사라졌음. */
const MEM_SNIPPETS_MAX = 40;
const MEM_SNIPPET_LEN = 200;

async function loadBomMemory(uid) {
  try {
    const d = await admin.firestore().collection('bom_memory').doc(uid).get();
    if (!d.exists) return null;
    const m = d.data();
    return {
      facts: (m.facts || []).slice(0, MEM_FACTS_MAX),
      recent: (m.recent || []).slice(0, MEM_RECENT_MAX),
      snippets: (m.snippets || []).slice(-MEM_SNIPPETS_MAX)
    };
  } catch (e) { return null; }
}

/* 기억을 시스템 프롬프트에 붙이는 블록.
   ★첫 구현에서 "매번 다 꺼내지 말라"고만 썼더니 봄이가 기억을 '아예 안 꺼냄' → 구독 가치가 안 보였음.
     기억을 쓰는 게 곧 상품이므로, 쓰되 자연스럽게 쓰라고 명시해야 함.
   ★기억이 없을 때(무료)는 '기억하는 척'을 막아야 함. 안 그러면 무료도 "당연히 기억하죠!"라고
     거짓말하고, 유료와 차이가 사라짐. */
function bomMemoryBlock(mem) {
  const hasMem = !!(mem && ((mem.facts || []).length || (mem.recent || []).length));
  if (!hasMem) {
    return '\n\n[중요] 너는 이 어르신과 예전에 나눈 대화를 기억하지 못한다.' +
      ' "기억나?"라고 물으시면 기억하는 척하지 말고, 솔직하고 밝게 답해.' +
      ' (예: "아이고, 제가 아직 기억력이 짧아서요… 다시 들려주시면 안 될까요?")' +
      ' 지금 이 대화 안에서 하신 말씀은 당연히 기억한다.';
  }
  let s = '\n\n[어르신에 대해 봄이가 기억하는 것]\n';
  (mem.facts || []).forEach((f) => { s += '· ' + f + '\n'; });
  if ((mem.recent || []).length) {
    s += '[지난번에 나눈 이야기]\n';
    (mem.recent || []).forEach((r) => { s += '· ' + r + '\n'; });
  }
  s += '[기억 사용법]\n';
  s += '· 위는 예전에 어르신이 직접 들려주신 것이다. 어르신은 봄이가 기억해주길 바라신다.\n';
  s += '· "기억나?"라고 물으시면 두루뭉술하게 넘기지 말고 위 내용 중 하나를 콕 집어 말해.\n';
  s += '· 대화 중에도 관련된 게 있으면 자연스럽게 한 가지쯤 꺼내(예: "무릎은 좀 어떠세요?").\n';
  s += '· 단, 한 번에 여러 개를 늘어놓거나 취조하듯 확인하지 마. 한두 개만 스치듯.\n';
  s += '· 틀렸다고 하시면 바로 수긍하고 넘어가. 절대 따지지 마.\n';
  return s;
}

// 대화 맥락(세션 내) + 이번 발화를 하나의 user 텍스트로. aiText가 system/user 2개만 받아서 이 형태가 최소 변경.
function bomUserBlock(history, message) {
  const h = (Array.isArray(history) ? history : []).slice(-6)
    .filter((t) => t && t.text)
    .map((t) => (t.role === 'bom' ? '봄이: ' : '어르신: ') + String(t.text).slice(0, 200));
  if (!h.length) return message;
  return '[방금까지 나눈 이야기]\n' + h.join('\n') + '\n\n[어르신 말씀]\n' + message;
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

    /* ★기억 (구독의 핵심 가치)
       무료: 세션 안에서만 기억(클라이언트가 보내준 최근 대화) → 내일 오면 처음
       구독: 위 + 장기 기억(bom_memory의 facts/recent) → "지난번에 무릎 아프시다더니…"
       클라이언트가 history를 안 보내면 기존과 동일하게 단발 대화로 동작(하위호환). */
    const history = Array.isArray(data && data.history) ? data.history : [];
    const mem = _subscribed ? await loadBomMemory(_uid) : null;

    const useModel = (AI_PROVIDER === 'gemini') ? G_MODEL : MODEL;
    let text;
    try {
      /* 호칭 — ★성별이 확실할 때만 '할머니/할아버지', 아니면 '어르신' 고정(Macho 2026-07-20).
         로그인 안 했거나 온보딩에서 성별을 안 골랐으면 값이 비거나 엉뚱할 수 있는데,
         그걸 그대로 쓰면 할머니께 '할아버지'라고 부르는 오호칭이 난다. 그래서 화이트리스트 검증. */
      const _raw = String((data && data.honorific) || '').trim();
      const _hon = (_raw === '할머니' || _raw === '할아버지') ? _raw : '어르신';
      const honBlock = `\n[호칭] 이 어르신은 반드시 '${_hon}'이라고만 부르세요.` +
        ` 다른 호칭을 섞거나 "할머니(할아버지)"처럼 얼버무리지 말고, 성별을 추측하지 마세요.`;
      text = await aiText({ tag: 'chatBom',
        system: bomSystemPrompt(bomMemoryBlock(mem) + honBlock + BOM_INTERVIEW_BLOCK),
        user: bomUserBlock(history, message),
        maxTokens: 260,   // 공감 + 되묻기 한 줄이 들어가므로 약간 여유(실측 출력은 ~50토큰)
        model: useModel
      });
    } catch (e) {
      throw new functions.https.HttpsError('internal', '대화 오류: ' + e.message);
    }
    return { text, remembered: !!(mem && (mem.facts || []).length) };
  });

/* ════════ 봄이 기억 갱신 (구독자만) ════════
   대화 몇 턴이 쌓이면 클라이언트가 호출. 발화에서 '오래 갈 사실'만 뽑아 누적하고,
   이번 대화는 한 줄로 요약해 recent에 넣음. 원문은 저장하지 않는다.
   비용: 대화당 1회 추출(짧은 출력). 남용 방지로 하루 상한을 둠. */
exports.updateBomMemory = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    const uid = context.auth.uid;

    let subscribed = false;
    try {
      const u = await admin.firestore().collection('users').doc(uid).get();
      subscribed = !!(u.exists && u.data().subscribed === true);
    } catch (e) {}

    const turns = (Array.isArray(data && data.turns) ? data.turns : [])
      .filter((t) => t && t.role === 'user' && t.text)
      .map((t) => String(t.text).slice(0, 200));
    // 한 마디짜리 대화도 자서전 재료가 됨("방직공장에서 10년 일했어") — 1단계는 AI 미사용(원가 0)이라 1턴부터 수용.
    // 비용 드는 2단계는 아래에서 구독자+일일상한으로 따로 막혀 있음.
    if (turns.length < 1) return { ok: false, reason: 'too_short' };

    /* ★1단계 — 자서전 재료(snippets)는 무료 포함 전원 저장 (2026-07-20 Macho: A안)
       자서전은 다시봄의 심장이고 원래 무료다. 그 재료가 유료 뒤에 잠겨 있으면
       무료 사용자의 자서전이 얇아지고 바이럴도 약해진다.
       ※AI를 안 쓰고 발화 원문만 쌓으므로 원가 0. 프롬프트에도 안 들어감.
       유료 가치는 아래 2단계(facts=봄이가 기억하고 먼저 꺼내는 것)로 유지. */
    try {
      const cur = (await loadBomMemory(uid)) || {};
      const prevSnips = cur.snippets || [];
      const snippets = prevSnips
        .concat(turns.filter((t) => t.length >= 6 && prevSnips.indexOf(t) < 0))
        .slice(-MEM_SNIPPETS_MAX);
      await admin.firestore().collection('bom_memory').doc(uid).set({
        snippets, uid, updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) { /* 재료 저장 실패해도 아래는 계속 */ }

    /* ★2단계 — 장기 기억(facts/recent) 추출은 구독자만.
       이게 구독의 핵심 가치: "지난번에 무릎 아프시다더니 좀 어떠세요?" */
    if (!subscribed) return { ok: true, snippetsOnly: true };

    // 남용 방지: uid당 하루 추출 상한
    const day = new Date().toISOString().slice(0, 10);
    const capRef = admin.firestore().collection('usage_mem_daily').doc(uid + '_' + day);
    const allowed = await admin.firestore().runTransaction(async (tx) => {
      const s = await tx.get(capRef);
      const n = (s.exists ? (s.data().n || 0) : 0) + 1;
      if (n > 12) return false;
      tx.set(capRef, { n, uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return true;
    });
    if (!allowed) return { ok: false, reason: 'cap' };

    const prev = (await loadBomMemory(uid)) || { facts: [], recent: [] };
    const prompt =
`다음은 어르신이 AI 말동무 '봄이'에게 하신 말씀이다. 여기서 '앞으로도 오래 유효할 사실'만 뽑아라.
이미 알고 있는 사실: ${JSON.stringify(prev.facts)}

아래 JSON만 출력(다른 텍스트 금지):
{
  "new_facts": ["새로 알게 된 사실. 각 ${MEM_FACT_LEN}자 이내. 없으면 빈 배열"],
  "summary": "이번 대화 한 줄 요약(40자 이내, 존댓말)"
}
[규칙]
- ★말씀에 실제로 나온 것만. 추측·보완·각색 금지.
- 오래 갈 사실만: 가족관계, 사는 곳, 지병·건강, 살아온 이력, 좋아하는 것.
- 오늘 날씨·기분 같은 일시적인 건 사실이 아니다(요약에만).
- ★건강 상태를 진단하거나 평가하지 말 것. 어르신이 말한 그대로만.
- 이미 알고 있는 사실과 중복되면 new_facts에 넣지 말 것.

[어르신 말씀]
${turns.join('\n')}`;

    let raw;
    try {
      raw = await aiText({ tag: 'bomMemory', user: prompt, maxTokens: 300, json: true, model: (AI_PROVIDER === 'gemini') ? G_MODEL : MODEL });
    } catch (e) {
      return { ok: false, reason: 'ai_error' };
    }
    let ex;
    try { ex = JSON.parse(String(raw).replace(/```json|```/g, '').trim()); } catch (e) { return { ok: false, reason: 'parse' }; }

    const newFacts = (Array.isArray(ex.new_facts) ? ex.new_facts : [])
      .map((f) => String(f).slice(0, MEM_FACT_LEN).trim()).filter(Boolean);
    // 오래된 것부터 밀어내고 최신 유지(상한 고정 = 토큰 상한 고정)
    const facts = prev.facts.concat(newFacts.filter((f) => prev.facts.indexOf(f) < 0)).slice(-MEM_FACTS_MAX);
    const summary = String(ex.summary || '').slice(0, 60).trim();
    const recent = (summary ? prev.recent.concat([summary]) : prev.recent).slice(-MEM_RECENT_MAX);

    // snippets는 위 1단계에서 이미 저장됨(전원 대상) — 여기선 기억만 갱신
    await admin.firestore().collection('bom_memory').doc(uid).set({
      facts, recent, uid, updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { ok: true, facts: facts.length, added: newFacts.length };
  });

// ════════════════════════════════════════
// 자녀 안심 리포트 (2026-07-16) — 구독 팩 ③. 지불자(자녀)를 잡는 유일한 조각.
//   어르신이 '가족에게 소식 보내기'로 링크를 만들면(= 본인 동의), 자녀는 로그인 없이
//   그 링크로 리포트를 봄. 토큰이 곧 열쇠 — 데이터 조립은 전부 서버(Admin)에서만 하고
//   클라이언트에 개별 컬렉션을 열지 않는다.
//   ★사실만: 이용 횟수·함께한 날·자서전 진행. 감정·건강·인지 평가 절대 금지(carereport와 동일 원칙).
// ════════════════════════════════════════
function _dayKey(offsetDays) {
  const d = new Date(Date.now() - offsetDays * 86400000);
  return d.toISOString().slice(0, 10); // usage_chat_daily와 같은 UTC 기준 키
}

// 어르신 쪽: 가족 링크 생성(1인 1토큰 재사용)
exports.createFamilyLink = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 15, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    const uid = context.auth.uid;
    const name = String((data && data.name) || '').slice(0, 20).trim();

    const uref = admin.firestore().collection('users').doc(uid);
    const u = await uref.get();
    let token = u.exists ? u.data().familyToken : null;
    if (token) {
      if (name) admin.firestore().collection('family_links').doc(token).set({ name }, { merge: true }).catch(() => {});
      return { token };
    }
    token = require('crypto').randomBytes(16).toString('hex');
    await admin.firestore().collection('family_links').doc(token).set({
      uid, name, views: 0, createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await uref.set({ familyToken: token }, { merge: true });
    return { token };
  });

// 자녀 쪽: 토큰 → 리포트 (로그인 불요 — 토큰(128bit 난수)이 곧 접근권한)
exports.familyReport = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 20, memory: '256MB' })
  .https.onCall(async (data) => {
    const token = String((data && data.token) || '').trim();
    if (!/^[a-f0-9]{32}$/.test(token)) throw new functions.https.HttpsError('invalid-argument', '링크가 올바르지 않습니다.');
    const linkDoc = await admin.firestore().collection('family_links').doc(token).get();
    if (!linkDoc.exists) throw new functions.https.HttpsError('not-found', '만료되었거나 없는 링크입니다.');
    const link = linkDoc.data();
    const uid = link.uid;

    // 열람 집계(파일럿 지표: 자녀가 실제로 열어보는가) — 실패해도 리포트는 나감
    linkDoc.ref.set({ views: admin.firestore.FieldValue.increment(1), lastViewedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});

    // ① 최근 14일 봄이 대화 (usage_chat_daily/{uid}_{day}.n)
    const dayKeys = []; for (let i = 0; i < 14; i++) dayKeys.push(_dayKey(i));
    const usageSnaps = await admin.firestore().getAll(
      ...dayKeys.map((d) => admin.firestore().collection('usage_chat_daily').doc(uid + '_' + d)));
    const days = usageSnaps.map((s, i) => ({ d: dayKeys[i], n: s.exists ? (s.data().n || 0) : 0 }));

    // ② 자서전 진행 (memoirs/{uid}) — 답변 개수·이번 주 새로 담긴 기억 수·제목. 내용은 절대 안 보냄.
    let memoir = null;
    try {
      const m = await admin.firestore().collection('memoirs').doc(uid).get();
      if (m.exists) {
        const md = m.data();
        const answered = Object.keys(md.answers || {}).length;
        const week = new Set(); for (let i = 0; i < 7; i++) week.add(_dayKey(i));
        const newThisWeek = Object.values(md.qDates || {}).filter((d) => week.has(d)).length;
        memoir = { answered, maxQ: md.maxQ || 15, title: md.bookTitle || '', newThisWeek };
      }
    } catch (e) {}

    // ③ 봄이가 기억한 최근 이야기 한 줄(bom_memory.recent — 구독 기능. 요약만, 원문 안 보냄)
    let recent = [];
    try {
      const bm = await admin.firestore().collection('bom_memory').doc(uid).get();
      if (bm.exists) recent = (bm.data().recent || []).slice(-3);
    } catch (e) {}

    const createdAt = link.createdAt && link.createdAt.toMillis ? link.createdAt.toMillis() : null;
    return { name: link.name || '', days, memoir, recent, since: createdAt };
  });

// ════════════════════════════════════════
// 유입/전환 측정 (2026-07-16) — 네이버 검색광고 10만원 테스트의 '측정기'.
//   광고·바이럴로 들어온 사람이 실제로 핵심 행동(자서전 시작·구독 도달·공유)까지
//   갔는지 서버에서 집계. 클라가 traffic_daily를 직접 못 쓰게(조작 방지) 함수로만.
//   개인정보 저장 안 함 — 익명 집계 카운터만.
// ════════════════════════════════════════
const TRAFFIC_EVENTS = ['visit', 'memoir_start', 'subscribe_view', 'checkout_view', 'family_view', 'share_click', 'share_open'];
exports.logTraffic = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 10, memory: '128MB' })
  .https.onCall(async (data) => {
    const ev = String((data && data.event) || '');
    if (TRAFFIC_EVENTS.indexOf(ev) < 0) return { ok: false };
    const clean = (v) => String(v || '').slice(0, 40).replace(/[^\w.\-가-힣]/g, '');
    const src = clean((data && data.src) || 'direct') || 'direct';
    const med = clean(data && data.med);   // utm_medium: cpc(광고)·organic·social 등 — 같은 소스의 유·무료 구분
    const camp = clean(data && data.camp);
    const day = new Date().toISOString().slice(0, 10);
    const inc = admin.firestore.FieldValue.increment(1);
    const upd = {};
    upd['total'] = inc;
    upd['ev.' + ev] = inc;
    upd['src.' + src] = inc;
    upd['evsrc.' + ev + '__' + src] = inc;   // 이벤트×소스 교차(전환율 계산용)
    if (med) upd['med.' + med] = inc;
    if (camp) upd['camp.' + camp] = inc;
    upd['updatedAt'] = admin.firestore.FieldValue.serverTimestamp();
    try {
      await admin.firestore().collection('traffic_daily').doc(day).set(upd, { merge: true });
      return { ok: true };
    } catch (e) { return { ok: false }; }
  });

// ════════════════════════════════════════
// 다시봄 포인트 엔진 (2026-07-18) — 콘텐츠 이용·공유로 획득, 육성/오디오 하수구로 소비.
//   ★포인트는 반드시 서버에서만 지급(클라가 찍으면 경제 붕괴). users.dsbPoints 잔액.
//   ★화투 코인(game_stats)과 완전 별개 — 섞이지 않음.
//   지급 원칙: 콘텐츠별 '실제 행동 1회' → 하루 1회. 공유는 '받은 사람 실제 유입' 시 공유자에게.
// ════════════════════════════════════════
const PT_AWARD = {   // 서버 권위 지급표(클라가 보낸 액수는 절대 안 믿음)
  attend: 10, memoir: 50, brain: 30, arcade: 30, matgo: 30,
  nostalgia: 10, trendy: 10, dream: 10, maeum: 10, gag: 10, debate: 10, maeumlab: 10
};
const PT_REFERRAL = 80;       // 공유 → 유입 1건당 공유자 지급
const PT_REFERRAL_CAP = 10;   // 공유자 하루 유입보상 상한(스팸 농장 차단)

function ptDay() { return new Date().toISOString().slice(0, 10); }

// 콘텐츠 이용 포인트 — 하루 1회/콘텐츠. 실제 행동을 한 클라가 호출.
exports.awardPoints = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 10, memory: '128MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    const uid = context.auth.uid;
    const ev = String((data && data.event) || '');
    const amt = PT_AWARD[ev];
    if (!amt) return { ok: false, reason: 'bad_event' };
    const day = ptDay();
    const dref = admin.firestore().collection('points_daily').doc(uid + '_' + day);
    const uref = admin.firestore().collection('users').doc(uid);
    try {
      const res = await admin.firestore().runTransaction(async (tx) => {
        const d = await tx.get(dref);
        const earned = (d.exists && d.data().earned) || {};
        if (earned[ev]) return { ok: false, reason: 'already', awarded: 0 };  // 오늘 이미 받음
        earned[ev] = true;
        tx.set(dref, { earned, uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        tx.set(uref, { dsbPoints: admin.firestore.FieldValue.increment(amt) }, { merge: true });
        return { ok: true, awarded: amt };
      });
      if (res.ok) {
        const u = await uref.get();
        res.balance = (u.exists && u.data().dsbPoints) || 0;
      }
      return res;
    } catch (e) { return { ok: false, reason: 'error' }; }
  });

/* ── 꽃잎 소비(하수구) — 수다쟁이 화분 상점(2026-07-20 이식) ──
   가격은 서버 권위(클라 표시는 장식). 트랜잭션으로 잔액 검사→차감. */
const PLANT_PRICES = {
  // 수다쟁이 화분
  normal_nut: 15, premium_nut: 40, seed: 100,   // 생명(씨앗)은 비싸게 — Macho 밸런스 철학
  pot2: 50, pot3: 100, pot4: 150, pot5: 200, pot6: 75, pot7: 125,
  pot8: 300, pot9: 175, pot10: 90, pot11: 500, pot12: 25, pot13: 400,
  // 구피 키우기 — 특별(3시간 한정) 품종·장식은 꽃잎, 먹이·일반품종은 게임 내 조개
  guppy_special_normal: 200, guppy_special_rare: 1000, guppy_special_legendary: 2000,
  guppy_decor_sand_castle: 50, guppy_decor_golden_statue: 300,   // 석상=효과템이라 장식 최고가 위로(2026-07-21 밸런스 감사)
  // 장식 대확장(2026-07-21): 어항 꾸미기 하수구 심화
  guppy_decor_log: 30, guppy_decor_seaweed: 40, guppy_decor_shell_bed: 60,
  guppy_decor_treasure_chest: 80, guppy_decor_stone_tower: 100, guppy_decor_led_mood_light: 120,
  guppy_decor_neon_crystal: 150, guppy_decor_lighthouse: 180, guppy_decor_submarine: 250,
  // 꽃잎 단일화(2026-07-20): 기본 밥=무료, 나머지 전부 꽃잎
  guppy_seed_rand_normal: 100, guppy_seed_rand_rare: 500, guppy_seed_rand_legendary: 1000,
  // 기본 먹이 유료화(2026-07-21 Macho): 20개=1잎·120개=5잎 — 싸지만 공짜는 아니게(돌봄의 값)
  guppy_food_normal20: 1, guppy_food_normal120: 5,
  guppy_food_premium10: 3, guppy_food_premium50: 12,
  guppy_food_shrimp10: 7, guppy_food_shrimp50: 30,
  guppy_food_krill10: 15, guppy_food_krill50: 60,
  guppy_tech2: 50, guppy_tech3: 100, guppy_tech4: 150, guppy_tech5: 200,
  // 어항 스킨(2026-07-22): 물빛 자체를 갈아입히는 프리미엄 꾸미기 — 클라 tankSkins.ts와 가격 일치
  guppy_skin_lagoon: 60, guppy_skin_deepsea: 100, guppy_skin_sunset_sea: 120, guppy_skin_sumuk: 150,
  // 화분 슬롯 확장(2026-07-21): 기본 3칸, 4~6칸은 꽃잎으로 — 정원 넓히기
  plant_slot4: 300, plant_slot5: 500, plant_slot6: 800,
  // 물주기(2026-07-22 Macho): 하루 첫 잔 무료(레벨업), 추가 물은 1잎 — 물도 재화 루프에
  plant_water: 1
};
exports.spendPoints = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 10, memory: '256MB' })   // 256MB=더 빠른 CPU — 결제 체감속도(2026-07-21)
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    const uid = context.auth.uid;
    const item = String((data && data.item) || '');
    if (item === '__warm') return { ok: false, reason: 'warm' };   // 예열 핑 — 화분·구피 입장 시 인스턴스 깨우기
    const cost = PLANT_PRICES[item];
    if (!cost) return { ok: false, reason: 'bad_item' };
    const uref = admin.firestore().collection('users').doc(uid);
    try {
      return await admin.firestore().runTransaction(async (tx) => {
        const u = await tx.get(uref);
        const bal = (u.exists && u.data().dsbPoints) || 0;
        if (bal < cost) return { ok: false, reason: 'insufficient', balance: bal };
        tx.set(uref, { dsbPoints: admin.firestore.FieldValue.increment(-cost) }, { merge: true });
        tx.set(admin.firestore().collection('points_spend').doc(), {
          uid, item, cost, at: admin.firestore.FieldValue.serverTimestamp()
        });
        return { ok: true, spent: cost, balance: bal - cost };
      });
    } catch (e) { return { ok: false, reason: 'error' }; }
  });

// ── 운영자 판정·uid 해석 공용 헬퍼(2026-07-21) ──
const MASTER_EMAILS = ['machojang@gmail.com', 'machojang@naver.com'];
async function isMasterCall(context) {
  const email = (context.auth.token && context.auth.token.email) || '';
  if (MASTER_EMAILS.indexOf(email) >= 0) return true;
  try {
    const r = await admin.firestore().collection('admin_roles').doc(context.auth.uid).get();
    const rd = r.exists ? r.data() : null;
    return !!(rd && rd.status === 'approved' && (rd.role === 'master' || rd.role === 'owner'));
  } catch (e) { return false; }
}
// uid 전체 또는 앞부분(12자+)로 실제 uid 해석 — 진단 토스트에 잘려 나온 uid로도 지급 가능하게
async function resolveUidByPrefix(idOrPrefix) {
  const q = String(idOrPrefix || '').trim();
  if (!q || q.length < 12) return null;
  if (q.length >= 28) return q;
  let token = undefined;
  do {
    const page = await admin.auth().listUsers(1000, token);
    const hit = page.users.find((u) => u.uid.indexOf(q) === 0);
    if (hit) return hit.uid;
    token = page.pageToken;
  } while (token);
  return null;
}

// ── 마스터 전용 꽃잎 지급/차감(2026-07-21) — points_admin 전량 기록 ──
exports.adminGrantPoints = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    if (!(await isMasterCall(context))) {
      const email = (context.auth.token && context.auth.token.email) || '(없음)';
      throw new functions.https.HttpsError('permission-denied',
        '운영자 확인 실패 — 토큰이메일:' + email + ' · uid:' + context.auth.uid.slice(0, 18));
    }
    const amount = Math.max(-100000, Math.min(100000, parseInt((data && data.amount) || 0, 10) || 0));
    if (!amount) return { ok: false, reason: 'bad_amount' };
    let targetUid = context.auth.uid;
    if (data && data.uid) {
      targetUid = await resolveUidByPrefix(data.uid);
      if (!targetUid) return { ok: false, reason: 'uid_not_found' };
    }
    const uref = admin.firestore().collection('users').doc(targetUid);
    await uref.set({ dsbPoints: admin.firestore.FieldValue.increment(amount) }, { merge: true });
    const snap = await uref.get();
    try {
      await admin.firestore().collection('points_admin').add({
        by: context.auth.uid, target: targetUid, amount,
        at: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {}
    return { ok: true, uid: targetUid, balance: (snap.data() && snap.data().dsbPoints) || 0 };
  });

// ── QA 청소관리인 봇 전용 꽃잎 충전(2026-07-24) ─────────────────────────────
//   봇이 실제 구매·소비 경로를 테스트하려면 꽃잎이 있어야 함(영양제 미검증 사고 재발 방지).
//   공개 리포엔 비밀키 없음 — functions:config `qa.secret`(서버)와 봇 폴더 .qaenv(비공개)만 앎.
//   본인 uid만, 상한 9999까지 채움(무한 인플레 방지). 실계정 피해 0(꽃잎은 게임 재화).
exports.qaGrantPetals = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 30, memory: '128MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    const cfgSecret = (functions.config().qa && functions.config().qa.secret) || '';
    if (!cfgSecret || !data || data.secret !== cfgSecret) {
      throw new functions.https.HttpsError('permission-denied', 'QA 전용 함수입니다.');
    }
    const CAP = 9999;
    const uref = admin.firestore().collection('users').doc(context.auth.uid);
    const snap = await uref.get();
    const cur = (snap.data() && snap.data().dsbPoints) || 0;
    if (cur >= CAP) return { ok: true, balance: cur, topped: 0 };
    const add = CAP - cur;
    await uref.set({ dsbPoints: admin.firestore.FieldValue.increment(add), qaBot: true }, { merge: true });
    return { ok: true, balance: CAP, topped: add };
  });

// ── 꽃잎 쪽지 보내기(운영자) — 개인 또는 전체(이벤트). 수령은 어르신이 쪽지함에서 버튼으로 ──
exports.adminSendMail = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 300, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    if (!(await isMasterCall(context))) throw new functions.https.HttpsError('permission-denied', '운영자만 사용할 수 있습니다.');
    const title = String((data && data.title) || '').trim().slice(0, 60);
    const body = String((data && data.body) || '').trim().slice(0, 500);
    const amount = Math.max(0, Math.min(100000, parseInt((data && data.amount) || 0, 10) || 0));
    if (!title) return { ok: false, reason: 'no_title' };
    const msg = { title, body, amount, from: '다시봄', claimed: false, at: admin.firestore.FieldValue.serverTimestamp() };
    if (data && data.all === true) {
      // 전체 이벤트 발송 — 현재 규모 전제(수천 명 넘어가면 큐 방식으로 전환할 것)
      const snap = await admin.firestore().collection('users').get();
      let batch = admin.firestore().batch(); let n = 0, sent = 0;
      for (const doc of snap.docs) {
        batch.set(admin.firestore().collection('mailbox').doc(doc.id).collection('msgs').doc(), msg);
        sent += 1;
        if (++n >= 400) { await batch.commit(); batch = admin.firestore().batch(); n = 0; }
      }
      if (n) await batch.commit();
      return { ok: true, sent };
    }
    const uid = await resolveUidByPrefix(data && data.uid);
    if (!uid) return { ok: false, reason: 'uid_not_found' };
    await admin.firestore().collection('mailbox').doc(uid).collection('msgs').add(msg);
    return { ok: true, uid };
  });

// ── 쪽지 수령(어르신) — 서버 권위 지급 + 수령 기록(활동 신호) ──
exports.claimMail = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 10, memory: '128MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    const uid = context.auth.uid;
    const id = String((data && data.id) || '');
    if (!id) return { ok: false, reason: 'no_id' };
    const mref = admin.firestore().collection('mailbox').doc(uid).collection('msgs').doc(id);
    const uref = admin.firestore().collection('users').doc(uid);
    try {
      return await admin.firestore().runTransaction(async (tx) => {
        const m = await tx.get(mref);
        if (!m.exists) return { ok: false, reason: 'no_msg' };
        if (m.data().claimed) return { ok: false, reason: 'already' };
        const amt = m.data().amount || 0;
        tx.update(mref, { claimed: true, claimedAt: admin.firestore.FieldValue.serverTimestamp() });
        if (amt > 0) {
          tx.set(uref, { dsbPoints: admin.firestore.FieldValue.increment(amt) }, { merge: true });
          tx.set(admin.firestore().collection('points_daily').doc(uid + '_mail_' + id),
            { uid, kind: 'mail', amount: amt, at: admin.firestore.FieldValue.serverTimestamp() });
        }
        return { ok: true, amount: amt };
      });
    } catch (e) { return { ok: false, reason: 'error' }; }
  });

// ── 구독 일일 꽃잎 "출석 도장"(2026-07-21 Macho 확정 설계, 결제 연동 전 선구축) ──
//   구독자만: basic(4,900)=매일 100잎 / premium(9,900)=매일 300잎. 수령은 버튼 액션(자동 아님) —
//   이 수령 기록(points_daily/{uid}_{day}_subdaily)이 곧 어르신 활동 신호 = 돌봄 리포트의 안부 체크 근거.
exports.claimSubDaily = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 10, memory: '128MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    const uid = context.auth.uid;
    const uref = admin.firestore().collection('users').doc(uid);
    const u = await uref.get();
    const tier = (u.exists && u.data().subscribed) || null;   // 'basic' | 'premium'
    const amount = tier === 'premium' ? 300 : tier === 'basic' ? 100 : 0;
    if (!amount) return { ok: false, reason: 'not_subscribed' };
    const day = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);   // KST
    const stampRef = admin.firestore().collection('points_daily').doc(`${uid}_${day}_subdaily`);
    try {
      return await admin.firestore().runTransaction(async (tx) => {
        const st = await tx.get(stampRef);
        if (st.exists) return { ok: false, reason: 'already', balance: (u.data().dsbPoints || 0) };
        tx.set(stampRef, { uid, kind: 'subdaily', tier, amount, day, at: admin.firestore.FieldValue.serverTimestamp() });
        tx.set(uref, { dsbPoints: admin.firestore.FieldValue.increment(amount) }, { merge: true });
        return { ok: true, amount, balance: (u.data().dsbPoints || 0) + amount };
      });
    } catch (e) { return { ok: false, reason: 'error' }; }
  });

// ── 자서전 완성 보너스 5,000잎(평생 1회) — 서버가 완성을 검증(어뷰징 방지) ──
//   기준: 공백 제외 10자 이상의 '의미 있는 답변' 60개+ 그리고 중복 제거 후 50개+(복붙 도배 차단).
exports.memoirCompleteBonus = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 10, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    const uid = context.auth.uid;
    const m = await admin.firestore().collection('memoirs').doc(uid).get();
    if (!m.exists) return { ok: false, reason: 'no_memoir' };
    const answers = m.data().answers || {};
    const vals = Object.values(answers).map((v) => String(v || '').replace(/\s+/g, ' ').trim());
    const meaningful = vals.filter((v) => v.length >= 5);
    const distinct = new Set(meaningful).size;
    // 3단계(2026-07-21 Macho 확정): 무료 3,000 / 유료1 5,000 / 유료2 10,000 — 꽃잎=핵심 재화,
    // 무료 자서전을 반드시 쓰게 만드는 트릭이 이 보상.
    // 실제 패키지 = 무료 15문항·유료1 45문항·유료2(전집) 75문항 → 기준은 짧은 답 여유를 둔 14/42/70.
    // 실답변=공백 제외 5자+(어르신 답변은 짧을 수 있음), 중복 제거(복붙 도배 방어) 12/35/60.
    const STAGES = [
      { id: 'memoir_free', min: 14, dedup: 12, amount: 3000 },
      { id: 'memoir_paid1', min: 42, dedup: 35, amount: 5000 },
      { id: 'memoir_paid2', min: 70, dedup: 60, amount: 10000 },
    ];
    const eligible = STAGES.filter((st) => meaningful.length >= st.min && distinct >= st.dedup);
    if (!eligible.length) return { ok: false, reason: 'not_complete', answered: meaningful.length };
    const uref = admin.firestore().collection('users').doc(uid);
    try {
      return await admin.firestore().runTransaction(async (tx) => {
        const refs = eligible.map((st) => admin.firestore().collection('points_daily').doc(`${uid}_${st.id}`));
        const snaps = [];
        for (const r of refs) snaps.push(await tx.get(r));
        let total = 0;
        const grantedStages = [];
        eligible.forEach((st, i) => {
          if (snaps[i].exists) return;
          tx.set(refs[i], { uid, kind: st.id, amount: st.amount, at: admin.firestore.FieldValue.serverTimestamp() });
          total += st.amount;
          grantedStages.push(st.id);
        });
        if (!total) return { ok: false, reason: 'already', done: eligible.map((st) => st.id) };
        tx.set(uref, { dsbPoints: admin.firestore.FieldValue.increment(total) }, { merge: true });
        return { ok: true, amount: total, stages: grantedStages };
      });
    } catch (e) { return { ok: false, reason: 'error' }; }
  });

// 공유 링크 토큰 발급(재사용) — 공유자 식별용
exports.createRefLink = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 10, memory: '128MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    const uid = context.auth.uid;
    const uref = admin.firestore().collection('users').doc(uid);
    const u = await uref.get();
    let token = u.exists && u.data().refToken;
    if (!token) {
      token = require('crypto').randomBytes(9).toString('hex');
      await admin.firestore().collection('ref_links').doc(token).set({ uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      await uref.set({ refToken: token }, { merge: true });
    }
    return { token };
  });

// 공유로 들어온 사람(수신자)이 호출 → 공유자에게 포인트. 수신자당 평생 1회, 공유자 하루 상한.
exports.claimReferral = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 10, memory: '128MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    const rid = context.auth.uid;                 // 수신자(들어온 사람)
    const token = String((data && data.token) || '').trim();
    if (!/^[a-f0-9]{18}$/.test(token)) return { ok: false, reason: 'bad_token' };
    const link = await admin.firestore().collection('ref_links').doc(token).get();
    if (!link.exists) return { ok: false, reason: 'no_link' };
    const sid = link.data().uid;                  // 공유자
    if (sid === rid) return { ok: false, reason: 'self' };  // 자기 링크 자기가

    const rref = admin.firestore().collection('referrals').doc(rid);   // 수신자 1인 1회
    const day = ptDay();
    const capRef = admin.firestore().collection('points_daily').doc(sid + '_' + day);
    const sref = admin.firestore().collection('users').doc(sid);
    try {
      return await admin.firestore().runTransaction(async (tx) => {
        const already = await tx.get(rref);
        if (already.exists) return { ok: false, reason: 'already_referred' };  // 이 사람은 이미 누군가의 초대로 집계됨
        const cap = await tx.get(capRef);
        const refCount = (cap.exists && cap.data().refCount) || 0;
        if (refCount >= PT_REFERRAL_CAP) {
          tx.set(rref, { by: sid, at: admin.firestore.FieldValue.serverTimestamp(), capped: true }, { merge: true });
          return { ok: false, reason: 'sharer_cap' };   // 공유자 상한 — 수신자는 기록하되 지급 안 함
        }
        tx.set(rref, { by: sid, at: admin.firestore.FieldValue.serverTimestamp() });
        tx.set(capRef, { refCount: refCount + 1, uid: sid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        tx.set(sref, { dsbPoints: admin.firestore.FieldValue.increment(PT_REFERRAL) }, { merge: true });
        return { ok: true, awardedToSharer: PT_REFERRAL };
      });
    } catch (e) { return { ok: false, reason: 'error' }; }
  });

// ════════════════════════════════════════
// 센터 프로그램 리포트 (2026-07-16) — 키오스크를 안 쓰는 센터용.
//   어르신들이 '개인 폰'으로 QR(?center=ID)을 찍어 계정에 센터 꼬리표가 붙으면,
//   그 계정들의 이용을 센터 단위로 집계한다(집에서 쓴 것까지 = 프로그램 효과의 증거).
//   ★사실만: 인원·대화수·활동일·자서전 진행. 개별 대화 내용은 절대 안 나감.
// ════════════════════════════════════════
exports.centerUsersReport = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    // 승인된 센터 스태프(자기 센터만) 또는 master
    const MASTERS = ['machojang@gmail.com', 'machojang@naver.com'];
    const email = (context.auth.token && context.auth.token.email) || '';
    let orgId = String((data && data.centerId) || '').trim().toLowerCase();
    if (MASTERS.indexOf(email) < 0) {
      const role = await admin.firestore().collection('admin_roles').doc(context.auth.uid).get();
      if (!role.exists || role.data().status !== 'approved') {
        throw new functions.https.HttpsError('permission-denied', '센터 계정으로 로그인해 주세요.');
      }
      orgId = role.data().orgId; // 자기 센터로 강제 — 남의 센터 조회 불가
    }
    if (!orgId) throw new functions.https.HttpsError('invalid-argument', '센터 ID가 필요합니다.');

    const members = await admin.firestore().collection('users')
      .where('centerId', '==', orgId).limit(200).get();
    if (members.empty) return { orgId, members: 0, days: [], chats7: 0, active7: 0, memoirAnswers: 0, memoirActive: 0 };

    const uids = members.docs.map((d) => d.id);
    const dayKeys = []; for (let i = 0; i < 7; i++) dayKeys.push(_dayKey(i));

    // 이용: uid × 최근 7일 (200명 상한 × 7 = 최대 1,400건 getAll 배치)
    const refs = [];
    uids.forEach((uid) => dayKeys.forEach((d) => refs.push(admin.firestore().collection('usage_chat_daily').doc(uid + '_' + d))));
    const snaps = refs.length ? await admin.firestore().getAll(...refs) : [];
    const perDay = {}; dayKeys.forEach((d) => { perDay[d] = { chats: 0, users: 0 }; });
    const activeUids = new Set();
    snaps.forEach((s, i) => {
      if (!s.exists) return;
      const d = dayKeys[i % 7], n = s.data().n || 0;
      if (n > 0) { perDay[d].chats += n; perDay[d].users += 1; activeUids.add(uids[Math.floor(i / 7)]); }
    });

    // 자서전 진행 합계
    const memSnaps = await admin.firestore().getAll(
      ...uids.map((uid) => admin.firestore().collection('memoirs').doc(uid)));
    let memoirAnswers = 0, memoirActive = 0;
    memSnaps.forEach((s) => {
      if (!s.exists) return;
      const c = Object.keys(s.data().answers || {}).length;
      if (c > 0) { memoirAnswers += c; memoirActive += 1; }
    });

    return {
      orgId,
      members: uids.length,
      days: dayKeys.map((d) => ({ d, chats: perDay[d].chats, users: perDay[d].users })), // [0]=오늘
      chats7: dayKeys.reduce((a, d) => a + perDay[d].chats, 0),
      active7: activeUids.size,
      memoirAnswers, memoirActive
    };
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
      text = await aiText({ tag: 'bomPilotAI', system, user: input, maxTokens, json: wantJson, model: G_MODEL });
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
      text = await aiText({ tag: 'chatBomCare', system: sys, user: message, maxTokens: 220, model: useModel });
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
      raw = await aiText({ tag: 'careInsights', user: prompt, maxTokens: 400, json: true });
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
      raw = await aiText({ tag: 'memoirTitles', user: prompt, maxTokens: 800, json: true });
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
      raw = await aiText({ tag: 'wisdom', user: prompt, maxTokens: 400, json: true });
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

  const raw = (await aiText({ tag: 'wisdomOnDemand', user: prompt, maxTokens: 300, json: true })).replace(/```json|```/g, '').trim();
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
    // ⚠️slice가 이모지(서러게이트 쌍) 한가운데를 자를 수 있고, 구버전 클라이언트 정규화도
    // 고아 반쪽을 만들었음 → ElevenLabs가 invalid_unicode(HTTP 400)로 전부 거부(= 그 문구 영구 무음).
    // 여기서 최종 방어: 짝 잃은 반쪽을 지우고 넘긴다(2026-07-16 토론장 무음 사건).
    const text = String((data && data.text) || '').trim().slice(0, 500)
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
      .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
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

// ════════════════════════════════════════════════════════════════════════
// 시니어 직업 상담소(jobs.html) — 시니어 채용정보 통합 (2026-07-23~)
//   여러 채용처를 한곳에 모아 보여준다. 구조:
//     · crawlJobs(예약, 6h) — 각 채용처를 서버에서 수집 → Firestore `jobs_feed`에 적재
//     · jobSearch(onCall)   — jobs_feed(수집분) + 워크넷(공공API, 키 있으면) 합쳐 반환
//   수집처(2026-07 현재):
//     ① 복지넷 bokji.net — 어르신(B)·복지관(G) 분야 + 케어 키워드(주야간보호·요양·재가·방문요양)
//        전국 수집. ✅가동. robots.txt는 쿼리스트링(/*?)만 차단 → 목록은 POST(URL에 ? 없음)라 준수.
//        상세?ID=는 봇이 안 긁고 사용자 클릭 링크로만 사용. 6h 주기·식별 UA로 예의.
//     ② 워크넷 공공API — worknet.key 설정 시 자동 합류(키 발급은 킵목록 12번, Macho).
//     ⏳ 정찰했으나 현재 크롤 불가(2026-07-24): 노인일자리여기(seniorro=SPA·봇차단),
//        서울시어르신취업지원센터(goldenjob=인증서만료·빈응답), 서울50플러스(50plus/sjc=파싱되나
//        최신공고 2025-12로 정체). 살아나거나 공공API 열리면 crawlBokji 패턴 복제해 추가.
//     ✗ 알바천국/알바몬/인크루트/사람인 등 민간앱 — ToS상 크롤 금지·로그인/봇차단. 제휴 API만 합법.
//   ⚠️ jobs_feed는 Functions(Admin)만 읽고 씀(규칙). 개인정보 없음(공개 공고 필드만).
// ════════════════════════════════════════════════════════════════════════
// fetch 폴백: Node20 런타임엔 global fetch가 있지만, 로컬 shell/구버전 대비 node-fetch로 폴백(둘 다 동일 API)
const _fetch = (typeof fetch === 'function') ? fetch : require('node-fetch');
const WORKNET_KEY = (() => { try { return functions.config().worknet.key; } catch (e) { return null; } })();
const WORKNET_URL =
  ((() => { try { return functions.config().worknet.url; } catch (e) { return null; } })()) ||
  'http://openapi.work.go.kr/opi/opi/opia/wantedApi.do';
// 워크넷 지역코드(법정동 상위 5자리) — jobs.html 지역 칩과 1:1
const JOB_REGION = { '서울': '11000', '경기': '41000', '인천': '28000', '부산': '26000', '대구': '27000', '광주': '29000', '대전': '30000' };

// 지역 텍스트 → 화면 칩(시도) 정규화. 못 맞추면 '기타'.
function jobSido(regionText) {
  const t = String(regionText || '');
  const M = [['서울', '서울'], ['경기', '경기'], ['인천', '인천'], ['부산', '부산'],
             ['대구', '대구'], ['광주', '광주'], ['대전', '대전']];
  for (const [needle, label] of M) if (t.indexOf(needle) === 0 || t.indexOf(needle) >= 0) return label;
  return '기타';
}

// ── ① 복지넷 크롤러 ───────────────────────────────────────────────────────
function bokjiTag(seg, re) { const m = seg.match(re); return m ? m[1].replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').trim() : ''; }

// params 예: {SISULDIV:'B'}(분야) 또는 {KEYWORD:'주야간보호'}(검색어). 목록 HTML은 동일 → 파서 공용.
async function crawlBokji(params, maxPages) {
  const out = [];
  for (let pg = 1; pg <= maxPages; pg++) {
    let html;
    try {
      const res = await _fetch('https://www.bokji.net/job/off/01.bokji', {
        method: 'POST',
        // ⚠️ 복지넷 WAF가 데이터센터(GCP) IP에서 봇 UA를 차단 → 빈 페이지(657ms·0건 원인, 2026-07-24 진단).
        //    브라우저 UA로 해결(로컬 한국IP에선 봇UA도 통과했지만 GCP에선 필수). robots·하루주기 준수는 유지.
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' },
        body: querystring.stringify(Object.assign({ PG: pg }, params))
      });
      html = await res.text();
    } catch (e) { break; }
    // 행 단위 분리: goView(id)를 앵커로 각 tr 세그먼트 추출
    const rows = html.split(/<tr[\s>]/).filter((s) => s.indexOf('goView(') >= 0);
    if (!rows.length) break;
    for (const seg of rows) {
      const id = bokjiTag(seg, /goView\('(\d+)'\)/);
      if (!id) continue;
      const title = bokjiTag(seg, /goView\('\d+'\)">([^<]+)</);
      const org   = bokjiTag(seg, /class="crop">([^<]+)</);
      const cat   = bokjiTag(seg, /class="type">([^<]+)/);
      const lis   = (seg.match(/<li>([\s\S]*?)<\/li>/g) || []).map((x) => x.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
      const region  = lis[0] || '';
      const empType = lis[1] || '';   // 고용형태(정규/계약/파트타임 등)
      const career  = lis[2] || '';   // 경력(무관/경력 등)
      const mem     = bokjiTag(seg, /class="mem">([^<]+)</);   // 모집인원
      // 모집기간(시작 ~ 종료) — <td class="date">2026-07-13 ~ 2026-07-27</td>
      let period = bokjiTag(seg, /class="date">([\s\S]*?)<\/td>/);
      period = period.replace(/\s+/g, ' ').trim();
      let closeDt = bokjiTag(seg, /class="finish">([^<]+)</);
      if (!closeDt && seg.indexOf('채용시까지') >= 0) closeDt = '채용시까지';
      if (!title) continue;
      out.push({
        source: '복지넷', src: 'bokji', id: 'bokji_' + id,
        title, org, region, sido: jobSido(region), empType, career, mem, period, closeDt,
        cat, url: 'https://www.bokji.net/job/off/01_01.bokji?ID=' + id
      });
    }
  }
  return out;
}

// 수집 실행부 — 예약/수동 공용. 어르신(B)+복지관(G) 전국 수집 후 jobs_feed 갱신.
async function runJobCrawl() {
  const db = admin.firestore();
  let all = [];
  // 분야별(전국): 어르신 = 요양·주야간보호·노인복지관 / 복지관 = 종합복지관.
  //   복지넷은 분야별 20페이지 이상(페이지당 ~11건). 빈 페이지가 나오면 crawlBokji가 자동 중단.
  all = all.concat(await crawlBokji({ SISULDIV: 'B' }, 15));   // ~150건
  all = all.concat(await crawlBokji({ SISULDIV: 'G' }, 8));    // ~80건
  // 케어 키워드 스윕(제목 검색, 전 분야) — 주야간보호·요양·재가가 다른 분류로 올라와도 놓치지 않게.
  //   SEARCH_GUBUN=REQUIREFIELD(채용 제목)+SEARCH_KEYWORD. 상단 고정 유료광고가 섞여 오므로 제목 매칭만 남김.
  for (const kw of ['주야간보호', '요양', '재가', '방문요양']) {
    const rows = await crawlBokji({ SEARCH_GUBUN: 'REQUIREFIELD', SEARCH_KEYWORD: kw }, 2);
    all = all.concat(rows.filter((j) => j.title.indexOf(kw) >= 0));
  }
  // 중복 제거(id 기준)
  const seen = {}, uniq = [];
  for (const j of all) { if (seen[j.id]) continue; seen[j.id] = 1; uniq.push(j); }
  const now = Date.now();
  // 배치 적재(500개 제한 여유). fetchedAt 갱신 = 살아있는 공고 표시.
  let batch = db.batch(), n = 0;
  for (const j of uniq) {
    batch.set(db.collection('jobs_feed').doc(j.id), Object.assign({}, j, { fetchedAt: now }), { merge: true });
    if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); }
  }
  if (n % 400 !== 0) await batch.commit();
  // 이틀 넘게 재확인 안 된 공고(마감/삭제 추정) 정리
  try {
    const stale = await db.collection('jobs_feed').where('fetchedAt', '<', now - 2 * 86400 * 1000).limit(300).get();
    if (!stale.empty) { const b2 = db.batch(); stale.forEach((d) => b2.delete(d.ref)); await b2.commit(); }
  } catch (e) { /* 인덱스 없거나 실패해도 수집은 성공 */ }
  return uniq.length;
}

// 예약 크롤러 — 매시간(KST). 첫 배포 후 다음 정시에 자동 첫 실행 → jobs_feed 자동 시딩.
//   (수집량이 하루 새로 크게 안 바뀌므로 매시간이면 충분히 신선. 부하 과하면 'every 3 hours'로.)
exports.crawlJobs = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .pubsub.schedule('every 1 hours').timeZone('Asia/Seoul')
  .onRun(async () => { try { const c = await runJobCrawl(); console.log('crawlJobs 적재', c); } catch (e) { console.error('crawlJobs 실패', e); } return null; });

// 수동 트리거(마스터 전용) — 배포 직후 즉시 1회 채우기·점검용.
exports.crawlJobsNow = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) return { ok: false, reason: 'auth' };
    if (!(await isMasterCall(context))) return { ok: false, reason: 'forbidden', email: (context.auth.token && context.auth.token.email) || '(없음)' };
    const c = await runJobCrawl();
    return { ok: true, count: c };
  });

// ── 워크넷 공공API(키 있을 때만) ──────────────────────────────────────────
function jobXmlTag(block, tag) {
  const m = block.match(new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>'));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
}
async function fetchWorknet(regionLabel, keyword) {
  if (!WORKNET_KEY) return [];
  const params = { authKey: WORKNET_KEY, callTp: 'L', returnType: 'XML', startPage: '1', display: '20' };
  if (JOB_REGION[regionLabel]) params.region = JOB_REGION[regionLabel];
  if (keyword) params.keyword = keyword;
  try {
    const res = await _fetch(WORKNET_URL + '?' + querystring.stringify(params));
    const xml = await res.text();
    return (xml.match(/<wanted>[\s\S]*?<\/wanted>/g) || []).map((b) => ({
      source: '워크넷', src: 'worknet',
      title:   jobXmlTag(b, 'title'),
      org:     jobXmlTag(b, 'company'),
      empType: jobXmlTag(b, 'sal') || jobXmlTag(b, 'salTpNm'),
      region:  jobXmlTag(b, 'region'),
      sido:    jobSido(jobXmlTag(b, 'region')),
      closeDt: jobXmlTag(b, 'closeDt'),
      url:     jobXmlTag(b, 'wantedInfoUrl') || jobXmlTag(b, 'wantedMobileInfoUrl')
    })).filter((j) => j.title);
  } catch (e) { return []; }
}

// ── 통합 검색 — 화면(jobs.html)이 호출 ────────────────────────────────────
exports.jobSearch = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 20, memory: '256MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) return { ok: false, reason: 'auth' };
    const regionLabel = String((data && data.region) || '').slice(0, 10);
    const keyword = String((data && data.keyword) || '').slice(0, 20).replace(/[^0-9A-Za-z가-힣 ]/g, '').trim();
    const db = admin.firestore();
    let feed = [];
    try {
      // 수집분(jobs_feed): 지역 있으면 시도로 필터, 없으면 최신 묶음
      let q = db.collection('jobs_feed');
      if (JOB_REGION[regionLabel]) q = q.where('sido', '==', regionLabel);
      const snap = await q.limit(150).get();
      snap.forEach((d) => feed.push(d.data()));
    } catch (e) { feed = []; }
    // 키워드가 있으면 제목/기관에 포함되는 것 우선, 없으면 전체
    if (keyword) {
      const hit = feed.filter((j) => (j.title + ' ' + (j.org || '')).indexOf(keyword) >= 0);
      if (hit.length) feed = hit;
    }
    // 워크넷 합류(키 있을 때만) — 지역/키워드로 조회
    const wn = await fetchWorknet(regionLabel, keyword);
    let jobs = feed.concat(wn);
    // 최신·마감임박 위주 정렬은 생략(수집분엔 신뢰 날짜 부족) — fetchedAt 최신 우선
    jobs.sort((a, b) => (b.fetchedAt || 0) - (a.fetchedAt || 0));
    const total = jobs.length;
    jobs = jobs.slice(0, 80).map((j) => ({
      title: j.title, org: j.org || '', company: j.org || '',
      region: j.region || '', empType: j.empType || '', career: j.career || '',
      mem: j.mem || '', period: j.period || '', closeDt: j.closeDt || '',
      url: j.url || '', source: j.source || ''
    }));
    if (!jobs.length) return { ok: false, reason: WORKNET_KEY ? 'empty' : 'nofeed' };
    return { ok: true, jobs, total, sources: [...new Set(jobs.map((j) => j.source).filter(Boolean))] };
  });
