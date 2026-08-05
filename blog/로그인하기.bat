@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ================================
echo   네이버 블로그 로그인
echo ================================
echo.
echo  곧 크롬 창이 하나 뜹니다.
echo  거기서 네이버에 로그인만 해 주세요.
echo.
echo  이 창으로 돌아오실 필요 없습니다.
echo  로그인이 끝나면 알아서 저장하고 크롬 창이 닫힙니다.
echo.

rem 기다리는 시간(분). 넉넉하게 30분입니다.
set LOGIN_WAIT_MIN=30

node login_naver.mjs

echo.
if errorlevel 1 (
  echo  로그인이 확인되지 않았습니다.
  echo  이 파일을 다시 두 번 누르시면 됩니다.
) else (
  echo  다 됐습니다. 이제 클로드에게 "로그인 했어" 라고 알려 주세요.
)
echo.
pause
