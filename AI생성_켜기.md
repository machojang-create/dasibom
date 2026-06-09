# 봄이 AI 글쓰기 켜기 (자서전 생성 + 오늘의 지혜)

> 현재 상태: 자서전 흐름은 끝까지 완성되지만, **봄이의 AI 글쓰기가 라이브에서 작동 안 함** (AI 키 미설정).
> 실패해도 답변 원문으로 책은 나오지만, "봄이가 써주는" 산문이 빠짐. 오늘의 지혜 자동생성(매일 6시)도 같은 이유로 멈춰 있음.
> 안전조치는 코드에 미리 넣어둠: 로그인 필수 + 1인 하루 60회 상한 + **결제 전까지 Opus 봉인(전원 Haiku=저렴)**.

---

## 1단계. Anthropic 키 발급 (+크레딧 충전)
1. https://console.anthropic.com 접속 → 로그인(또는 가입)
2. 왼쪽 **Billing** → 크레딧 잔액 확인. 없으면 충전(최소 $5).
   - 참고 비용: 무료 자서전 1권(15문단, Haiku) ≈ **몇십 원** 수준. $5면 테스트 수백 회.
3. **API Keys** 메뉴 → **Create Key** → 이름 아무거나(dasibom) → 생성된 `sk-ant-api03-...` 복사
   - ⚠️ 이 키는 비밀번호예요. 채팅·메일에 붙이지 말 것(클로드에게도 X). 아래 명령어에만 사용.

## 2단계. 파란 창(PowerShell)에서 한 줄씩
(윈도우키 → powershell → 엔터)

```
npm install -g firebase-tools
```
```
firebase login
```
→ 브라우저 열리면 machojang@gmail.com 선택 → 허용
```
cd "C:\Users\USER\Desktop\이전작업\백업\memoir"
```
아래 명령의 `여기에키` 자리에 복사해둔 키를 붙여넣고 실행:
```
firebase functions:config:set anthropic.key="여기에키"
```
마지막으로(한 줄 전체 복사):
```
firebase deploy --only functions:generateSection,functions:generateTitles,functions:generateDailyWisdom,functions:generateWisdomOnDemand
```
- 2~5분 걸림. 초록 **Deploy complete!** 나오면 끝.
- 끝나면 PowerShell 창 닫기(키가 화면 기록에 남아있으니).

## ⚠️ 하지 말 것
```
firebase deploy --only functions        ← 금지!
```
→ 이러면 **카카오/네이버 로그인 함수까지** 새 코드로 교체되는데, 그 비밀키들이 아직 설정 전이라 **카카오/네이버 로그인이 깨짐.**
반드시 위처럼 **함수 이름 4개를 콕 집어서** 배포.

## 3단계. 끝나면
저(클로드)한테 "AI 배포 완료"라고 알려주세요 → 제가 테스트 호출로 ①생성 작동 ②비로그인 차단 ③지혜 생성까지 검증해드립니다.
