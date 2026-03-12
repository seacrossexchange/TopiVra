@echo off
setlocal EnableDelayedExpansion

REM ============================================================
REM TopiVra Windows 开发环境停止脚本
REM 功能：停止所有 Docker 容器
REM ============================================================

cls
echo.
echo ============================================================
echo        TopiVra Development Environment - Stop
echo ============================================================
echo.

REM ============================================================
REM Get the project root directory
REM ============================================================
REM Script is in scripts/deploy/, so go up 2 levels to project root
cd /d "%~dp0..\.."
set PROJECT_ROOT=%cd%
echo Project Root: %PROJECT_ROOT%
echo.

echo [1/2] 停止容器...
docker-compose -f "%PROJECT_ROOT%\config\docker-compose.yml" down
if %errorlevel% neq 0 (
    echo [FAIL] 停止容器失败！
    pause
    exit /b 1
)
echo [PASS] 容器已停止
echo.

echo [2/2] 清理完成
echo.
echo ============================================================
echo                  停止完成
echo ============================================================
echo.
echo 如需清理所有数据（谨慎！）：
echo   docker-compose -f config/docker-compose.yml down -v
echo.
pause
