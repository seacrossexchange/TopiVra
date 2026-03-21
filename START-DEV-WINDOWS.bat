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
REM Get the project root directory (script is in project root)
REM ============================================================
cd /d "%~dp0"
set PROJECT_ROOT=%cd%
echo Project Root: %PROJECT_ROOT%
echo.

REM ============================================================
REM Step 0: Check Administrator (for WSL2 port forwarding)
REM ============================================================
echo [Step 0/7] Checking privileges...
net session >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] Running as Administrator - can fix port forwarding
    set CAN_FIX_PORTS=1
) else (
    echo [WARN] Not running as Administrator
    echo        If ports don't work, run as Admin or use:
    echo        powershell -ExecutionPolicy Bypass -File scripts\fix-wsl2-port-forward.ps1 -Action fix
    set CAN_FIX_PORTS=0
)
echo.

REM ============================================================
REM Step 1: Check Docker
REM ============================================================
echo [Step 1/7] Checking Docker...
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
REM Step 2: Clean up old containers
REM ============================================================
echo [Step 2/7] Preparing containers...

REM Stop any existing containers
docker-compose -f "%PROJECT_ROOT%\config\docker-compose.yml" down 2>nul

REM Start only MySQL and Redis (not the full stack)
echo Starting MySQL and Redis containers...
docker-compose -f "%PROJECT_ROOT%\config\docker-compose.yml" up -d mysql redis
if %errorlevel% neq 0 (
    echo [FAIL] Failed to start containers!
    echo.
    goto :error_exit
)
echo [PASS] MySQL and Redis containers started
echo.

REM ============================================================
REM Step 3: Wait for MySQL
REM ============================================================
echo [Step 3/7] Waiting for MySQL to be ready...
echo This may take 30-60 seconds on first run...
echo.

set RETRY_COUNT=0
set MAX_RETRIES=30

:wait_loop
timeout /t 2 /nobreak >nul
docker exec topivra-mysql mysqladmin ping -h localhost -uroot -proot >nul 2>&1
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

REM Check Redis
docker exec topivra-redis redis-cli -a redis_dev_pass ping >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] Redis is ready
) else (
    echo [WARN] Redis ping failed, but continuing...
)
echo.

REM ============================================================
REM Step 4: Fix WSL2 Port Forwarding (if Admin)
REM ============================================================
if %CAN_FIX_PORTS% equ 1 (
    echo [Step 4/7] Fixing WSL2 port forwarding...
    
    REM Get WSL2 IP
    for /f "tokens=*" %%i in ('wsl -d Ubuntu -- bash -c "ip addr show ^| grep -E 'inet [0-9]' ^| grep -v '127.0.0.1' ^| head -1 ^| awk '{print $2}' ^| cut -d'/' -f1" 2^>nul') do set WSL_IP=%%i
    
    if not "!WSL_IP!"=="" (
        echo WSL2 IP: !WSL_IP!
        
        REM Clear old rules and add new ones
        for %%p in (3001 5173 3306 6379 8000) do (
            netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=%%p >nul 2>&1
            netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=%%p connectaddress=!WSL_IP! connectport=%%p >nul 2>&1
        )
        echo [PASS] Port forwarding configured
    ) else (
        echo [WARN] Could not get WSL2 IP, skipping port forwarding
    )
) else (
    echo [Step 4/7] Skipping port forwarding fix (not Admin)
)
echo.

REM ============================================================
REM Step 5: Setup Backend
REM ============================================================
echo [Step 5/7] Setting up backend...
cd /d "%PROJECT_ROOT%\server"

REM Install dependencies if needed
if not exist "node_modules\" (
    echo Installing backend dependencies...
    echo This will take 2-3 minutes, please wait...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [FAIL] Backend npm install failed!
        goto :error_exit
    )
    echo [PASS] Backend dependencies installed
    echo.
)

