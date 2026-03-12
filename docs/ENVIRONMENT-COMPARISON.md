# 生产环境 vs 本地开发环境 - 完整对比与验证

**审核日期**：2026-03-12  
**审核范围**：环境配置、启动流程、E2E 测试、功能验证

---

## 一、环境对比矩阵

### 1.1 核心配置对比

| 配置项 | 开发环境 | 生产环境 | 说明 |
|--------|---------|---------|------|
| NODE_ENV | development | production | 环境标识 |
| 数据库主机 | localhost | docker 内部 mysql | 连接方式 |
| Redis 主机 | localhost | docker 内部 redis | 连接方式 |
| 数据库密码 | root/root | 强随机密码 | 安全性 |
| JWT_SECRET | 开发密钥 | 64+ 字符强密钥 | 安全性 |
| ENABLE_SWAGGER | true | false | API 文档 |
| HTTPS | 否 | 是 | 安全传输 |
| 资源限制 | 无 | 有（CPU、内存） | 性能管理 |
| 日志级别 | 详细 | 优化 | 日志输出 |
| 缓存 | 无 | 启用 | 性能优化 |
| 备份 | 手动 | 自动 | 数据保护 |

### 1.2 启动方式对比

| 项目 | 开发环境 | 生产环境 |
|------|---------|---------|
| 启动脚本 | START-DEV-WINDOWS.bat | deploy-production.sh |
| 配置文件 | config/docker-compose.yml | config/docker-compose.yml + config/docker-compose.prod.yml |
| 自动清理 | ✅ 启用 | ✅ 启用 |
| 数据库初始化 | ✅ 自动 | ✅ 自动 |
| 种子数据 | ✅ 自动 | ✅ 自动 |
| 热重载 | ✅ 支持 | ❌ 不支持 |
| 开发服务器 | ✅ 两个窗口 | ❌ 容器化 |

### 1.3 访问地址对比

| 服务 | 开发环境 | 生产环境 |
|------|---------|---------|
| 前端 | http://localhost:5174 | https://yourdomain.com |
| 后端 API | http://localhost:3001 | https://yourdomain.com/api/v1 |
| API 文档 | http://localhost:3001/api/v1/docs | ❌ 禁用 |
| Nginx 代理 | http://localhost | https://yourdomain.com |
| MySQL | localhost:3306 | docker 内部 |
| Redis | localhost:6379 | docker 内部 |

---

## 二、启动流程详解

### 2.1 Windows 本地开发启动流程

```
执行：scripts/deploy/START-DEV-WINDOWS.bat
    ↓
[Step 1/6] 检查 Docker
    ├─ 验证 Docker 已安装
    ├─ 验证 Docker 正在运行
    └─ ✅ 通过
    ↓
[Step 2a/6] 清理旧容器
    ├─ docker-compose down
    ├─ 删除旧容器
    └─ ✅ 完成
    ↓
[Step 2b/6] 启动 MySQL 和 Redis
    ├─ docker-compose up -d mysql redis
    ├─ 创建网络和卷
    └─ ✅ 启动
    ↓
[Step 3/6] 等待 MySQL 就绪
    ├─ 检查 MySQL 连接
    ├─ 最多等待 60 秒
    └─ ✅ 就绪
    ↓
[Step 4/6] 设置后端
    ├─ cd server
    ├─ npm install（如需要）
    ├─ 生成 .env 文件
    ├─ npx prisma generate
    ├─ 创建数据库
    ├─ npx prisma migrate deploy
    ├─ npx prisma db seed
    └─ ✅ 完成
    ↓
[Step 5/6] 设置前端
    ├─ cd client
    ├─ npm install（如需要）
    ├─ 生成 .env 文件
    └─ ✅ 完成
    ↓
[Step 6/6] 启动开发服务器
    ├─ 启动后端：npm run start:dev（新窗口）
    ├─ 启动前端：npm run dev（新窗口）
    └─ ✅ 运行
    ↓
访问应用
    ├─ 前端：http://localhost:5174
    ├─ 后端：http://localhost:3001
    ├─ API 文档：http://localhost:3001/api/v1/docs
    └─ ✅ 可用
```

### 2.2 Linux 生产环境启动流程

