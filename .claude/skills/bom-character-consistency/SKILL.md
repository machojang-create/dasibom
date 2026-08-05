---
name: bom-character-consistency
description: Keep 봄이(Bom)'s voice, tone, and premium-voice scope consistent across every touchpoint (onboarding, chatbot, memoir questions, kiosk gift sequence). She's used in many separate files (index.html, carechat.html, memoir_v8.html, people.html, nostalgia.html...) so it's easy for one file to drift from the established rules. Use when adding any new screen or feature where Bom speaks or appears.
user-invocable: true
allowed-tools:
  - Read
  - Grep
---

# bom-character-consistency — 봄이 일관성 점검

봄이는 이 프로덕트 전체에서 4가지 역할(온보딩·콘텐츠가이드·챗봇·자서전
인터뷰어)을 겸한다. 파일이 여러 개(index.html, carechat.html, memoir_v8.html,
people.html, nostalgia.html, letter.html)로 나뉘어 있어서, 한 파일에서만
새 기능을 넣다 보면 다른 곳과 톤/규칙이 어긋나기 쉽다.

## 확인 사항

1. **프리미엄 음성(ElevenLabs, `BomVoice.say`)은 "정해진 대사"에만.**
   온보딩·콘텐츠가이드·상시챗봇 고정멘트·자서전질문·선물연출 — 이 다섯
   범주 밖에서 음성을 새로 붙이려 하면(특히 AI가 그때그때 생성하는 자유
   응답에) 멈추고 확인한다. 자유대화는 텍스트만, `BomVoice.say`를 호출하지
   않는 게 확정된 설계다(2026-07-07 확정, 이유: 예측불가 텍스트를 합성하면
   어색하고 API 비용도 매 메시지마다 든다).
2. **브라우저 기본 TTS(`speechSynthesis`, `dsbSpeak`)는 절대 재도입하지
   않는다.** 2026-07-08에 "어린 소녀 목소리와 브라우저 로봇 음성이 안 어울린다"
   는 이유로 전면 제거됐고, 낭독 기능은 향후 "봄이 튜토리얼 모드"(프리미엄
   보이스 기반)로만 재도입하기로 확정. 아직 그 모드는 구현 시작 전이다 —
   먼저 물어보지 않고 임의로 만들지 않는다.
3. **말투는 반말 섞인 다정한 손녀/봄이 톤 유지, 기능설명형 금지** —
   `frontend-design` 스킬의 카피 원칙과 동일 기준.
4. **호칭 형식 통일**: "김순자 할머니"/"박성태 할아버지"(성별 존칭), "OO님"
   금지 — `sHonor()` 패턴 참고.
5. **표정 이미지(`bom_smile`/`bom_calm`/`bom_grin`/`bom_think` 등)를 새
   화면에 쓸 때, 기존 파일들이 어떤 상황에 어떤 표정을 쓰는지
   grep으로 먼저 확인**하고 맥락에 맞는 걸 골라 일관성을 유지한다
   (예: 민감한 질문엔 `bom_calm`, 힌트가 있으면 `bom_grin`).
6. **개인정보(성함) 음성 합성은 실시간 합성만, 정적 mp3로 미리 구워
   저장하지 않는다** — 이미 동의는 받았지만(2026-07-07 Macho 확인), 이름이
   들어간 오디오를 영구 파일로 캐싱하지 않는다는 원칙은 유지.

## 하지 말 것

- 새 화면을 급하게 추가할 때 "일단 텍스트만 넣고 나중에 톤 맞추자"고
  넘어가지 말 것 — 나중에 여러 파일에 흩어진 문구를 한 번에 고치는 게
  더 큰 작업이 된다. 처음부터 위 규칙에 맞춰 쓴다.

## 홈 챗봇이 먼저 말 거는 규칙 (2026-07-20 확정, index.html)
- **첫 오픈 = 인사 한 마디만.** 두 개를 한꺼번에 쌓아두지 말 것(어색함).
- **음성은 화면에 뜬 그 문장을 그대로 읽는다**(`_bomFirstText`). 고정 대사를 따로 읽으면 글과 말이 어긋남 — 실제 사고 사례.
- **1분마다(`BCP_TALK_EVERY`) 계속 말 건다.** 예전 3단계 사다리(`_bcpStage`)는 3개 하고 영영 멈춰서 "말을 안 한다"는 지적을 받음.
- 말 종류를 섞을 것 — `_nextTalk()`: **care(날씨·건강·안부, 계절별) / chat(일상 잡담) / content(콘텐츠 유도) / memoir(자서전 유도)**. 같은 종류 연속 금지, care 비중 높게.
- 창이 닫히면 `_stopTalkCycle()`로 중단(닫힌 채 쌓이지 않게).
- QA: `window._bcpTalkNow()`로 즉시 한 마디 뽑아볼 수 있음.

## ★대화 취재 (2026-07-20 Macho) — 채팅이 자서전을 살찌운다
"자서전 화면으로 가세요" 유도보다 **이 일상 대화 자체가 취재**인 것이 훨씬 중요.
- 서버 `BOM_INTERVIEW_BLOCK`(chatBom 전용): 답변 3번 중 1번쯤 어르신 말에서 실마리를 잡아 삶으로 한 겹 더. 오늘→옛날로 잇기, 사람·장소·시절·마음을 묻기. **한 번에 하나만, 취조 금지, 말 아끼시면 공감만.**
- 클라 `BOM_INTERVIEW_SEEDS`(씨앗 질문) + `_nextTalk` 비중 **취재36/케어27/잡담18/콘텐츠9/자서전9**.
- ⚠️키오스크(chatBomCare)엔 적용 금지 — 거긴 15문항 구조가 따로 있음.
- 캐낸 이야기는 `bom_memory.snippets` → 자서전 화면 `findRecall`("저번에 이런 이야기를…")로 환류.

## ★호칭은 확실할 때만 (2026-07-20)
- **'할머니'|'할아버지' 화이트리스트 통과 시에만** 그 호칭. 그 외(로그인 전·성별 미선택·이상값)는 **'어르신' 고정**. 성별 추측 금지.
- 클라·서버 양쪽에서 검증. 서버가 호칭을 모르면 **"우리 할머니(할아버지)께"로 얼버무리는 실제 사고**가 났음 → chatBom에 honorific 전달 필수.
