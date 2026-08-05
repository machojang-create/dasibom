---
name: frontend-design
description: Senior-friendly UI/UX checklist for this project — brand tone, copy style, typography scaling, and accessibility conventions specific to 다시봄라이프. Use when adding or editing any user-facing screen, button copy, or visual component, so new work matches the established look-and-feel instead of drifting toward generic app UI.
user-invocable: true
allowed-tools:
  - Read
  - Grep
  - mcp__Claude_Preview__preview_screenshot
  - mcp__Claude_Preview__preview_inspect
  - mcp__Claude_Preview__preview_resize
---

# frontend-design — 다시봄라이프 시니어 UX 규칙

이 프로젝트의 사용자는 대부분 노년층이다. 일반적인 "깔끔한 앱 UI" 감각을
그대로 적용하면 오히려 이 제품의 톤에서 벗어난다. 화면/문구를 새로 만들거나
고칠 때 아래를 반드시 확인한다.

## 카피(문구) 원칙

- **감성적으로, 기능설명형 금지.** "~하는 기능입니다", "~할 수 있습니다" 대신
  봄이가 말을 거는 듯한 톤으로. (반복적으로 지적된 원칙 — 기본값으로 적용)
- **튜토리얼/가이드는 무조건 짧게, 1회만.** 길면 이탈한다. 매번 보여주지
  말고 `localStorage`에 "본 적 있음" 플래그를 남겨 재방문 시 스킵.
- **동의서 등 법적 UI도 핵심만 기본 노출, 세부는 "더보기"로 접기.** 법적으로
  필요하다고 화면 전체를 텍스트로 채우지 말 것.
- **호칭은 "김순자 할머니"/"박성태 할아버지" 형식.** "OO님"으로 뭉뚱그리지
  않는다 (`sHonor()` 패턴 참고, carechat.html).

## 시각/접근성

- **글씨 크기 배율은 `--ts` CSS 변수로 스케일.** 새 텍스트 스타일 추가 시
  `font-size: calc(Npx * var(--ts,1))` 패턴을 따를 것 — 하드코딩된 px로만
  쓰면 사용자가 "크게/아주 크게" 설정해도 그 요소만 안 커진다.
- **다크 모드 대응.** `body.hc`(고대비) 같은 기존 클래스 패턴이 있으면
  새 컴포넌트도 대응 스타일을 같이 추가.
- **터치 영역은 넉넉하게.** 손 떨림/정확도가 낮은 사용자층 — 버튼은 최소
  44px 이상 높이 유지.
- **브랜드 톤은 웜크림/앰버 계열.** 민트/차가운 블루 계열로 새로 만들지
  말 것(과거 letter/people 페이지가 민트→웜크림으로 통일된 이력 있음).

## 검증

1. 화면을 고쳤으면 `preview_resize`로 mobile(375x812) 프리셋에서 실제
   렌더를 확인한다 — 시니어 사용자 대다수는 모바일.
2. `preview_inspect`로 색상/폰트크기 등 스타일 값을 실측 확인한다
   (스크린샷만으로는 정확한 색상/px 판단이 어렵다).
3. 새 문구를 넣었으면 소리 내어 읽어봤을 때 기능설명처럼 들리지 않는지
   스스로 점검한다.

## 하지 말 것

- 요청받지 않은 리디자인/색상 통일 작업을 곁다리로 진행하지 말 것 — 이건
  체크리스트지 리팩터링 허가가 아니다.
