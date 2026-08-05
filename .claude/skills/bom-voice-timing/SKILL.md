---
name: bom-voice-timing
description: The standard for how 봄이(Bom)'s premium voice is timed and loaded across every card/screen, so voice never comes out "a long time (4-5s) after the window opens." Use whenever adding 봄이 voice to a new card, guide, pilot, or screen — or editing bom_voice.js / the guides. Codifies the pattern Macho confirmed 2026-07-13.
user-invocable: true
allowed-tools:
  - Read
  - Grep
  - Edit
---

# 봄이 음성 타이밍 표준

**문제였던 것**: 카드에 들어오면 텍스트는 바로 뜨는데 봄이 목소리가 **4~5초 뒤** 어색하게 나옴. 원인 = 음성 인프라(firebase compat + 인증 + 프리미엄 합성)를 **가이드 열릴 때 순차 로드**해서. Macho 확정 해법(2026-07-13): 아래 표준.

## 핵심 규칙 3가지

1. **음성 인프라는 '페이지 진입 즉시' 로드 시작** — 가이드/봄이가 열릴 때까지 기다리지 말 것.
   - 파일럿(하위경로 React): `dasibom-bomguide.js`의 `ensureVoice()`가 페이지 파싱 시 바로 실행(app-compat 먼저 → auth+functions **병렬** → `/bom_voice.js`). 네이티브 페이지: `<script src="/bom_voice.js?v=N">`를 head에 직접.
2. **자동으로 뜨는 첫 대사(환영 인사)는 `sayIfQuick()` — 절대 `say()` 아님.**
   - `sayIfQuick(text, 2800)` = 2.8초 안에 준비되면 재생, 늦으면 **조용히 스킵**. 늦은 음성이 억지로 나오는 걸 막음.
3. **곧 나올 대사는 `prefetch()`로 미리 합성** — 로딩 중에 환영/다음 스텝 오디오를 받아둬서, 나올 때 즉시.

## API 4종 — 목적별 사용 (bom_voice.js window.BomVoice)

| 함수 | 언제 |
|---|---|
| `say(text)` | **사용자 상호작용**(버튼 클릭 등)으로 나오는 대사. 그 즈음엔 인프라 로드 끝나 바로 나옴. |
| `sayIfQuick(text, maxMs)` | **자동 등장 첫 대사(환영)**. 반드시 이걸로. 늦으면 스킵. |
| `prefetch(text)` | 곧 나올 대사 미리 합성(재생X). 환영·다음 투어 스텝에. |
| `speakSynced(text, onStart, cap)` | 텍스트를 음성과 **동시 등장**시켜야 하는 곳(memoir 인터뷰처럼 페이스 느린 곳만). 일반 카드엔 과함. |

★`sayIfQuick`는 `speakSynced` opacity-hide 방식과 다름 — **텍스트는 항상 즉시 표시**(안 보이는 버그 방지), 음성만 조건부. 파일럿은 음성 인프라가 느려서 텍스트를 숨기고 기다리면 말풍선이 안 보이는 사고가 났었음. 절대 텍스트를 음성 대기로 숨기지 말 것.

## 새 카드/봄이 등장 지점 추가할 때 체크리스트

- [ ] 페이지 진입 즉시 음성 인프라 로드(위 1). 파일럿이면 `dasibom-bomguide.js` 그대로 사용 → 자동 적용됨.
- [ ] 자동 환영 대사 = `sayIfQuick`. 버튼으로 나오는 대사 = `say`.
- [ ] 다음에 나올 대사 `prefetch`.
- [ ] 텍스트는 즉시 표시(음성 대기로 숨기지 말 것).
- [ ] **AI 자유대화 응답엔 음성 X**(고정 대사만 — 비용·어색함). [[bom-character-consistency]] 참조.

## bom_voice.js 수정 시 (중요)

`bom_voice.js`는 캐시됨(`?v=N`). 고치면 **`bump-shared-js` 스킬로 모든 참조의 `?v=N`을 올릴 것** — 안 하면 옛 캐시본이 떠서 변경이 안 먹음.

## ★★음성이 '안 나오는' 문제부터 확인 — 타이밍은 그 다음 (2026-07-14)

**"태그가 있다 ≠ 소리가 난다".** 봄이 음성 = Cloud Function `bomVoiceTTS` 호출이라 아래가 **전부** 있어야 남:
`firebase app + auth + **functions** + 로그인(익명이라도)`

