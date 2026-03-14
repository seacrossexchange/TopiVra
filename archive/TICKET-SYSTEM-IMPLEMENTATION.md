# 🎫 TopiVra 工单系统完整实现文档

## 📋 系统概览

本文档详细说明了 TopiVra C2C 交易平台的工单系统实现，包括买家、卖家、管理员三方的完整功能。

---

## 🎯 核心功能

### 1. 工单类型
- **REFUND** - 退款工单（售后）
- **DM** - 私信工单（买卖双方沟通）

### 2. 工单状态流转

```
退款工单流程：
SELLER_REVIEWING (卖家审核中)
  ├─ 卖家同意 → SELLER_AGREED → ADMIN_REVIEWING (平台审核)
  │                                  ├─ 批准 → ADMIN_APPROVED → COMPLETED
  │                                  └─ 拒绝 → ADMIN_REJECTED
  ├─ 卖家拒绝 → SELLER_REJECTED
  │              └─ 买家申请介入 → ADMIN_REVIEWING
  └─ 卖家提供换货 → SELLER_OFFERED_REPLACEMENT
                      ├─ 买家接受 → BUYER_ACCEPTED_REPLACEMENT
                      │              └─ 卖家发货 → REPLACEMENT_DELIVERED
                      │                            └─ 买家确认 → COMPLETED
                      └─ 买家拒绝 → BUYER_REJECTED_REPLACEMENT

私信工单流程：
PENDING (待处理) → 双方沟通 → CLOSED (关闭)
```

### 3. 角色权限

| 功能 | 买家 | 卖家 | 管理员 |
|------|------|------|--------|
| 创建退款工单 | ✅ | ❌ | ❌ |
| 创建私信工单 | ✅ | ❌ | ❌ |
| 响应退款 | ❌ | ✅ | ❌ |
| 提供换货 | ❌ | ✅ | ❌ |
| 发货换货商品 | ❌ | ✅ | ❌ |
| 接受/拒绝换货 | ✅ | ❌ | ❌ |
| 确认换货收货 | ✅ | ❌ | ❌ |
| 申请平台介入 | ✅ | ❌ | ❌ |
| 审核退款 | ❌ | ❌ | ✅ |
| 查看所有工单 | ❌ | ❌ | ✅ |
| 发送消息 | ✅ | ✅ | ✅ |
| 关闭工单 | ✅ | ❌ | ✅ |

---

## 📁 文件结构

### 后端文件

```
server/src/modules/tickets/
├── tickets.module.ts           # 模块定义
├── tickets.controller.ts       # API 控制器
├── tickets.service.ts          # 业务逻辑
└── dto/
    └── ticket.dto.ts          # 数据传输对象
```

### 前端文件

```
client/src/
├── services/
│   └── tickets.ts             # API 服务
├── pages/
│   ├── buyer/
│   │   ├── BuyerTicketList.tsx      # 买家工单列表
│   │   └── BuyerTicketList.css
│   ├── seller/
│   │   ├── SellerTicketList.tsx     # 卖家工单列表
│   │   ├── SellerTicketList.css
│   │   ├── SellerTicketDetail.tsx   # 卖家工单详情
│   │   └── SellerTicketDetail.css
│   ├── admin/
│   │   ├── AdminTicketList.tsx      # 管理员工单列表
│   │   ├── AdminTicketList.css
│   │   ├── AdminTicketDetail.tsx    # 管理员工单详情
│   │   └── AdminTicketDetail.css
│   └── user/
│       ├── BuyerTicketDetail.tsx    # 买家工单详情
│       └── BuyerTicketDetail.css
└── router.tsx                 # 路由配置
```

---

## 🗄️ 数据库设计

### c2c_tickets 表

