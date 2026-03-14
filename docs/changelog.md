# Changelog

所有重要变更记录在此文件中，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [Unreleased]

### Added
- GitHub Actions CI/CD 全流程（测试 → 构建 → 部署 → 健康检查 → 失败回滚）
- Prometheus metrics 端点 (`GET /metrics`)，包含 HTTP 延迟、业务计数器等指标
- `MetricsInterceptor` 自动采集每个请求的延迟和状态码
- 响应压缩中间件（`compression`，gzip/brotli）
- 架构文档 `docs/architecture.md`
- 测试指南 `docs/testing-guide.md`
- 监控指南 `docs/monitoring-guide.md`
- 故障排查手册 `docs/troubleshooting.md`

---

## [2.1.0] - 2026-03-13

### Added
- **SSE 自动发货实时进度流**
  - 后端 `GET /orders/:id/delivery-stream` 端点
  - `DeliveryEventsService`（RxJS Subject 广播，按 orderId 过滤）
  - `DeliveryEventsModule`（独立模块，避免循环依赖）
  - 前端 `useDeliveryStream` hook（自动管理 EventSource 生命周期）
  - `OrderDetail` 页面集成实时进度条 + 事件流展示
  - SSE 相关 CSS 动画（`fadeSlideIn`）
- **后端测试补全**
  - `payments.auto-delivery.spec.ts`：支付→自动发货集成测试
  - `delivery-events.service.spec.ts`：SSE 服务单元测试
  - `orders.service.spec.ts` 新增 `handlePaymentSuccess` 用例
- **前端测试补全**
  - `useDeliveryStream.test.ts`：完整 hook 单元测试（7 个用例）
  - `orders.test.ts`：订单接口契约测试
  - `i18n.test.ts`：多语言 key 验证

### Fixed
- 修复所有后端 spec 文件中方法名与实现不匹配的 TypeScript 错误
  - `payments.service.spec.ts`：`initiatePayment` → `createPayment`
  - `admin.service.spec.ts`：`verifySeller` → `auditSeller`，`approveProduct` → `auditProduct`
  - `messages.service.spec.ts`：`send` → `sendMessage`
  - `notifications.service.spec.ts`：移除不存在的 `delete` 方法调用
  - `sellers.service.spec.ts`：`apply` → `applySeller`，`getProfile` → `getSellerProfile`
  - `tickets.service.spec.ts`：`adminFindAll` → `findAll`，`adminReply` → `reply(isAdmin=true)`
  - `products.service.spec.ts`：`keyword` → `search` 查询字段

---

## [2.0.0] - 2026-03-12

### Added
- **自动发货系统**
  - `AutoDeliveryService.handlePaymentSuccess()`：FIFO 库存分配
  - 支持 `autoDeliver=true` 的商品在支付成功后自动推送凭证
  - 买家 WebSocket + 站内信通知
  - 卖家发货失败通知
- **支付链路完整集成**
  - USDT (TRON/EVM)、支付宝、微信、YiPay、MaPay、虎皮椒、PayPal、Stripe
  - 统一通过 `completePayment()` 触发自动发货
- **国际化重构**
  - 语言收敛：`zh-CN` / `en` / `id` / `pt-BR` / `es-MX`
  - 覆盖首页、商品、购物车、结算、订单、卖家中心、库存管理

### Changed
- 后端端口统一为 8000，前端端口统一为 3000
- 文档从 20 个精简为 5 个核心文档 + AUTO-DELIVERY 专题系列

---

## [1.0.0] - 2026-03-01

### Added
- 初始版本：用户认证（JWT + 2FA + OAuth）
- 商品管理、购物车、订单、支付基础流程
- 卖家中心、管理后台
- WebSocket 实时通知
- Docker 容器化部署








