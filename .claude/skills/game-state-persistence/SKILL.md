---
name: game-state-persistence
description: The dasibom pattern for saving/resuming game & 육성 state across leaves, offline, and device changes — 2-layer save (localStorage instant + Firestore blob keyed by uid), last-write-wins by savedAt, elapsed-time settlement on return, and cross-device adopt-if-newer. Use when adding save/resume, pause, or cross-device sync to any game (matgo, plant, guppy) or when auditing why state didn't carry over. Encodes the one real gap (anonymous uid = no cross-device) and the hard rule to consult before touching the login/auth flow.
user-invocable: true
allowed-tools:
  - Read
  - Grep
  - Edit
---

# game-state-persistence — 저장·이어하기·기기연동 표준

이 프로젝트 게임/육성(matgo·plant·guppy)은 **같은 저장 패턴**을 쓴다. 새 저장·일시정지·기기연동을
붙이거나 "왜 안 이어지지"를 감사할 때 이 구조를 따른다. (서버 0대 — 파이어베이스 창고 방식)

## 2겹 저장

1. **기기 안 (localStorage)** — 즉시·오프라인. 같은 기기 이어하기·복귀 정산의 근간.
   반드시 `savedAt: Date.now()` 를 함께 저장한다(충돌 판정 기준).
2. **클라우드 (Firestore blob, 계정 uid)** — 폰↔웹·기기변경. 공용 브리지 `dasibom-points.js`:
   - `dsb().saveBlob(app, data, cb)` → `users/{uid}/apps/{app}` = `{data:JSON.stringify(data), savedAt:Date.now()}`
   - `dsb().loadBlob(app, cb)` → `{data, savedAt}` (없으면 null)
   - matgo처럼 게임 스냅샷은 `game_stats/{uid}.matgoSave`(merge, `FieldValue.delete()`로 삭제)를 써도 됨.

## 충돌 = 마지막 저장 우선 (Macho 확정)

- 로드 시: `if (cloud.savedAt > localAt + 3000) { 서버 채택 }` — 3초 여유는 방금 내가 올린 걸 "더 최신"으로
  오인하지 않기 위함. 채택 후 가장 안전한 복원은 localStorage에 심고 `location.reload()`(guppy 방식) 또는
  setState 일괄 적용(plant 방식).
- 저장 트리거: 주기(60~64초) + `pagehide` + `visibilitychange(hidden)`. 게임 스냅샷은 **안정된 시점(턴 경계)**
  에서만 — 애니메이션 도중(busy)엔 건너뛰어 직전 안정본을 지킨다.
- 오래된 저장은 만료(예: 3일↑ `snapValid`에서 무효).

## 자리비움 정산 (시간 기반 성장/감소)

- localStorage에 `last_seen`/`savedAt` 두고, 복귀 시 경과분을 한 번에 정산(상한선 둘 것 — 폭주 방지).
- 함정: **저장 주기가 savedAt을 계속 갱신**해 로드 정산이 경과를 못 잡는 사각지대 → 별도 `hiddenAtRef`
  (visibilitychange 진입 시각)로 백그라운드 경과를 메운다(guppy 실증).

## ★유일한 실질 갭 — 익명(비로그인) uid

- blob은 `firebase.auth().currentUser.uid` 기준. **소셜 로그인(카카오/네이버) = uid 고정 → 기기연동 O.**
  **익명 = 기기마다 랜덤 uid → 기기연동 X**(폰 바꾸면 빈 상태). "빈 계정으로의 이관"은 로그인 후
  기존 자동 저장으로 이미 되지만, 사용자가 그 사실을 모른다 → `dasibom-syncnudge.js`(익명에게만 1회 안내).
- **auth 흐름은 함부로 건드리지 말 것**(과거 데이터 사고 구역). 무조건 `signInAnonymously` 호출 금지 —
  소셜 세션 복원을 기다렸다가 "끝까지 익명일 때만" 익명. 이관/병합 규칙 변경은 반드시 상의 먼저.

## 검증

live-verify로: 딜/한수 후 스냅샷=라이브 일치, 새로고침→이어하기 복원, 종료→저장삭제, 만료 판정,
익명→안내 배너/로그인→미표시. 콘솔 에러 0. 교차기기 실물 2대 테스트는 어려우니 코드경로+저장문서로 확인하고
"2기기 실검증 미실시"를 정직하게 남긴다.
