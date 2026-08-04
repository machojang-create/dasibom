@echo off
setlocal

rem  창이 바로 꺼져도 무슨 일이 있었는지 알 수 있게, 모든 내용을
rem  실행기록.txt 에 남기고 마지막에 메모장으로 열어 줍니다.
if "%~1"=="RUN" goto RUN

set LOG=%~dp0실행기록.txt
cmd /c ""%~f0" RUN" > "%LOG%" 2>&1
notepad "%LOG%"
exit /b

:RUN
cd /d "%~dp0"

echo ==========================================
echo   다시봄 블로그 이미지 만들기
echo ==========================================
echo.
echo [확인] 지금 폴더: %CD%
echo.

echo [확인] git 이 깔려 있는지...
git --version
if errorlevel 1 echo    ^>^> git 이 없습니다. https://git-scm.com 에서 설치가 필요합니다.
echo.

echo [확인] node 가 깔려 있는지...
node --version
if errorlevel 1 echo    ^>^> node 가 없습니다. https://nodejs.org 에서 설치가 필요합니다.
echo.

if exist ".git" goto HAVEREPO
echo [!] 여기는 저장소 폴더가 아닙니다.
echo.
echo     이 파일을 아래 폴더에 넣고 다시 두 번 누르세요.
echo     C:\Users\USER\Desktop\이전작업\백업\memoir
echo.
echo     그 폴더에 들어갔을 때 index.html, tools, img 같은 것이
echo     보이면 맞는 폴더입니다.
goto END

:HAVEREPO
echo [1/5] 최신 내용 받는 중...
git pull
echo.

if exist "blog" goto HAVEBLOG
echo [!] blog 폴더가 없습니다. 받아오기가 안 된 것 같습니다.
goto END

:HAVEBLOG
cd blog

echo [2/5] 준비 중... 처음 한 번만 오래 걸립니다.
call npm install --no-audit --no-fund
echo.

echo [3/5] 대표 이미지 만드는 중...
for %%f in (out\*.json) do node gen_image.mjs --post "%%f"
echo.

echo [4/5] 정보 카드 만드는 중...
call node gen_figures.mjs --all
echo.

echo [5/5] 일러스트 3장 만드는 중... 한 장에 7초쯤 걸립니다.
call node gen_illust.mjs --all --limit 3
echo.

echo ==========================================
echo   끝났습니다.
echo   그림 위치: %CD%\out\illust
echo ==========================================
start "" "%CD%\out\illust"

:END
echo.
echo (이 기록을 그대로 복사해서 채팅창에 붙여 주시면 제가 봅니다)
