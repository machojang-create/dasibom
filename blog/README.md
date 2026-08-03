# 다시봄라이프 블로그 운영

네이버 블로그(blog.naver.com/dasibomlife) 글 작성부터 발행까지 자동화한 파이프라인입니다.

---

## 1. 왜 블로그인가

다시봄라이프 웹앱은 PWA(SPA)라서 검색엔진이 내용을 거의 못 읽습니다. 앱 안의 콘텐츠는 로그인·진입 후에야 나오니 검색 유입이 잡히지 않습니다. 블로그가 그 결핍을 메우는 **검색 진입로**입니다.

**방향은 블로그 → 앱 한 방향입니다.** 앱 안에서 블로그로 내보내면 이탈만 만듭니다.

| | 웹앱 | 블로그 |
|---|---|---|
| 읽는 사람 | 이미 쓰는 어르신 | 아직 모르는 자녀 세대 / 담당자 |
| 글의 성격 | 오늘의 콘텐츠, 서비스 기능 | 검색해서 들어오는 글 |
| 목적 | 계속 쓰게 하기 | 앱으로 데려오기 |

앱 콘텐츠를 블로그에 그대로 복사하면 안 됩니다. 검색엔진이 중복으로 보고 양쪽 다 순위를 낮춥니다. **소재만 재활용하고 글은 다시 씁니다.**

---

## 2. 카테고리 5개와 비중

`config.json` 의 `categories` 에 정의되어 있습니다. 큐에서 다음 주제를 고를 때 이 비중을 맞추는 쪽을 먼저 집습니다.

| 카테고리 | 비중 | 독자 | CTA 목적지 |
|---|---|---|---|
| 부모님과의 시간 | 35% | 40~50대 자녀 | `/memoir` 자서전 |
| 건강한 노후 | 25% | 60대 + 자녀 | `/health` 건강돋보기 |
| 돌봄 정책과 현장 | 20% | 지자체·복지관 | `/kiosk` 도입 문의 |
| 어르신들의 이야기 | 10% | 전 연령 | `/memoir` (**수동 작성**) |
| 오늘의 즐거움 | 10% | 60대 본인 | `/arcade` 오락실 |

**글 하나에 CTA는 하나뿐입니다.** 전체 메뉴를 다 붙이면 아무 데도 안 갑니다.

`어르신들의 이야기` 는 실제 인터뷰라서 자동 생성하지 않습니다. 큐에 `manual: true` 로 표시되어 있고, 파이프라인이 건너뜁니다.

---

## 3. 변동성 처리 규칙

AI가 쓴 글에서 가장 위험한 건 **시간이 지나면 틀리는 문장**과 **출처 없는 숫자**입니다. `config.json` 의 `writing.volatility_rules` 에 넣어두었고 시스템 프롬프트로 매번 들어갑니다.

- 상대적 시간 표현(올해, 작년, 요즘) 금지
- 통계·비율·순위를 지어내지 말 것
- 지원금 액수·신청 기간은 "주민센터에 확인" 으로 안내
- 가격·요금제를 본문에 쓰지 말 것
- 의학적 단정 금지, "전문의와 상의" 로 마무리
- 특정 병원·제품 추천 금지

규칙을 바꾸려면 `config.json` 만 고치면 됩니다. 코드는 손댈 필요 없습니다.

---

## 4. 설치 (최초 1회, 대표님 PC에서)

```bash
cd blog
npm install
npx playwright install chromium

cp .env.example .env
# .env 를 열어 ANTHROPIC_API_KEY 를 채웁니다
```

한글 폰트가 필요합니다 (썸네일 글자가 네모로 나오면 이것 때문입니다).

```bash
# 설치된 한글 폰트 확인
fc-list :lang=ko family

# Ubuntu/WSL
sudo apt install fonts-nanum && fc-cache -fv

# macOS / Windows 는 config.json 의 image.font_family 를 바꾸세요
#   macOS   → "AppleSDGothicNeo"
#   Windows → "Malgun Gothic"
```

네이버 로그인 세션을 만듭니다.

```bash
npm run login
```

브라우저가 뜨면 **직접** 아이디/비밀번호를 넣고 로그인하세요. 네이버는 자동 입력을 차단하기 때문에 수동이 가장 안정적입니다. 2단계 인증도 이 창에서 통과하시면 됩니다. 로그인이 끝나면 터미널로 돌아와 Enter.

`.naver_session.json` 이 생깁니다. **이 파일은 로그인 상태 그 자체입니다.** `.gitignore` 에 넣어두었으니 절대 커밋하지 마세요. 세션이 만료되면 `npm run login` 을 다시 돌리면 됩니다.

---

## 5. 매일 쓰는 명령

```bash
npm run status      # 큐 현황 (카테고리별 남은 편수, 몇 주치인지)
npm run draft       # 원고 + 이미지만 생성. 발행 안 함
npm run post        # 원고 → 이미지 → 다음 발행 슬롯에 예약
npm run post:now    # 예약 대신 즉시 발행
```

세부 옵션:

