# ============================================================
# TopiVra 开发环境变量模板
# 复制此文件为 .env 并填写相应配置
# ============================================================

# ==================== 应用配置 ====================
NODE_ENV=development
PORT=3001
API_VERSION=v1
API_PREFIX=api/v1

# ==================== 数据库配置 ====================
MYSQL_ROOT_PASSWORD=root
MYSQL_DATABASE=topivra
MYSQL_USER=topivra_dev
MYSQL_PASSWORD=topivra_dev_pass
DATABASE_URL=mysql://topivra_dev:topivra_dev_pass@localhost:3306/topivra

# ==================== Redis 配置 ====================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379

# ==================== JWT 安全密钥 ====================
JWT_SECRET=dev-jwt-secret-key-change-in-production-2024
JWT_REFRESH_SECRET=dev-jwt-refresh-secret-key-change-in-production-2024
ENCRYPTION_KEY=dev-encryption-key-32-chars-min-2024

# ==================== 前端 URL ====================
CLIENT_URL=http://localhost:5174
FRONTEND_URL=http://localhost:5174

# ==================== Google OAuth ====================
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback

# ==================== SMTP 邮件配置 ====================
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@localhost

# ==================== 支付配置 ====================
USDT_WALLET_ADDRESS=
USDT_CALLBACK_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
STRIPE_SECRET_KEY=

# ==================== 监控配置 ====================
SENTRY_DSN=
ENABLE_SWAGGER=true

# ==================== Telegram 配置 ====================
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_NAME=

