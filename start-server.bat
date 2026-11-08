@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title 학사일정 웹앱 로컬 서버

echo ========================================================
echo   [학사일정 관리 웹앱] 로컬 웹 서버 실행기
echo ========================================================
echo.

where npx >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [안내] Node.js 환경이 감지되었습니다.
    echo [준비] 웹 서버 도구를 확인하는 중입니다. 처음에는 30초쯤 걸릴 수 있습니다...
    call npx --yes http-server --version >nul 2>nul
    echo [실행] http://localhost:8000 로컬 웹 서버를 구동합니다...
    echo [브라우저] 캐시 간섭 없는 시크릿 창으로 자동 연결합니다.
    echo [종료] 이 창을 닫으면 서버가 꺼집니다.
    echo.
    start "" chrome -incognito http://localhost:8000/ 2>nul || start "" msedge -inprivate http://localhost:8000/ 2>nul || start "" http://localhost:8000/
    call npx --yes http-server -p 8000 -c-1
    goto :end
)

echo [안내] Node.js가 없어 윈도우 내장 PowerShell 웹 서버로 구동합니다.
echo [실행] http://localhost:8000 로컬 웹 서버를 구동합니다...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '.\server.ps1' -Encoding utf8 | Out-String | Invoke-Expression"

:end
pause