```bash
node run.mjs --count 3                 # 3편 연속 (예약 슬롯이 차례로 밀림)
node run.mjs --id B02                  # 특정 주제 지정
node run.mjs --category care_policy    # 카테고리 지정
node run.mjs --headed                  # 브라우저 보면서 (문제 생겼을 때)
```

**처음 2~3주는 `npm run draft` 로 원고를 눈으로 확인한 뒤 발행하시길 권합니다.** 문체와 변동성 규칙이 의도대로 나오는지 보고, `config.json` 의 `writing.tone` 을 다듬는 게 좋습니다.

발행 주기는 `config.json` 의 `schedule` 에 있습니다. 기본값은 **주 3회, 월·수·금 오전 9시**입니다. 혼자 운영하시는 상황이면 주 1~2회로 줄이는 걸 권합니다 — 주 3회는 두 달이면 큐가 마릅니다 (현재 27편, 주3회 기준 9주치).

---

## 6. 자동 실행 (선택)

큐에 주제가 충분히 쌓인 뒤에 거는 걸 권합니다.

**macOS / Linux — crontab**

```
0 8 * * 1,3,5 cd /경로/dasibom/blog && /usr/local/bin/node run.mjs --now >> out/cron.log 2>&1
```

**Windows — 작업 스케줄러**
- 프로그램: `node`
- 인수: `run.mjs --now`
- 시작 위치: `C:\경로\dasibom\blog`

자동 실행은 세션 만료에 취약합니다. 로그(`out/cron.log`)를 주 1회는 확인하세요. 실패하면 `npm run login` 만 다시 돌리면 됩니다.

---

## 7. 파일 구조

```
blog/
  config.json          카테고리·비중·CTA·문체·변동성 규칙·발행 주기
  topic_queue.json     주제 큐 (30편). status: pending → drafted → published
  lib/
    queue.mjs          큐 읽기/쓰기, 비중 맞춰 다음 주제 선택
    selectors.mjs      네이버 에디터 셀렉터 — 발행 깨지면 여기만 고침
  gen_post.mjs         글 생성 (Claude API)
  gen_image.mjs        썸네일 800x800 PNG (sharp)
  login_naver.mjs      네이버 세션 저장 (최초 1회)
  publish_naver.mjs    발행 / 예약 발행 (Playwright)
  run.mjs              전체 오케스트레이션
  out/                 생성물 (git 제외)
```

---

## 8. 발행이 깨졌을 때

네이버는 예고 없이 에디터 DOM 을 바꿉니다. 발행 실패는 코드 버그가 아니라 대부분 이것입니다.

실패하면 **어느 단계에서 멈췄는지** 로그에 찍히고 `out/error_*.png` 스크린샷이 남습니다.

```bash
node publish_naver.mjs --post out/A01_xxx.json --headed --pause
```

브라우저가 열린 채 멈춥니다. Playwright Inspector 의 Explore 로 바뀐 셀렉터를 찍어서 `lib/selectors.mjs` 의 해당 항목에 **맨 앞에** 추가하세요. 후보 배열이라 위에서부터 시도합니다. 기존 값은 지우지 말고 두세요 — 네이버가 되돌릴 때가 있습니다.

발행 없이 화면만 확인:

```bash
node publish_naver.mjs --post out/A01_xxx.json --dry-run --headed
```

---

## 9. 큐 관리

주제가 떨어지면 `topic_queue.json` 의 `topics` 에 항목을 추가합니다.

```json
{
  "id": "A12",
  "category": "parent_time",
  "title": "검색될 만한 제목",
  "keyword": "부모님 무엇",
  "angle": "이 글이 다른 글과 다른 지점 한 문장",
  "status": "pending"
}
```

`angle` 이 제일 중요합니다. 비어 있으면 어디서나 볼 수 있는 뻔한 글이 나옵니다.

B2G 카테고리는 **도입 지자체가 생기면 그 자체가 최고의 콘텐츠**입니다. 담당 공무원은 기능 설명보다 "다른 지자체가 이미 쓰고 있다"를 찾습니다. 사례가 생기면 최우선으로 큐에 넣으세요.

---

## 10. 아직 안 한 것

- **자체 블로그(`dasibomlife.com/blog`)** — 장기적으로는 본 도메인에 콘텐츠가 쌓이는 게 유리합니다. 다만 지금 Firebase 호스팅은 `/**` 가 `index.html` 로 가는 SPA 구조라, `/blog` 경로를 쓰려면 `firebase.json` 의 rewrites 에 `/**` 보다 **위쪽에** 별도 규칙을 넣어야 합니다. 네이버 블로그가 자리를 잡은 뒤에 하는 게 순서입니다.
- **네이버 요약본 자동화** — 자체 블로그가 생기면, 네이버에는 요약본 + 원문 링크만 올리는 방식으로 바꿉니다. 지금은 네이버가 원문이라 해당 없습니다.
- **지표 수집** — 유입 키워드와 CTA 클릭률을 봐야 카테고리 비중을 재조정할 수 있습니다. 발행이 안정되면 붙입니다.
