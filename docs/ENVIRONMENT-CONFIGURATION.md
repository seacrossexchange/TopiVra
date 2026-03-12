# TopiVra 开发与生产环境配置指南

**目的**：确保本地开发环境和生产环境能够正确识别和配置

---

## 一、环境识别机制

### 1.1 环境变量识别

系统通过 `NODE_ENV` 环境变量识别当前环境：

```bash
# 开发环境
NODE_ENV=development

# 生产环境
NODE_ENV=production
```

### 1.2 配置文件位置

| 环境 | 配置文件 | 位置 |
|------|---------|------|
| 开发 | docker-compose.yml | config/ |
| 生产 | docker-compose.prod.yml | config/ |
| 开发 | Nginx dev.nginx.conf | config/nginx/ |
| 生产 | Nginx prod.nginx.conf | config/nginx/ |

---

## 二、本地开发环境（Windows）

### 2.1 启动流程

```bash
# 1. 执行启动脚本
scripts/deploy/START-DEV-WINDOWS.bat

# 脚本会自动：
# - 检查 Docker 环境
# - 启动 MySQL 和 Redis 容器（使用 config/docker-compose.yml）
# - 初始化数据库
# - 安装 npm 依赖
# - 启动两个开发服务器窗口
```

### 2.2 环境配置

**server/.env**（自动生成）：
```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=mysql://root:root@localhost:3306/topivra
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production-2024
```

**client/.env**（自动生成）：
```bash
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_WS_URL=ws://localhost:3001
```

### 2.3 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5174 |
| 后端 API | http://localhost:3001 |
| API 文档 | http://localhost:3001/api/v1/docs |
| Nginx 代理 | http://localhost |

### 2.4 数据库信息

| 服务 | 地址 | 用户 | 密码 |
|------|------|------|------|
| MySQL | localhost:3306 | root | root |
| Redis | localhost:6379 | - | - |

### 2.5 测试账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@topivra.com | Admin123! |
| 卖家 | seller@topivra.com | Seller123! |
| 买家 | buyer@topivra.com | Buyer123! |

### 2.6 常用命令

```bash
# 查看日志
docker-compose -f config/docker-compose.yml logs -f server

# 查看容器状态
docker-compose -f config/docker-compose.yml ps

# 停止服务
docker-compose -f config/docker-compose.yml down

# 清理所有数据
docker-compose -f config/docker-compose.yml down -v
```

---

## 三、生产环境（Linux）

### 3.1 部署流程

```bash
# 1. 生成密钥（本地 Windows）
powershell -ExecutionPolicy Bypass -File gen-keys.ps1 -Domain yourdomain.com

# 2. 上传配置
scp server/.env user@server:/opt/topivra/.env

# 3. 部署到服务器
bash scripts/deploy/deploy-production.sh

# 4. 验证部署
bash scripts/deploy/health-check.sh
```

### 3.2 环境配置

**server/.env**（由 gen-keys.ps1 生成）：
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=mysql://topivra_user:PASSWORD@mysql:3306/topivra_prod
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=STRONG_PASSWORD
REDIS_URL=redis://:STRONG_PASSWORD@redis:6379
JWT_SECRET=STRONG_RANDOM_KEY_64_CHARS
JWT_REFRESH_SECRET=STRONG_RANDOM_KEY_64_CHARS
ENCRYPTION_KEY=STRONG_RANDOM_KEY_32_CHARS
CLIENT_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
ENABLE_SWAGGER=false
```

### 3.3 Docker Compose 配置

**使用方式**：
```bash
# 开发环境
docker-compose -f config/docker-compose.yml up -d

