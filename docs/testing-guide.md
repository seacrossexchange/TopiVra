# 测试指南

> 版本: 1.0 | 更新时间: 2026-03-13

---

## 1. 测试架构

```
测试金字塔

        ┌─────────┐
        │  E2E    │  Playwright (e2e/)
        ├─────────┤
        │ 集成测试 │  Supertest + Jest
        ├─────────┤
        │ 单元测试 │  Jest (server) / Vitest (client)
        └─────────┘
```

---

## 2. 后端测试（Jest）

### 2.1 运行测试

```bash
cd server

# 运行所有单元测试
npm test

# 监听模式
npm run test:watch

# 覆盖率报告
npm run test:cov

# E2E 测试
npm run test:e2e
```

### 2.2 测试文件结构

```
server/src/modules/
├── orders/
│   ├── orders.service.ts
│   ├── orders.service.spec.ts          # 订单服务单元测试
│   ├── delivery-events.service.ts
│   └── delivery-events.service.spec.ts # SSE 事件服务测试
├── payments/
│   ├── payments.service.spec.ts        # 支付服务单元测试
│   └── payments.auto-delivery.spec.ts  # 支付→自动发货集成测试
├── inventory/
│   └── auto-delivery.service.ts        # 自动发货服务
└── ...
```

### 2.3 关键测试场景

#### 自动发货链路
```typescript
// payments.auto-delivery.spec.ts
- 支付记录不存在 → 抛出 BadRequestException
- 支付已 SUCCESS → 直接返回，不触发发货
- 正常成功 → 更新支付/订单状态 + 调用 handlePaymentSuccess + WS 通知 + 邮件

// orders.service.spec.ts
- handlePaymentSuccess 正常 → 更新订单为 PAID + 调用 AutoDeliveryService
- handlePaymentSuccess 发货失败 → 仍更新为已支付，返回 { success: false, error }
```

#### SSE 事件流
```typescript
// delivery-events.service.spec.ts
- streamForOrder 按 orderId 过滤事件
- emit 自动附加 timestamp
- 订阅后才接收事件（热流行为）
```

### 2.4 Mock 规范

```typescript
// 标准 Prisma Mock 模式
const mockPrisma = {
  order: { findUnique: jest.fn(), update: jest.fn() },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
};

// 在 beforeEach 中重置
beforeEach(() => {
  jest.clearAllMocks();
});
```

---

## 3. 前端测试（Vitest）

### 3.1 运行测试

```bash
cd client

# 运行所有测试（含覆盖率）
npm test

# 监听模式
npx vitest

# UI 模式
npx vitest --ui
```

### 3.2 测试文件结构

```
client/src/
├── hooks/
│   ├── useDeliveryStream.ts
│   └── useDeliveryStream.test.ts  # SSE hook 测试
├── services/
│   ├── orders.ts
│   └── orders.test.ts             # 订单接口契约测试
├── store/
│   ├── cartStore.ts
│   ├── cartStore.test.ts
│   ├── authStore.ts
│   └── authStore.test.ts
└── i18n/
    └── i18n.test.ts               # 多语言验证
```

### 3.3 关键测试场景

#### useDeliveryStream hook
```typescript
- 初始状态 idle
- start() → 创建 EventSource，URL 含 token
- onopen → status: streaming
- ITEM_SUCCESS 事件 → 更新 progress
- COMPLETED 事件 → progress=100, allSuccess=true, 关闭连接
- PARTIAL_FAILED → allSuccess=false, status: completed
- onerror → status: error, 关闭连接
- orderId=undefined → 不创建 EventSource
```

#### 多语言
```typescript
// i18n.test.ts
- id: inventory.title === 'Kelola Stok'
- pt-BR: inventory.title === 'Gerenciar Estoque'
- es-MX: inventory.title === 'Gestión de Inventario'
```

### 3.4 Mock 规范

```typescript
// Mock apiClient
vi.mock('@/services/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

// Mock EventSource（用于 SSE hook 测试）
class MockEventSource {
  onopen = null;
  onmessage = null;
  onerror = null;
  close() { this.closed = true; }
  pushMessage(data) { this.onmessage?.({ data: JSON.stringify(data) }); }
}
vi.stubGlobal('EventSource', MockEventSource);
```

---

## 4. E2E 测试（Playwright）

### 4.1 运行测试

```bash
cd e2e

# 安装 Playwright
npx playwright install --with-deps

# 运行所有 E2E
npx playwright test

# 指定浏览器
npx playwright test --project=chromium

# 调试模式
npx playwright test --debug

# 查看报告
npx playwright show-report
```

### 4.2 核心 E2E 场景

| 文件 | 场景 |
|------|------|
| `purchase-flow.spec.ts` | 注册 → 浏览商品 → 加购 → 结算 → 支付 → 查看自动发货凭证 |
| `seller-flow.spec.ts` | 卖家登录 → 上架商品 → 导入库存 → 查看订单 |
| `admin-flow.spec.ts` | 管理员 → 审核商品 → 审核卖家 → 查看统计 |
| `auth.spec.ts` | 登录 / 注册 / 2FA / OAuth 回调 |
| `security-xss.spec.ts` | XSS 输入防护 |

---

## 5. 覆盖率目标

| 层级 | 目标覆盖率 | 验收方式 |
|------|-----------|----------|
| 后端单元测试 | ≥ 70% | `npm run test:cov` |
| 前端单元测试 | ≥ 60% | `npm test` |
| E2E 核心流程 | 100% | 手动 + CI |

---

## 6. CI 集成

测试在 GitHub Actions 中自动运行，见 `.github/workflows/ci-cd.yml`：
- `test-server`: 后端单元测试 + ESLint + tsc
- `test-client`: 前端单元测试 + ESLint + tsc  
- `test-e2e`: E2E 测试（仅 main/develop 分支）
- `security`: npm audit + Trivy 扫描








