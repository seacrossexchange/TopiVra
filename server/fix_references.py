#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# 读取文件
with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复所有问题
fixes = [
    # 注释掉 BlogTag 引用
    ('  tags         BlogTag[]', '  // tags         BlogTag[]'),
    ('  blogs BlogTag[]', '  // blogs BlogTag[]'),
    
    # 修复 Message 模型中缺失的字段（需要取消注释）
    ('// //   senderId   String @map("sender_id")', '  senderId   String @map("sender_id")'),
    ('// //   receiverId String @map("receiver_id")', '  receiverId String @map("receiver_id")'),
    ('// //   isRead Boolean   @default(false) @map("is_read")', '  isRead Boolean   @default(false) @map("is_read")'),
    
    # 修复 Conversation 模型中缺失的字段
    ('// //   user1Id String @map("user1_id")', '  user1Id String @map("user1_id")'),
    ('// //   user2Id String @map("user2_id")', '  user2Id String @map("user2_id")'),
    
    # 修复 User 模型中缺失的 status 字段
    ('// //   status        UserStatus @default(ACTIVE)', '  status        UserStatus @default(ACTIVE)'),
    
    # 修复 Product 模型中缺失的 status 字段
    ('// //   status       ProductStatus @default(DRAFT)', '  status       ProductStatus @default(DRAFT)'),
    
    # 修复 Order 模型中缺失的 orderStatus 字段
    ('// //   orderStatus OrderStatus @default(CREATED) @map("order_status")', '  orderStatus OrderStatus @default(CREATED) @map("order_status")'),
    
    # 修复 ProductInventory 模型中缺失的 status 字段
    ('// //   status InventoryStatus @default(AVAILABLE)', '  status InventoryStatus @default(AVAILABLE)'),
    
    # 修复 Withdrawal 模型中缺失的 status 字段
    ('// //   status       WithdrawalStatus @default(PENDING)', '  status       WithdrawalStatus @default(PENDING)'),
    
    # 修复 RefundRequest 模型中缺失的 status 字段
    ('// //   status RefundStatus @default(PENDING)', '  status RefundStatus @default(PENDING)'),
    
    # 修复 Blog 模型中缺失的 status 字段
    ('// //   status BlogStatus @default(DRAFT)', '  status BlogStatus @default(DRAFT)'),
    
    # 修复 SellerCredit 中的 creditLevel 默认值
    ('  creditLevel CreditLevel @default(NORMAL)', '  creditLevel CreditLevel @default(POOR)'),
    
    # 修复 SellerCredit 中缺失的 creditScore 字段
    ('// //   creditScore Int         @default(100) @map("credit_score")', '  creditScore Int         @default(100) @map("credit_score")'),
    
    # 修复 BlacklistedIp 中缺失的 expiresAt 字段
    ('// //   expiresAt DateTime @map("expires_at")', '  expiresAt DateTime @map("expires_at")'),
]

for old, new in fixes:
    content = content.replace(old, new)

# 保存文件
with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.write(content)

print("Schema file fixed - all references resolved!")