```
执行：bash scripts/deploy/deploy-production.sh
    ↓
前置检查
    ├─ 检查 Docker 已安装
    ├─ 检查 Docker Compose 已安装
    └─ ✅ 通过
    ↓
初始化项目目录
    ├─ mkdir -p /opt/topivra
    ├─ cd /opt/topivra
    └─ ✅ 完成
    ↓
检查环境变量
    ├─ 验证 .env 文件存在
    ├─ 验证必需变量已设置
    └─ ✅ 通过
    ↓
创建必需目录
    ├─ mkdir -p server/uploads server/logs
    ├─ mkdir -p /backup/mysql /backup/redis
    └─ ✅ 完成
    ↓
备份现有数据（如存在）
    ├─ mysqldump 备份
    ├─ 保存到 backups/
    └─ ✅ 完成
    ↓
构建 Docker 镜像
    ├─ docker-compose build server
    ├─ docker-compose build client
    └─ ✅ 完成
    ↓
启动服务
    ├─ docker-compose up -d mysql redis
    ├─ 等待数据库就绪
    ├─ docker-compose up -d
    └─ ✅ 启动
    ↓
数据库迁移
    ├─ npx prisma migrate deploy
    ├─ npx prisma db seed
    └─ ✅ 完成
    ↓
健康检查
    ├─ 检查所有容器状态
    ├─ 检查 API 健康
    └─ ✅ 通过
    ↓
部署完成
    ├─ 前端：https://yourdomain.com
    ├─ 后端：https://yourdomain.com/api/v1
    └─ ✅ 可用
```

---

## 三、环境变量配置

### 3.1 开发环境 (.env)

```bash
# 应用配置
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5174

# 数据库
DATABASE_URL=mysql://root:root@localhost:3306/topivra
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

# JWT 密钥
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production-2024

# 其他
USDT_WALLET_ADDRESS=TTestWalletAddressForDevelopmentOnly123456789
ENABLE_SWAGGER=true
```

### 3.2 生产环境 (.env)

```bash
# 应用配置
NODE_ENV=production
PORT=3001
CLIENT_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

# 数据库（由 gen-keys.ps1 生成）
DATABASE_URL=mysql://topivra_user:STRONG_PASSWORD@mysql:3306/topivra_prod
MYSQL_ROOT_PASSWORD=STRONG_ROOT_PASSWORD
MYSQL_PASSWORD=STRONG_PASSWORD

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=STRONG_PASSWORD
REDIS_URL=redis://:STRONG_PASSWORD@redis:6379

# JWT 密钥（64+ 字符强密钥）
JWT_SECRET=STRONG_RANDOM_KEY_64_CHARS_MINIMUM
JWT_REFRESH_SECRET=STRONG_RANDOM_KEY_64_CHARS_MINIMUM
ENCRYPTION_KEY=STRONG_RANDOM_KEY_32_CHARS_MINIMUM

# 其他
ENABLE_SWAGGER=false
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/v1/auth/google/callback
```

---

## 四、E2E 测试配置

### 4.1 Playwright 配置

**文件**：`e2e/playwright.config.ts`

```typescript
// 基础 URL 配置
baseURL: process.env.BASE_URL || 'http://localhost:5174'

// 浏览器配置
projects: [
  { name: 'chromium', ... },
  { name: 'firefox', ... },
  { name: 'webkit', ... }
]

// 失败时收集证据
screenshot: 'only-on-failure'
video: 'on-first-retry'
trace: 'on-first-retry'
```

### 4.2 开发环境 E2E 测试

```bash
# 1. 启动开发环境
scripts/deploy/START-DEV-WINDOWS.bat

# 2. 等待服务启动（2-3 分钟）

# 3. 运行 E2E 测试
cd e2e
npm install
npx playwright test

# 4. 查看测试报告
npx playwright show-report
```

**测试地址**：`http://localhost:5174`

**测试账号**：
- 管理员：admin@topivra.com / Admin123!
- 卖家：seller@topivra.com / Seller123!
- 买家：buyer@topivra.com / Buyer123!

### 4.3 生产环境 E2E 测试

