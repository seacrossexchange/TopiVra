#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# 读取文件
with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 找到 CreditTransaction 模型并注释掉所有未注释的行
in_credit_transaction = False
new_lines = []

for i, line in enumerate(lines):
    if '// Credit transactions' in line and i + 1 < len(lines) and 'model CreditTransaction' in lines[i+1]:
        in_credit_transaction = True
        new_lines.append(line)
    elif in_credit_transaction:
        # 如果遇到下一个 enum 或 model，结束
        if line.strip().startswith('enum ') or (line.strip().startswith('model ') and 'CreditTransaction' not in line):
            in_credit_transaction = False
            new_lines.append(line)
        else:
            # 注释掉所有未注释的行
            if line.strip() and not line.strip().startswith('//'):
                new_lines.append('// ' + line)
            else:
                new_lines.append(line)
    else:
        new_lines.append(line)

# 保存文件
with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("CreditTransaction model fully commented out!")



