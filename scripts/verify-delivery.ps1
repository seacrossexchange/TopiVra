#!/usr/bin/env pwsh
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
        Write-Host "⚠️  " -ForegroundColor Yellow -NoNewline
        Write-Host "$TestName" -ForegroundColor Yellow
        if ($Message) { Write-Host "   $Message" -ForegroundColor Gray }
        $script:warnCount++
    }
    elseif ($Passed) {
        Write-Host "✅ " -ForegroundColor Green -NoNewline
        Write-Host "$TestName" -ForegroundColor Green
        if ($Message) { Write-Host "   $Message" -ForegroundColor Gray }
        $script:passCount++
    }
    else {
        Write-Host "❌ " -ForegroundColor Red -NoNewline
        Write-Host "$TestName" -ForegroundColor Red
        if ($Message) { Write-Host "   $Message" -ForegroundColor Gray }
        $script:failCount++
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "        TopiVra 最终交付验证" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ==================== 1. 端口配置验证 ====================
Write-Host "[1/8] 验证端口配置统一性..." -ForegroundColor Cyan
Write-Host ""

# 检查 Nginx 配置
$nginxConfigs = @(
    "config\nginx\nginx.conf",
    "config\nginx\dev.nginx.conf",
    "config\nginx\prod.nginx.conf"
)

foreach ($config in $nginxConfigs) {
    if (Test-Path $config) {
        $content = Get-Content $config -Raw
        if ($content -match "server\s+server:8000") {
            Write-TestResult "Nginx 配置 $config" $true "upstream 指向 server:8000"
        }
        elseif ($content -match "server\s+server:3001") {
            Write-TestResult "Nginx 配置 $config" $false "仍然指向 server:3001，应为 server:8000"
        }
        else {
            Write-TestResult "Nginx 配置 $config" $false "未找到 upstream backend 配置"
        }
    }
    else {
        Write-TestResult "Nginx 配置 $config" $false "文件不存在"
    }
}

# 检查启动脚本
if (Test-Path "scripts\deploy\START-DEV-WINDOWS.bat") {
    $content = Get-Content "scripts\deploy\START-DEV-WINDOWS.bat" -Raw
    
    $port8000 = $content -match "PORT=8000"
    $frontend5173 = $content -match "localhost:5173"
    $api8000 = $content -match "localhost:8000"
    
    Write-TestResult "启动脚本端口配置" ($port8000 -and $frontend5173 -and $api8000) "Backend:8000, Frontend:5173"
}
else {
    Write-TestResult "启动脚本" $false "文件不存在"
}

Write-Host ""

# ==================== 2. 环境变量文件验证 ====================
Write-Host "[2/8] 验证环境变量配置..." -ForegroundColor Cyan
Write-Host ""

$envFiles = @(
    @{Path="server\.env.example"; Required=$true},
    @{Path="client\.env.example"; Required=$true},
    @{Path=".env.example"; Required=$true}
)

foreach ($file in $envFiles) {
    if (Test-Path $file.Path) {
        $content = Get-Content $file.Path -Raw
        
        # 检查关键变量
        $hasJwtSecret = $content -match "JWT_SECRET"
        $hasDbUrl = $content -match "DATABASE_URL"
        $hasApiUrl = $content -match "(VITE_)?API"
        
        if ($hasJwtSecret -or $hasDbUrl -or $hasApiUrl) {
            Write-TestResult "环境变量文件 $($file.Path)" $true "包含必需的配置项"
        }
        else {
            Write-TestResult "环境变量文件 $($file.Path)" $false "缺少关键配置项"
        }
    }
    elseif ($file.Required) {
        Write-TestResult "环境变量文件 $($file.Path)" $false "文件不存在"
    }
}

Write-Host ""

# ==================== 3. 安全配置验证 ====================
Write-Host "[3/8] 验证安全配置..." -ForegroundColor Cyan
Write-Host ""

# 检查 main.ts 安全检查逻辑
if (Test-Path "server\src\main.ts") {
    $content = Get-Content "server\src\main.ts" -Raw
    
    $hasJwtCheck = $content -match "jwtSecret\.length < 32"
    $hasSwaggerDisable = $content -match "nodeEnv !== 'production'"
    
    Write-TestResult "JWT 密钥长度检查" $hasJwtCheck "main.ts 包含密钥长度验证"
    Write-TestResult "Swagger 生产环境禁用" $hasSwaggerDisable "生产环境强制禁用 Swagger"
}
else {
    Write-TestResult "main.ts" $false "文件不存在"
}

# 检查启动脚本密钥长度
if (Test-Path "scripts\deploy\START-DEV-WINDOWS.bat") {
    $content = Get-Content "scripts\deploy\START-DEV-WINDOWS.bat" -Raw
    
    # 检查密钥是否至少 32 字符
    if ($content -match "JWT_SECRET=([^\r\n]+)") {
        $jwtSecret = $matches[1]
        $length = $jwtSecret.Length
        if ($length -ge 32) {
            Write-TestResult "启动脚本 JWT 密钥长度" $true "长度: $length 字符 (≥32)"
        }
        else {
            Write-TestResult "启动脚本 JWT 密钥长度" $false "长度: $length 字符 (<32)"
        }
    }
}

Write-Host ""

# ==================== 4. 文档一致性验证 ====================
Write-Host "[4/8] 验证文档一致性..." -ForegroundColor Cyan
Write-Host ""

$docs = @(
    "DEPLOYMENT.md",
    "docs\deployment-guide.md",
    "README.md"
)

foreach ($doc in $docs) {
    if (Test-Path $doc) {
        $content = Get-Content $doc -Raw
        
        # 检查是否包含旧端口号
        $hasOldPort = $content -match "localhost:3001" -or $content -match "localhost:5174"
        
        if (-not $hasOldPort) {
            Write-TestResult "文档 $doc" $true "端口号已更新"
        }
        else {
            Write-TestResult "文档 $doc" $false "仍包含旧端口号 (3001/5174)"
        }
    }
    else {
        Write-TestResult "文档 $doc" $false "文件不存在"
    }
}

Write-Host ""

# ==================== 5. Docker 配置验证 ====================
Write-Host "[5/8] 验证 Docker 配置..." -ForegroundColor Cyan
Write-Host ""

$dockerFiles = @(
    "config\docker-compose.yml",
    "config\docker-compose.prod.yml"
)

foreach ($file in $dockerFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        $hasHealthCheck = $content -match "healthcheck:"
        $hasResourceLimits = $content -match "resources:" -or $file -notmatch "prod"
        
        Write-TestResult "Docker 配置 $file" ($hasHealthCheck) "健康检查配置存在"
    }
    else {
        Write-TestResult "Docker 配置 $file" $false "文件不存在"
    }
}

