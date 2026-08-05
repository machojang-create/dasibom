---
name: code-review
description: Pre-deploy review of uncommitted changes in this repo, checked against project-specific conventions (cache-busting versions, scope discipline, no leftover debug code, no reintroduced browser-TTS calls). Use before suggesting a `firebase deploy`, or when the user asks to double-check a change before it ships. This is a project-local lightweight check — for a full multi-agent audit, the user can run the separate `/code-review ultra` command instead.
user-invocable: true
allowed-tools:
  - Bash(git diff *)
  - Bash(git status *)
  - Grep
  - Read
---

# code-review — 배포 전 로컬 점검

이 프로젝트(다시봄라이프)는 프레임워크 테스트/CI가 없는 vanilla HTML/JS라
배포 전 점검이 사실상 유일한 안전망이다. `firebase deploy` 전에는 이 체크를
거친다. 이건 가벼운 프로젝트 로컬 점검이고, 더 깊은 다중 에이전트 리뷰가
필요하면 `/code-review ultra`(원격, 사용자 과금 승인 필요)를 안내한다 —
이 스킬이 직접 그걸 대신 실행하지는 않는다.

## 점검 항목

1. **`git status` / `git diff --stat`로 변경 범위 확인.** 사용자가 요청한
   파일 외에 의도치 않게 건드린 파일이 없는지 본다. Macho의 작업 규칙은
   "요청한 부분만 수정" — 요청과 무관한 리팩터링/포맷팅이 섞여 있으면
   되돌리거나 사용자에게 확인받는다.
2. **공용 JS를 고쳤다면 `?v=` 캐시버전이 그 파일을 로드하는 모든 HTML에서
   같이 올라갔는지** (`bump-shared-js` 스킬 참고). 하나라도 안 올라간 채
   배포되면 그 페이지만 조용히 구버전으로 남는다.
3. **브라우저 TTS 재도입 여부.** `dsbSpeak(`, `speechSynthesis.` 같은 패턴이
   diff에 새로 추가됐으면 즉시 플래그 — 2026-07-08 Macho 지시로 브라우저
   낭독 기능은 전면 제거됐고, 재도입은 봄이 프리미엄 보이스(ElevenLabs,
   `BomVoice.say`)로만 해야 한다.
4. **디버그 잔재.** `console.log(`, 임시로 넣은 `window.__` 전역, alert() 등이
   diff에 남아있지 않은지 grep.
5. **감성 카피 원칙 위반.** 새로 추가된 사용자 대면 문구가 기능설명형
   ("~하는 기능입니다")으로 되어 있으면 감성적 톤으로 바꿀지 확인 — 이건
   이 프로젝트에서 반복 지적된 사항.
6. **결제/개인정보 관련 변경이면 특히 신중히.** 이 프로젝트는 아직 결제
   검증·건기식 신고 등 출시 전 블로커가 남아있는 상태 — 관련 코드를 건드릴
   땐 그 블로커 목록과 상충하지 않는지 확인.
7. 변경사항 요약을 사용자에게 보여주고, 실제 `firebase deploy` 실행은
   반드시 사용자 확인을 받은 뒤에만 한다(공유 상태에 영향을 주는 배포는
   항상 확인 필요 — 이전에 허락했다고 자동으로 계속 허락된 게 아님).

## 하지 말 것

- 이 스킬이 통과했다고 곧장 deploy까지 실행하지 말 것 — 점검과 배포 승인은
  분리된 단계다.
- 지적사항을 발견했다고 요청받지 않은 범위까지 임의로 고치지 말 것 —
  발견한 건 보고하고, 고칠지는 사용자가 정한다.
