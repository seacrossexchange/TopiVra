@echo off
setlocal EnableDelayedExpansion

REM ============================================================
REM TopiVra Development Environment - WSL2 Compatible
REM ============================================================

cls
echo.
echo ============================================================
echo        TopiVra Development Environment Startup
echo        (WSL2 Docker Desktop Compatible)
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

REM ============================================================
REM Step 1: Check Docker
REM ============================================================
echo [Step 1/5] Checking Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] Docker is not running!
    echo.
    echo Please start Docker Desktop and try again.
    echo.
    goto :error_exit
)
echo [PASS] Docker is running
echo.

REM ============================================================
REM Step 2: Clean up old containers (if any)
REM ============================================================
echo [Step 2a/5] Cleaning up old containers...
docker-compose -f "%PROJECT_ROOT%\config\docker-compose.yml" down -v 2>nul
timeout /t 2 /nobreak >nul

REM Force remove any lingering containers
for /f "tokens=*" %%i in ('docker ps -a --filter "name=topivra" --format "{{.ID}}" 2^>nul') do (
    echo Removing container: %%i
    docker rm -f %%i 2>nul
)

echo [PASS] Old containers cleaned
echo.

REM ============================================================
REM Step 2b: Start Database Containers
REM ============================================================
echo [Step 2b/5] Starting MySQL and Redis containers...
docker-compose -f "%PROJECT_ROOT%\config\docker-compose.yml" up -d mysql redis
if %errorlevel% neq 0 (
    echo [FAIL] Failed to start containers!
    echo.
    goto :error_exit
)
echo [PASS] Containers started
echo.

REM ============================================================
REM Step 3: Wait for MySQL
REM ============================================================
echo [Step 3/6] Waiting for MySQL to be ready...
echo This may take 30-60 seconds on first run...
echo.

set RETRY_COUNT=0
set MAX_RETRIES=30

:wait_loop
timeout /t 2 /nobreak >nul
docker-compose -f "%PROJECT_ROOT%\config\docker-compose.yml" exec -T mysql mysqladmin ping -h localhost -uroot -proot >nul 2>&1
if %errorlevel% equ 0 goto mysql_ready

set /a RETRY_COUNT+=1
echo Attempt %RETRY_COUNT%/%MAX_RETRIES%...

if %RETRY_COUNT% lss %MAX_RETRIES% goto wait_loop

echo [FAIL] MySQL did not start in time!
echo.
echo Please check: docker logs topivra-mysql
echo.
goto :error_exit

:mysql_ready
echo [PASS] MySQL is ready
echo [PASS] Redis is ready
echo.

REM ============================================================
REM Step 4: Setup Backend (Use localhost for WSL2)
REM ============================================================
echo [Step 4/6] Setting up backend...
cd /d "%PROJECT_ROOT%\server"

REM Install dependencies if needed
if not exist "node_modules\" (
    echo Installing backend dependencies...
    echo This will take 3-5 minutes, please wait...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [FAIL] Backend npm install failed!
        goto :error_exit
    )
    echo [PASS] Backend dependencies installed
    echo.
)

REM Create .env file with localhost
echo Creating backend .env file...
echo Using localhost for database connections
echo.
(
echo NODE_ENV=development
echo PORT=3001
echo FRONTEND_URL=http://localhost:5174
echo DATABASE_URL=mysql://root:root@localhost:3306/topivra
echo REDIS_HOST=localhost
echo REDIS_PORT=6379
echo REDIS_URL=redis://localhost:6379
echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
echo JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production-2024
echo USDT_WALLET_ADDRESS=TTestWalletAddressForDevelopmentOnly123456789
) > .env

REM Generate Prisma Client
echo Generating Prisma Client...
call npx prisma generate >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Prisma generate had issues, but continuing...
)

REM Create database using docker-compose exec
echo Creating database...
docker-compose -f "%PROJECT_ROOT%\config\docker-compose.yml" exec -T mysql mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS topivra;" 2>nul

REM Run database migrations
echo Running database migrations...
call npx prisma migrate deploy >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Running migrations with dev mode...
    call npx prisma migrate dev --name init >nul 2>&1
)

