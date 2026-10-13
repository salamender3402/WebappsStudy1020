@echo off
setlocal
cd /d "%~dp0"
title 학사일정 웹앱 로컬 서버

echo ========================================================
echo   [학사일정 관리 웹앱] 로컬 웹 서버 실행기
echo ========================================================
echo.

where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [안내] Python 환경이 감지되었습니다.
    echo [실행] http://localhost:8000 로컬 웹 서버를 구동합니다...
    echo [브라우저] 캐시 간섭 없는 시크릿 창으로 자동 연결합니다.
    echo.
    start "" chrome -incognito http://localhost:8000/ 2>nul || start "" msedge -inprivate http://localhost:8000/ 2>nul || start http://localhost:8000/
    py -m http.server 8000
    goto :end
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [안내] Python 환경이 감지되었습니다.
    echo [실행] http://localhost:8000 로컬 웹 서버를 구동합니다...
    echo [브라우저] 캐시 간섭 없는 시크릿 창으로 자동 연결합니다.
    echo.
    start "" chrome -incognito http://localhost:8000/ 2>nul || start "" msedge -inprivate http://localhost:8000/ 2>nul || start http://localhost:8000/
    python -m http.server 8000
    goto :end
)

where npx >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [안내] Node.js 환경이 감지되었습니다.
    echo [실행] http://localhost:8000 로컬 웹 서버를 구동합니다...
    echo [브라우저] 캐시 간섭 없는 시크릿 창으로 자동 연결합니다.
    echo.
    start "" chrome -incognito http://localhost:8000/ 2>nul || start "" msedge -inprivate http://localhost:8000/ 2>nul || start http://localhost:8000/
    call npx --yes http-server -p 8000
    goto :end
)

echo [안내] 윈도우 내장 PowerShell 로컬 웹 서버로 구동합니다.
echo [실행] http://localhost:8000 로컬 웹 서버를 구동합니다...
echo [브라우저] 캐시 간섭 없는 시크릿 창으로 자동 연결합니다.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '.\server.ps1' -Encoding utf8 | Out-String | Invoke-Expression"

:end
pause
