# 🚀 工单系统快速启动指南

## 📋 前置条件

- Node.js 18+
- MySQL 8.0+
- npm 或 yarn

## 🗄️ 数据库设置

### 1. 创建工单表

```sql
-- 工单主表
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
  INDEX idx_created (created_at),
  INDEX idx_ticket_no (ticket_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 工单消息表
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 🔧 后端设置

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

```bash
# .env
DATABASE_URL="mysql://user:password@localhost:3306/topivra"
JWT_SECRET="your-secret-key"
```

### 3. 启动后端服务

```bash
npm run start:dev
```

后端将运行在 `http://localhost:3000`

## 🎨 前端设置

### 1. 安装依赖

```bash
cd client
npm install
```

### 2. 配置环境变量

```bash
# .env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 3. 启动前端服务

```bash
npm run dev
```

前端将运行在 `http://localhost:5173`

## 🧪 测试功能

### 买家测试流程

1. **登录买家账号**
   ```
   访问：http://localhost:5173/login
   ```

2. **查看工单列表**
   ```
   访问：http://localhost:5173/buyer/tickets
   ```

3. **创建退款工单**
   ```bash
   POST http://localhost:3000/api/tickets/refund
   Authorization: Bearer {buyer_token}
   
   {
     "orderId": "order-uuid",
     "refundReason": "商品与描述不符",
     "refundAmount": 99.99
   }
   ```

4. **查看工单详情**
   ```
   访问：http://localhost:5173/buyer/tickets/{ticketNo}
   ```

5. **发送消息**
   ```bash
   POST http://localhost:3000/api/tickets/{ticketNo}/messages
   Authorization: Bearer {buyer_token}
   
   {
     "content": "请问什么时候可以处理？"
   }
   ```

### 卖家测试流程

1. **登录卖家账号**
   ```
   访问：http://localhost:5173/login
   ```

2. **查看工单列表**
   ```
   访问：http://localhost:5173/seller/tickets
   ```

3. **响应退款工单**
   ```bash
   PUT http://localhost:3000/api/tickets/{ticketNo}/seller-respond
   Authorization: Bearer {seller_token}
   
   {
     "action": "AGREE",
     "response": "同意退款"
   }
   ```

4. **提供换货**
   ```bash
   PUT http://localhost:3000/api/tickets/{ticketNo}/seller-respond
   Authorization: Bearer {seller_token}
   
   {
     "action": "OFFER_REPLACEMENT",
     "replacementReason": "可以提供换货服务"
   }
   ```

5. **发货换货商品**
   ```bash
   PUT http://localhost:3000/api/tickets/{ticketNo}/deliver-replacement
   Authorization: Bearer {seller_token}
   
   {
     "deliveryInfo": "新账号：xxx 密码：xxx",
     "note": "请及时登录修改密码"
   }
   ```

### 管理员测试流程

1. **登录管理员账号**
   ```
   访问：http://localhost:5173/login
   ```

2. **查看所有工单**
   ```
   访问：http://localhost:5173/admin/tickets
   ```

3. **审核退款工单**
   ```bash
   PUT http://localhost:3000/api/tickets/{ticketNo}/admin-process
   Authorization: Bearer {admin_token}
   
   {
     "action": "APPROVE",
     "adminResponse": "经审核，同意退款"
   }
   ```

4. **发送内部消息**
   ```bash
   POST http://localhost:3000/api/tickets/{ticketNo}/messages
   Authorization: Bearer {admin_token}
   
   {
     "content": "内部备注：此工单需要特别关注",
     "isInternal": true
   }
   ```

## 📊 API 测试集合

### Postman Collection

