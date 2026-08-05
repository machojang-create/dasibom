---
name: firestore-rules-safety
description: Guardrails before editing firestore.rules in this project. The auth architecture here is non-obvious (anonymous Firebase uid + a `users` collection cross-lookup for Kakao/Naver login), so the "obviously more secure" rule change breaks login and the public library. Use whenever firestore.rules or the login/social-auth flow is being touched.
user-invocable: true
allowed-tools:
  - Read
  - Grep
  - Bash(git diff firestore.rules)
---

# firestore-rules-safety — firestore.rules 수정 전 필독

> ★2026-07-20 갱신: 아래 본문의 전제(익명 uid+교차조회)는 **해소됨**.
> 카카오/네이버는 커스텀 토큰(uid=kakao_/naver_+<id>) 로그인으로 전환 완료됐고
> (auth/*/callback.html signInWithCustomToken + functions mintCustomToken),
> users/memoirs 규칙은 본인+운영자(+서재 isPublic 읽기)로 이미 조여져 있다(커밋 71c798a).
> 이제의 가드레일: ①memoirs 읽기에서 isPublic 경로를 없애면 서재가 깨진다
> ②users의 subscribed·dsbPoints·refToken 필드 가드를 느슨하게 하면 결제우회/경제붕괴
> ③users/{uid}/{subpath=**} 하위컬렉션 규칙을 지우면 두뇌게임 기록이 죽는다
> ④규칙 변경 후엔 6종 프로브(본인 읽쓰/남의 읽기 거부/서재 쿼리)를 라이브로 돌려 확인할 것.
> 아래 원문은 역사적 맥락으로만 남긴다.


## 왜 단순히 조이면 안 되는가

카카오/네이버 로그인은 **커스텀 토큰을 안 쓴다.** 클라이언트는 Firebase
**익명(anonymous) uid** 상태를 유지한 채, `kakaoAuth`/`naverAuth` 함수가
돌려준 프로필을 갖고 `users` 컬렉션에서 provider/socialId로 교차조회해
(`handleSocialLogin`) **다른 uid에 연결된 memoir 문서를 읽고 쓴다.** 또
공개 서재(library) 기능은 다른 사용자의 `isPublic` memoir 문서를 읽어야
정상 동작한다.

그래서 얼핏 정석처럼 보이는:
```
match /memoirs/{userId} {
  allow read, write: if request.auth.uid == userId;
}
```
같은 규칙을 걸면 **로그인 직후 자기 자서전을 못 읽는 것처럼 보이고,
공개 서재는 통째로 깨진다.** 현재 규칙이 `if request.auth != null`처럼
느슨해 보이는 건 방치가 아니라 이 구조 때문이다.

## 올바른 순서

1. **로그인 계정 매핑을 먼저 Cloud Function(admin SDK)으로 옮기거나,
   카카오/네이버 로그인을 커스텀 토큰 발급 방식으로 바꿔서 uid를 결정론적으로
   부여하는 리팩터가 선행돼야** `uid == userId`식 규칙을 걸 수 있다. 이건
   로그인 경로 자체를 건드리는 작업이라 신중하게, 별도 작업으로 진행한다.
2. 그 전까지 안전하게 추가 가능한 건 `shared/{id}`처럼 **범위가 명확히 분리된
   컬렉션**에 대한 규칙 강화뿐이다 (공유 링크용 등, 기존 로그인 흐름과 무관).
3. `firestore.rules`를 diff했을 때 `memoirs`나 `users` 컬렉션의 read/write
   조건이 `request.auth.uid`로 좁혀지는 변경이 보이면, 위 리팩터가 이미
   됐는지부터 확인 — 안 됐으면 배포 전에 반드시 멈추고 사용자에게 이 리스크를
   설명한다.
4. 규칙 변경 배포는 `firebase deploy --only firestore:rules`로 다른 배포와
   분리해서, 문제 생겼을 때 무엇 때문인지 바로 알 수 있게 한다.

## 하지 말 것

- "이 규칙은 보안상 당연히 이래야 한다"는 일반론만으로 firestore.rules를
  고치지 말 것 — 이 프로젝트의 로그인 구조를 먼저 확인해야 한다.
- 리팩터 없이 규칙만 조여서 "일단 보안 개선했다"고 보고하지 말 것 — 로그인이
  깨지면 보안 개선이 아니라 서비스 중단이다.

## 소셜 세션 보호 철칙(2026-07-21 실사고)
`signInAnonymously()`를 무조건/동기 currentUser 체크로 호출하면 **카카오·네이버 커스텀토큰 세션을 익명으로 갈아치운다**(꽃잎·데이터가 남의 계정이 됨). 반드시 `onAuthStateChanged` 1회 대기 후 `if(!u)`일 때만 익명 로그인. 새 페이지·이식 앱 전수 체크 항목.
