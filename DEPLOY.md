# 다시봄라이프 배포 가이드 (Macho 전용)

> 작성 2026-06-10 · 현재 **stealth 배포**(실도메인 O, 검색노출 X) 기준
> Firebase 프로젝트: **mylife-650f0**
> 기본 도메인: https://mylife-650f0.web.app (또는 연결한 커스텀 도메인)

---

## ⚠️ 절대 규칙 (꼭 지키기)
- **`firebase deploy` 단독 실행 금지.**
  → hosting + **functions** + firestore 가 한꺼번에 배포됨.
  → 그러면 **유료 Opus 경로가 결제검증 없이 켜져서** 클라 조작 시 무료로 비싼 Opus 남용 = 비용 누수(블로커 #1).
- 반드시 **`--only` 로 대상 지정**. functions 는 결제검증 붙기 전까지 **배포하지 않는다.**

---

## 0. 사전 준비 (최초 1회만)
```powershell
npm install -g firebase-tools     # firebase CLI 설치 (이미 있으면 생략)
firebase login                    # 본인 Google 계정으로 로그인 (브라우저 열림)
cd "C:\Users\USER\Desktop\이전작업\백업\memoir"
firebase use mylife-650f0         # 프로젝트 선택 (이미 default라 보통 생략 가능)
```
배포 직전 항상: `git status` 가 **깨끗**한지 확인 (= GitHub 백업과 동일한 상태를 올리는 것).

---

## 1. 지금 배포할 것 — 프론트(화면)만 ✅
이번 세션 개선분이 전부 올라갑니다:
홈/대시보드 글씨크기 · 자서전 고대비 · 건강돋보기 그린톤 · 미리보기 상품 정리 · 관리자 정리 등.
```powershell
firebase deploy --only hosting
```
- 잔재 파일(extracted_*, game_recovered, health_magnifier (1))은 ignore 처리돼 **안 올라감.**

## 2. (선택) 공유링크를 실제로 작동시키려면 — firestore 규칙
자서전 **공유링크(3일)** 를 쓰려면 `shared` 규칙 배포 필요:
```powershell
firebase deploy --only firestore:rules
```
- 주의: users/memoirs 규칙은 **아직 열려 있음**(블로커 #2). 검색 비노출·소수 테스트면 단기 감수 가능하나,
  **실유저를 본격적으로 받기 전 보안 인증 리팩터 필수.**

## 3. 지금 배포하면 안 되는 것 ❌
```
firebase deploy --only functions      ← 하지 말 것 (유료 Opus, 결제검증 #1 처리 후에)
```
라이브 functions 는 기존 Haiku 버전 그대로 두면 됩니다. (결제가 "준비중" 스텁이라 유료 결제자가 아직 없음 → 손해 없음)

---

## 4. 배포 후 확인 (1분)
- 홈 열기 → 인트로 정상 · "글씨 가가가" 동작
- `/memoir` 자서전 · `/health` 건강돋보기(그린톤) · `/admin` 관리자 로그인
- 강력 새로고침 `Ctrl + Shift + R` (HTML 은 no-cache 라 보통 바로 반영)

## 5. 전면 공개(검색노출·홍보·실결제) 전 체크리스트
- [ ] 결제(PortOne) 구현 + **서버 결제검증**(Opus 게이트) — 블로커 #1
- [ ] **보안 인증 리팩터** + firestore users/memoirs 규칙 조이기 — 블로커 #2
- [ ] 검색노출 ON 여부 결정 (robots / meta)
- [ ] functions 배포(결제검증 포함된 버전)

---

### 요약 한 줄
지금은 **`firebase deploy --only hosting`** (+ 원하면 `--only firestore:rules`) 만.
**functions 와 전면공개는 두 블로커 처리 후.**
