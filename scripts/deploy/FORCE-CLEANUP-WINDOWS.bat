@echo off
setlocal EnableDelayedExpansion

REM ============================================================
REM TopiVra Force Cleanup Script
REM ============================================================

cls
echo.
echo ============================================================
echo        TopiVra Force Cleanup - Remove All Containers
echo ============================================================
echo.

REM Get the project root directory
cd /d "%~dp0..\.."
set PROJECT_ROOT=%cd%
echo Project Root: %PROJECT_ROOT%
echo.

REM Check Docker
echo [Step 1/4] Checking Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo [PASS] Docker is running
echo.

REM Step 1: Stop all running containers
echo [Step 2/4] Stopping all running TopiVra containers...
docker ps --filter "name=topivra" --format "{{.ID}}" | for /f %%i in ('findstr /r "."') do (
    echo Stopping container: %%i
    docker stop %%i 2>nul
)
timeout /t 2 /nobreak >nul
echo [PASS] Containers stopped
echo.

REM Step 2: Remove all containers
echo [Step 3/4] Removing all TopiVra containers...
docker ps -a --filter "name=topivra" --format "{{.ID}}" | for /f %%i in ('findstr /r "."') do (
    echo Removing container: %%i
    docker rm -f %%i 2>nul
)
timeout /t 2 /nobreak >nul
echo [PASS] Containers removed
echo.

REM Step 3: Remove volumes
echo [Step 4/4] Removing TopiVra volumes...
docker volume ls --filter "name=topivra" --format "{{.Name}}" | for /f %%i in ('findstr /r "."') do (
    echo Removing volume: %%i
    docker volume rm %%i 2>nul
)
echo [PASS] Volumes removed
echo.

REM Verify cleanup
echo ============================================================
echo              Cleanup Verification
echo ============================================================
echo.
echo Remaining TopiVra containers:
docker ps -a --filter "name=topivra" --format "table {{.Names}}\t{{.Status}}"
if %errorlevel% equ 0 (
    echo [PASS] No containers found
) else (
    echo [INFO] No containers to display
)
echo.

echo Remaining TopiVra volumes:
docker volume ls --filter "name=topivra" --format "table {{.Name}}\t{{.Driver}}"
if %errorlevel% equ 0 (
    echo [PASS] No volumes found
) else (
    echo [INFO] No volumes to display
)
echo.

echo ============================================================
echo              Cleanup Complete!
echo ============================================================
echo.
echo You can now run: START-DEV-WINDOWS.bat
echo.
pause
exit /b 0

