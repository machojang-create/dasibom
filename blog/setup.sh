#!/usr/bin/env bash
# 처음 한 번만 돌리면 되는 준비 스크립트.
#
#   cd blog && ./setup.sh
#
# 하는 일: 패키지 설치 → 크롬 설치 → 한글 폰트 확인 → 블로그 이미지 생성 → 네이버 로그인.
# 중간에 브라우저 창이 뜹니다. 거기서 직접 네이버에 로그인하고 터미널로 돌아와 Enter 를 누르세요.
set -e
cd "$(dirname "$0")"

echo
echo "[1/6] 패키지 설치"
npm install --silent

echo
echo "[2/6] 크롬 설치 (이미 있으면 건너뜁니다)"
npx playwright install chromium

echo
echo "[3/6] 한글 폰트 확인"
FONT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('config.json','utf8')).brand.font_family)")
if command -v fc-list >/dev/null 2>&1; then
  if fc-list :lang=ko family | grep -qi "$(echo "$FONT" | sed 's/Gothic/ *Gothic/')"; then
    echo "  $FONT 있음"
  else
    echo "  경고: config.json 의 brand.font_family 가 '$FONT' 인데 시스템에 없습니다."
    echo "        썸네일 글자가 네모로 나옵니다. 아래 중 하나로 고치세요."
    echo "        macOS   : font_family 를 \"AppleSDGothicNeo\" 로"
    echo "        Windows : font_family 를 \"Malgun Gothic\" 으로"
    echo "        Ubuntu  : sudo apt install fonts-nanum && fc-cache -fv"
  fi
else
  echo "  (fc-list 가 없어 건너뜁니다. macOS 면 font_family 를 AppleSDGothicNeo 로 두세요.)"
fi

echo
echo "[4/6] 블로그 이미지 생성"
node gen_blog_assets.mjs >/dev/null
echo "  out/assets/ 에 타이틀·프로필·사이드배너·모바일커버 4개 생성"

echo
echo "[5/6] 일러스트 키 확인"
if [ -f .env ]; then set -a; . ./.env; set +a; fi
if [ -n "${GEMINI_API_KEY:-}${GOOGLE_API_KEY:-}" ]; then
  echo "  GEMINI_API_KEY 있음 — 본문 일러스트를 만듭니다."
else
  echo "  GEMINI_API_KEY 가 없습니다. 본문에는 카드 이미지만 들어갑니다."
  echo "    1. https://aistudio.google.com/apikey 에서 키 발급"
  echo "    2. blog/.env 에  GEMINI_API_KEY=...  한 줄"
  echo "    (.env 는 .gitignore 에 있습니다. 커밋되지 않습니다.)"
fi

echo
echo "[6/6] 네이버 로그인"
if [ -f .naver_session.json ]; then
  echo "  .naver_session.json 이 이미 있습니다. 다시 로그인하려면:  npm run login"
else
  node login_naver.mjs
fi

cat <<'EOF'

준비 끝났습니다. 다음은 네이버 관리 화면에서 손으로 해야 하는 것 두 가지입니다.

  1. 카테고리 7개 만들기      (SETUP_NAVER.md 2번 — 이걸 안 하면 발행이 실패합니다)
  2. 이미지 4개 업로드         (SETUP_NAVER.md 0·3·5번 — out/assets/)

그다음 첫 글은 눈으로 확인하고 올리세요.

  node publish_naver.mjs --post out/B01_*.json --headed --dry-run

화면이 out/dryrun_*.png 로 저장됩니다. 카테고리와 태그가 맞으면 --dry-run 을 빼고 다시 실행하세요.
EOF