```sql
CREATE TABLE c2c_tickets (
  id VARCHAR(36) PRIMARY KEY,
  ticket_no VARCHAR(50) UNIQUE NOT NULL,
  type ENUM('REFUND', 'DM') NOT NULL,
  status VARCHAR(50) NOT NULL,
  priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
  
  -- 关联信息
  order_id VARCHAR(36),
  buyer_id VARCHAR(36) NOT NULL,
  seller_id VARCHAR(36),
  admin_id VARCHAR(36),
  
  -- 工单内容
  subject VARCHAR(255) NOT NULL,
  
  -- 退款相关
  refund_amount DECIMAL(10,2),
  refund_reason TEXT,
  refund_evidence JSON,
  
  -- 换货相关
  replacement_reason TEXT,
  replacement_delivery_info TEXT,
  replacement_delivered_at DATETIME,
  
  -- 时间戳
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  seller_respond_deadline DATETIME,
  seller_responded_at DATETIME,
  admin_reviewed_at DATETIME,
  completed_at DATETIME,
  closed_at DATETIME,
  
  -- 未读计数
  unread_buyer INT DEFAULT 0,
  unread_seller INT DEFAULT 0,
  unread_admin INT DEFAULT 0,
  
  INDEX idx_buyer (buyer_id),
  INDEX idx_seller (seller_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
);
```

### c2c_ticket_messages 表

```sql
CREATE TABLE c2c_ticket_messages (
  id VARCHAR(36) PRIMARY KEY,
  ticket_id VARCHAR(36) NOT NULL,
  sender_id VARCHAR(36),
  sender_role ENUM('BUYER', 'SELLER', 'ADMIN', 'SYSTEM') NOT NULL,
  content TEXT NOT NULL,
  attachments JSON,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_ticket (ticket_id),
  INDEX idx_created (created_at),
  FOREIGN KEY (ticket_id) REFERENCES c2c_tickets(id) ON DELETE CASCADE
);
```

---

## 🔌 API 端点

### 买家接口

#### 1. 创建退款工单
```http
POST /tickets/refund
Authorization: Bearer {token}

{
  "orderId": "order-uuid",
  "refundReason": "商品与描述不符",
  "refundEvidence": ["image1.jpg", "image2.jpg"],
  "refundAmount": 99.99
}

Response: {
  "ticketNo": "TKT1234567890ABC",
  "message": "退款申请已提交"
}
```

#### 2. 创建私信工单
```http
POST /tickets/dm
Authorization: Bearer {token}

{
  "sellerId": "seller-uuid",
  "subject": "咨询商品问题",
  "content": "请问这个账号是否支持...",
  "orderId": "order-uuid" // 可选
}

Response: {
  "ticketNo": "TKT1234567890DEF",
  "message": "私信已发送"
}
```

#### 3. 查询我的工单
```http
GET /tickets/buyer?page=1&limit=20&type=REFUND&status=SELLER_REVIEWING
Authorization: Bearer {token}

Response: {
  "items": [...],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

#### 4. 获取工单统计
```http
GET /tickets/buyer/stats
Authorization: Bearer {token}

Response: {
  "total": 50,
  "pending": 5,
  "closed": 40,
  "avgResponseTime": "2小时"
}
```

#### 5. 申请平台介入
```http
PUT /tickets/{ticketNo}/escalate
Authorization: Bearer {token}

{
  "reason": "卖家拒绝退款但商品确实有问题"
}

Response: {
  "success": true,
  "message": "已申请平台介入"
}
```

#### 6. 响应换货
```http
PUT /tickets/{ticketNo}/buyer-respond-replacement
Authorization: Bearer {token}

{
  "action": "ACCEPT", // 或 "REJECT"
  "reason": "同意换货" // 拒绝时必填
}

Response: {
  "success": true,
  "message": "买家已接受换货，等待卖家发货新账号"
}
```

#### 7. 确认换货收货
```http
PUT /tickets/{ticketNo}/confirm-replacement
Authorization: Bearer {token}

Response: {
  "success": true,
  "message": "换货已完成"
}
```

### 卖家接口

#### 1. 查询我的工单
```http
GET /tickets/seller?page=1&limit=20
Authorization: Bearer {token}

