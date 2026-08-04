@echo off
cd /d "%~dp0"
title 블로그 이미지 만들기

rem  이 파일은 저장소 맨 위 폴더에 두고 두 번 누르시면 됩니다.
rem  몇 장 뽑을지는 아래 숫자만 바꾸세요.  3 = 세 장만 / 0 = 전부
set COUNT=3

echo.
echo  ==========================================
echo    다시봄 블로그 이미지 만들기
echo  ==========================================
echo.

if not exist ".git" goto WRONGDIR

echo  [1/5] 최신 내용 받는 중...
git pull
if errorlevel 1 goto NONET

if not exist "blog" goto NOBLOG

cd blog

echo.
echo  [2/5] 준비 중... 처음 한 번만 오래 걸립니다.
call npm install --silent --no-audit --no-fund

echo.
echo  [3/5] 대표 이미지 만드는 중...
for %%f in (out\*.json) do node gen_image.mjs --post "%%f" >nul 2>&1

echo  [4/5] 정보 카드 만드는 중...
call node gen_figures.mjs --all

echo.
echo  [5/5] 일러스트 만드는 중... 한 장에 7초쯤 걸립니다.
echo.
call node gen_illust.mjs --all --limit %COUNT%

echo.
echo  ==========================================
echo    끝났습니다.
echo  ==========================================
echo.
echo  아무 키나 누르시면 그림 폴더가 열립니다.
pause >nul
start "" "%CD%\out\illust"
goto END

:WRONGDIR
echo  [!] 여기가 저장소 폴더가 아닙니다.
echo.
echo      이 파일을 아래 폴더에 넣고 다시 두 번 누르세요.
echo      C:\Users\USER\Desktop\이전작업\백업\memoir
echo.
pause
goto END

:NONET
echo.
echo  [!] 받아오지 못했습니다. 인터넷 연결을 확인해 주세요.
echo.
pause
goto END

:NOBLOG
echo.
echo  [!] blog 폴더가 없습니다. 받아오기가 제대로 안 된 것 같습니다.
echo.
pause
goto END

:END
