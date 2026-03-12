# ============================================================
# TopiVra 生产环境变量模板
# 复制此文件为 .env 并填写真实配置
# WARNING: 不要提交此文件到版本控制系统！
# ============================================================

# ==================== 应用配置 ====================
NODE_ENV=production
PORT=3001
API_VERSION=v1
API_PREFIX=api/v1

# ==================== 数据库配置 ====================
# 使用强密码！最少 16 个字符，包含大小写字母、数字、特殊符号
MYSQL_ROOT_PASSWORD=ChangeMe_StrongPassword123!
MYSQL_DATABASE=topivra_prod
MYSQL_USER=topivra_user
MYSQL_PASSWORD=ChangeMe_StrongPassword456!
DATABASE_URL=mysql://topivra_user:ChangeMe_StrongPassword456!@mysql:3306/topivra_prod

# ==================== Redis 配置 ====================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=ChangeMe_StrongPassword789!
REDIS_URL=redis://:ChangeMe_StrongPassword789!@redis:6379

# ==================== JWT 安全密钥 ====================
# 使用强随机密钥！最少 64 个字符
JWT_SECRET=ChangeMe_GenerateStrongRandomKey_MinimumLength64Characters_Part1
JWT_REFRESH_SECRET=ChangeMe_GenerateStrongRandomKey_MinimumLength64Characters_Part2
ENCRYPTION_KEY=ChangeMe_32CharacterEncryptionKey

# ==================== 前端 URL ====================
CLIENT_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

# ==================== Google OAuth ====================
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/v1/auth/google/callback

# ==================== SMTP 邮件配置 ====================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# ==================== 支付配置 ====================
USDT_WALLET_ADDRESS=your-usdt-wallet-address
USDT_CALLBACK_SECRET=your-usdt-callback-secret
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
STRIPE_SECRET_KEY=your-stripe-secret-key

# ==================== 监控配置 ====================
SENTRY_DSN=your-sentry-dsn
ENABLE_SWAGGER=false

# ==================== Telegram 配置 ====================
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_BOT_NAME=your-telegram-bot-name

