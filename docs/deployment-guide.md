# TopiVra 完整部署指南

## 目录

1. [快速开始](#快速开始)
2. [本地开发环境](#本地开发环境)
3. [生产环境部署](#生产环境部署)
4. [环境变量配置](#环境变量配置)
5. [常用命令](#常用命令)
6. [故障排查](#故障排查)
7. [备份与恢复](#备份与恢复)

---

## 快速开始

### Windows 本地开发

```bash
# 1. 启动开发环境
scripts/deploy/START-DEV-WINDOWS.bat

# 2. 访问应用
# 前端：http://localhost:5174
# 后端：http://localhost:3001
# API 文档：http://localhost:3001/api/v1/docs
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
   scripts/deploy/START-DEV-WINDOWS.bat
   ```

3. **等待服务启动**
   - 首次运行需要 2-5 分钟
   - 脚本会自动下载镜像和初始化数据库

4. **访问应用**
   - 前端：http://localhost:5174
   - 后端：http://localhost:3001
   - API 文档：http://localhost:3001/api/v1/docs

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
docker compose -f config/docker-compose.yml down

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
   scp server/.env user@server:/opt/topivra/.env
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
   bash scripts/setup/ssl-setup.sh yourdomain.com
   ```

2. **配置防火墙**
   ```bash
   bash scripts/setup/setup-firewall.sh
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

### 开发环境

参考 `docs/ENV-DEVELOPMENT-TEMPLATE.md`

关键变量：
- `NODE_ENV=development`
- `DATABASE_URL=mysql://topivra_dev:topivra_dev_pass@localhost:3306/topivra`
- `REDIS_URL=redis://localhost:6379`
- `ENABLE_SWAGGER=true`

### 生产环境

参考 `docs/ENV-PRODUCTION-TEMPLATE.md`

关键变量：
- `NODE_ENV=production`
- `DATABASE_URL=mysql://topivra_user:PASSWORD@mysql:3306/topivra_prod`
- `REDIS_PASSWORD=STRONG_PASSWORD`
- `JWT_SECRET=STRONG_RANDOM_KEY_64_CHARS`
- `CLIENT_URL=https://yourdomain.com`
- `ENABLE_SWAGGER=false`

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
docker compose -f config/docker-compose.yml ps

# 查看容器资源使用
docker stats

# 查看容器日志
docker compose -f config/docker-compose.yml logs -f server
```

### 管理服务

```bash
# 启动服务
docker compose -f config/docker-compose.yml up -d

# 停止服务
docker compose -f config/docker-compose.yml down

# 重启服务
docker compose -f config/docker-compose.yml restart

# 重启特定服务
docker compose -f config/docker-compose.yml restart server
```

### 数据库操作

```bash
# 进入 MySQL 容器
docker compose -f config/docker-compose.yml exec mysql mysql -uroot -proot

# 执行数据库迁移
docker compose -f config/docker-compose.yml exec server npx prisma migrate deploy

# 初始化种子数据
docker compose -f config/docker-compose.yml exec server npx prisma db seed
```

### 备份与恢复

```bash
# 备份数据
bash scripts/deploy/backup.sh

# 恢复数据
bash scripts/deploy/restore.sh backups/mysql_backup_20240101_120000.sql
```

---

## 故障排查

### 服务无法启动

**症状**：容器启动后立即退出

**解决方案**：
```bash
# 查看错误日志
docker compose -f config/docker-compose.yml logs server

# 检查环境变量
docker compose -f config/docker-compose.yml exec server env | grep DATABASE_URL

# 检查数据库连接
docker compose -f config/docker-compose.yml exec mysql mysql -uroot -proot -e "SELECT 1"
```

### 数据库连接失败

**症状**：`Error: connect ECONNREFUSED 127.0.0.1:3306`

**解决方案**：
```bash
# 检查 MySQL 容器状态
docker compose -f config/docker-compose.yml ps mysql

# 检查 MySQL 日志
docker compose -f config/docker-compose.yml logs mysql

# 重启 MySQL
docker compose -f config/docker-compose.yml restart mysql
```

### 端口被占用

**症状**：`Error: bind: address already in use`

**解决方案**：
```bash
# 查找占用端口的进程
netstat -tulpn | grep 3001

# 杀死进程
kill -9 <PID>

# 或修改 docker-compose.yml 中的端口映射
```

### 磁盘空间不足

**症状**：`no space left on device`

**解决方案**：
```bash
# 查看磁盘使用
df -h

# 清理 Docker 镜像
docker image prune -a

# 清理 Docker 容器
docker container prune

# 清理 Docker 卷
docker volume prune
```

### 内存不足

**症状**：容器被 OOM 杀死

**解决方案**：
```bash
# 查看容器资源限制
docker inspect <container_id> | grep -A 10 "Memory"

# 增加 Docker 内存限制（Docker Desktop 设置）
# 或修改 docker-compose.prod.yml 中的资源限制
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
bash scripts/deploy/restore.sh backups/mysql_backup_20240101_120000.sql

# 恢复 Redis
bash scripts/deploy/restore.sh backups/redis_backup_20240101_120000.rdb

# 恢复上传文件
bash scripts/deploy/restore.sh backups/uploads_backup_20240101_120000.tar.gz
```

### 备份策略

- **日备份**：每天凌晨 2 点
- **周备份**：每周日凌晨 3 点
- **月备份**：每月 1 日凌晨 4 点
- **保留期**：日备份保留 7 天，周备份保留 4 周，月备份保留 12 个月

---

## 监控与日志

### 查看日志

```bash
# 实时日志
docker compose -f config/docker-compose.yml logs -f

# 特定服务日志
docker compose -f config/docker-compose.yml logs -f server

# 最后 100 行
docker compose -f config/docker-compose.yml logs --tail=100 server
```

### 性能监控

```bash
# 实时资源使用
docker stats

# 容器详细信息
docker inspect <container_id>

# 网络统计
docker network stats
```

### 诊断报告

```bash
# 生成完整诊断报告
bash scripts/deploy/diagnose.sh

# 查看报告
cat diagnostics/diagnostic_report_*.txt
```

---

## 常见问题

### Q: 如何更新应用？

A: 
```bash
# 1. 拉取最新代码
git pull origin main

# 2. 备份数据
bash scripts/deploy/backup.sh

# 3. 重新构建镜像
docker compose -f config/docker-compose.yml -f config/docker-compose.prod.yml build --no-cache

# 4. 重启服务
docker compose -f config/docker-compose.yml -f config/docker-compose.prod.yml up -d
```

### Q: 如何扩展容器资源？

A: 编辑 `config/docker-compose.prod.yml`，修改 `deploy.resources` 部分：
```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 2G
```

### Q: 如何配置 HTTPS？

A:
```bash
# 使用 Let's Encrypt
bash scripts/setup/ssl-setup.sh yourdomain.com

# 或手动配置
# 1. 放置证书文件到 config/nginx/ssl/
# 2. 修改 config/nginx/prod.nginx.conf
# 3. 重启 Nginx
```

---

## 支持与反馈

- 技术支持：tech@topivra.com
- 文档：https://docs.topivra.com
- 问题报告：https://github.com/topivra/topivra/issues

---

**最后更新**：2026-03-12



















