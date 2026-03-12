# TopiVra 部署指南

## 快速开始

### 开发环境

**Windows**:
```bash
START-DEV.bat
```

**Linux/Mac**:
```bash
docker-compose up -d
```

访问:
- 前端: http://localhost:5175
- 后端: http://localhost:3001
- API文档: http://localhost:3001/api/docs

### 生产环境

**自动化部署**:
```bash
./scripts/auto-deploy-production.sh
```

**手动部署**:
```bash
# 1. 配置环境变量
cp .env.example .env
vim .env

# 2. 构建并启动
docker-compose -f docker-compose.prod.yml up -d

# 3. 初始化数据库
docker exec topivra-server npx prisma migrate deploy
docker exec topivra-server npx prisma db seed

# 4. 验证部署
./scripts/diagnose-production.sh
```

## 环境变量配置

### 必需配置

```bash
# 数据库
DATABASE_URL=mysql://user:password@host:3306/topivra

# JWT密钥
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key

# Redis
REDIS_URL=redis://localhost:6379

# 应用配置
NODE_ENV=production
PORT=3001
CLIENT_URL=https://yourdomain.com
```

### 可选配置

```bash
# 邮件服务
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# 支付配置
USDT_WALLET_ADDRESS=your-wallet-address
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-secret
STRIPE_SECRET_KEY=your-stripe-key

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
```

## 服务器要求

### 最低配置
- CPU: 2核
- 内存: 4GB
- 磁盘: 20GB SSD
- 带宽: 5Mbps

### 推荐配置
- CPU: 4核
- 内存: 8GB
- 磁盘: 50GB SSD
- 带宽: 10Mbps

## 端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| Nginx | 80 | HTTP |
| Nginx | 443 | HTTPS |
| 前端 | 3000 | 内部端口 |
| 后端 | 3001 | API端口 |
| MySQL | 3306 | 数据库 |
| Redis | 6379 | 缓存 |
| Prometheus | 9090 | 监控 |
| Grafana | 3002 | 可视化 |

## SSL证书配置

### 使用Let's Encrypt
```bash
./scripts/ssl-setup.sh yourdomain.com
```

### 手动配置
```bash
# 1. 放置证书文件
cp your-cert.crt nginx/ssl/cert.crt
cp your-key.key nginx/ssl/cert.key

# 2. 更新Nginx配置
vim nginx/production.conf

# 3. 重启Nginx
docker-compose restart nginx
```

## 数据库迁移

```bash
# 生成迁移文件
cd server
npx prisma migrate dev --name migration_name

# 应用迁移（生产）
npx prisma migrate deploy

# 查看迁移状态
npx prisma migrate status
```

## 备份与恢复

### 自动备份
```bash
# 设置定时备份（每天凌晨2点）
./scripts/setup-cron-backup.sh
```

### 手动备份
```bash
# 完整备份
./scripts/backup-full.sh

# 仅数据库
./scripts/backup-mysql.sh

# 仅Redis
./scripts/backup-redis.sh
```

### 恢复数据
```bash
# 恢复MySQL
./scripts/restore-mysql.sh /path/to/backup.sql

# 恢复Redis
./scripts/restore-redis.sh /path/to/backup.rdb
```

## 监控配置

### 启动监控服务
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### 访问监控面板
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002 (admin/admin)

### 配置告警
```bash
vim monitoring/alerts.yml
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

## 日志管理

### 查看日志
```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f server
docker-compose logs -f client

# 最近100行
docker-compose logs --tail=100 server
```

### 日志轮转
```bash
./scripts/setup-logrotate.sh
```

## 性能优化

### 数据库优化
```sql
-- 添加索引
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_orders_user_id ON orders(userId);
CREATE INDEX idx_orders_status ON orders(status);
```

### Redis缓存策略
```bash
# 设置最大内存
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Nginx优化
```nginx
# 启用gzip压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# 启用缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 安全加固

### 防火墙配置
```bash
./scripts/setup-firewall.sh
```

### 更新系统
```bash
# Ubuntu/Debian
apt update && apt upgrade -y

# CentOS/RHEL
yum update -y
```

### 定期安全检查
```bash
# 检查开放端口
netstat -tulpn

# 检查运行进程
ps aux | grep node

# 检查磁盘使用
df -h
```

## 故障排查

### 服务无法启动
```bash
# 检查日志
docker-compose logs server

# 检查端口占用
netstat -tulpn | grep 3001

# 重启服务
docker-compose restart server
```

### 数据库连接失败
```bash
# 测试连接
docker exec topivra-mysql mysql -uroot -proot -e "SELECT 1"

# 检查配置
docker exec topivra-server env | grep DATABASE_URL
```

### 性能问题
```bash
# 运行诊断脚本
./scripts/diagnose-production.sh

# 检查资源使用
docker stats
```

## 扩展部署

### 负载均衡
```nginx
upstream backend {
    server server1:3001;
    server server2:3001;
    server server3:3001;
}
```

### 数据库主从复制
参考 MySQL 官方文档配置主从复制。

### Redis集群
参考 Redis 官方文档配置集群模式。

## 回滚操作

```bash
# 回滚到上一个版本
./scripts/rollback.sh

# 回滚到指定版本
./scripts/rollback.sh v1.2.3
```

## 健康检查

```bash
# 手动健康检查
./scripts/health-check.sh

# API健康检查
curl http://localhost:3001/health/live
curl http://localhost:3001/health/ready
```

## 联系支持

- 技术支持: tech@topivra.com
- 紧急联系: +86 xxx-xxxx-xxxx
- 文档: https://docs.topivra.com















