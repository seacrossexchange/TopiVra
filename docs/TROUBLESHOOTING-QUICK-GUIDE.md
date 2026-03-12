# TopiVra 快速故障排查指南

## 开发环境启动失败

### 错误：`no configuration file provided: not found`

**原因**：docker-compose 找不到 config/docker-compose.yml

**解决方案**：

脚本已修复，确保使用最新版本的 `START-DEV-WINDOWS.bat`

关键修复：
```batch
# 旧版本（错误）
docker-compose up -d mysql redis

# 新版本（正确）
docker-compose -f config/docker-compose.yml up -d mysql redis
```

**验证**：
```bash
# 确认 config/docker-compose.yml 存在
dir config\docker-compose.yml

# 手动测试
docker-compose -f config/docker-compose.yml ps
```

---

### 错误：`docker: command not found`

**原因**：Docker 未安装或未在 PATH 中

**解决方案**：
1. 安装 Docker Desktop
2. 重启电脑
3. 验证：`docker --version`

---

### 错误：`port is already allocated`

**原因**：端口被其他进程占用

**解决方案**：
```bash
# 查找占用端口的进程
netstat -ano | findstr :3001
netstat -ano | findstr :3306
netstat -ano | findstr :5174
netstat -ano | findstr :6379

# 杀死进程（替换 PID）
taskkill /PID <PID> /F

# 或停止现有容器
docker-compose -f config/docker-compose.yml down
```

---

### 错误：`MySQL did not start in time`

**原因**：MySQL 容器启动缓慢

**解决方案**：
```bash
# 查看 MySQL 日志
docker-compose -f config/docker-compose.yml logs mysql

# 增加等待时间（编辑脚本中的 MAX_RETRIES）
# 或手动等待后重试

# 重启 MySQL
docker-compose -f config/docker-compose.yml restart mysql
```

---

### 错误：`npm install failed`

**原因**：网络问题或依赖冲突

**解决方案**：
```bash
# 清理 npm 缓存
npm cache clean --force

# 删除 node_modules 和 package-lock.json
rmdir /s /q node_modules
del package-lock.json

# 重新安装
npm install

# 或使用 yarn
yarn install
```

---

### 错误：`Prisma migration failed`

**原因**：数据库连接问题或迁移冲突

**解决方案**：
```bash
# 检查数据库连接
docker-compose -f config/docker-compose.yml exec -T mysql mysql -uroot -proot -e "SELECT 1"

# 查看迁移状态
npx prisma migrate status

# 重置数据库（开发环境）
npx prisma migrate reset

# 或手动迁移
npx prisma migrate deploy
```

---

## 生产环境部署失败

### 错误：`environment file not found`

**原因**：server/.env 不存在

**解决方案**：
```bash
# 生成密钥（本地 Windows）
powershell -ExecutionPolicy Bypass -File gen-keys.ps1 -Domain yourdomain.com

# 上传到服务器
scp server/.env user@server:/opt/topivra/.env

# 验证
ssh user@server "cat /opt/topivra/.env | head -5"
```

---

### 错误：`database connection refused`

**原因**：MySQL 容器未启动或密码错误

**解决方案**：
```bash
# 检查容器状态
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml ps

# 查看 MySQL 日志
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml logs mysql

# 验证环境变量
cat .env | grep DATABASE_URL

# 测试连接
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml exec -T mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} -e "SELECT 1"
```

---

### 错误：`API health check failed`

**原因**：后端服务未启动或配置错误

**解决方案**：
```bash
# 查看后端日志
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml logs -f server

# 检查环境变量
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml exec -T server env | grep NODE_ENV

# 重启后端
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml restart server

# 等待启动后重新检查
sleep 30
curl http://localhost:3001/health/live
```

---

### 错误：`502 Bad Gateway`

**原因**：Nginx 无法连接到后端

**解决方案**：
```bash
# 检查后端是否运行
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml ps server

# 检查 Nginx 日志
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml logs nginx

# 验证 Nginx 配置
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml exec -T nginx nginx -t

# 重启 Nginx
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml restart nginx
```

---

## 环境识别问题

### 问题：开发环境使用了生产配置

**症状**：
- 数据库连接到 docker 内部而不是 localhost
- 无法访问 Swagger 文档
- 性能异常

**解决方案**：
```bash
# 检查 NODE_ENV
echo %NODE_ENV%  # Windows
echo $NODE_ENV   # Linux

# 检查 server/.env
cat server/.env | grep NODE_ENV

# 应该是 development
NODE_ENV=development

# 重启服务
docker-compose -f config/docker-compose.yml down
docker-compose -f config/docker-compose.yml up -d
```

---

### 问题：生产环境使用了开发配置

**症状**：
- 数据库密码是简单密码
- Swagger 文档暴露
- 缺少 SSL 证书

**解决方案**：
```bash
# 检查 NODE_ENV
echo $NODE_ENV

# 应该是 production
NODE_ENV=production

# 检查 .env 文件
cat .env | grep -E "NODE_ENV|JWT_SECRET|ENABLE_SWAGGER"

# 应该是：
# NODE_ENV=production
# JWT_SECRET=STRONG_RANDOM_KEY_64_CHARS
# ENABLE_SWAGGER=false

# 重新生成密钥
powershell -ExecutionPolicy Bypass -File gen-keys.ps1 -Domain yourdomain.com

# 重新部署
bash scripts/deploy/deploy-production.sh
```

---

## 快速诊断命令

### 开发环境

```bash
# 一键诊断
echo === Docker ===
docker --version
docker-compose --version

echo === Containers ===
docker-compose -f config/docker-compose.yml ps

echo === Logs ===
docker-compose -f config/docker-compose.yml logs --tail=20 mysql
docker-compose -f config/docker-compose.yml logs --tail=20 server

echo === Ports ===
netstat -ano | findstr :3001
netstat -ano | findstr :3306
netstat -ano | findstr :5174
```

### 生产环境

```bash
# 一键诊断
bash scripts/deploy/diagnose.sh

# 或手动诊断
echo === Status ===
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml ps

echo === Health Check ===
bash scripts/deploy/health-check.sh

echo === Logs ===
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml logs --tail=50 server
```

---

## 常见问题速查表

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| no configuration file | 路径错误 | 使用 `-f config/docker-compose.yml` |
| port already allocated | 端口占用 | `taskkill /PID <PID> /F` |
| MySQL timeout | 启动缓慢 | 增加等待时间或重启 |
| npm install failed | 网络/依赖 | `npm cache clean --force` |
| Prisma migration failed | 数据库问题 | `npx prisma migrate reset` |
| API health check failed | 后端未启动 | 查看日志，重启服务 |
| 502 Bad Gateway | Nginx 配置 | 检查后端连接 |
| 开发环境用生产配置 | NODE_ENV 错误 | 检查 .env 文件 |

---

**最后更新**：2026-03-12

