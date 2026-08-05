---
name: health-content-compliance
description: Tone and claim-safety check for health_magnifier / health-detail content (건강돋보기, MECHS rules, supplement/medication descriptions). Korean health-supplement advertising is regulated — effect claims can trigger 심의 (advertising review) and selling supplements requires separate business registration. Use whenever editing health_magnifier.html, health-detail.html, or any AI prompt that generates health/supplement copy.
user-invocable: true
allowed-tools:
  - Read
  - Grep
---

# health-content-compliance — 건강 콘텐츠 표현 점검

건강돋보기(health_magnifier)는 시니어 대상으로 약/영양제 정보를 다루는
민감 영역이다. 이 프로젝트는 아직 **건강기능식품판매업 신고·통신판매업
신고를 하지 않은 상태**이고, 기능성을 표방하는 광고문구는 심의 대상이다.

## 확인 사항

1. **효능 단정 표현 금지.** "OO에 좋습니다", "OO을 낫게 합니다" 류의 단정적
   문구가 있으면 "성분 중심 설명"으로 바꾼다 — 예: "비타민D는 뼈 건강과
   관련된 영양소로 알려져 있어요" (단정 X) vs "비타민D 드시면 뼈가
   튼튼해져요" (단정 O, 금지).
2. **"의료 진단을 대체하지 않는다"는 고지 문구가 화면에 남아있는지 확인.**
   페이지를 고치다가 실수로 이 고지를 지우지 않았는지 diff에서 확인.
3. **AI가 건강 설명을 생성하는 프롬프트(Cloud Function 등)를 고칠 때도
   같은 톤 규칙을 프롬프트 지시문에 반영한다** — "효능을 단정하지 말고
   성분/일반 정보 중심으로 설명하라" 같은 제약이 프롬프트에서 빠지지 않았는지.
4. **직접 판매 기능(구매 버튼, 결제 연동 등)을 새로 추가하려는 요청이면
   먼저 멈춘다.** 건강기능식품판매업 신고 전이라 실제 판매 기능 출시는
   `release_blockers` 상 미해결 블로커다 — 정보 제공/추천 링크(도매꾹 등
   외부 링크) 수준까지만 진행하고, 자체 결제 판매 기능은 사용자에게 신고
   절차 완료 여부를 먼저 확인한다.
5. **MECHS(중복체크) 같은 임상 규칙을 추가/수정할 때는 근거 출처를 명시한다**
   (NIH, 식약처, 약학정보원 등) — 출처 불명 규칙을 새로 추가하지 않는다.

## 하지 말 것

- "더 설득력 있게" 만들자고 효능을 단정하는 방향으로 문구를 강화하지 말 것 —
  이 영역은 매출보다 규제 리스크가 우선이다.
