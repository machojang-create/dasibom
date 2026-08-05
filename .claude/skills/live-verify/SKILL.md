---
name: live-verify
description: Prove a shipped web change actually works by driving the live page's own JavaScript with the browser MCP and asserting real values — not by eyeballing or clicking through the UI. Gray-box verification: call the page's own functions (calcScore, buildDeck…), mutate app globals to simulate mid-flow state (G.me.hand, STATS.points…), invoke the real handler, then assert the resulting state/DOM, and gate on zero console errors. Use after deploying any change observable on a dasibom page — especially game logic and React bundles with no in-page source. Complements fast-web-debug (root-causing a break) and e2e-web-check (full click-through flow).
user-invocable: true
allowed-tools:
  - Bash(firebase deploy *)
  - mcp__Claude_Browser__navigate
  - mcp__Claude_Browser__javascript_tool
  - mcp__Claude_Browser__read_console_messages
  - mcp__Claude_Browser__resize_window
  - mcp__Claude_Browser__computer
---

# live-verify — 페이지 자체 JS로 "진짜 되는지" 값으로 증명

`firebase deploy` 성공이나 화면이 그럴듯한 것만으로 "됐다"고 하지 않는다. 이 프로젝트에서
가장 많이 쓴 검증법은 **라이브 페이지의 자기 함수·상태를 브라우저 MCP로 직접 호출해 값으로
단언**하는 그레이박스 방식이다. UI를 클릭해 훑는 것(e2e-web-check)이나 버그 원인 추적
(fast-web-debug)과 다르다. 특히 **게임 로직**과 **소스가 없는 React 번들**에 필수.

## 절차

1. **배포**: `firebase deploy --only hosting` (이 프로젝트는 hosting/functions 분리 — firebase-ops 참고).
2. **접속**: `navigate` 로 라이브 URL(예: `https://dasibomlife.com/matgo`). 배포본을 봐야 한다.
3. **순수 로직 단언**: 페이지의 자기 함수를 크래프트한 입력으로 호출해 기대값과 비교.
   - 예) 덱 구성·점수: `buildDeck().length===50`, `_score({cap:[...]},false).pi`, `snapValid({...})`.
   - `javascript_tool` 로 `JSON.stringify({...})` 반환 → 값을 눈으로 확인.
4. **중간 상태 시뮬레이션**: 앱 전역을 직접 조작해 원하는 국면을 만든 뒤 **진짜 핸들러**를 호출하고
   결과 상태/DOM을 단언. (스텁 금지 — 실제 코드 경로를 태운다)
   - 예) 손패에 카드 주입→`playCard('me',card)`→`G.me.cap`·손패수·턴·렌더된 `.card` 확인.
   - 예) 스냅샷 세팅→`doAbandon()`→코인 차감·`localStorage` 삭제·시작화면 표시 확인.
5. **비동기 대기**: 딜 애니·auth 복원 등은 `new Promise(res=>{ (function w(){ 조건? res(...) : setTimeout(w,300) })() })`
   로 폴링해 안정 시점에 단언.
6. **콘솔 에러 게이트**: `read_console_messages({onlyErrors:true})` → **반드시 0**. 에러가 있으면 미완료.
7. **보고**: "정상"이 아니라 **단언한 실제 값**을 보여준다(show-actual-output). 예: `chosenCorrect:true, spent:3, balance:97`.

## 이 환경의 함정 (실제로 겪음)

- **브라우저 pane가 0×0/비합성 상태**면 `computer{action:'screenshot'}`이 5초 타임아웃 나고,
  `getBoundingClientRect().right > innerWidth(=0)` 라 `inViewport` 판정이 거짓이 된다.
  → **스크린샷 대신 JS 단언**을 기본으로. 레이아웃을 꼭 봐야 하면 `resize_window({preset:'mobile'})`
  로 375 뷰포트를 잡은 뒤 `getBoundingClientRect`로 수치 확인.
- **React 번들은 함수명이 minify**돼 있지만 `window` 전역(BomCheer, DasibomPoints 등)과 DOM ref는
  그대로 잡힌다. 소스 없이도 전역·DOM으로 검증 가능.
- **봄이 가이드/튜토리얼 팝업이 UI를 덮어** 셀렉터가 안 잡히는 걸 앱 버그로 오인하기 쉽다 —
  먼저 가이드부터 닫고(‘알겠어요’/닫기) 확인. (bot 쪽은 feature-qa-bot 스킬의 dismissBom 참고)
- **저장 키 이름을 추측하지 말 것**: 초기화하려면 `Object.keys(localStorage)`로 실제 키를 먼저 확인
  (이번에 `nostalgia_quiz`인 줄 알았는데 실제는 `ns_quiz_v1`이라 초기화가 안 먹었다).

## 원칙

- **실패는 앱 버그인지 내 검증 rig 문제인지 먼저 가른다.** 셀렉터·타이밍·상태 세팅을 재확인한 뒤에
  "앱 버그"라고 말한다. (Macho가 검증 엄밀성을 반복 지적 — 스텁·데이터상 정상 금지)
- **분기까지 검증**: 성공 경로뿐 아니라 "안 떠야 하는 경우"(오답·복원·잔액0)도 단언한다.
- 검증이 끝나면 커밋. (checkpoint-commit 참고)
