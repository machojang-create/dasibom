---
name: deploy-firebase
description: Safe Firebase deploy checklist for this project — which --only targets are safe together, which combination has previously broken social login, and where secrets must live. Use before running any `firebase deploy` command, especially for Cloud Functions.
user-invocable: true
allowed-tools:
  - Bash(firebase deploy *)
  - Bash(git status *)
  - Bash(git diff *)
  - Grep
  - Read
---

# deploy-firebase — 안전 배포 체크리스트

이 프로젝트는 과거에 무심코 한 배포 명령이 실제 사고로 이어진 적이 있다.
매번 아래를 확인하고, 배포 실행 자체는 항상 사용자 확인을 받은 뒤에 한다
(공유 상태에 영향을 주는 행동 — 자동 실행 금지).

## 절대 규칙

- **`firebase deploy --only functions` (전체, bare)를 절대 쓰지 않는다.**
  라이브에 이미 배포된 `kakaoAuth`/`naverAuth`는 예전 방식(하드코딩 시크릿)으로
  동작 중인데, 로컬 코드는 `functions.config()` 참조로 바뀐 상태라 bare로
  덮으면 **소셜 로그인이 즉시 파손**된다.
- **바꾼 함수만 이름을 나열해서 배포한다.** 예:
  `firebase deploy --only functions:generateSection,functions:generateTitles`
  배포 전 `git diff functions/index.js`로 실제 어떤 함수가 바뀌었는지 확인하고,
  그 함수들만 콤마로 나열.
- **비밀키는 절대 코드에 하드코딩하지 않는다.** `functions.config()` 또는
  `.env`(gitignore됨)로만. 새 API 키가 필요하면 사용자에게
  `firebase functions:config:set <service>.key="..."` 를 직접 실행하도록
  안내한다(비밀값을 채팅에 그대로 붙여넣지 않도록).
- **firestore.rules를 건드릴 때는 특히 신중히.** 이 프로젝트의 소셜로그인은
  Firebase 익명 uid + `users` 컬렉션의 socialId 교차조회 구조라, 얼핏 당연해
  보이는 `uid == userId` 같은 제약을 걸면 로그인/공개서재가 깨진다. 규칙을
  조이기 전에 `project_admin_roles`/`release_blockers` 관련 메모리나
  `handleSocialLogin` 실제 코드를 먼저 확인.

## 배포 전 체크

1. `git status`로 의도한 파일만 바뀌었는지 확인.
2. `git diff <파일>`로 실제 diff 내용을 눈으로 훑는다 — 특히 functions/index.js는
   비밀값·모델 분기(useModel)가 실수로 원복되지 않았는지 확인.
3. 어떤 `--only` 타겟으로 배포할지 정확히 정한다 (`hosting` / `functions:이름1,이름2`
   / `firestore:rules` 중 필요한 것만, 절대 뭉뚱그리지 않음).
4. 사용자에게 정확한 배포 명령과 영향 범위를 보여주고 확인받는다.
5. 배포 후에는 `verify-deploy` 스킬로 실제 반영 여부까지 확인한다 — push나
   deploy 명령이 성공했다고 곧장 "배포됐습니다"라고 말하지 않는다.
