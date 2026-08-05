---
name: feature-qa-bot
description: Write a focused Playwright QA bot that exercises a NEW dasibom feature across realistic play against the live site, logs each action to jsonl + screenshots failures, and rigorously separates bot-rig issues from real app bugs. Use when the user says "봇 돌려"/"봇으로 체크", when a feature needs coverage beyond one happy path, or when you must leave error logs. Bots live in C:/Users/USER/Desktop/작업/dasibom-qa; reuse qalib.js helpers, fold durable bots into crew.js. Pairs with live-verify (quick in-page assertions) for the heavier "play like a user, many paths" cases.
user-invocable: true
allowed-tools:
  - Bash(node *)
  - Bash(ls *)
  - Read
  - Write
  - Edit
---

# feature-qa-bot — 새 기능용 Playwright QA 봇

라이브 사이트를 사람처럼 여러 경로로 돌려 **커버리지 + 오류 로그**를 남긴다. 빠른 단발 검증은
live-verify(페이지 JS 단언)로 충분하고, 이 스킬은 "여러 판·랜덤·전담 순찰" 같은 무거운 검증용이다.

## 위치·구성 (기존 인프라 재사용, 새로 만들지 말 것)

- 봇 폴더: `C:/Users/USER/Desktop/작업/dasibom-qa` (리포 밖).
- `qalib.js` 공용: `BASE, sleep, topUpPetals, ensurePetals, dismissBom, clickByText, readPetals, qaSecret`.
- `.qaenv` 에 `QA_SECRET=...` (비공개 — 절대 커밋 금지). 봇은 Cloud Function `qaGrantPetals`로 자기 계정
  꽃잎을 채워 **실제 구매·소비 경로까지** 태운다.
- `crew.js` = 청소관리인 오케스트레이터. 재사용 가치가 있는 봇은 여기 한 줄로 편입(매일 `node crew.js`).
- 로그: `logs/<name>-<stamp>.jsonl`(행동 1건=JSON 1줄), 실패 스크린샷 `logs/shots/`.

## 봇 스캐폴드 (cheerbot.js 패턴)

```js
const { chromium } = require('playwright');
// ...LOGDIR/SHOTDIR, stamp, log(rec)=jsonl+콘솔, sleep, shot(page,tag)
const ctx = await chromium.launchPersistentContext(path.join(__dirname,'profiles','<bot>'), {
  headless: true, viewport:{width:420,height:860}, locale:'ko-KR',   // ★headless:false → 이 윈도우박스에선 'spawn UNKNOWN'
});
const page = await ctx.newPage();
// ★rAF·타이머가 백그라운드로 멈추지 않게(게임 로직 정지 방지):
await page.addInitScript(() => {
  Object.defineProperty(document,'visibilityState',{get:()=>'visible'});
  Object.defineProperty(document,'hidden',{get:()=>false});
});
```

- 시나리오마다 try/catch로 감싸 예외도 로그로 남긴다.
- 결과 요약: `PASS/FAIL` 카운트 + 로그 파일 경로, `process.exit(FAIL>0?1:0)`.

## 봇 vs 앱 버그 구분 (★이번 세션에서 반복해서 덴 지점 — 먼저 의심하라)

FAIL이 나면 **앱 버그로 단정하기 전에 스크린샷으로 원인부터 특정**한다. 실제 사례:

- **봄이 가이드 팝업이 UI를 덮어** 시작 버튼(.qz-pick)을 못 찾음 → `dismissBom(page)`로 먼저 닫아야.
  (첫 클릭 시 뜨는 버튼 가이드까지 닫아야 — 탭 클릭 후 한 번 더 dismissBom)
- **답한 뒤 안 고른 보기는 색이 안 입혀져서** "미응답"으로 오판 → 같은 문제만 반복 클릭.
  판정은 `.qz-opt.correct/.wrong` 존재 여부로.
- **꽃잎 충전 auth 경합** → `ensurePetals` 재시도로 흡수. functions-compat 없는 페이지는 topUpPetals가 자동 주입.
- **확인 버튼 라벨 틀림**(‘방생’ 아니라 실제 ‘방생하기’), **잘못된 셀렉터**(onClick 없는 요소) 등.

즉 대부분의 최초 FAIL은 **봇 rig 문제**였다. 셀렉터·타이밍·팝업·라벨을 재확인한 뒤에 "앱 버그"라고 보고한다.

## 관리 팀장 봇 (선택)

`managers.js` = 알바 봇들의 작업을 재확인 + 랜덤 테스트 + **짧은 요약 리포트**(`logs/manager-summary-*.md`).
넌 그 요약을 보고 수정한다. 모든 봇은 꽃잎 무제한(청소관리인 컨셉).

## 실행·마무리

- 실행: `node <bot>.js` 또는 전 병력 `node crew.js`.
- 콘솔 인코딩(cp949)에서 이모지 print가 깨질 수 있음 — 로그는 jsonl 파일을 Read로 확인.
- 발견한 앱 버그는 수리 후 **재실행해 all-green**까지. 그다음 커밋(checkpoint-commit).