# 生产环境（使用两个配置文件）
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml up -d
```

**生产环境覆盖**（config/docker-compose.prod.yml）：
- 资源限制（CPU、内存）
- 性能优化参数
- 备份目录配置
- 日志配置

### 3.4 Nginx 配置

**开发环境**（config/nginx/dev.nginx.conf）：
- 前端代理
- API 代理
- WebSocket 支持
- 简单配置

**生产环境**（config/nginx/prod.nginx.conf）：
- HTTPS/TLS 1.2+
- 静态资源缓存（30 天）
- API 缓存（5 分钟）
- 安全头（HSTS、CSP 等）
- Gzip 压缩
- 负载均衡就绪

### 3.5 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | https://yourdomain.com |
| 后端 API | https://yourdomain.com/api/v1 |
| API 文档 | https://yourdomain.com/api/v1/docs |

### 3.6 常用命令

```bash
# 查看状态
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml ps

# 查看日志
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml logs -f server

# 备份数据
bash scripts/deploy/backup.sh

# 恢复数据
bash scripts/deploy/restore.sh backups/mysql_backup_*.sql

# 健康检查
bash scripts/deploy/health-check.sh

# 系统诊断
bash scripts/deploy/diagnose.sh
```

---

## 四、环境差异对比

| 项目 | 开发环境 | 生产环境 |
|------|---------|---------|
| NODE_ENV | development | production |
| 数据库 | localhost:3306 | docker 内部 |
| Redis | localhost:6379 | docker 内部 |
| 密码 | 简单密码 | 强随机密码 |
| HTTPS | 否 | 是 |
| Swagger | 启用 | 禁用 |
| 日志 | 详细 | 优化 |
| 缓存 | 无 | 启用 |
| 资源限制 | 无 | 有 |
| 备份 | 手动 | 自动 |

---

## 五、故障排查

### 5.1 开发环境

**问题**：`no configuration file provided: not found`

**原因**：docker-compose 找不到配置文件

**解决**：
```bash
# 确保使用正确的路径
docker-compose -f config/docker-compose.yml up -d

# 或在 config 目录执行
cd config
docker-compose up -d
cd ..
```

**问题**：端口被占用

**解决**：
```bash
# 查找占用端口的进程
netstat -tulpn | grep 3001

# 杀死进程
kill -9 <PID>

# 或修改 docker-compose.yml 中的端口映射
```

### 5.2 生产环境

**问题**：数据库连接失败

**解决**：
```bash
# 检查数据库运行状态
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml exec -T mysql mysqladmin ping -uroot -p${MYSQL_ROOT_PASSWORD}

# 检查环境变量
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml exec -T server env | grep DATABASE_URL
```

**问题**：API 无响应

**解决**：
```bash
# 检查 API 健康状态
curl http://localhost:3001/health/live

# 查看日志
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml logs -f server
```

---

## 六、最佳实践

### 6.1 开发环境

1. ✅ 使用 `scripts/deploy/START-DEV-WINDOWS.bat` 启动
2. ✅ 保持两个开发服务器窗口打开
3. ✅ 修改代码后自动热重载
4. ✅ 定期检查日志
5. ✅ 使用测试账号登录验证

### 6.2 生产环境

1. ✅ 使用 `gen-keys.ps1` 生成强密钥
2. ✅ 使用 `scripts/deploy/deploy-production.sh` 部署
3. ✅ 配置 SSL 证书
4. ✅ 设置定时备份
5. ✅ 定期运行健康检查
6. ✅ 监控系统资源使用

---

## 七、环境变量检查清单

### 开发环境

- [ ] NODE_ENV=development
- [ ] DATABASE_URL 指向 localhost
- [ ] REDIS_HOST=localhost
- [ ] JWT_SECRET 已设置
- [ ] ENABLE_SWAGGER=true

### 生产环境

- [ ] NODE_ENV=production
- [ ] DATABASE_URL 指向 docker 内部 mysql
- [ ] REDIS_HOST=redis
- [ ] JWT_SECRET 是强随机密钥（64+ 字符）
- [ ] ENCRYPTION_KEY 已设置
- [ ] CLIENT_URL 是 HTTPS 地址
- [ ] ENABLE_SWAGGER=false
- [ ] SSL 证书已配置

---

**最后更新**：2026-03-12

