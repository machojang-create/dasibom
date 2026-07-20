# 다시봄 파일럿 공용 키트 (pilot-kit)

에버링크/다시봄 파일럿 앱(구글 AI 스튜디오 산출물 등)에 **복사해서 쓰는 공용 모듈**.
반복 작업(봄이 페르소나·폰트·프리셋·로더)을 앱마다 다시 만들지 않기 위함.

## 파일
| 파일 | 역할 | 앱에 넣는 법 |
|---|---|---|
| `bomAI.ts` | **봄이 AI 클라이언트** — `askBom(app, task, input, {json})` → 다시봄 Cloud Function `bomPilotAI` 호출. 봄이 페르소나는 **서버에 1곳** 정의됨. | 앱 `src/`에 복사. `npm i firebase` 필요. |
| `dasibom-theme.css` | Pretendard 폰트 + 다시봄 브랜드 토큰 → **폰트·색 통일** | 앱 `src/`에 복사 후 진입점에서 `import` |
| `BomThinking.tsx` | "봄이가 생각 중…" 로더 (테마 변수 사용) | 필요 시 복사 |
| `PresetChips.tsx` | 프리셋 버튼(칩) | 필요 시 복사 |

## 인테이크 표준 흐름 (studio-port)
1. 앱의 자체 AI 백엔드(`server.ts`, `/api/*`)를 **`askBom(...)` 호출로 교체** — 서버 안 띄워도 됨.
2. `dasibom-theme.css` 넣고 진입점에서 import (폰트·톤 통일).
3. 앱 고유의 **task(봄이에게 시킬 일)와 프리셋 목록만** 작성.
4. 봄이 페르소나·말투는 손대지 않음 — 서버 `bomPilotAI`가 담당. 말투 바꿀 일 있으면 그 함수만 수정.

## 서버 쪽
`functions/index.js`의 `exports.bomPilotAI` — 봄이 페르소나(`BOM_PERSONA_BASE`) + app별 task 결합,
gemini.key 사용, 인증 필수, `usage_pilot_daily`로 앱+uid 하루 100회 캡.
