# TopiVra 数据库设计文档

> 版本: 1.0 | 更新时间: 2026-03-14

---

## 1. 数据库概览

- **数据库类型**: MariaDB 11 (MySQL 兼容)
- **ORM**: Prisma 5
- **字符集**: utf8mb4
- **时区**: UTC

---

## 2. 核心表结构

### 2.1 用户与权限

#### users - 用户表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| email | VARCHAR(255) | 邮箱，唯一 |
| username | VARCHAR(100) | 用户名 |
| password_hash | VARCHAR(255) | 密码哈希 |
| status | ENUM | 状态: ACTIVE, SUSPENDED, BANNED, DELETED |
| two_factor_enabled | BOOLEAN | 是否启用2FA |
| created_at | DATETIME | 创建时间 |

**索引**: `email`, `status`

#### user_roles - 用户角色表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| role | ENUM | 角色: ADMIN, SELLER, USER |
| granted_at | DATETIME | 授权时间 |

**索引**: `user_id`, `role`, `unique(user_id, role)`

#### seller_profiles - 卖家档案表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID，唯一 |
| shop_name | VARCHAR(100) | 店铺名称 |
| balance | DECIMAL(12,2) | 可用余额 |
| frozen_balance | DECIMAL(12,2) | 冻结余额 |
| total_sales | DECIMAL(12,2) | 总销售额 |
| commission_rate | DECIMAL(4,2) | 佣金比例 |

---

### 2.2 商品与分类

#### products - 商品表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| seller_id | UUID | 卖家ID |
| category_id | UUID | 分类ID |
| title | VARCHAR(255) | 商品标题 |
| price | DECIMAL(10,2) | 价格 |
| stock | INT | 库存数量 |
| status | ENUM | 状态: DRAFT, PENDING, APPROVED, REJECTED, ON_SALE, OFF_SALE, SOLD_OUT |
| auto_deliver | BOOLEAN | 是否自动发货 |

**索引**: `seller_id`, `category_id`, `platform`, `status`, `price`, `sold_count`, `seller_id+status`, `platform+status`, `created_at`

#### categories - 分类表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| parent_id | UUID | 父分类ID |
| name | VARCHAR(100) | 分类名称 |
| slug | VARCHAR(100) | URL别名，唯一 |
| sort_order | INT | 排序 |

---

### 2.3 订单系统

#### orders - 订单表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| order_no | VARCHAR(50) | 订单号，唯一 |
| buyer_id | UUID | 买家ID |
| total_amount | DECIMAL(10,2) | 总金额 |
| pay_amount | DECIMAL(10,2) | 实付金额 |
| payment_status | ENUM | 支付状态: UNPAID, PAYING, PAID, REFUNDED, PARTIAL_REFUND |
| order_status | ENUM | 订单状态: CREATED, PENDING_PAYMENT, PAID, DELIVERED, COMPLETED, REFUNDING, REFUNDED, CANCELLED, CLOSED |
| auto_cancel_at | DATETIME | 自动取消时间 |

**索引**: `buyer_id`, `order_status`, `payment_status`, `buyer_id+order_status`, `created_at`

#### order_items - 订单项表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| order_id | UUID | 订单ID |
| product_id | UUID | 商品ID |
| seller_id | UUID | 卖家ID |
| unit_price | DECIMAL(10,2) | 单价 |
| quantity | INT | 数量 |
| delivered_credentials | JSON | 发货凭证 |
| auto_delivered | BOOLEAN | 是否自动发货 |
| settled | BOOLEAN | 是否已结算 |

**索引**: `order_id`, `seller_id`, `product_id`, `seller_id+settled`

---

### 2.4 支付系统

#### payments - 支付记录表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| payment_no | VARCHAR(50) | 支付单号，唯一 |
| order_id | UUID | 订单ID |
| method | VARCHAR(50) | 支付方式 |
| amount | DECIMAL(10,2) | 金额 |
| status | ENUM | 状态: PENDING, PROCESSING, SUCCESS, FAILED, EXPIRED, REFUNDED |
| provider_order_id | VARCHAR(100) | 第三方订单号 |

**索引**: `order_id`, `status`, `method`, `status+created_at`

#### payment_gateways - 支付通道配置表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | CUID | 主键 |
| code | VARCHAR(50) | 通道代码，唯一 |
| name | VARCHAR(100) | 通道名称 |
| enabled | BOOLEAN | 是否启用 |
| config | JSON | 配置信息 |
| sort | INT | 排序 |

---

### 2.5 库存系统

#### product_inventories - 商品库存表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| product_id | UUID | 商品ID |
| seller_id | UUID | 卖家ID |
| account_data | TEXT | 账号数据(加密) |
| account_hash | VARCHAR(255) | 账号哈希，唯一 |
| status | ENUM | 状态: AVAILABLE, RESERVED, SOLD, INVALID |
| order_id | UUID | 订单ID |
| is_valid | BOOLEAN | 是否有效 |

**索引**: `product_id+status`, `seller_id+status`, `account_hash`, `order_id`

---

### 2.6 退款系统

#### refund_requests - 退款申请表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| refund_no | VARCHAR(50) | 退款单号，唯一 |
| order_id | UUID | 订单ID |
| user_id | UUID | 买家ID |
| seller_id | UUID | 卖家ID |
| refund_amount | DECIMAL(10,2) | 退款金额 |
| status | ENUM | 状态: PENDING, SELLER_AGREED, SELLER_REJECTED, DISPUTED, PROCESSING, COMPLETED, REJECTED, CANCELLED |
| reason | TEXT | 退款原因 |

