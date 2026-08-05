---
name: bump-shared-js
description: Bump the cache-busting ?v= query string for a shared JS/CSS file (a11y.js, bom_voice.js, questions_v3.js, attend.js, reactions.js, trendy_data.js) across every HTML file that references it. Use whenever editing one of these shared files, since a missed reference means some pages silently keep running stale cached code.
user-invocable: true
allowed-tools:
  - Grep
  - Read
  - Edit
  - Bash(git diff *)
---

# bump-shared-js — 공용 JS 캐시버전 일괄 증가

이 프로젝트는 프레임워크 없는 vanilla HTML/JS라 여러 페이지가 같은 공용 스크립트를
`<script src="foo.js?v=N">` 형태로 각자 로드한다. 공용 파일 하나를 고치면
**그 파일을 로드하는 모든 HTML의 `?v=` 숫자를 다같이 올려야** 브라우저 캐시가
깨지지 않고 새 코드가 실제로 반영된다. 한 곳이라도 빠뜨리면 그 페이지만 조용히
구버전으로 남는다 (이번 세션에서 a11y.js·bom_voice.js·questions_v3.js 관련해
반복적으로 발생했던 문제).

## 사용법

인자로 파일명을 받는다 (예: `bom_voice.js`, `a11y.js`). 인자가 없으면 방금 수정한
파일이 무엇인지 대화 맥락에서 추론한다.

## 절차

1. `Grep`으로 프로젝트 루트의 모든 `*.html`에서 해당 파일명 + `?v=` 패턴을 찾는다
   (예: `pattern: "bom_voice\\.js\\?v=\\d+"`, `glob: "*.html"`, `output_mode: content`,
   `-n: true`). 서브 디렉터리(auth/, surakstreet/ 등)도 놓치지 않도록
   `path`를 프로젝트 루트로 지정한다.
2. 발견된 모든 파일에서 현재 버전 숫자들을 모은다. 파일마다 버전이 다르게 밀려있을
   수 있으니(예: 어떤 페이지는 v5, 어떤 페이지는 v7) 그 중 **가장 높은 값 + 1**을
   새 버전으로 쓴다.
3. 각 파일에서 `Edit`로 `?v=구버전`을 `?v=신버전`으로 치환한다. 한 파일에 같은
   스크립트 태그가 여러 곳(예: defer 버전과 일반 버전)에 있으면 `replace_all: true`.
4. 다 바꾼 뒤 다시 `Grep`으로 같은 패턴을 재검색해 신버전으로 통일됐는지, 빠진
   파일이 없는지 확인한다.
5. `git diff --stat`로 변경된 파일 목록을 사용자에게 보고한다 (배포는 별도 확인
   후 진행 — 이 스킬은 배포하지 않는다).

## 주의

- HTML이 아닌 JS 파일(questions_v3.js 등)이 서로를 참조하는 경우는 없으므로
  `*.html`만 검색하면 충분하다.
- 쿼리 파라미터가 없는 스크립트 태그(`<script src="foo.js">`, 버전 없음)를
  발견하면 그 파일도 캐시버스팅이 안 되고 있다는 뜻이니 함께 `?v=1`을 붙일지
  사용자에게 확인한다(새로 발견된 문제이므로 조용히 넘어가지 말 것).
