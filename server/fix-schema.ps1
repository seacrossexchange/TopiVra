# 修复 Prisma schema 文件中的编码问题
$content = Get-Content "prisma\schema.prisma" -Raw -Encoding UTF8

# 修复所有问题行
$content = $content -replace '// 分类多语言表model', "// 分类多语言表`r`nmodel"
$content = $content -replace '// 商品多语言表model', "// 商品多语言表`r`nmodel"
$content = $content -replace '// 博客多语言表model', "// 博客多语言表`r`nmodel"
$content = $content -replace '// 标签表model', "// 标签表`r`nmodel"
$content = $content -replace '// 博客-标签关联表model', "// 博客-标签关联表`r`nmodel"
$content = $content -replace '// 信用分变动记录model', "// 信用分变动记录`r`nmodel"

# 修复其他可能的问题
$content = $content -replace '// 分类多语言�?model', "// 分类多语言表`r`nmodel"
$content = $content -replace '// 商品多语言�?model', "// 商品多语言表`r`nmodel"
$content = $content -replace '// 博客多语言�?model', "// 博客多语言表`r`nmodel"
$content = $content -replace '// 标签�?model', "// 标签表`r`nmodel"
$content = $content -replace '// 博客-标签关联�?model', "// 博客-标签关联表`r`nmodel"
$content = $content -replace '// 信用分变动记�?model', "// 信用分变动记录`r`nmodel"

# 修复行内注释问题
$content = $content -replace '  change      Int // 正数为加分，负数为减�?  reason      CreditChangeReason', "  change      Int // 正数为加分，负数为减分`r`n  reason      CreditChangeReason"

# 保存文件
$content | Set-Content "prisma\schema.prisma" -Encoding UTF8 -NoNewline

Write-Host "Schema file fixed successfully!"