2026-07-14 전수 조사 결과 — 네이티브 카드 중 음성이 실제로 나오던 건 **people 하나뿐**이었음. 나머지는 봄이는 뜨는데 무음(functions-compat 미탑재, 건강/편지는 firebase 자체가 없음). 파일럿만 멀쩡했던 건 `dasibom-bomguide.js`가 firebase를 **스스로 로드**해서. **이전 '전수 체크'가 `bom_voice.js` 태그 유무만 세고 실제 재생을 확인 안 해서 놓쳤음** — Macho가 직접 발견("보이스가 나오는 게 있고 안 나오는 게 있어").

**지금은 `bom_voice.js`가 인프라를 자립 조달함** — 없는 모듈만 스스로 싣고, 미초기화면 initializeApp, 로그인 없으면 익명 로그인. 이미 있으면 no-op. **그래서 새 페이지는 `bom_voice.js?v=N` 하나만 넣으면 음성이 남**(firebase를 따로 챙길 필요 없음).

⚠️**함정**: 페이지가 app-compat을 **나중에 동적 로드**하면(`game.html`이 그랬음) `window.firebase`가 새로 만들어지며 등록된 functions가 **통째로 날아감**. → bom_voice에 20초 워치독이 있어 다시 채움. 같은 이유로 `getFn()`은 콜러블을 **캐시하지 않음**(죽은 앱 물면 조용히 실패).

### 검증은 반드시 '실제 수신'으로
태그·설정 유무 말고 **`bomVoiceTTS`가 오디오를 실제로 주는지** 확인할 것:
```js
var r = await firebase.app().functions('asia-northeast3').httpsCallable('bomVoiceTTS')({text:'테스트'});
!!(r && r.data && r.data.audioBase64)   // 이게 true여야 소리가 남
```

## ★프리워밍은 '빈 시간'이 있어야 먹힌다 (2026-07-14, 실측)

첫 합성은 **4.3초**(콜드) / **1.2초**(웜) 걸림 — 이건 못 줄임. 프리워밍은 **그 시간을 대사가 나오기 전 빈 시간에 미리 태우는 것**뿐. 그래서 대사마다 "앞에 빈 시간이 있나?"를 먼저 볼 것:

| 대사 | 빈 시간 | 그래서 |
|---|---|---|
| 키오스크 동의 멘트 | 어르신 목록 보는 중(수초) | 목록 뜰 때 prewarm → **0ms** |
| 선물 연출 각 줄 | 줄 간격 1.7초 | 연출 시작 때 전 줄 prewarm |
| 다음 자서전 질문 | 어르신이 답하는 중 | 현재 질문 낼 때 다음 것 prewarm |
| **챗봇 첫 인사** | **없음(열자마자)** | ★**이전 화면에서** 미리 태워야 함 |

**빈 시간이 없는 대사는 앞 화면에서 prewarm할 것.** 첫 인사는 키오스크 '대화 시작' 모달이 떠 있는 동안 미리 합성 → 서버 캐시에 올라가서 대화방에선 **424ms**만에 받음.

### 그때 반드시: 문구를 공용 모듈로
서버 캐시 키가 **문구 문자열 그 자체**라, 미리 합성하는 쪽과 재생하는 쪽이 **완전히 같은 문자열**을 보내야 적중함. 한 글자만 달라도 프리워밍이 통째로 헛돎.
- `dasibom-caregreet.js` = carekiosk↔carechat 공용: `bomCareGreet(S,honor)`(문구) + `bomVoiceClean(text)`(이모지 제거 등 정규화).
- ⚠️**실제로 당한 실수**: 문구는 공유했는데 **정규화를 안 챙겨** 한쪽만 🌸를 지워 보냄 → 캐시 미스로 프리워밍 무효. 문구를 공유하면 **정규화도 같이** 공유할 것.

