#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

# 读取文件
with open('prisma/schema.prisma', 'r', encoding='utf-8-sig') as f:
    content = f.read()

# 修复所有问题
fixes = [
    (r'// 分类多语言.?model', '// Category translations\nmodel'),
    (r'// 商品多语言.?model', '// Product translations\nmodel'),
    (r'// 博客多语言.?model', '// Blog translations\nmodel'),
    (r'// 标签.?model', '// Tags\nmodel'),
    (r'// 博客-标签关联.?model', '// Blog-Tag relations\nmodel'),
    (r'// 信用分变动记.?model', '// Credit transactions\nmodel'),
    (r'  change      Int // 正数为加分，负数为减.?  reason', '  change      Int // Positive for add, negative for subtract\n  reason'),
]

for pattern, replacement in fixes:
    content = re.sub(pattern, replacement, content)

# 保存文件（UTF-8 without BOM）
with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.write(content)

print("Schema file fixed successfully!")



