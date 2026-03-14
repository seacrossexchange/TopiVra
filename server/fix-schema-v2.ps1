# 彻底修复 Prisma schema 文件
$schemaPath = "prisma\schema.prisma"

# 读取文件（移除 BOM）
$content = Get-Content $schemaPath -Raw -Encoding UTF8
$content = $content.TrimStart([char]0xFEFF)

# 修复所有中文注释后缺少换行的问题
$fixes = @(
    @('// 分类多语言表model', "// Category translations table`r`nmodel"),
    @('// 分类多语言�?model', "// Category translations table`r`nmodel"),
    @('// 商品多语言表model', "// Product translations table`r`nmodel"),
    @('// 商品多语言�?model', "// Product translations table`r`nmodel"),
    @('// 博客多语言表model', "// Blog translations table`r`nmodel"),
    @('// 博客多语言�?model', "// Blog translations table`r`nmodel"),
    @('// 标签表model', "// Tags table`r`nmodel"),
    @('// 标签�?model', "// Tags table`r`nmodel"),
    @('// 博客-标签关联表model', "// Blog-Tag relation table`r`nmodel"),
    @('// 博客-标签关联�?model', "// Blog-Tag relation table`r`nmodel"),
    @('// 信用分变动记录model', "// Credit transaction records`r`nmodel"),
    @('// 信用分变动记�?model', "// Credit transaction records`r`nmodel"),
    @('  change      Int // 正数为加分，负数为减�?  reason      CreditChangeReason', "  change      Int // Positive for add, negative for subtract`r`n  reason      CreditChangeReason")
)

foreach ($fix in $fixes) {
    $content = $content -replace [regex]::Escape($fix[0]), $fix[1]
}

# 保存为 UTF-8 without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Resolve-Path $schemaPath), $content, $utf8NoBom)

Write-Host "Schema file fixed successfully!" -ForegroundColor Green



