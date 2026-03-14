# 故障排查手册

> 版本: 1.0 | 更新时间: 2026-03-13

---

## 1. 快速诊断

```bash
# 检查所有服务状态
docker compose -f config/docker-compose.yml ps

# 健康检查
curl http://localhost:8000/health
curl http://localhost:8000/health/ready

# PowerShell 健康检查脚本
.\scripts\health-check.ps1
```

---

## 2. 常见问题

### 2.1 服务无法启动

**症状**: `docker compose up` 后服务立即退出

**排查步骤**:
```bash
# 查看退出日志
docker logs topivra-server --tail 50

# 常见原因
# 1. 环境变量缺失
cat server/.env | grep JWT_SECRET
# 2. 数据库连接失败
docker exec topivra-db mysqladmin ping -h localhost
# 3. Redis 连接失败
docker exec topivra-redis redis-cli ping
```

### 2.2 支付回调失败

**症状**: 用户支付后订单状态没有更新

**排查步骤**:
```bash
# 1. 检查支付回调日志
docker logs topivra-server | grep 'callback\|webhook\|notify'

# 2. 查询支付记录状态
# 在数据库中执行：
SELECT paymentNo, status, method, createdAt, updatedAt
FROM payments
ORDER BY createdAt DESC LIMIT 10;

# 3. 检查回调 URL 是否可达
curl -X POST https://your-domain.com/api/v1/payments/notify/stripe
```

### 2.3 自动发货未触发

**症状**: 支付成功但没有自动发货

**排查步骤**:
```bash
# 1. 检查商品是否开启自动发货
SELECT id, title, autoDeliver FROM products WHERE id = 'xxx';

# 2. 检查库存是否充足
SELECT COUNT(*) FROM product_inventory
WHERE productId = 'xxx' AND status = 'AVAILABLE' AND isValid = true;

# 3. 检查自动发货日志
docker logs topivra-server | grep 'AutoDeliveryService'

# 4. 检查 orderItem.deliveredCredentials
SELECT id, deliveredCredentials, autoDelivered, deliveredAt
FROM order_items WHERE orderId = 'xxx';
```

### 2.4 SSE 连接断开

**症状**: 前端订单详情页发货进度条没有更新

**排查步骤**:
```bash
# 1. 手动测试 SSE 端点
curl -N -H 'Authorization: Bearer YOUR_TOKEN' \
  http://localhost:8000/api/v1/orders/ORDER_ID/delivery-stream

# 2. 检查 Nginx 配置（SSE 需要关闭缓冲）
grep -A5 'proxy_buffering' config/nginx/nginx.conf

# 3. 检查防火墙/CDN 是否拦截长连接
```

**Nginx SSE 配置**（需确保存在）:
```nginx
location /api/ {
  proxy_pass http://server:8000;
  proxy_buffering off;          # 关键：SSE 需要关闭缓冲
  proxy_cache off;
  proxy_read_timeout 86400s;    # 长连接超时
  chunked_transfer_encoding on;
}
```

### 2.5 WebSocket 连接失败

**症状**: 实时通知不工作

**排查步骤**:
```bash
# 1. 检查 Nginx WebSocket 升级配置
grep -A3 'upgrade' config/nginx/nginx.conf

# 2. 检查 CORS 配置
grep 'FRONTEND_URL' server/.env

# 3. 测试 WS 连接
npx wscat -c ws://localhost:8000/socket.io/?transport=websocket
```

### 2.6 内存持续增长

**症状**: 服务内存使用量持续上涨

**排查步骤**:
```bash
# 1. 查看当前内存
docker stats topivra-server --no-stream

# 2. 查看 Prometheus 内存指标
curl http://localhost:9090/api/v1/query?query=nodejs_heap_size_used_bytes

# 3. 重启服务（临时解决）
docker compose restart server
```

---

## 3. 数据库问题

### 3.1 连接池耗尽

```bash
# 查看当前连接数
SELECT COUNT(*) FROM information_schema.processlist;

# 查看慢查询
SHOW FULL PROCESSLIST;

# 终止慢查询
KILL QUERY [pid];
```

### 3.2 Prisma 迁移失败

```bash
# 查看迁移状态
cd server && npx prisma migrate status

# 重置开发数据库（危险：会删除所有数据）
npx prisma migrate reset

# 仅推送 schema（不生成迁移记录）
npx prisma db push
```

---

## 4. 紧急回滚

```bash
# 回滚到上一个 Docker 镜像
cd /opt/topivra
docker compose -f config/docker-compose.prod.yml stop server
docker tag topivra-server:previous topivra-server:latest
docker compose -f config/docker-compose.prod.yml up -d server

# 验证服务正常
curl http://localhost:8000/health
```

---

## 5. 联系支持

- 查看日志: `docker logs topivra-server -f`
- 监控面板: `http://grafana:3001`
- Sentry 错误: `https://sentry.io/topivra`
- 运行诊断脚本: `bash scripts/deploy/diagnose.sh`










