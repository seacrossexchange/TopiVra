# TopiVra 完整部署指南

## 目录

1. [快速开始](#快速开始)
2. [本地开发环境](#本地开发环境)
3. [生产环境部署](#生产环境部署)
4. [环境变量配置](#环境变量配置)
5. [常用命令](#常用命令)
6. [监控配置](#监控配置)
7. [备份与恢复](#备份与恢复)

---

## 快速开始

### Windows 本地开发

```bash
# 1. 启动开发环境
scripts\deploy\START-DEV-WINDOWS.bat

# 2. 访问应用
# 前端：http://localhost:5173
# 后端：http://localhost:8000
# API 文档：http://localhost:8000/api/v1/docs
```

### Linux 生产环境

```bash
# 1. 生成密钥（在本地 Windows 执行）
powershell -ExecutionPolicy Bypass -File gen-keys.ps1 -Domain yourdomain.com

# 2. 上传 server/.env 到服务器 /opt/topivra/.env

# 3. 部署到生产环境
bash scripts/deploy/deploy-production.sh

# 4. 验证部署
bash scripts/deploy/health-check.sh
```

---

## 本地开发环境

### 系统要求

- **操作系统**：Windows 10/11
- **Docker Desktop**：最新版本
- **磁盘空间**：至少 20GB
- **内存**：至少 4GB

### 启动步骤

1. **启动 Docker Desktop**
   - 打开 Docker Desktop 应用
   - 等待 Docker 引擎启动

2. **运行启动脚本**
   ```bash
   scripts\deploy\START-DEV-WINDOWS.bat
   ```

3. **等待服务启动**
   - 首次运行需要 2-5 分钟
   - 脚本会自动下载镜像和初始化数据库

4. **访问应用**
   - 前端：http://localhost:5173
   - 后端：http://localhost:8000
   - API 文档：http://localhost:8000/api/v1/docs

### 测试账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@topivra.com | Admin123! |
| 卖家 | seller@topivra.com | Seller123! |
| 买家 | buyer@topivra.com | Buyer123! |

### 常用开发命令

```bash
# 查看容器状态
docker compose -f config/docker-compose.yml ps

# 查看服务日志
docker compose -f config/docker-compose.yml logs -f server

# 停止服务
scripts\deploy\STOP-DEV-WINDOWS.bat

# 清理所有数据（谨慎！）
docker compose -f config/docker-compose.yml down -v

# 重启特定服务
docker compose -f config/docker-compose.yml restart server
```

---

## 生产环境部署

### 系统要求

- **操作系统**：Ubuntu 20.04 LTS 或 CentOS 8+
- **CPU**：2 核心（推荐 4 核）
- **内存**：4GB（推荐 8GB）
- **磁盘**：20GB SSD（推荐 50GB）
- **带宽**：5Mbps（推荐 10Mbps）

### 前置准备

1. **安装 Docker**
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```

2. **安装 Docker Compose**
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **克隆项目**
   ```bash
   git clone <repository-url> /opt/topivra
   cd /opt/topivra
   ```

### 部署步骤

1. **生成安全密钥**（在本地 Windows 执行）
   ```bash
   powershell -ExecutionPolicy Bypass -File gen-keys.ps1 -Domain yourdomain.com
   ```

2. **上传配置文件**
   ```bash
   # 将 server/.env 上传到服务器
   scp server/.env user@server:/opt/topivra/server/.env
   ```

3. **执行部署脚本**
   ```bash
   cd /opt/topivra
   bash scripts/deploy/deploy-production.sh
   ```

4. **验证部署**
   ```bash
   bash scripts/deploy/health-check.sh
   ```

### 部署后配置

1. **配置 SSL 证书**
   ```bash
   # 使用 Let's Encrypt
   bash scripts/ssl-setup.sh yourdomain.com
   ```

2. **配置防火墙**
   ```bash
   bash scripts/setup-firewall.sh
   ```

3. **设置定时备份**
   ```bash
   # 编辑 crontab
   crontab -e
   
   # 添加每天凌晨 2 点备份
   0 2 * * * cd /opt/topivra && bash scripts/deploy/backup.sh
   ```

---

## 环境变量配置

### 核心配置

```bash
# 应用配置
NODE_ENV=production
PORT=8000

# 数据库
DATABASE_URL=mysql://user:password@mysql:3306/topivra_prod

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=strong_password

# JWT 密钥（必须修改）
JWT_SECRET=your_64_char_random_secret
JWT_REFRESH_SECRET=your_64_char_random_secret

# 前端 URL
CLIENT_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# Swagger（生产环境建议关闭）
ENABLE_SWAGGER=false
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

### 安全建议

1. **使用强密码**
   - 最少 16 个字符
   - 包含大小写字母、数字、特殊符号

2. **定期轮换密钥**
   - JWT_SECRET 每 6 个月轮换一次
   - 数据库密码每 3 个月轮换一次

3. **不要提交 .env 文件**
   - 已在 .gitignore 中配置
   - 使用 .env.example 作为模板

---

## 常用命令

### 查看状态

```bash
# 查看所有容器状态
docker compose -f config/docker-compose.prod.yml ps

# 查看容器资源使用
docker stats

# 查看容器日志
docker compose -f config/docker-compose.prod.yml logs -f server
```

### 管理服务

```bash
# 启动服务
docker compose -f config/docker-compose.prod.yml up -d

# 停止服务
docker compose -f config/docker-compose.prod.yml down

# 重启服务
docker compose -f config/docker-compose.prod.yml restart

# 重启特定服务
docker compose -f config/docker-compose.prod.yml restart server
```

### 数据库操作

```bash
# 进入 MySQL 容器
docker compose -f config/docker-compose.prod.yml exec mysql mysql -uroot -p

# 执行数据库迁移
docker compose -f config/docker-compose.prod.yml exec server npx prisma migrate deploy

# 初始化种子数据
docker compose -f config/docker-compose.prod.yml exec server npx prisma db seed
```

---

## 监控配置

### Prometheus + Grafana

```bash
# 启动监控服务
docker compose -f config/docker-compose.monitoring.yml up -d

# 访问监控面板
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)
```

### 配置告警

编辑 `config/monitoring/alerts.yml` 添加告警规则：

```yaml
groups:
  - name: topivra
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "高错误率告警"
```

---

## 备份与恢复

### 自动备份

```bash
# 设置定时备份（每天凌晨 2 点）
crontab -e

# 添加以下行
0 2 * * * cd /opt/topivra && bash scripts/deploy/backup.sh
```

### 手动备份

```bash
# 完整备份
bash scripts/deploy/backup.sh

# 备份文件位置
ls -lh backups/
```

### 恢复数据

```bash
# 恢复 MySQL
bash scripts/deploy/restore.sh backups/mysql_backup_20260314_020000.sql

# 恢复上传文件
tar -xzf backups/uploads_backup_20260314_020000.tar.gz -C server/uploads/
```

---

## 故障排查

详见 [troubleshooting.md](./troubleshooting.md)

### 快速诊断

```bash
# 运行诊断脚本
bash scripts/deploy/diagnose.sh

# 查看诊断报告
cat diagnostics/diagnostic_report_*.txt
```

---

## 更多文档

- **[开发指南](./DEVELOPMENT.md)** - 本地开发环境配置
- **[API 文档](./API.md)** - API 接口说明
- **[故障排查](./troubleshooting.md)** - 常见问题解决

---

**最后更新**：2026-03-14