```bash
# 1. 部署生产环境
bash scripts/deploy/deploy-production.sh

# 2. 等待服务启动（1-2 分钟）

# 3. 运行 E2E 测试（指定生产环境 URL）
cd e2e
BASE_URL=https://yourdomain.com npx playwright test

# 4. 查看测试报告
npx playwright show-report
```

**测试地址**：`https://yourdomain.com`

---

## 五、功能验证清单

### 5.1 开发环境验证

#### 基础功能
- [ ] 前端可访问（http://localhost:5174）
- [ ] 后端 API 可访问（http://localhost:3001）
- [ ] API 文档可访问（http://localhost:3001/api/v1/docs）
- [ ] Nginx 代理可访问（http://localhost）

#### 认证功能
- [ ] 用户注册成功
- [ ] 用户登录成功
- [ ] JWT Token 生成正确
- [ ] Token 刷新正常
- [ ] 登出功能正常

#### 数据库功能
- [ ] MySQL 连接正常
- [ ] Redis 连接正常
- [ ] 数据库迁移成功
- [ ] 种子数据已初始化
- [ ] 数据查询正常

#### 业务功能
- [ ] 商品浏览正常
- [ ] 购物车功能正常
- [ ] 订单创建正常
- [ ] 支付流程正常
- [ ] 消息系统正常

#### E2E 测试
- [ ] 登录测试通过
- [ ] 商品浏览测试通过
- [ ] 购物车测试通过
- [ ] 订单流程测试通过
- [ ] 所有浏览器测试通过

### 5.2 生产环境验证

#### 基础功能
- [ ] 前端可访问（https://yourdomain.com）
- [ ] 后端 API 可访问（https://yourdomain.com/api/v1）
- [ ] API 文档已禁用
- [ ] HTTPS 证书有效
- [ ] Nginx 代理正常

#### 安全功能
- [ ] JWT_SECRET 是强密钥
- [ ] 数据库密码是强密码
- [ ] Redis 密码已设置
- [ ] CORS 配置正确
- [ ] 安全头已启用

#### 性能功能
- [ ] 资源限制已启用
- [ ] 缓存已启用
- [ ] 日志已优化
- [ ] 备份已启用
- [ ] 监控已启用

#### 业务功能
- [ ] 所有开发环境功能正常
- [ ] 性能满足要求
- [ ] 没有错误日志

#### E2E 测试
- [ ] 登录测试通过
- [ ] 商品浏览测试通过
- [ ] 购物车测试通过
- [ ] 订单流程测试通过
- [ ] 所有浏览器测试通过

---

## 六、故障排查

### 6.1 开发环境问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 容器启动失败 | 旧容器未清理 | 脚本自动清理，或手动 `docker-compose down -v` |
| 端口被占用 | 其他进程占用 | `taskkill /PID <PID> /F` |
| 数据库连接失败 | MySQL 未就绪 | 等待或重启 MySQL |
| npm install 失败 | 网络问题 | `npm cache clean --force` |
| E2E 测试失败 | 服务未启动 | 确保开发环境已启动 |

### 6.2 生产环境问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 部署失败 | .env 文件缺失 | 运行 `gen-keys.ps1` 生成 |
| API 无响应 | 后端未启动 | 查看日志，重启服务 |
| 数据库错误 | 连接字符串错误 | 检查 .env 中的 DATABASE_URL |
| HTTPS 错误 | 证书配置错误 | 运行 `ssl-setup.sh` 配置 |
| E2E 测试失败 | 生产环境问题 | 运行 `health-check.sh` 诊断 |

---

## 七、验证命令

### 7.1 开发环境验证

```bash
# 检查容器状态
docker-compose -f config/docker-compose.yml ps

# 检查日志
docker-compose -f config/docker-compose.yml logs -f server

# 测试 API
curl http://localhost:3001/health/live

# 运行 E2E 测试
cd e2e && npx playwright test
```

### 7.2 生产环境验证

```bash
# 检查容器状态
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml ps

# 运行健康检查
bash scripts/deploy/health-check.sh

# 运行诊断
bash scripts/deploy/diagnose.sh

# 运行 E2E 测试
cd e2e && BASE_URL=https://yourdomain.com npx playwright test
```

---

**最后更新**：2026-03-12

