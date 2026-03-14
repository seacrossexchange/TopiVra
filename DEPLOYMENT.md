# 🚀 TopiVra 部署指南

## 快速部署

### 本地开发环境（Windows）

```bash
# 1. 启动 Docker Desktop

# 2. 一键启动
scripts/deploy/START-DEV-WINDOWS.bat

# 3. 访问应用
# 前端：http://localhost:5173
# 后端：http://localhost:8000
# API 文档：http://localhost:8000/api/v1/docs
```

### 生产环境（Linux）

```bash
# 1. 生成密钥（本地 Windows 执行）
powershell -ExecutionPolicy Bypass -File gen-keys.ps1 -Domain yourdomain.com

# 2. 上传配置到服务器
scp server/.env root@your-server:/opt/topivra/.env

# 3. 部署
bash scripts/deploy/deploy-production.sh

# 4. 验证
bash scripts/deploy/health-check.sh
```

---

## 环境要求

### 开发环境
- Windows 10/11
- Docker Desktop
- 4GB+ 内存
- 20GB+ 磁盘空间

### 生产环境
- Linux (Ubuntu 20.04+ / CentOS 7+)
- Docker + Docker Compose
- 4GB+ 内存
- 50GB+ 磁盘空间
- 域名（可选）

---

## 配置说明

### 必须修改的配置

生产环境部署前，必须修改以下配置：

```bash
# 生成强随机密钥
openssl rand -base64 32

# 修改 .env 文件
JWT_SECRET=<生成的32字符密钥>
JWT_REFRESH_SECRET=<生成的32字符密钥>
MYSQL_ROOT_PASSWORD=<强密码>
REDIS_PASSWORD=<强密码>

# 配置域名
CLIENT_URL=https://your-domain.com
SERVER_URL=https://your-domain.com/api/v1
CORS_ORIGIN=https://your-domain.com
```

### 支付配置（可选）

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# PayPal
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_MODE=live

# USDT
USDT_WALLET_ADDRESS=xxx
```

---

## 常用命令

### 服务管理

```bash
# 启动服务
docker-compose -f config/docker-compose.prod.yml up -d

# 停止服务
docker-compose -f config/docker-compose.prod.yml down

# 重启服务
docker-compose -f config/docker-compose.prod.yml restart

# 查看状态
docker-compose -f config/docker-compose.prod.yml ps

# 查看日志
docker-compose -f config/docker-compose.prod.yml logs -f server
```

### 数据库管理

```bash
# 运行迁移
cd server
npx prisma migrate deploy

# 初始化数据
npx prisma db seed

# 备份数据库
bash scripts/deploy/backup.sh

# 恢复数据库
bash scripts/deploy/restore.sh backups/mysql_backup_*.sql
```

### 健康检查

```bash
# 检查服务健康
curl http://localhost:8000/health/live
curl http://localhost:8000/health/ready

# 完整诊断
bash scripts/deploy/diagnose.sh
```

---

## 测试账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@topivra.com | Admin123! |
| 卖家 | seller@topivra.com | Seller123! |
| 买家 | buyer@topivra.com | Buyer123! |

---

## 故障排查

### 服务无法启动

```bash
# 检查 Docker 状态
docker ps -a

# 查看错误日志
docker-compose logs server

# 检查端口占用
netstat -ano | findstr :8000
netstat -ano | findstr :3306
```

### 数据库连接失败

```bash
# 检查 MySQL 容器
docker exec -it topivra-mysql mysql -uroot -p

# 检查 DATABASE_URL 配置
echo $DATABASE_URL
```

### 前端无法访问后端

```bash
# 检查 CORS 配置
# 确保 CORS_ORIGIN 包含前端域名

# 检查网络连接
docker network ls
docker network inspect topivra-network
```

---

## 性能优化

### 数据库优化

```sql
-- 查看慢查询
SHOW VARIABLES LIKE 'slow_query_log';

-- 优化表
OPTIMIZE TABLE users, products, orders;

-- 查看索引使用情况
SHOW INDEX FROM products;
```

### Redis 优化

```bash
# 查看内存使用
docker exec topivra-redis redis-cli INFO memory

# 清理过期键
docker exec topivra-redis redis-cli FLUSHDB
```

---

## 安全建议

1. **定期更新密钥** - 每 3-6 个月更新 JWT 密钥
2. **启用防火墙** - 仅开放必要端口（80, 443）
3. **配置 SSL** - 使用 Let's Encrypt 免费证书
4. **定期备份** - 每天自动备份数据库
5. **监控日志** - 配置 Sentry 错误追踪

---

## 更多文档

- **开发文档**: [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)
- **API 文档**: [docs/API.md](./docs/API.md)
- **完整部署指南**: [docs/COMPLETE-DEPLOYMENT-GUIDE.md](./docs/COMPLETE-DEPLOYMENT-GUIDE.md)

---

**最后更新**: 2026-03-12