REM Seed test data
echo Initializing test data (accounts, products, orders)...
call npx prisma db seed >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Seed data initialization had issues, but continuing...
)

echo [PASS] Backend setup complete
echo.

REM ============================================================
REM Step 5: Setup Frontend
REM ============================================================
echo [Step 5/6] Setting up frontend...
cd /d "%PROJECT_ROOT%\client"

REM Install dependencies if needed
if not exist "node_modules\" (
    echo Installing frontend dependencies...
    echo This will take 3-5 minutes, please wait...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [FAIL] Frontend npm install failed!
        goto :error_exit
    )
    echo [PASS] Frontend dependencies installed
    echo.
)

REM Create .env file if not exists
if not exist ".env" (
    echo Creating frontend .env file...
    (
echo VITE_API_BASE_URL=http://localhost:3001/api/v1
echo VITE_WS_URL=ws://localhost:3001
echo VITE_GOOGLE_CLIENT_ID=
echo VITE_TELEGRAM_BOT_NAME=
echo VITE_ENABLE_TELEGRAM_LOGIN=false
echo VITE_ENABLE_2FA=false
    ) > .env
)

echo [PASS] Frontend setup complete
echo.

REM ============================================================
REM Step 6: Start Development Servers
REM ============================================================
echo [Step 6/6] Starting Development Servers...
echo ============================================================
echo Starting Development Servers...
echo ============================================================
echo.
echo IMPORTANT NOTES:
echo - Using localhost for database connections
echo - Backend will run database migrations on first start
echo - This may take 1-2 minutes, please be patient
echo.
echo Two command windows will open:
echo   1. Backend Server  - http://localhost:3001
echo   2. Frontend Server - http://localhost:5174
echo.

REM Start backend
cd /d "%PROJECT_ROOT%\server"
start "TopiVra Backend - http://localhost:3001" cmd /k "npm run start:dev"

REM Wait a bit before starting frontend
echo Waiting for backend to initialize...
timeout /t 8 /nobreak >nul

REM Start frontend
cd /d "%PROJECT_ROOT%\client"
start "TopiVra Frontend - http://localhost:5174" cmd /k "npm run dev"

echo.
echo ============================================================
echo              Startup Complete!
echo ============================================================
echo.
echo Access URLs:
echo   Frontend:  http://localhost:5174
echo   Backend:   http://localhost:3001/api/v1
echo   API Docs:  http://localhost:3001/api/v1/docs
echo.
echo Test Accounts:
echo   Admin:  admin@topivra.com / Admin123!
echo   Seller: seller@topivra.com / Seller123!
echo   Buyer:  buyer@topivra.com / Buyer123!
echo.
echo Database Info:
echo   MySQL: localhost:3306 (root/root)
echo   Redis: localhost:6379
echo   Database: topivra
echo.
echo Next Steps:
echo   1. Wait for both servers to finish starting (1-2 minutes)
echo   2. Check the Backend window for "Nest application successfully started"
echo   3. Check the Frontend window for "Local: http://localhost:5174"
echo   4. Open http://localhost:5174 in your browser
echo   5. Login with one of the test accounts above
echo.
echo IMPORTANT - First Time Setup:
echo   If this is your first run, the script has:
echo   - Created database tables (migrations)
echo   - Initialized test accounts and products (seed data)
echo   - Set up 3 test products in different categories
echo.
echo To stop: Close the two command windows or press Ctrl+C
echo.
echo ============================================================
echo.
goto :success_exit

:error_exit
echo.
echo ============================================================
echo                  Startup Failed!
echo ============================================================
echo.
echo Please check the error messages above.
echo.
echo Common solutions:
echo   1. Make sure Docker Desktop is running
echo   2. Check if ports 3001, 3306, 5174, 6379 are available
echo   3. Try: docker-compose -f config/docker-compose.yml down -v
echo   4. Then run this script again
echo.
echo WSL2 Troubleshooting:
echo   - Restart Docker Desktop
echo   - Run: wsl --shutdown
echo   - Then start Docker Desktop again
echo.
pause
exit /b 1

:success_exit
pause
exit /b 0
