// ════════ 다시봄 파일럿 공용 봄이 AI 클라이언트 ════════
//   askBom(app, task, input, {json}) → 다시봄 Cloud Function `bomPilotAI` 호출.
//   봄이 페르소나는 서버(bomPilotAI)에 1곳만 정의됨 — 여기선 app별 task/input만 넘긴다.
//   필요 패키지: npm i firebase
//   ※ 앱은 다시봄과 같은 Firebase 프로젝트에서 익명 로그인으로 동작(공용 인프라).
// ══════════════════════════════════════════════════════
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

// 다시봄 웹 설정(공개값이라 코드 포함 무방)
const FB_CFG = {
  apiKey: "AIzaSyAZAhBAsrKcXnznnx8_0oF2gyYC0WbvoP0",
  authDomain: "mylife-650f0.firebaseapp.com",
  projectId: "mylife-650f0",
  storageBucket: "mylife-650f0.firebasestorage.app",
  messagingSenderId: "512010655611",
  appId: "1:512010655611:web:32b153b836b23ae96a8fde",
};
const REGION = "asia-northeast3";

function fbApp(): FirebaseApp {
  return getApps().length ? getApps()[0] : initializeApp(FB_CFG);
}
async function ensureAuth() {
  const auth = getAuth(fbApp());
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth;
}

export interface BomAIResult {
  text: string;      // 봄이 목소리 응답(항상 있음)
  data?: any;        // json:true 요청 시 파싱된 객체(실패 시 null)
  blocked?: boolean; // 위험주제로 차단된 경우 true
}

/**
 * 봄이에게 물어보기.
 * @param app   앱 식별자(예: 'dream') — 사용량 캡·로그 구분
 * @param task  이 앱에서 봄이가 할 일(고유 지시). json 원하면 여기 출력 형식도 명시.
 * @param input 사용자 입력(꿈 내용 등)
 * @param opts  { json?: boolean } — 구조화(JSON) 응답 원할 때
 */
export async function askBom(
  app: string,
  task: string,
  input: string,
  opts?: { json?: boolean }
): Promise<BomAIResult> {
  await ensureAuth();
  const fn = httpsCallable(getFunctions(fbApp(), REGION), "bomPilotAI");
  const res: any = await fn({ app, task, input, json: !!(opts && opts.json) });
  return res.data as BomAIResult;
}
