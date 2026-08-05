---
name: preview-seed
description: Start the local static preview server and seed localStorage/sessionStorage fixtures so a vanilla-JS page (memoir_v8.html, index.html, carechat.html, game.html) opens directly into a mid-flow state (existing memoir answers, kiosk session, logged-in senior profile) instead of the blank first-visit state. Use before UI-testing any feature that only shows up after some prior state exists, so you don't have to manually click through onboarding every time.
user-invocable: true
allowed-tools:
  - mcp__Claude_Preview__preview_start
  - mcp__Claude_Preview__preview_eval
  - mcp__Claude_Preview__preview_resize
  - mcp__Claude_Preview__preview_snapshot
  - mcp__Claude_Preview__preview_list
---

# preview-seed — 로컬 프리뷰 상태 미리 채우기

이 프로젝트(다시봄라이프)는 서버사이드 세션이 없고 상태 대부분이
`localStorage`/`sessionStorage`에 있다. 매번 처음 화면부터 클릭해서 상태를
만드는 대신, 이 스킬로 필요한 상태를 바로 주입하고 시작한다.

## 절차

1. `preview_list`로 이미 떠있는 서버가 있는지 확인. 없으면
   `preview_start`로 `static` 설정(`.claude/launch.json`의 python
   `http.server 8123`)을 켠다.
2. `preview_eval`로 `location.href`를 목표 페이지(`http://localhost:8123/<파일>.html`)로
   이동시킨다. 크로스오리진(운영 도메인)으로는 이동하지 말 것 — 로컬 정적 서버
   기준으로만 테스트한다(운영 확인이 꼭 필요하면 별도로 사용자에게 알린다).
3. 목적에 맞는 localStorage 키를 세팅한 뒤 `location.reload()`.
4. `preview_resize`로 `mobile` 프리셋(375x812) 지정 — **필수**. 리사이즈를
   생략하면 뷰포트가 0x0으로 남아 `getBoundingClientRect()`가 전부 빈 값이
   되고 클릭/좌표 기반 도구가 먹통이 된다(이번 세션에서 실제로 겪은 함정).

## 자주 쓰는 픽스처 (memoir_v8.html)

```js
localStorage.setItem('memoir_intro_seen','1');           // 감성 인트로 스킵
localStorage.setItem('memoir_answers', JSON.stringify({0:'테스트 답변'}));
localStorage.setItem('memoir_maxQ','15');
localStorage.setItem('memoir_pkg','free');
// 대시보드(s-dash, "이어서 쓰기" 상태)로 바로 진입됨
```

키오스크 브라우즈 상태(홈 자서전 카드가 키오스크로 리다이렉트되는 케이스):
```js
sessionStorage.setItem('dasibom_kiosk_browse','1');
```

봄이 보이스 강제 ON(마이그레이션 로직 우회):
```js
localStorage.setItem('dasibom_bomvoice_v2','1');
localStorage.setItem('dasibom_bomvoice','1');
```

## 주의

- `LS.save(k,v)` 헬퍼는 실제로 `localStorage.setItem('memoir_'+k, JSON.stringify(v))`
  형태이므로 키 이름에 `memoir_` 접두사가 반드시 붙는다. 접두사를 빼먹으면
  값을 세팅해도 앱이 못 읽는다(과거 실수 사례).
- 로그인 관련 기능(`isSocialUser`, Firestore 저장/복원)은 로컬 정적 서버에서도
  실제 Firebase 프로젝트로 네트워크 요청이 나간다 — 목업이 아니다. 데이터를
  더럽히고 싶지 않으면 테스트용 익명 계정 상태인지 확인 후 진행.
- 픽스처 주입 후에는 실제 사용자 흐름처럼 버튼을 눌러 검증하되, 이 세션에서
  `preview_click`(좌표 기반 실클릭 시뮬레이션)이 간헐적으로 이벤트를 아예
  못 붙이는 현상이 있었다. 클릭이 안 먹는 것처럼 보이면 먼저
  `element.click()`을 `preview_eval`로 직접 호출해 로직 자체는 정상인지
  분리해서 확인하라 — 그래야 앱 버그인지 프리뷰 툴 문제인지 헷갈리지 않는다.