REM Create .env file
echo Creating backend .env file...
(
echo NODE_ENV=development
echo PORT=8000
echo APP_PORT=8000
echo FRONTEND_URL=http://localhost:5173
echo DATABASE_URL=mysql://topivra_dev:topivra_dev_pass@localhost:3306/topivra
echo REDIS_HOST=localhost
echo REDIS_PORT=6379
echo REDIS_PASSWORD=redis_dev_pass
echo REDIS_URL=redis://:redis_dev_pass@localhost:6379
echo JWT_SECRET=dev-jwt-secret-key-minimum-32-characters-for-development-only-2024
echo JWT_REFRESH_SECRET=dev-jwt-refresh-secret-key-minimum-32-characters-for-dev-2024
echo JWT_EXPIRES_IN=7d
echo JWT_REFRESH_EXPIRES_IN=30d
echo ENCRYPTION_KEY=dev-encryption-key-32-chars-minimum-for-development-2024
echo API_VERSION=v1
echo PLATFORM_FEE_RATE=0.05
echo MIN_WITHDRAWAL_AMOUNT=10
echo WITHDRAWAL_FEE_RATE=0.01
echo ORDER_AUTO_CANCEL_MINUTES=30
echo ORDER_AUTO_CONFIRM_DAYS=7
echo PAYMENT_EXPIRATION_MINUTES=30
echo MAX_REFUND_DAYS=7
echo ENABLE_SWAGGER=true
echo SWAGGER_PATH=api/v1/docs
) > .env
echo [PASS] Backend .env created

REM Generate Prisma Client
echo Generating Prisma Client...
call npx prisma generate >nul 2>&1

REM Run database migrations
echo Running database migrations...
call npx prisma migrate deploy >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Running migrate dev...
    call npx prisma migrate dev --name init >nul 2>&1
)

REM Seed test data
echo Seeding test data...
call npx prisma db seed >nul 2>&1

echo [PASS] Backend setup complete
echo.

REM ============================================================
REM Step 6: Setup Frontend
REM ============================================================
echo [Step 6/7] Setting up frontend...
cd /d "%PROJECT_ROOT%\client"

REM Install dependencies if needed
if not exist "node_modules\" (
    echo Installing frontend dependencies...
    echo This will take 2-3 minutes, please wait...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [FAIL] Frontend npm install failed!
        goto :error_exit
    )
    echo [PASS] Frontend dependencies installed
    echo.
)

REM Create .env file
echo Creating frontend .env file...
(
echo VITE_API_BASE_URL=http://localhost:8000/api/v1
echo VITE_WS_URL=ws://localhost:8000
echo VITE_GOOGLE_CLIENT_ID=
echo VITE_TELEGRAM_BOT_NAME=
echo VITE_ENABLE_TELEGRAM_LOGIN=false
echo VITE_ENABLE_2FA=false
) > .env
echo [PASS] Frontend .env created
echo.

REM ============================================================
REM Step 7: Start Development Servers
REM ============================================================
echo [Step 7/7] Starting Development Servers...
echo.
echo ============================================================
echo.
echo Two command windows will open:
echo   1. Backend Server  - http://localhost:8000
echo   2. Frontend Server - http://localhost:5173
echo.
echo IMPORTANT: Wait for both servers to fully start (1-2 minutes)
echo.

REM Start backend
cd /d "%PROJECT_ROOT%\server"
start "TopiVra Backend - http://localhost:8000" cmd /k "npm run start:dev"

REM Wait for backend to initialize
echo Waiting for backend to initialize...
timeout /t 10 /nobreak >nul

REM Start frontend
cd /d "%PROJECT_ROOT%\client"
start "TopiVra Frontend - http://localhost:5173" cmd /k "npm run dev"

echo.
echo ============================================================
echo              Startup Complete!
echo ============================================================
echo.
echo Access URLs:
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:8000/api/v1
echo   API Docs:  http://localhost:8000/api/v1/docs
echo.
echo Test Accounts:
echo   Admin:  admin@topivra.com / Admin123!
echo   Seller: seller@topivra.com / Seller123!
echo   Buyer:  buyer@topivra.com / Buyer123!
echo.
echo Database Info:
echo   MySQL: localhost:3306
echo     - Root: root / root
echo     - App:  topivra_dev / topivra_dev_pass
echo   Redis: localhost:6379 (password: redis_dev_pass)
echo   Database: topivra
echo.
echo Troubleshooting:
echo   - If ports don't work, run as Administrator
echo   - Or run: powershell -ExecutionPolicy Bypass -File scripts\fix-wsl2-port-forward.ps1 -Action fix
echo   - Restart: wsl --shutdown then restart Docker Desktop
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
echo   2. Check if ports 8000, 3306, 5173, 6379 are available
echo   3. Run as Administrator for WSL2 port forwarding
echo   4. Try: docker-compose -f config/docker-compose.yml down -v
echo   5. Then run this script again
echo.
pause
exit /b 1

:success_exit
pause
exit /b 0