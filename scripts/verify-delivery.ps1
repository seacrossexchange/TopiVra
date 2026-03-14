# ============================================================
# TopiVra 最终交付验证脚本
# 用途: 验证所有修复和优化是否正确应用
# 执行: powershell -ExecutionPolicy Bypass -File verify-delivery.ps1
# ============================================================

$ErrorActionPreference = "Continue"
$script:passCount = 0
$script:failCount = 0
$script:warnCount = 0

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Message = "",
        [bool]$IsWarning = $false
    )
    
    if ($IsWarning) {
        Write-Host "WARNING " -ForegroundColor Yellow -NoNewline
        Write-Host "$TestName" -ForegroundColor Yellow
        if ($Message) { Write-Host "   $Message" -ForegroundColor Gray }
        $script:warnCount++
    }
    elseif ($Passed) {
        Write-Host "PASS " -ForegroundColor Green -NoNewline
        Write-Host "$TestName" -ForegroundColor Green
        if ($Message) { Write-Host "   $Message" -ForegroundColor Gray }
        $script:passCount++
    }
    else {
        Write-Host "FAIL " -ForegroundColor Red -NoNewline
        Write-Host "$TestName" -ForegroundColor Red
        if ($Message) { Write-Host "   $Message" -ForegroundColor Gray }
        $script:failCount++
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "        TopiVra Final Delivery Verification" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ==================== 1. Port Configuration ====================
Write-Host "[1/8] Verifying port configuration..." -ForegroundColor Cyan
Write-Host ""

$nginxConfigs = @(
    "config\nginx\nginx.conf",
    "config\nginx\dev.nginx.conf",
    "config\nginx\prod.nginx.conf"
)

foreach ($config in $nginxConfigs) {
    if (Test-Path $config) {
        $content = Get-Content $config -Raw
        if ($content -match "server\s+server:8000") {
            Write-TestResult "Nginx config $config" $true "upstream points to server:8000"
        }
        elseif ($content -match "server\s+server:3001") {
            Write-TestResult "Nginx config $config" $false "still points to server:3001, should be server:8000"
        }
        else {
            Write-TestResult "Nginx config $config" $false "upstream backend not found"
        }
    }
    else {
        Write-TestResult "Nginx config $config" $false "file not found"
    }
}

Write-Host ""

# ==================== 2. Environment Files ====================
Write-Host "[2/8] Verifying environment files..." -ForegroundColor Cyan
Write-Host ""

$envFiles = @("server\.env.example", "client\.env.example", ".env.example")

foreach ($file in $envFiles) {
    if (Test-Path $file) {
        Write-TestResult "Environment file $file" $true "exists"
    }
    else {
        Write-TestResult "Environment file $file" $false "not found"
    }
}

Write-Host ""

# ==================== 3. Security Configuration ====================
Write-Host "[3/8] Verifying security configuration..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path "server\src\main.ts") {
    $content = Get-Content "server\src\main.ts" -Raw
    
    $hasJwtCheck = $content -match "jwtSecret.length"
    $hasSwaggerDisable = $content -match "nodeEnv !== 'production'"
    
    Write-TestResult "JWT key length check" $hasJwtCheck "main.ts includes key validation"
    Write-TestResult "Swagger production disable" $hasSwaggerDisable "production environment disables Swagger"
}
else {
    Write-TestResult "main.ts" $false "file not found"
}

Write-Host ""

# ==================== 4. Documentation ====================
Write-Host "[4/8] Verifying documentation..." -ForegroundColor Cyan
Write-Host ""

$docs = @("DEPLOYMENT.md", "docs\deployment-guide.md", "README.md")

foreach ($doc in $docs) {
    if (Test-Path $doc) {
        $content = Get-Content $doc -Raw
        $hasOldPort = $content -match "localhost:3001" -or $content -match "localhost:5174"
        
        if (-not $hasOldPort) {
            Write-TestResult "Documentation $doc" $true "ports updated"
        }
        else {
            Write-TestResult "Documentation $doc" $false "still contains old ports (3001/5174)"
        }
    }
    else {
        Write-TestResult "Documentation $doc" $false "file not found"
    }
}

