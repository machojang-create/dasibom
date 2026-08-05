---
name: external-data-integration
description: 외부 데이터 소스(공공데이터포털 오픈API·크롤 대상 사이트)를 다시봄에 연동할 때의 실전 노하우. 크롤 User-Agent 차단 함정(로컬은 통과, GCP는 차단), robots 준수 크롤, 예약 pubsub 크롤러 구조, 공공API serviceKey·XML 태그 실응답 확정, 외부 사이트 봇 정찰(XHR/세션/CSRF/딥링크), 개인·기업 회원 API 신청 벽, 배포 함수 익명인증 모니터. 시니어 직업 상담소의 워크넷·노인일자리여기·복지넷 연동에서 얻음. 외부 채용/상품/콘텐츠 데이터를 앱에 붙일 때 사용.
---

# external-data-integration — 외부 데이터 소스를 다시봄에 붙이기

다시봄은 외부 데이터(채용정보, 상품, 콘텐츠)를 자주 끌어와야 한다. 시니어 직업 상담소를
만들며 워크넷·노인일자리여기·복지넷을 붙였고, 그때 크게 데인 함정들을 여기 남긴다.

## 크롤 vs 공공 API — 먼저 판단

- **크롤(HTML 긁기)**: 로그인/키 없이 가능. robots.txt를 본다. `Disallow: /*?`는 **쿼리스트링만**
  막는 것 → 목록을 `POST`(URL에 `?` 없음)로 받으면 준수. 상세(`?id=`)는 봇이 안 긁고
  사용자 클릭 링크로만. 예의: 식별 UA(또는 아래 함정 참고)·시간당 주기.
- **공공 API(data.go.kr)**: `serviceKey` 필요. 활용신청 → 대개 자동승인. 응답 대부분 XML.
  URL은 `serviceKey=`+`encodeURIComponent(key)`. **Encoding/Decoding 키 두 종류** 주의
  (내가 encodeURIComponent 하면 Decoding=원본 키를 넣어야 이중인코딩 안 됨).

## ★ 함정 1: fetch User-Agent 데이터센터 차단 (제일 크게 데임)

증상: **로컬(한국 IP)에선 크롤 잘 되는데 배포된 Cloud Function은 0건**. 로그를 보면
`실행 657ms·적재 0` — 네트워크가 즉시 실패/빈페이지. 원인은 대상 사이트 WAF가
**GCP 데이터센터 IP + 봇스러운 UA** 조합을 차단하고 빈 페이지를 준 것. 로컬 IP는 통과해서
못 잡는다. **해결: UA를 진짜 브라우저(Chrome)로.** 진단은 임시 onRequest 엔드포인트로
`{status,len,rows,head}`를 찍어 GCP가 실제로 뭘 받는지 확인 후 삭제.
Node20 런타임엔 global `fetch` 있으나 `const _fetch=(typeof fetch==='function')?fetch:require('node-fetch')` 폴백을 둔다.

## ★ 함정 2: 응답 태그를 문서/추정으로 믿지 말 것

공공 API XML 필드명은 문서와 다를 때가 많다. **키 넣은 뒤 첫 크롤에서
`console.log('senuri sample:', xml.slice(0,700))`로 실제 태그를 눈으로 확인하고 확정**한다.
실제로 겪은 것: 노인일자리 목록은 `recrtTitle`(제목)·`oranNm`(기관)·`workPlcNm`(근무지)·
`toDd`(마감)·`deadline`(접수상태, 마감일 아님!), `emplymShpNm`이 이름이 아니라 코드값(`CM0105`)
으로 옴 → 매핑표 필요하거나 표시 포기. 목록에 없는 필드(연령·인원)는 **상세 API(getJobInfo)**에
있으니, 크롤 시 상세도 `mapLimit(arr, 8, fn)` 동시성 제한으로 보강.

## 예약 크롤러 구조 (서버 0대·Firebase)

- `crawlJobs` = `pubsub.schedule('every 1 hours')` onRun → 소스 수집 → `jobs_feed` 적재(merge).
- `jobSearch`(onCall) = `jobs_feed`만 읽어 화면에 반환(빠름). 실시간 외부호출 X.
- `crawlJobsNow`(onCall, **isMasterCall**로 확인 — 이메일 or admin_roles 폴백. 카카오/네이버
  로그인도 통과) = 배포 직후 즉시 시딩. 클로드는 서비스계정/ADC 없어 직접 시딩 불가 →
  마스터 콘솔 한 줄 or 예약 대기.
- config 키 없으면 각 fetch가 `[]` 반환 → 화면은 예시 폴백. rules: feed/cache 컬렉션은
  `allow read,write:if false`(함수 전용). stale(2일 미갱신) 배치 삭제로 마감공고 정리.

## 배포 함수 모니터 (익명 인증 node 스크립트)

배포한 함수가 실제로 데이터를 채우는지 백그라운드로 확인:
`accounts:signUp?key=<webApiKey>`로 익명 idToken → `Authorization: Bearer`로 callable
(`https://<region>-<proj>.cloudfunctions.net/<fn>`) 폴링. `result` 안의 값(total/필드)로 단언,
채워지면 예시 출력하고 exit. run_in_background로 돌리고 결과 통지받아 사용자에 보고.
(토큰 1h 만료 → 폴링마다 새로 발급.) 이 패턴이 [[live-verify]]의 데이터 파이프라인 버전.

## 외부 사이트 봇 정찰 (딥링크·신청 절차 알아내기)

사용자에게 "주소 캡처해줘" 시키지 말고 **직접 판다**([[feedback_autonomous_verify]]):
1. `curl`로 메인 HTML → `.do`/`/api/` 경로·`src=".../*.js"` grep.
2. 해당 JS를 curl로 받아 `url:"/..."`·`goDetail`·파라미터(`jobId,projType,instnId`) 추출.
3. 브라우저 MCP로 실제 열어 검색 실행 → `read_network_requests`로 XHR 엔드포인트·응답 확인.
4. 딥링크가 세션/CSRF/보안모듈(nppfs) 요구하면 외부 서버 재현 불가로 판단.
   개별 딥링크 실패 시 **허브(사이트 소개 카드 그리드)** 대안이 오히려 낫다.

## 공공 API 신청 벽 (놓치기 쉬움)

- data.go.kr에서 **API 유형이 "LINK"**면 그 페이지서 신청 X → "바로가기"로 원 사이트(예:
  work24)에서 별도 회원가입 후 신청. "REST"는 data.go.kr 자체 자동승인.
- **개인회원 제약**: 워크넷 "채용정보 **목록·상세** API"는 개인회원 불가, **기업회원(사업자등록)**
  전용. 신청 폼 제출 순간에야 알림으로 막힌다 → 미리 회원유형 확인.

## 검증·마무리

연동 후 반드시 [[live-verify]]로 라이브에서 실제 데이터가 뜨는지 값으로 단언. 크롤/API가
불안정하거나 벽에 막히면, 억지로 매달리지 말고 **우리가 확실히 줄 수 있는 것(실공고 일부+담당자
연락처)+허브 링크**로 정직하게 완결한다. [[deploy-firebase]] 규칙(함수 이름 나열 배포) 준수.
