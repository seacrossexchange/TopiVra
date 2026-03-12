# TopiVra — 数字账号交易平台

> 安全、可靠的多平台数字账号交易市场，支持 Facebook、Instagram、Telegram、Gmail 等平台账号买卖。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS |
| 后端 | NestJS + TypeScript + Prisma ORM |
| 数据库 | MySQL 8.0 + Redis |
| 认证 | JWT + Google OAuth + 2FA (TOTP) |
| 支付 | USDT / PayPal / Stripe |
| 部署 | Docker Compose + Nginx |
| 监控 | Prometheus + Alertmanager |

---

## 项目结构

```
TopiVra/
├── client/              # React 前端应用
├── server/              # NestJS 后端应用
├── e2e/                 # Playwright 端对端测试
├── config/              # 配置文件（集中管理）
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── docker-compose.monitoring.yml
│   ├── nginx/           # Nginx 配置
│   ├── k8s/             # Kubernetes 配置
│   └── monitoring/      # Prometheus / Alertmanager
├── scripts/             # 运维脚本
│   ├── deploy/          # 部署脚本
│   └── setup/           # 初始化脚本
├── docs/                # 文档
│   ├── COMPLETE-DEPLOYMENT-GUIDE.md
│   ├── ENV-DEVELOPMENT-TEMPLATE.md
│   ├── ENV-PRODUCTION-TEMPLATE.md
│   └── reports/         # 审计报告
└── gen-keys.ps1         # 密钥生成脚本
```

---

## 快速启动

### Windows 本地开发（推荐）

```bash
# 一键启动开发环境
scripts/deploy/START-DEV-WINDOWS.bat
```

访问地址：
- 前端：http://localhost:5174
- 后端：http://localhost:3001
- API 文档：http://localhost:3001/api/v1/docs
- Nginx 代理：http://localhost

### Linux 生产环境

```bash
# 1. 生成密钥（本地 Windows 执行）
powershell -ExecutionPolicy Bypass -File gen-keys.ps1 -Domain yourdomain.com

# 2. 上传 server/.env 到服务器 /opt/topivra/.env

# 3. 部署到生产环境
bash scripts/deploy/deploy-production.sh

# 4. 验证部署
bash scripts/deploy/health-check.sh
```

---

## 部署文档

详细部署指南请参考：

- **完整部署指南**：[docs/COMPLETE-DEPLOYMENT-GUIDE.md](./docs/COMPLETE-DEPLOYMENT-GUIDE.md)
- **开发环境配置**：[docs/ENV-DEVELOPMENT-TEMPLATE.md](./docs/ENV-DEVELOPMENT-TEMPLATE.md)
- **生产环境配置**：[docs/ENV-PRODUCTION-TEMPLATE.md](./docs/ENV-PRODUCTION-TEMPLATE.md)
- **部署工程师审核**：[docs/DEPLOYMENT-ENGINEER-AUDIT.md](./docs/DEPLOYMENT-ENGINEER-AUDIT.md)

### 常用部署命令

```bash
# 查看服务状态
docker compose -f config/docker-compose.yml ps

# 查看日志
docker compose -f config/docker-compose.yml logs -f server

# 备份数据
bash scripts/deploy/backup.sh

# 恢复数据
bash scripts/deploy/restore.sh backups/mysql_backup_*.sql

# 健康检查
bash scripts/deploy/health-check.sh

# 诊断系统
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

## 核心功能

### 买家
- 商品浏览、搜索、筛选
- 购物车与多支付方式结算
- 订单管理与退款申请
- 站内消息 & 工单支持
- 博客阅读

### 卖家
- 商品发布、编辑、上下架
- 订单履约与退款处理
- 财务管理（余额、提现申请）
- 数据统计面板

### 管理员
- 用户 / 卖家 / 商品审核管理
- 订单、退款、工单全局处理
- 财务与提现审批
- SEO 配置（自动推送 Google 索引）
- 实时访客世界地图（24h / 30d 波动）
- 系统配置（支付网关、OAuth、Telegram）
- Prometheus 监控接入

---

## 安全特性

- JWT 认证 + Refresh Token 轮换
- bcrypt 密码加密
- RBAC 角色权限控制
- SQL 注入 / XSS / CSRF 防护
- 接口限流（Rate Limiting）
- 双因素认证（TOTP 2FA）
- 登录失败锁定

---

## 运维命令

```bash
# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f server

# 数据库备份
bash scripts/backup-enhanced.sh

# 防火墙配置
bash scripts/setup-firewall.sh

# SSL 证书配置
bash scripts/ssl-setup.sh
```

---

## 域名 & SSL

域名：`topivra.com`

```
Cloudflare DNS:
  A  @    156.226.168.206  已代理
  A  www  156.226.168.206  已代理
SSL 模式：Flexible
```

---

## 许可证

[MIT License](./LICENSE)

---

**最后更新**：2026-03-11
