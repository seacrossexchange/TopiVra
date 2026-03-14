# TopiVra 系统架构文档

> 版本: 1.0 | 更新时间: 2026-03-13

---

## 1. 系统概览

TopiVra 是一个面向 TikTok 主流市场的**全球数字账号交易平台**，支持买家购买、卖家上架、自动发货（FIFO 库存分配）、多种支付方式及多语言（zh-CN / en / id / pt-BR / es-MX）。

```
┌─────────────────────────────────────────────────────┐
│                    客户端 (React)                      │
│   Vite · Ant Design · Zustand · React Query · i18n   │
│                   端口: 3000                           │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/WebSocket
                     ▼
┌─────────────────────────────────────────────────────┐
│                  Nginx 反向代理                        │
│        /api → :8000   /  → :3000                     │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              服务端 (NestJS)   端口: 8000              │
│  ┌──────────┐ ┌──────────┐ ┌─────────────────────┐  │
│  │  REST API │ │ WebSocket│ │   SSE (发货进度流)    │  │
│  └──────────┘ └──────────┘ └─────────────────────┘  │
│  ┌──────────────────────────────────────────────┐   │
│  │              业务模块层                         │   │
│  │  Auth · Orders · Payments · AutoDelivery      │   │
│  │  Products · Inventory · Sellers · Admin       │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │              基础设施层                         │   │
│  │  Prisma ORM · Redis · Winston · Prometheus    │   │
│  └──────────────────────────────────────────────┘   │
└──────────────┬─────────────────┬───────────────────┘
               │                 │
               ▼                 ▼
        ┌──────────┐      ┌──────────┐
        │  MariaDB │      │  Redis   │
        │  端口:3306│      │  端口:6379│
        └──────────┘      └──────────┘
```

---

## 2. 核心业务流程

### 2.1 支付 → 自动发货链路

```
用户支付
  │
  ▼
PaymentsService.createPayment()
  │  ← 创建支付记录，状态 PENDING
  ▼
[支付回调 / 手动确认]
  │
  ▼
PaymentsService.completePayment()
  │  ← 更新支付状态 SUCCESS，更新订单状态 PAID
  │  ← 推送 WebSocket payment:completed 给买家
  │  ← 发送支付确认邮件
  ▼
OrdersService.handlePaymentSuccess()
  │  ← 更新订单 orderStatus=PAID, paymentStatus=PAID
  ▼
AutoDeliveryService.handlePaymentSuccess()
  │  ← emit SSE STARTED
  │  ← 遍历每个 orderItem
  │    ├─ 检查 product.autoDeliver
  │    ├─ emit SSE ITEM_PROCESSING
  │    ├─ FIFO 获取可用库存 (status=AVAILABLE, isValid=true)
  │    ├─ markAsSold(inventoryId, orderId, orderItemId)
  │    ├─ 更新 orderItem.deliveredCredentials
  │    └─ emit SSE ITEM_SUCCESS / ITEM_FAILED
  │
  ├─ 全部成功 → orderStatus=DELIVERED, emit SSE COMPLETED
  │              通知买家站内信 + WebSocket
  └─ 部分失败 → emit SSE PARTIAL_FAILED
               通知卖家处理
```

### 2.2 SSE 实时发货进度

- **后端**: `GET /api/v1/orders/:id/delivery-stream` 返回 `text/event-stream`
- **服务**: `DeliveryEventsService`（RxJS Subject 广播）
- **前端**: `useDeliveryStream` hook，自动在订单状态变为 `PAID` 时开始监听
- **事件类型**: `STARTED → ITEM_PROCESSING → ITEM_SUCCESS/ITEM_FAILED → COMPLETED/PARTIAL_FAILED`

---

## 3. 模块结构

```
server/src/
├── common/
│   ├── audit/          # 审计日志
│   ├── decorators/     # 自定义装饰器 (@Public, @CurrentUser, @Roles)
│   ├── filters/        # 全局异常过滤器
│   ├── guards/         # 限流守卫
│   ├── interceptors/   # 响应转换、Metrics
│   ├── mail/           # 邮件服务
│   ├── metrics/        # Prometheus 指标
│   ├── middleware/     # 请求日志中间件
│   ├── notification/   # 统一通知服务 (站内信 + WS + 邮件)
│   ├── pipes/          # XSS 净化管道
│   └── redis/          # Redis 客户端
├── modules/
│   ├── auth/           # JWT 认证、2FA、OAuth
│   ├── orders/         # 订单 + SSE 发货流
│   ├── payments/       # 多渠道支付
│   ├── inventory/      # 库存管理 + 自动发货
│   ├── products/       # 商品管理
│   ├── sellers/        # 卖家中心
│   ├── admin/          # 管理后台
│   ├── websocket/      # Socket.io 网关
│   └── ...             # tickets / messages / notifications 等
└── prisma/             # Prisma ORM 配置
```

---

## 4. 技术选型

| 层级 | 技术栈 | 说明 |
|------|--------|------|
| 前端框架 | React 19 + Vite 7 | 路由懒加载，代码分割 |
| 状态管理 | Zustand + React Query | 全局状态 + 服务端状态 |
| UI 组件 | Ant Design 5 | 统一 UI 规范 |
| 国际化 | i18next | zh-CN / en / id / pt-BR / es-MX |
| 后端框架 | NestJS 11 | 模块化，支持 DI |
| ORM | Prisma 5 | 类型安全数据库访问 |
| 数据库 | MariaDB 11 | 主数据存储 |
| 缓存 | Redis 7 | 会话、热点数据 |
| 实时通信 | Socket.io + SSE | WS 推送 + 发货进度流 |
| 监控 | Prometheus + Grafana | 指标采集与可视化 |
| 错误追踪 | Sentry | 前后端错误追踪 |
| 容器化 | Docker + Docker Compose | 标准化部署 |
| CI/CD | GitHub Actions | 自动测试、构建、部署 |

---

## 5. 部署架构

参见 `docs/deployment-guide.md` 和 `config/docker-compose.prod.yml`。

## 6. 监控架构

参见 `docs/monitoring-guide.md` 和 `config/monitoring/`。








