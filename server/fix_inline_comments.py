#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# 读取文件
with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复所有中文注释后面直接跟字段的问题
# 这些注释后面应该有换行，但由于编码问题，字段被当作注释的一部分

patterns = [
    # Message 模型
    (r'// 发送者和接收.+  senderId', '// 发送者和接收者\n  senderId'),
    (r'// 状.+  isRead', '// 状态\n  isRead'),
    (r'// 删除标记（软删除.+  senderDeleted', '// 删除标记（软删除）\n  senderDeleted'),
    
    # Conversation 模型
    (r'// 参与.+  user1Id', '// 参与者\n  user1Id'),
    (r'// 最后一条消.+  lastMessage', '// 最后一条消息\n  lastMessage'),
    
    # User 模型
    (r'// 第三方登.+  googleId', '// 第三方登录\n  googleId'),
    (r'// 状.+  status', '// 状态\n  status'),
    
    # SellerCredit 模型
    (r'// 基础信用.+  creditScore', '// 基础信用分\n  creditScore'),
    (r'// 变动信息', '// 变动信息\n'),
    
    # BlacklistedIp 模型
    (r'// 过期时间（自动解除黑名单.+  expiresAt', '// 过期时间（自动解除黑名单）\n  expiresAt'),
    (r'// 添加.+  addedBy', '// 添加者\n  addedBy'),
]

for pattern, replacement in patterns:
    content = re.sub(pattern, replacement, content)

# 保存文件
with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.write(content)

print("Schema file fixed - all inline comments separated!")