```json
{
  "info": {
    "name": "工单系统 API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "买家接口",
      "item": [
        {
          "name": "创建退款工单",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{buyer_token}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"orderId\": \"{{order_id}}\",\n  \"refundReason\": \"商品与描述不符\",\n  \"refundAmount\": 99.99\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{base_url}}/tickets/refund",
              "host": ["{{base_url}}"],
              "path": ["tickets", "refund"]
            }
          }
        },
        {
          "name": "查询我的工单",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{buyer_token}}"
              }
            ],
            "url": {
              "raw": "{{base_url}}/tickets/buyer?page=1&limit=20",
              "host": ["{{base_url}}"],
              "path": ["tickets", "buyer"],
              "query": [
                {"key": "page", "value": "1"},
                {"key": "limit", "value": "20"}
              ]
            }
          }
        }
      ]
    },
    {
      "name": "卖家接口",
      "item": [
        {
          "name": "响应退款",
          "request": {
            "method": "PUT",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{seller_token}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"action\": \"AGREE\",\n  \"response\": \"同意退款\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{base_url}}/tickets/{{ticket_no}}/seller-respond",
              "host": ["{{base_url}}"],
              "path": ["tickets", "{{ticket_no}}", "seller-respond"]
            }
          }
        }
      ]
    },
    {
      "name": "管理员接口",
      "item": [
        {
          "name": "审核退款",
          "request": {
            "method": "PUT",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{admin_token}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"action\": \"APPROVE\",\n  \"adminResponse\": \"经审核，同意退款\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{base_url}}/tickets/{{ticket_no}}/admin-process",
              "host": ["{{base_url}}"],
              "path": ["tickets", "{{ticket_no}}", "admin-process"]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000/api"
    },
    {
      "key": "buyer_token",
      "value": ""
    },
    {
      "key": "seller_token",
      "value": ""
    },
    {
      "key": "admin_token",
      "value": ""
    },
    {
      "key": "order_id",
      "value": ""
    },
    {
      "key": "ticket_no",
      "value": ""
    }
  ]
}
```

## 🐛 常见问题

### 1. 数据库连接失败

**问题：** `Error: connect ECONNREFUSED`

**解决：**
```bash
# 检查 MySQL 是否运行
mysql -u root -p

# 检查数据库是否存在
SHOW DATABASES;

# 创建数据库
CREATE DATABASE topivra CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 权限验证失败

**问题：** `403 Forbidden`

**解决：**
- 检查 JWT token 是否有效
- 检查用户角色是否正确
- 检查路由守卫配置

### 3. 工单创建失败

**问题：** `订单不存在` 或 `无权操作此订单`

**解决：**
- 确保订单存在且属于当前用户
- 检查订单状态是否允许创建工单
- 检查是否已有进行中的工单

### 4. 状态流转失败

**问题：** `当前状态无法响应`

**解决：**
- 检查工单当前状态
- 确认操作是否符合业务流程
- 查看状态流转图

### 5. 未读计数不更新

**问题：** 未读徽章不显示

**解决：**
- 检查轮询是否正常
- 检查未读计数字段
- 清除浏览器缓存

## 📝 开发建议

### 1. 调试技巧

```typescript
// 后端日志
this.logger.log(`工单创建: ${ticketNo}`);
this.logger.error(`错误: ${error.message}`);

// 前端日志
console.log('工单详情:', ticket);
console.error('API 错误:', error);
```

### 2. 性能优化

```typescript
// 使用 React Query 缓存
const { data } = useQuery({
  queryKey: ['ticket', ticketNo],
  queryFn: () => ticketsService.getTicket(ticketNo),
  staleTime: 5000, // 5秒内不重新请求
  refetchInterval: 5000, // 每5秒刷新
});
```

### 3. 错误处理

```typescript
// 统一错误处理
try {
  await ticketsService.createRefundTicket(data);
  message.success('退款申请已提交');
} catch (error) {
  message.error(error.response?.data?.message || '操作失败');
}
```

## 🔍 监控指标

### 关键指标

1. **工单创建成功率**
   - 目标：> 99%
   - 监控：创建失败次数

2. **平均响应时间**
   - 买家：< 2小时
   - 卖家：< 1小时
   - 管理员：< 3小时

3. **工单完成率**
   - 目标：> 95%
   - 监控：未完成工单数量

4. **用户满意度**
   - 目标：> 4.5/5
   - 监控：工单评价

## 📚 相关文档

- [工单系统实现文档](./TICKET-SYSTEM-IMPLEMENTATION.md)
- [功能验证清单](./TICKET-SYSTEM-VERIFICATION.md)
- [API 文档](./API-DOCUMENTATION.md)
- [数据库设计](./DATABASE-SCHEMA.md)

## 🎯 下一步

1. ✅ 完成基础功能开发
2. ⏳ 编写单元测试
3. ⏳ 编写集成测试
4. ⏳ 性能测试
5. ⏳ 用户验收测试
6. ⏳ 生产环境部署

## 💡 提示

- 开发环境使用 `npm run start:dev` 启动热重载
- 生产环境使用 `npm run build && npm run start:prod`
- 使用 Postman 或 Insomnia 测试 API
- 使用 Chrome DevTools 调试前端
- 查看 Network 面板检查 API 请求

---

**最后更新：** 2024-01-01
**维护者：** 开发团队
**状态：** ✅ 可用



