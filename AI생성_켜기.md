# 봄이 AI 글쓰기 켜기 — 제미나이 (자서전 생성 + 제목 + 오늘의 지혜)

> 서버가 **제미나이 일원화**로 전환되었습니다(2026-06-12, 코드 완료). 그때그시절 생성과 **같은 키** 하나면 됩니다.
> 안전장치 내장: 로그인 필수 · 1인 하루 60회 상한 · 유료 모델(3.1 Pro) 결제검증 전 봉인(전원 3.1 Flash-Lite, 권당 ~20원).

## 준비물
- 제미나이 API 키 (이미 만드신 것 그대로) — **단, API 결제 연결 필수** (무료 한도는 서비스용으로 부족. aistudio.google.com/apikey → 프로젝트 "결제 설정")

## 켜는 법 — 파란 창(PowerShell)에서 4줄
```
npm install -g firebase-tools
```
(이미 설치했다면 생략)
```
firebase login
```
```
cd "C:\Users\USER\Desktop\이전작업\백업\memoir"
```
아래 한 줄의 `여기에키` 자리에 제미나이 키 붙여넣고 실행:
```
firebase functions:config:set gemini.key="여기에키"
```
마지막으로(한 줄 전체 복사):
```
firebase deploy --only functions:generateSection,functions:generateTitles,functions:generateDailyWisdom,functions:generateWisdomOnDemand
```
- 2~5분 후 **Deploy complete!** → 끝. 자서전 봄이 글쓰기·제목 추천·오늘의 지혜(매일 6시)가 살아납니다.

## ⚠️ 하지 말 것
```
firebase deploy --only functions        ← 금지!
```
→ 카카오/네이버 로그인 함수까지 덮여서 **소셜 로그인이 깨집니다.** 반드시 위처럼 함수 4개를 콕 집어 배포.

## 참고
- **Claude로 복귀**(나중에 결제 풀리면 유료만 Opus 등): `firebase functions:config:set ai.provider="anthropic" anthropic.key="sk-ant-..."` 후 같은 부분배포 한 줄.
- 끝나면 클로드에게 "AI 배포 완료"라고 알려주세요 → 생성 작동·비로그인 차단·지혜 생성까지 검증해 드립니다.
