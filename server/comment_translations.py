#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# 读取文件
with open('prisma/schema.prisma', 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

# 标记需要注释的区域
comment_ranges = [
    (207, 222),  # CategoryTranslation
    (304, 321),  # ProductTranslation  
    (904, 922),  # BlogTranslation
    (936, 951),  # Tag
    (953, 966),  # BlogTag
    (1149, 1165), # CreditTransaction (部分)
]

# 注释掉这些行
for start, end in comment_ranges:
    for i in range(start - 1, min(end, len(lines))):
        if not lines[i].strip().startswith('//'):
            lines[i] = '// ' + lines[i]

# 同时需要移除 Category, Product, Blog 中对这些表的引用
new_lines = []
for i, line in enumerate(lines):
    # 跳过 translations 字段
    if 'translations' in line and ('CategoryTranslation' in line or 'ProductTranslation' in line or 'BlogTranslation' in line):
        new_lines.append('  // ' + line)
    else:
        new_lines.append(line)

# 保存文件
with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Schema file fixed - translation tables commented out!")



