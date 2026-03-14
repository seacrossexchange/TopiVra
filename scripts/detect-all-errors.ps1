# TopiVra 全面错误检测脚本 (Windows PowerShell 版本)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "TopiVra 全面错误检测" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 创建错误报告目录
$errorReportsDir = "error-reports"
if (-not (Test-Path $errorReportsDir)) {
    New-Item -ItemType Directory -Path $errorReportsDir | Out-Null
}

$projectRoot = Get-Location

# 1. TypeScript 类型错误检测
Write-Host "📝 [1/5] 检测 TypeScript 类型错误..." -ForegroundColor Yellow
$tsErrorsFile = "$errorReportsDir/typescript-errors.txt"

Write-Host "  检查后端 TypeScript..." -ForegroundColor Gray
Set-Location "$projectRoot/server"
$output = npm run build 2>&1 | Out-String
"=== 后端 TypeScript/构建检查 ===" | Out-File -FilePath $tsErrorsFile -Encoding utf8
$output | Out-File -FilePath $tsErrorsFile -Encoding utf8 -Append

Write-Host "  检查前端 TypeScript..." -ForegroundColor Gray
Set-Location "$projectRoot/client"
$output = npm run build 2>&1 | Out-String
"`n=== 前端 TypeScript/构建检查 ===" | Out-File -FilePath $tsErrorsFile -Encoding utf8 -Append
$output | Out-File -FilePath $tsErrorsFile -Encoding utf8 -Append

Write-Host "✅ TypeScript 错误已保存到 $tsErrorsFile" -ForegroundColor Green
Write-Host ""

# 2. ESLint 错误检测
Write-Host "📝 [2/5] 检测 ESLint 错误..." -ForegroundColor Yellow
$eslintFile = "$errorReportsDir/eslint-errors.txt"

Write-Host "  检查后端 ESLint..." -ForegroundColor Gray
Set-Location "$projectRoot/server"
$output = npx eslint . --ext .ts 2>&1 | Out-String
"=== 后端 ESLint 检查 ===" | Out-File -FilePath $eslintFile -Encoding utf8
$output | Out-File -FilePath $eslintFile -Encoding utf8 -Append

Write-Host "  检查前端 ESLint..." -ForegroundColor Gray
Set-Location "$projectRoot/client"
$output = npx eslint . --ext .ts,.tsx 2>&1 | Out-String
"`n=== 前端 ESLint 检查 ===" | Out-File -FilePath $eslintFile -Encoding utf8 -Append
$output | Out-File -FilePath $eslintFile -Encoding utf8 -Append

Write-Host "✅ ESLint 错误已保存到 $eslintFile" -ForegroundColor Green
Write-Host ""

# 3. 测试失败检测
Write-Host "📝 [3/5] 检测测试失败..." -ForegroundColor Yellow
$testFile = "$errorReportsDir/test-failures.txt"

Write-Host "  运行后端测试..." -ForegroundColor Gray
Set-Location "$projectRoot/server"
$output = npm test 2>&1 | Out-String
"=== 后端测试 ===" | Out-File -FilePath $testFile -Encoding utf8
$output | Out-File -FilePath $testFile -Encoding utf8 -Append

Write-Host "  运行前端测试..." -ForegroundColor Gray
Set-Location "$projectRoot/client"
$output = npm test 2>&1 | Out-String
"`n=== 前端测试 ===" | Out-File -FilePath $testFile -Encoding utf8 -Append
$output | Out-File -FilePath $testFile -Encoding utf8 -Append

Write-Host "✅ 测试失败已保存到 $testFile" -ForegroundColor Green
Write-Host ""

# 4. 构建错误检测 (已在 TypeScript 检测中完成)
Write-Host "📝 [4/5] 构建错误已在 TypeScript 检测中完成" -ForegroundColor Yellow
Write-Host ""

# 5. 依赖问题检测
Write-Host "📝 [5/5] 检测依赖问题..." -ForegroundColor Yellow
$depFile = "$errorReportsDir/dependency-issues.txt"

Write-Host "  检查后端依赖..." -ForegroundColor Gray
Set-Location "$projectRoot/server"
$output = npm audit 2>&1 | Out-String
"=== 后端依赖审计 ===" | Out-File -FilePath $depFile -Encoding utf8
$output | Out-File -FilePath $depFile -Encoding utf8 -Append

Write-Host "  检查前端依赖..." -ForegroundColor Gray
Set-Location "$projectRoot/client"
$output = npm audit 2>&1 | Out-String
"`n=== 前端依赖审计 ===" | Out-File -FilePath $depFile -Encoding utf8 -Append
$output | Out-File -FilePath $depFile -Encoding utf8 -Append

Write-Host "✅ 依赖问题已保存到 $depFile" -ForegroundColor Green
Write-Host ""

Set-Location $projectRoot

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "错误检测完成！" -ForegroundColor Green
Write-Host "请查看 $errorReportsDir/ 目录下的报告文件" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 显示摘要
Write-Host ""
Write-Host "📊 错误报告摘要:" -ForegroundColor Magenta
Get-ChildItem "$errorReportsDir/*.txt" | ForEach-Object {
    $lineCount = (Get-Content $_.FullName | Measure-Object -Line).Lines
    Write-Host "  $($_.Name): $lineCount 行"
}
