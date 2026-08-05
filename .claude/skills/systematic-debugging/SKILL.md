---
name: systematic-debugging
description: Structured protocol for chasing a reported bug that doesn't reproduce cleanly — especially "이 화면이 스킵/안 됨" style reports on this vanilla-JS PWA. Use whenever a user reports something broken but the failure mode is vague, intermittent, or you're not yet sure if it's an app bug vs. a testing-tool artifact. Prevents burning time chasing the wrong layer.
user-invocable: true
allowed-tools:
  - Bash(git diff *)
  - Bash(git log *)
  - Grep
  - Read
  - mcp__Claude_Preview__preview_eval
  - mcp__Claude_Preview__preview_click
  - mcp__Claude_Preview__preview_console_logs
  - mcp__Claude_Preview__preview_resize
---

# systematic-debugging — 애매한 버그 리포트 추적 절차

"방금 그거 하다가 꼬인 것 같아" 류의 리포트는 원인이 (a) 진짜 로직 버그,
(b) 최근 diff의 다른 부분, (c) 캐시된 구버전 JS, (d) 테스트 툴 자체의 오류,
넷 중 하나인 경우가 많다. 순서를 건너뛰고 바로 코드를 고치려 들면 엉뚱한 곳을
수정하게 된다.

## 절차 (이 순서를 지킬 것)

1. **범위부터 좁힌다.** `git diff <파일>`로 최근에 실제로 뭘 바꿨는지 먼저 본다.
   사용자가 "조금 전 작업"이라고 말한 게 정말 방금 그 기능을 건드렸는지,
   아니면 세션 초반의 다른 작업(예: 게임 난이도 조정)을 가리키는지 헷갈리지
   말 것 — 애매하면 문자열 검색으로 후보를 좁힌다.
2. **로직을 UI에서 분리해서 먼저 검증한다.** 콘솔에서 문제의 함수를 직접
   호출(`preview_eval`로 `resumeJourney()` 같은 함수를 바로 실행)해서 예외 없이
   의도한 화면 전환/상태변화가 일어나는지 본다. 이게 통과하면 로직 자체는
   정상이라는 뜻이고, 남은 원인은 (c) 캐시 또는 (d) 클릭 시뮬레이션이다.
3. **다음으로 프로그래매틱 클릭을 시도한다.** `element.click()`을 eval로
   직접 호출. 이것도 통과하면 이벤트 바인딩도 정상.
4. **그 다음에야 `preview_click`(좌표 기반 실클릭 시뮬레이션)을 시도한다.**
   이 프로젝트에서 `preview_click`이 뷰포트를 리사이즈하지 않은 채 쓰면
   0x0 뷰포트로 인해 아예 이벤트가 안 붙는 현상이 확인된 적 있다 — 실패하면
   먼저 `preview_resize`(mobile 375x812)를 했는지부터 의심할 것. 리사이즈
   후에도 실패하고 스크린샷도 타임아웃되면 그건 로직 버그가 아니라 프리뷰
   세션 자체가 불안정해진 것이니 서버를 재시작하고 넘어간다 — 여기서 계속
   삽질하지 말 것.
5. **1~4에서 전부 정상으로 나오면**, 실제 사용자가 겪은 상황은 이 로컬
   재현 범위 밖에 있다는 뜻이다. 추측성 수정을 넣지 말고, 사용자에게
   정확한 재현 상황(어느 화면에서, 뭘 눌렀을 때, 뭐가 안 됐는지)을
   `AskUserQuestion`으로 되물어라. 사용자가 답을 거부/보류하면 그대로
   대기하고 다음 지시를 기다린다 — 확인 안 된 가설로 코드를 건드리지 않는다.
6. 원인이 실제로 잡히면, 고친 뒤 반드시 1번의 함수직접호출 → 클릭시뮬레이션
   순서로 재검증하고 나서 배포를 제안한다.

## 하지 말 것

- 콘솔 에러가 없다고 "로직은 멀쩡하다"로 바로 결론짓지 말 것 — 에러 없이
  화면만 안 바뀌는 경우(이벤트 미바인딩, 뷰포트 문제)가 이 프로젝트에서
  실제로 있었다.
- 재현이 하나도 안 되는데 "아마 이것 때문일 것"이라며 방어적 try/catch나
  안전장치를 추가로 얹지 말 것. 원인 불명 상태에서의 코드 변경은 새 버그를
  더 만들 뿐이다.