Write-Host ""

# ==================== 5. Docker Configuration ====================
Write-Host "[5/8] Verifying Docker configuration..." -ForegroundColor Cyan
Write-Host ""

$dockerFiles = @("config\docker-compose.yml", "config\docker-compose.prod.yml")

foreach ($file in $dockerFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $hasHealthCheck = $content -match "healthcheck:"
        Write-TestResult "Docker config $file" $hasHealthCheck "health check configured"
    }
    else {
        Write-TestResult "Docker config $file" $false "file not found"
    }
}

Write-Host ""

# ==================== 6. Database Optimization ====================
Write-Host "[6/8] Verifying database optimization..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path "server\prisma\migrations\add_performance_indexes.sql") {
    Write-TestResult "Database index optimization" $true "performance indexes SQL created"
}
else {
    Write-TestResult "Database index optimization" $false "file not found"
}

if (Test-Path "server\prisma\schema.prisma") {
    Write-TestResult "Prisma Schema" $true "database model exists"
}
else {
    Write-TestResult "Prisma Schema" $false "file not found"
}

Write-Host ""

# ==================== 7. Core Documentation ====================
Write-Host "[7/8] Verifying core documentation..." -ForegroundColor Cyan
Write-Host ""

$coreDocs = @(
    "README.md",
    "DEPLOYMENT.md",
    "LICENSE",
    "docs\README.md",
    "docs\deployment-guide.md",
    "docs\DEVELOPMENT.md",
    "docs\API.md"
)

foreach ($doc in $coreDocs) {
    if (Test-Path $doc) {
        Write-TestResult "Core doc $doc" $true "exists"
    }
    else {
        Write-TestResult "Core doc $doc" $false "missing"
    }
}

Write-Host ""

# ==================== 8. Project Structure ====================
Write-Host "[8/8] Verifying project structure..." -ForegroundColor Cyan
Write-Host ""

$requiredDirs = @("client", "server", "config", "docs", "scripts", "e2e")

foreach ($dir in $requiredDirs) {
    if (Test-Path $dir -PathType Container) {
        Write-TestResult "Directory $dir" $true "exists"
    }
    else {
        Write-TestResult "Directory $dir" $false "not found"
    }
}

$requiredFiles = @("package.json", "README.md", "LICENSE", "server\package.json", "client\package.json")

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-TestResult "File $file" $true "exists"
    }
    else {
        Write-TestResult "File $file" $false "not found"
    }
}

Write-Host ""

# ==================== Summary ====================
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                    Verification Results" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PASS: $script:passCount" -ForegroundColor Green
Write-Host "FAIL: $script:failCount" -ForegroundColor Red
Write-Host "WARN: $script:warnCount" -ForegroundColor Yellow
Write-Host ""

$totalTests = $script:passCount + $script:failCount + $script:warnCount
if ($totalTests -gt 0) {
    $passRate = [math]::Round(($script:passCount / $totalTests) * 100, 1)
}
else {
    $passRate = 0
}

if ($passRate -ge 90) {
    Write-Host "Pass Rate: $passRate%" -ForegroundColor Green
}
elseif ($passRate -ge 70) {
    Write-Host "Pass Rate: $passRate%" -ForegroundColor Yellow
}
else {
    Write-Host "Pass Rate: $passRate%" -ForegroundColor Red
}

Write-Host ""

if ($script:failCount -eq 0) {
    Write-Host "SUCCESS: All critical checks passed! Project is ready for delivery." -ForegroundColor Green
    exit 0
}
else {
    Write-Host "WARNING: Found $script:failCount issues, please fix before delivery." -ForegroundColor Yellow
    exit 1
}
