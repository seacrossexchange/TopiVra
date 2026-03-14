#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# 读取文件
with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复所有剩余的中文注释问题
patterns = [
    # Order 模型 - orderStatus
    (r'// 订单状.+  orderStatus', '// 订单状态\n  orderStatus'),
    (r'// 退.+  refundReason', '// 退款\n  refundReason'),
    
    # Product 模型
    (r'// 状.+  status', '// 状态\n  status'),
    
    # ProductInventory 模型
    (r'// 状.+  status', '// 状态\n  status'),
    
    # Withdrawal 模型
    (r'// 状.+  status', '// 状态\n  status'),
    
    # RefundRequest 模型
    (r'// 状.+  status', '// 状态\n  status'),
    
    # Blog 模型
    (r'// 状.+  status', '// 状态\n  status'),
    
    # SellerCredit 模型
    (r'// 评分明细', '// 评分明细\n'),
    (r'// 统计指标', '// 统计指标\n'),
    (r'// 响应指标', '// 响应指标\n'),
    (r'// 评价指标', '// 评价指标\n'),
    (r'// 违规记录', '// 违规记录\n'),
    (r'// 时间.+  lastCalculated', '// 时间戳\n  lastCalculated'),
    
    # CreditTransaction - 移除注释掉的 @@index
    (r'// //   @@index', '  @@index'),
    
    # BlacklistedIp
    (r'// 过期时间.+  expiresAt', '// 过期时间\n  expiresAt'),
]

for pattern, replacement in patterns:
    content = re.sub(pattern, replacement, content)

# 特殊处理：找到 CreditTransaction 模型并取消注释 @@index
# 查找 "model CreditTransaction" 到下一个 "model" 或 "enum" 之间的内容
credit_trans_pattern = r'(// Credit transactions\nmodel CreditTransaction \{[^}]+)(// //   @@index\([^)]+\))'
content = re.sub(credit_trans_pattern, lambda m: m.group(1).replace('// //   @@index', '  @@index'), content)

# 移除所有 "// // " 开头的注释（这些是被双重注释的）
content = re.sub(r'// // ', '', content)

# 保存文件
with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.write(content)

print("Schema file fixed - all remaining issues resolved!")