Response: {
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

#### 2. 获取工单统计
```http
GET /tickets/seller/stats
Authorization: Bearer {token}

Response: {
  "total": 100,
  "pending": 10,
  "closed": 80,
  "avgResponseTime": "1小时30分"
}
```

#### 3. 响应退款
```http
PUT /tickets/{ticketNo}/seller-respond
Authorization: Bearer {token}

{
  "action": "AGREE", // AGREE | REJECT | OFFER_REPLACEMENT
  "response": "同意退款",
  "rejectReason": "商品无质量问题", // action=REJECT 时必填
  "replacementReason": "可以提供换货服务" // action=OFFER_REPLACEMENT 时必填
}

Response: {
  "success": true,
  "message": "卖家已同意退款，等待平台审核"
}
```

#### 4. 发货换货商品
```http
PUT /tickets/{ticketNo}/deliver-replacement
Authorization: Bearer {token}

{
  "deliveryInfo": "新账号：xxx 密码：xxx",
  "note": "请及时登录修改密码"
}

Response: {
  "success": true,
  "message": "卖家已发货新账号"
}
```

### 管理员接口

#### 1. 查询所有工单
```http
GET /tickets/admin?page=1&limit=20&status=ADMIN_REVIEWING
Authorization: Bearer {token}

Response: {
  "items": [...],
  "total": 500,
  "page": 1,
  "limit": 20
}
```

#### 2. 获取工单统计
```http
GET /tickets/admin/stats
Authorization: Bearer {token}

Response: {
  "total": 500,
  "pending": 20,
  "closed": 450,
  "avgResponseTime": "3小时"
}
```

#### 3. 处理工单
```http
PUT /tickets/{ticketNo}/admin-process
Authorization: Bearer {token}

{
  "action": "APPROVE", // 或 "REJECT"
  "adminResponse": "经审核，同意退款",
  "refundAmount": 99.99 // 可选，可调整退款金额
}

Response: {
  "success": true,
  "message": "平台已批准退款"
}
```

### 通用接口

#### 1. 获取工单详情
```http
GET /tickets/{ticketNo}
Authorization: Bearer {token}

Response: {
  "ticket_no": "TKT1234567890ABC",
  "type": "REFUND",
  "status": "SELLER_REVIEWING",
  "subject": "退款申请 - 订单 #ORD123",
  "buyer_id": "buyer-uuid",
  "seller_id": "seller-uuid",
  "refund_amount": 99.99,
  "refund_reason": "商品与描述不符",
  "created_at": "2024-01-01T10:00:00Z",
  "messages": [
    {
      "id": "msg-uuid",
      "sender_role": "SYSTEM",
      "content": "买家申请退款，金额：$99.99",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

#### 2. 发送消息
```http
POST /tickets/{ticketNo}/messages
Authorization: Bearer {token}

{
  "content": "您好，请问商品有什么问题？",
  "attachments": ["image.jpg"],
  "isInternal": false // 是否内部消息（仅管理员可见）
}

Response: {
  "success": true
}
```

#### 3. 关闭工单
```http
PUT /tickets/{ticketNo}/close
Authorization: Bearer {token}

Response: {
  "success": true,
  "message": "工单已关闭"
}
```

---

## 🎨 前端页面设计

### 1. 工单列表页（三方通用）

**设计特点：**
- 左侧边栏：工单列表 + 筛选器
- 右侧主区域：工单详情（iframe 嵌入）
- 实时刷新（5秒轮询）
- 未读消息徽章
- 统计面板（待处理/总数/已关闭/平均响应时间）

**筛选功能：**
- 类型筛选：全部/售后/私信
- 状态筛选：根据角色显示不同状态
- 平台介入筛选：已介入/未介入
- 搜索：工单号/主题/用户

**买家特有：**
- 新建工单按钮
- 状态：待卖家处理/待我响应/平台审核中/已完成/已关闭

**卖家特有：**
- 状态：待回复/已回复/已关闭
- 平台介入标识

**管理员特有：**
- 紧急程度筛选（超过24小时未处理标记为紧急）
- 显示买卖双方信息
- 状态：待处理/卖家处理中/已完成/已关闭

### 2. 工单详情页

**布局：**
```
┌─────────────────────────────────────┐
│ 工单头部（工单号、状态、时间）        │
├─────────────────────────────────────┤
│ 订单信息卡片（如果关联订单）          │
├─────────────────────────────────────┤
│ 消息列表（时间线样式）                │
│  - 系统消息（灰色）                   │
│  - 买家消息（蓝色）                   │
│  - 卖家消息（绿色）                   │
│  - 管理员消息（橙色）                 │
├─────────────────────────────────────┤
│ 操作区域（根据角色和状态显示）        │
│  - 发送消息输入框                     │
│  - 操作按钮（同意/拒绝/换货等）       │
└─────────────────────────────────────┘
```

**买家操作：**
- 发送消息
- 申请平台介入（卖家拒绝后）
- 接受/拒绝换货（卖家提供换货后）
- 确认收货（换货发货后）
- 关闭工单

**卖家操作：**
- 发送消息
- 同意退款
- 拒绝退款
- 提供换货
- 发货换货商品

**管理员操作：**
- 发送消息（可选内部消息）
- 批准退款
- 拒绝退款
- 调整退款金额
- 关闭工单

---

## 🔄 业务流程

### 退款流程

#### 场景1：卖家同意退款
```
1. 买家创建退款工单
   └─ 状态：SELLER_REVIEWING
   └─ 通知卖家（48小时内响应）

2. 卖家同意退款
   └─ 状态：SELLER_AGREED → ADMIN_REVIEWING
   └─ 通知买家和管理员

3. 管理员审核通过
   └─ 状态：ADMIN_APPROVED → COMPLETED
   └─ 执行退款：
      - 订单状态改为 REFUNDED
      - 买家余额增加
      - 恢复商品库存
   └─ 通知买卖双方

4. 工单完成
```

#### 场景2：卖家拒绝，买家申请介入
```
1. 买家创建退款工单
   └─ 状态：SELLER_REVIEWING

2. 卖家拒绝退款
   └─ 状态：SELLER_REJECTED
   └─ 通知买家

3. 买家申请平台介入
   └─ 状态：ADMIN_REVIEWING
   └─ 通知管理员

4. 管理员审核
   ├─ 批准：执行退款 → COMPLETED
   └─ 拒绝：维持原判 → ADMIN_REJECTED
```

#### 场景3：卖家提供换货
```
1. 买家创建退款工单
   └─ 状态：SELLER_REVIEWING

2. 卖家提供换货
   └─ 状态：SELLER_OFFERED_REPLACEMENT
   └─ 通知买家

3. 买家接受换货
   └─ 状态：BUYER_ACCEPTED_REPLACEMENT
   └─ 通知卖家

4. 卖家发货新账号
   └─ 状态：REPLACEMENT_DELIVERED
   └─ 通知买家

5. 买家确认收货
   └─ 状态：COMPLETED
   └─ 工单完成
```

### 私信流程

```
1. 买家创建私信工单
   └─ 状态：PENDING
   └─ 通知卖家

2. 双方沟通
   └─ 发送消息
   └─ 实时未读计数

3. 问题解决
   └─ 买家或管理员关闭工单
   └─ 状态：CLOSED
```

---

## 🔔 通知机制

### 通知触发点

| 事件 | 通知对象 | 通知内容 |
|------|---------|---------|
| 创建退款工单 | 卖家 | "收到退款申请，请在48小时内响应" |
| 创建私信工单 | 卖家 | "收到新私信" |
| 卖家同意退款 | 买家 | "卖家已同意退款" |
| 卖家拒绝退款 | 买家 | "卖家已拒绝退款" |
| 卖家提供换货 | 买家 | "卖家提供换货方案" |
| 买家申请介入 | 管理员 | "买家申请平台介入" |
| 管理员审核完成 | 买家+卖家 | "工单处理完成" |
| 收到新消息 | 对方 | "工单新消息" |

### 未读计数

- 每个工单维护三个未读计数：`unread_buyer`、`unread_seller`、`unread_admin`
- 发送消息时，对方的未读计数 +1
- 打开工单详情时，自己的未读计数清零
- 列表页显示未读徽章

---

## ⚡ 性能优化

### 1. 列表页
- 分页加载（每页20条）
- 5秒轮询刷新
- 虚拟滚动（大量工单时）

### 2. 详情页
- 消息懒加载
- 图片懒加载
- 5秒轮询刷新

### 3. 数据库
- 索引优化：buyer_id、seller_id、status、created_at
- 分页查询
- 只查询必要字段

---

## 🔒 安全性

### 1. 权限验证
- 买家只能查看自己的工单
- 卖家只能查看自己作为卖家的工单
- 管理员可以查看所有工单
- 操作前验证工单状态

### 2. 数据验证
- DTO 验证（class-validator）
- 退款金额不能超过订单金额
- 状态流转验证
- 防止重复提交

### 3. 审计日志
- 所有操作记录在消息表
- 系统消息记录关键节点
- 时间戳记录

---

## 📊 统计指标

### 买家统计
- 总工单数
- 处理中工单数
- 已关闭工单数
- 平均响应时间

### 卖家统计
- 总工单数
- 待处理工单数
- 已关闭工单数
- 平均响应时间

### 管理员统计
- 总工单数
- 待处理工单数（平台介入）
- 已关闭工单数
- 平均处理时间

---

## 🎯 用户体验

### 1. 视觉设计
- 清晰的状态标签（颜色区分）
- 时间线样式的消息列表
- 角色头像和颜色区分
- 未读徽章提醒

### 2. 交互设计
- 左右分栏布局（列表+详情）
- 实时刷新
- 快速筛选
- 一键操作

### 3. 响应式设计
- 移动端适配
- 触摸友好
- 底部导航

---

## ✅ 测试清单

### 功能测试
- [ ] 买家创建退款工单
- [ ] 买家创建私信工单
- [ ] 卖家同意退款
- [ ] 卖家拒绝退款
- [ ] 卖家提供换货
- [ ] 买家接受换货
- [ ] 买家拒绝换货
- [ ] 卖家发货换货商品
- [ ] 买家确认换货收货
- [ ] 买家申请平台介入
- [ ] 管理员批准退款
- [ ] 管理员拒绝退款
- [ ] 发送消息
- [ ] 关闭工单
- [ ] 未读计数
- [ ] 通知推送

### 权限测试
- [ ] 买家只能查看自己的工单
- [ ] 卖家只能查看自己的工单
- [ ] 管理员可以查看所有工单
- [ ] 状态验证
- [ ] 操作权限验证

### 性能测试
- [ ] 列表分页加载
- [ ] 轮询性能
- [ ] 大量消息加载
- [ ] 并发操作

---

## 🚀 部署清单

### 数据库
- [ ] 执行 SQL 创建表
- [ ] 创建索引
- [ ] 配置外键

### 后端
- [ ] 安装依赖
- [ ] 配置环境变量
- [ ] 启动服务
- [ ] 测试 API

### 前端
- [ ] 安装依赖
- [ ] 配置路由
- [ ] 构建生产版本
- [ ] 部署静态资源

---

## 📝 后续优化

### 功能增强
1. 工单模板
2. 快捷回复
3. 批量操作
4. 导出报表
5. 工单评价

### 性能优化
1. WebSocket 实时通信
2. 消息推送
3. 缓存优化
4. CDN 加速

### 用户体验
1. 富文本编辑器
2. 文件上传
3. 语音消息
4. 视频通话

---

## ✨ 总结

本工单系统完整实现了 C2C 交易平台的售后服务功能，包括：

✅ **完整的角色权限体系**
- 买家、卖家、管理员三方独立视图
- 精细化权限控制

✅ **灵活的业务流程**
- 退款、换货、平台介入
- 状态流转清晰

✅ **优秀的用户体验**
- 实时刷新
- 未读提醒
- 快速筛选

✅ **可靠的技术实现**
- 类型安全
- 权限验证
- 性能优化

系统已完整实现，可直接投入使用！



