@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem 몇 장 뽑을지. 그냥 두 번 누르시면 3장만 나옵니다.
rem 전부 뽑으시려면 이 파일에서 3 을 0 으로 바꾸세요.
set COUNT=3
if not "%~1"=="" set COUNT=%~1

echo.
echo ================================
echo   블로그 이미지 만들기
echo ================================
echo.

echo [1/4] 최신 원고 받는 중...
git pull --quiet
if errorlevel 1 (
  echo.
  echo    받아오지 못했습니다. 인터넷 연결을 확인해 주세요.
  pause
  exit /b 1
)

echo [2/4] 준비 중...
call npm install --silent --no-audit --no-fund >nul 2>&1

echo [3/4] 대표 이미지와 정보 카드 만드는 중...
for %%f in (out\*.json) do node gen_image.mjs --post "%%f" >nul 2>&1
call node gen_figures.mjs --all

echo.
echo [4/4] 일러스트 %COUNT% 장 만드는 중... (한 장에 7초쯤 걸립니다)
echo.
call node gen_illust.mjs --all --limit %COUNT%

echo.
echo ================================
echo   끝났습니다.
echo ================================
echo.
echo 아무 키나 누르시면 그림 폴더가 열립니다.
pause >nul
start "" "%~dp0out\illust"
