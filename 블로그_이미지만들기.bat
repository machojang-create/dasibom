@echo off
setlocal enabledelayedexpansion

rem  창이 바로 꺼져도 알 수 있게 모든 내용을 실행기록.txt 에 남깁니다.
if "%~1"=="RUN" goto RUN
set LOG=%~dp0실행기록.txt
cmd /c ""%~f0" RUN" > "%LOG%" 2>&1
notepad "%LOG%"
exit /b

:RUN
echo ==========================================
echo   다시봄 블로그 이미지 만들기
echo ==========================================
echo.

set REPO=

rem  1) 이 파일이 있는 폴더가 저장소인지 먼저 봅니다.
if exist "%~dp0tools\gen_nostalgia.mjs" set REPO=%~dp0
if defined REPO goto FOUND

rem  2) 아니면 컴퓨터에서 저장소를 찾습니다.
echo [찾는 중] 저장소 폴더를 찾고 있습니다. 잠시만 기다려 주세요...
echo.

call :SEARCH "%USERPROFILE%\Desktop"
if defined REPO goto FOUND
call :SEARCH "%USERPROFILE%\Documents"
if defined REPO goto FOUND
call :SEARCH "%USERPROFILE%\Downloads"
if defined REPO goto FOUND
if defined OneDrive call :SEARCH "%OneDrive%"
if defined REPO goto FOUND
call :SEARCH "%USERPROFILE%"
if defined REPO goto FOUND

echo [!] 저장소 폴더를 찾지 못했습니다.
echo.
echo     그때그시절 이미지를 만드실 때 쓰셨던 폴더입니다.
echo     그 폴더 안에는 tools 라는 폴더가 있고,
echo     그 안에 gen_nostalgia.mjs 라는 파일이 있습니다.
echo.
echo     그 폴더를 찾으시면 이 파일을 거기에 넣고 다시 두 번 누르세요.
goto END

:FOUND
cd /d "%REPO%"
echo [확인] 저장소를 찾았습니다: %CD%
echo.

echo [확인] git...
git --version
echo [확인] node...
node --version
echo.

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
goto END

rem  ---- 폴더 하나를 뒤져 tools\gen_nostalgia.mjs 를 찾습니다 ----
:SEARCH
if not exist %1 goto :eof
for /f "delims=" %%p in ('dir /s /b "%~1\gen_nostalgia.mjs" 2^>nul') do (
  for %%q in ("%%~dpp.") do set REPO=%%~dpq
  goto :eof
)
goto :eof

:END
echo.
echo (이 기록을 그대로 복사해서 채팅창에 붙여 주시면 제가 봅니다)