## 적용 현황(2026-07-14)
- 카드 전반: 파일럿 5개(`dasibom-bomguide.js`)·네이티브(`bom_tutorial.js`) — `bom_voice.js` 공용 모듈로 자동 적용.
- **케어(carekiosk/carechat)**: bom_voice 대신 자체 `speak()`를 쓰지만 **같은 표준을 자체 구현**함 — `ttsFetch`(합성 중복 방지) + `prewarm`(미리 합성) + `_ttsSeq`(밀린 음성 차단). 첫 인사는 키오스크에서 교차 프리워밍.
  - ⚠️ 자체 `speak()`라고 **표준에서 빼놓지 말 것** — 예전 이 문서가 "별개"라 적어둬서 키오스크가 4.3초 지연인 채 방치됐고 Macho가 직접 발견함("저번에 전수 체크했다며?"). **음성이 나오는 곳이면 파일이 뭐든 이 표준 적용.**

## ⚠️ 조용한 무시(no-op) 금지 (2026-07-16, Macho가 토론장에서 발견)
`say()`류를 `if (window.BomVoice) …`로만 감싸면 **로드가 늦은 첫 방문엔 소리 없이 그냥 넘어간다** — 에러도 없어서 텍스트는 멀쩡히 나오니 오래 숨는다. 실제로 파일럿 전부(가이드가 firebase→bom_voice 직렬 로드, 3~5초)에서 환영 설명이 영구 무음이었고, 투어 버튼을 누를 때쯤 로드가 끝나 "투어부터만 소리"가 났음.
- **표준: `whenVoice(cb, maxMs)` 패턴** — BomVoice가 생길 때까지 150ms 폴링 후 실행(`dasibom-bomguide.js`/`bom_tutorial.js` 참조). 새 봄이 등장 지점을 만들 때 `window.BomVoice` 존재를 조건으로 걸었다면 그건 결함이다.
- 자동 인사는 늦게 준비돼도 **그 말풍선이 아직 화면에 있을 때만** 재생(다음 단계로 넘어갔으면 끼어들지 않음).

## ⚠️ 이모지 정규화는 반드시 '쌍 단위'로 (2026-07-16, 토론장 영구 무음의 진짜 뿌리)
`[🌸🎉…]` 같은 **문자 클래스로 이모지를 나열하면 안 된다** — 이모지는 서러게이트 쌍(내부 2글자)이라 클래스가 반쪽 단위로 매칭돼, 목록에 없는 이모지(🎙️)도 앞 반쪽만 지워지고 **고아 반쪽**이 남는다 → ElevenLabs `invalid_unicode(400)` → 그 문구는 **영구 무음**(텍스트는 멀쩡히 떠서 오래 숨음). 같은 앞 반쪽을 쓰는 이모지가 대부분이라 사실상 시한폭탄.
- 표준: `bom_voice.js clean()` / `caregreet bomVoiceClean` 참조 — 쌍 전체 제거 `[\uD800-\uDBFF][\uDC00-\uDFFF]` + 고아 반쪽 제거 `[\uD800-\uDFFF]`. 서버(bomVoiceTTS)도 고아 반쪽 제거 후 합성(최종 방어).
- 증상 감별: "이 카드만 음성이 안 나와" = 대사의 이모지부터 의심. 콘솔 `[봄이보이스] 합성 실패` 경고에 이제 e.message가 붙어 400 본문이 바로 보임.

## ⚠️ 검증은 페이지 '안'에서 (도구 주입은 로드 후 ~19초)
javascript 주입으로 첫 방문 자동재생을 검증하면 훅이 **로드 후 19초**에나 설치돼 4~8초에 일어난 재생을 통째로 놓친다(= '자동재생 없음' 오판). 표준 계측: **같은 페이지에 iframe으로 대상 URL을 띄우고 10ms 폴링으로 contentWindow의 `HTMLMediaElement.prototype.play`를 0초부터 훅** — play 호출·성공·거부(NotAllowedError)·오디오 길이까지 다 잡힘.

## ★배포 전 의무: 전수 점검 스크립트 (2026-07-16 도입)
음성 사고가 5번 반복된 원인은 '증상 난 곳만 사람 손으로 확인'. 봄이 대사를 추가·수정했거나 음성 코드를 건드렸으면 **`node scripts/check_voice_texts.js`부터** — 가이드 15종+케어 인사 전체를 자동 추출해 고아 서러게이트를 잡는다(exit 1이면 그 문구는 무음). `--json`으로 뽑아 브라우저에서 bomVoiceTTS 실합성 전수 확인까지 하면 서버 캐시 프리워밍도 겸한다(2026-07-16 첫 실행: 48/48 성공).