**索引**: `order_id`, `user_id`, `seller_id`, `status`, `created_at`

---

### 2.7 消息与通知

#### messages - 站内消息表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| sender_id | UUID | 发送者ID |
| receiver_id | UUID | 接收者ID |
| content | TEXT | 消息内容 |
| message_type | ENUM | 类型: TEXT, IMAGE, FILE, SYSTEM, ORDER_NOTIFICATION |
| is_read | BOOLEAN | 是否已读 |
| order_id | UUID | 关联订单 |

**索引**: `sender_id`, `receiver_id`, `receiver_id+is_read`, `created_at`

#### notifications - 通知表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| type | VARCHAR(50) | 通知类型 |
| title | VARCHAR(255) | 标题 |
| content | TEXT | 内容 |
| is_read | BOOLEAN | 是否已读 |

**索引**: `user_id+is_read`

---

### 2.8 工单系统

#### tickets - 工单表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| ticket_no | VARCHAR(50) | 工单号，唯一 |
| user_id | UUID | 用户ID |
| type | ENUM | 类型: ORDER_ISSUE, ACCOUNT_ISSUE, PAYMENT_ISSUE, SUGGESTION, OTHER |
| priority | ENUM | 优先级: URGENT, HIGH, MEDIUM, LOW |
| status | ENUM | 状态: OPEN, IN_PROGRESS, WAITING, RESOLVED, CLOSED |
| assigned_to | UUID | 分配给 |

**索引**: `user_id+status`, `status+priority`, `assigned_to`

---

### 2.9 卖家信用系统

#### seller_credits - 卖家信用表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| seller_id | UUID | 卖家ID，唯一 |
| credit_score | INT | 信用分 (0-200) |
| credit_level | ENUM | 等级: POOR, NORMAL, GOOD, EXCELLENT, PREMIUM |
| avg_response_time | INT | 平均响应时间(分钟) |
| avg_rating | DECIMAL(2,1) | 平均评分 |

**索引**: `credit_score`, `credit_level`

---

### 2.10 风控系统

#### risk_assessments - 风险评估表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| type | VARCHAR(50) | 风险类型 |
| score | INT | 风险分数 (0-100) |
| level | VARCHAR(20) | 风险等级 |
| factors | JSON | 风险因素 |
| ip_address | VARCHAR(45) | IP地址 |

**索引**: `user_id`, `type`, `created_at`

#### blacklisted_ips - IP黑名单表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| ip | VARCHAR(45) | IP地址，唯一 |
| reason | VARCHAR(255) | 原因 |
| expires_at | DATETIME | 过期时间 |

**索引**: `ip`, `expires_at`

---

### 2.11 审计日志

#### audit_logs - 审计日志表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| operator_id | UUID | 操作者ID |
| operator_role | VARCHAR(50) | 操作者角色 |
| module | VARCHAR(50) | 模块 |
| action | VARCHAR(50) | 操作 |
| target_type | VARCHAR(50) | 目标类型 |
| target_id | UUID | 目标ID |
| before_data | JSON | 操作前数据 |
| after_data | JSON | 操作后数据 |
| ip_address | VARCHAR(45) | IP地址 |

**索引**: `operator_id`, `module+action`, `target_type+target_id`

---

## 3. 数据库关系图

```
┌─────────┐     ┌──────────────┐     ┌──────────┐
│  User   │────<│ SellerProfile│     │ Category │
└────┬────┘     └──────────────┘     └────┬─────┘
     │                                     │
     │            ┌────────────────────────┘
     │            │
     ▼            ▼
┌─────────┐     ┌──────────┐     ┌───────────────┐
│ Product │────<│ Order    │>────│ OrderItem     │
└────┬────┘     └────┬─────┘     └───────┬───────┘
     │               │                    │
     │               │                    │
     ▼               ▼                    ▼
┌──────────────┐  ┌─────────┐      ┌────────────────┐
│ProductInv.   │  │ Payment │      │RefundRequest   │
└──────────────┘  └─────────┘      └────────────────┘
```

---

## 4. 关键索引说明

### 4.1 性能关键索引

| 表名 | 索引 | 用途 |
|------|------|------|
| products | `seller_id + status` | 卖家商品列表查询 |
| products | `platform + status` | 按平台筛选商品 |
| orders | `buyer_id + order_status` | 买家订单列表 |
| order_items | `seller_id + settled` | 卖家待结算订单 |
| product_inventories | `product_id + status` | 可用库存查询 |
| messages | `receiver_id + is_read` | 未读消息查询 |

### 4.2 数据库优化建议

1. **定期分析表**
   ```sql
   ANALYZE TABLE products, orders, order_items, product_inventories;
   ```

2. **慢查询监控**
   - 开启慢查询日志
   - 阈值设置为 1 秒
   - 定期优化慢查询

3. **连接池配置**
   - 最大连接数: 100
   - 最小空闲连接: 10
   - 连接超时: 30s

---

## 5. 数据迁移

使用 Prisma Migrate 管理数据库迁移：

```bash
# 创建迁移
npx prisma migrate dev --name description

# 部署迁移
npx prisma migrate deploy

# 重置数据库（开发环境）
npx prisma migrate reset
```

---

## 6. 备份策略

参见 `scripts/backup-enhanced.sh` 和 `docs/deployment-guide.md`。

---

**文档维护者**: 后端团队
**最后更新**: 2026-03-14