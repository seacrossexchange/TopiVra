# 监控指南

> 版本: 1.0 | 更新时间: 2026-03-13

---

## 1. 监控架构

```
┌─────────────────┐     scrape      ┌─────────────┐
│  NestJS /metrics│ ◄────────────── │  Prometheus │
│  (prom-client)  │                 │  端口: 9090  │
└─────────────────┘                 └──────┬──────┘
                                           │
                                    ┌──────▼──────┐
                                    │   Grafana   │
                                    │  端口: 3001  │
                                    └──────┬──────┘
                                           │
                                    ┌──────▼──────┐
                                    │ Alertmanager│
                                    │  端口: 9093  │
                                    └─────────────┘
```

---

## 2. Prometheus 指标

### 2.1 HTTP 指标

| 指标名 | 类型 | 说明 |
|--------|------|------|
| `http_requests_total` | Counter | 按 method/route/status_code 分组的请求总数 |
| `http_request_duration_seconds` | Histogram | 请求延迟分布（P50/P95/P99）|

### 2.2 业务指标

| 指标名 | 类型 | 说明 |
|--------|------|------|
| `orders_created_total` | Counter | 订单创建总数（按货币） |
| `payments_success_total` | Counter | 支付成功总数（按方式） |
| `payments_failed_total` | Counter | 支付失败总数（按方式/原因） |
| `auto_delivery_total` | Counter | 自动发货成功总数 |
| `auto_delivery_failed_total` | Counter | 自动发货失败总数 |
| `websocket_connections_active` | Gauge | 当前 WebSocket 连接数 |
| `active_connections` | Gauge | 活跃 HTTP 连接数 |

### 2.3 Node.js 默认指标

通过 `collectDefaultMetrics()` 自动采集：
- `process_cpu_seconds_total`
- `process_resident_memory_bytes`
- `nodejs_heap_size_used_bytes`
- `nodejs_gc_duration_seconds`

---

## 3. 查看指标

### 3.1 直接访问

```bash
# 开发环境
curl http://localhost:8000/metrics

# 生产环境（需配置 IP 白名单或 Basic Auth）
curl https://your-domain.com/metrics
```

### 3.2 Prometheus 配置

见 `config/monitoring/prometheus.yml`：

```yaml
scrape_configs:
  - job_name: 'topivra-server'
    static_configs:
      - targets: ['server:8000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### 3.3 启动监控服务

```bash
# 启动 Prometheus + Grafana + Alertmanager
docker compose -f config/docker-compose.monitoring.yml up -d

# 访问 Grafana
open http://localhost:3001
# 默认账号: admin / admin
```

---

## 4. 告警规则

见 `config/monitoring/alerts.yml`，关键告警：

| 告警名 | 条件 | 严重级别 |
|--------|------|----------|
| HighErrorRate | 5xx 错误率 > 5% 持续 5 分钟 | critical |
| SlowRequests | P95 延迟 > 1s 持续 5 分钟 | warning |
| PaymentFailureSpike | 支付失败率 > 10% | critical |
| AutoDeliveryFailures | 自动发货失败 > 10/min | warning |
| HighMemoryUsage | 内存 > 80% | warning |

---

## 5. Sentry 错误追踪

### 5.1 配置

```bash
# .env
SENTRY_DSN=https://xxx@sentry.io/xxx

# 前端 vite.config.ts 已配置 Sentry 插件
# 后端 main.ts 已配置动态初始化
```

### 5.2 查看错误

- 登录 Sentry 控制台
- 过滤 `topivra-server` 和 `topivra-client` 两个项目
- 关注 `CRITICAL` 和 `ERROR` 级别问题

---

## 6. 日志

### 6.1 查看日志

```bash
# 服务器日志
docker logs topivra-server -f

# 按级别过滤
docker logs topivra-server 2>&1 | grep ERROR

# 日志文件（Winston daily rotate）
ls server/logs/
```

### 6.2 日志格式

```json
{
  "timestamp": "2026-03-13T10:00:00.000Z",
  "level": "info",
  "context": "OrdersService",
  "message": "订单创建成功",
  "orderId": "order-xxx",
  "userId": "user-xxx"
}
```

### 6.3 敏感信息脱敏

日志中以下字段会自动脱敏：
- `password` → `***`
- `token` / `accessToken` → `***`
- `cardNumber` → 最后4位保留
- `accountData` → `[REDACTED]`








