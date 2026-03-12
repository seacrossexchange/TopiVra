# TokBazaar 健康检查脚本
# 用法：.\scripts\health-check.ps1 [-Watch] [-Interval 30]

param(
    [switch]$Watch,
    [int]$Interval = 30
)

function Check-Health {
    Clear-Host
    Write-Host "=== TokBazaar 健康检查 ===" -ForegroundColor Cyan
    Write-Host "时间：$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host ""

    # 检查后端
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health/live" -TimeoutSec 5 -UseBasicParsing
        $data = $response.Content | ConvertFrom-Json
        Write-Host "✅ 后端：正常 (运行时间: $([math]::Round($data.data.uptime, 2))s)" -ForegroundColor Green
    } catch {
        Write-Host "❌ 后端：异常" -ForegroundColor Red
    }

    # 检查前端
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5174" -TimeoutSec 5 -UseBasicParsing
        Write-Host "✅ 前端：正常" -ForegroundColor Green
    } catch {
        Write-Host "❌ 前端：异常" -ForegroundColor Red
    }

    # 检查容器
    $containers = docker ps --format "{{.Names}}\t{{.Status}}" 2>$null
    if ($containers) {
        Write-Host ""
        Write-Host "容器状态：" -ForegroundColor Yellow
        foreach ($line in $containers) {
            Write-Host "  $line" -ForegroundColor Gray
        }
    }
}

if ($Watch) {
    Write-Host "持续监控模式（每 $Interval 秒刷新，按 Ctrl+C 退出）" -ForegroundColor Yellow
    Write-Host ""
    while ($true) {
        Check-Health
        Start-Sleep -Seconds $Interval
    }
} else {
    Check-Health
}