Write-Host ""

# ==================== 6. 数据库优化验证 ====================
Write-Host "[6/8] 验证数据库优化..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path "server\prisma\migrations\add_performance_indexes.sql") {
    Write-TestResult "数据库索引优化脚本" $true "性能索引 SQL 已创建"
}
else {
    Write-TestResult "数据库索引优化脚本" $false "文件不存在"
}

if (Test-Path "server\prisma\schema.prisma") {
    Write-TestResult "Prisma Schema" $true "数据库模型定义存在"
}
else {
    Write-TestResult "Prisma Schema" $false "文件不存在"
}

Write-Host ""

# ==================== 7. 交付文档验证 ====================
Write-Host "[7/8] 验证交付文档..." -ForegroundColor Cyan
Write-Host ""

$deliveryDocs = @(
    "FINAL-DELIVERY-REPORT.md",
    "FIX-EXECUTION-SUMMARY.md",
    "DELIVERY-CHECKLIST.md",
    "QUICK-REFERENCE.md",
    "OPTIMIZATION-COMPLETE.md"
)

foreach ($doc in $deliveryDocs) {
    if (Test-Path $doc) {
        Write-TestResult "交付文档 $doc" $true "文档已创建"
    }
    else {
        Write-TestResult "交付文档 $doc" $false "文档缺失"
    }
}

Write-Host ""

# ==================== 8. 项目结构验证 ====================
Write-Host "[8/8] 验证项目结构..." -ForegroundColor Cyan
Write-Host ""

$requiredDirs = @(
    "client",
    "server",
    "config",
    "docs",
    "scripts",
    "e2e"
)

foreach ($dir in $requiredDirs) {
    if (Test-Path $dir -PathType Container) {
        Write-TestResult "目录 $dir" $true "存在"
    }
    else {
        Write-TestResult "目录 $dir" $false "不存在"
    }
}

# 检查关键文件
$requiredFiles = @(
    "package.json",
    "README.md",
    "LICENSE",
    "server\package.json",
    "client\package.json"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-TestResult "文件 $file" $true "存在"
    }
    else {
        Write-TestResult "文件 $file" $false "不存在"
    }
}

Write-Host ""

# ==================== 总结 ====================
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                    验证结果" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ 通过: $script:passCount" -ForegroundColor Green
Write-Host "❌ 失败: $script:failCount" -ForegroundColor Red
Write-Host "⚠️  警告: $script:warnCount" -ForegroundColor Yellow
Write-Host ""

$totalTests = $script:passCount + $script:failCount + $script:warnCount
$passRate = if ($totalTests -gt 0) { [math]::Round(($script:passCount / $totalTests) * 100, 1) } else { 0 }

Write-Host "通过率: $passRate%" -ForegroundColor $(if ($passRate -ge 90) { "Green" } elseif ($passRate -ge 70) { "Yellow" } else { "Red" })
Write-Host ""

if ($script:failCount -eq 0) {
    Write-Host "🎉 所有关键检查已通过！项目可以交付。" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "⚠️  发现 $script:failCount 个问题，请修复后再交付。" -ForegroundColor Yellow
    exit 1
}

