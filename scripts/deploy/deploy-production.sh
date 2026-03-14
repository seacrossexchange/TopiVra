#!/bin/bash
# TopiVra 生产环境部署脚本
# 用法: ./deploy-production.sh

set -e

echo "=========================================="
echo "TopiVra 生产环境部署脚本"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    log_warn "建议使用root用户执行此脚本"
fi

# ==========================================
# 阶段1: 系统环境准备
# ==========================================
echo ""
echo "========== 阶段1: 系统环境准备 =========="

log_info "更新系统包..."
if command -v apt-get &> /dev/null; then
    apt update && apt upgrade -y
elif command -v yum &> /dev/null; then
    yum update -y
else
    log_error "不支持的系统"
    exit 1
fi

log_info "检查并安装必要软件..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    log_info "安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
log_info "Node.js 版本: $(node --version)"

# 检查npm
if ! command -v npm &> /dev/null; then
    log_info "安装 npm..."
    apt install -y npm
fi
log_info "npm 版本: $(npm --version)"

# 检查MySQL
if ! command -v mysql &> /dev/null; then
    log_info "安装 MySQL..."
    apt install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
fi
log_info "MySQL 版本: $(mysql --version)"

# 检查Redis
if ! command -v redis-server &> /dev/null; then
    log_info "安装 Redis..."
    apt install -y redis-server
    systemctl start redis
    systemctl enable redis
fi
log_info "Redis 状态: $(redis-cli ping)"

# 检查Nginx
if ! command -v nginx &> /dev/null; then
    log_info "安装 Nginx..."
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi
log_info "Nginx 版本: $(nginx -v 2>&1)"

# 检查Git
if ! command -v git &> /dev/null; then
    log_info "安装 Git..."
    apt install -y git
fi
log_info "Git 版本: $(git --version)"

# 安装PM2
if ! command -v pm2 &> /dev/null; then
    log_info "安装 PM2..."
    npm install -g pm2
fi
log_info "PM2 版本: $(pm2 --version)"

# 安装Certbot
if ! command -v certbot &> /dev/null; then
    log_info "安装 Certbot..."
    apt install -y certbot python3-certbot-nginx
fi

# ==========================================
# 阶段2: 数据库配置
# ==========================================
echo ""
echo "========== 阶段2: 数据库配置 =========="

# 提示输入数据库密码
read -sp "请输入MySQL root密码 (直接回车跳过，使用空密码): " MYSQL_ROOT_PASS
echo ""
read -sp "请输入TopiVra数据库用户密码: " DB_PASSWORD
echo ""

# 配置MySQL
log_info "配置MySQL数据库..."

# 创建数据库和用户
mysql -u root ${MYSQL_ROOT_PASS:+-p$MYSQL_ROOT_PASS} << EOF
CREATE DATABASE IF NOT EXISTS topivra CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'topivra_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON topivra.* TO 'topivra_user'@'localhost';
FLUSH PRIVILEGES;
EOF

log_info "验证数据库连接..."
mysql -u topivra_user -p${DB_PASSWORD} -e "SHOW DATABASES;" && log_info "数据库连接成功" || log_error "数据库连接失败"

# 配置Redis密码
read -sp "请输入Redis密码 (可选，直接回车跳过): " REDIS_PASSWORD
echo ""

if [ -n "$REDIS_PASSWORD" ]; then
    log_info "配置Redis密码..."
    sed -i "s/# requirepass.*/requirepass ${REDIS_PASSWORD}/" /etc/redis/redis.conf
    systemctl restart redis
    redis-cli -a ${REDIS_PASSWORD} ping && log_info "Redis配置成功" || log_error "Redis配置失败"
fi

# ==========================================
# 阶段3: 部署应用代码
# ==========================================
echo ""
echo "========== 阶段3: 部署应用代码 =========="

DEPLOY_DIR="/var/www/topivra"

log_info "创建部署目录..."
mkdir -p ${DEPLOY_DIR}
mkdir -p /var/log/topivra

log_info "请选择代码部署方式:"
echo "1. 从Git克隆 (推荐)"
echo "2. 从本地上传"
read -p "请选择 (1/2): " DEPLOY_METHOD

if [ "$DEPLOY_METHOD" == "1" ]; then
    read -p "请输入Git仓库地址: " GIT_REPO
    cd ${DEPLOY_DIR}
    if [ -d ".git" ]; then
        log_info "拉取最新代码..."
        git pull
    else
        log_info "克隆代码仓库..."
        git clone ${GIT_REPO} .
    fi
else
    log_info "请手动上传代码到 ${DEPLOY_DIR}"
    read -p "上传完成后按回车继续..."
fi

# 配置环境变量
log_info "配置环境变量..."
read -p "请输入域名 (如 topivra.com): " DOMAIN
read -p "请输入API域名 (如 api.topivra.com): " API_DOMAIN

JWT_SECRET=$(openssl rand -base64 32)

cat > ${DEPLOY_DIR}/server/.env << EOF
NODE_ENV=production
PORT=8000

# 数据库
DATABASE_URL="mysql://topivra_user:${DB_PASSWORD}@localhost:3306/topivra"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
EOF

if [ -n "$REDIS_PASSWORD" ]; then
    echo "REDIS_PASSWORD=${REDIS_PASSWORD}" >> ${DEPLOY_DIR}/server/.env
fi

cat >> ${DEPLOY_DIR}/server/.env << EOF

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://${DOMAIN}

# 文件上传
UPLOAD_DIR=/var/www/topivra/uploads
MAX_FILE_SIZE=10485760
EOF

# 提示配置支付和邮件
echo ""
log_warn "请手动配置以下环境变量:"
echo "  - STRIPE_SECRET_KEY"
echo "  - PAYPAL_CLIENT_ID"
echo "  - PAYPAL_SECRET"
echo "  - SMTP配置"
read -p "配置完成后按回车继续..."

# 安装依赖
log_info "安装后端依赖..."
cd ${DEPLOY_DIR}/server
npm ci --production

log_info "安装前端依赖..."
cd ${DEPLOY_DIR}/client
npm ci

# 构建前端
log_info "构建前端..."
cd ${DEPLOY_DIR}/client
npm run build

# 运行数据库迁移
log_info "运行数据库迁移..."
cd ${DEPLOY_DIR}/server
npx prisma migrate deploy
npx prisma generate

# 构建后端
log_info "构建后端..."
cd ${DEPLOY_DIR}/server
npm run build

# ==========================================
# 阶段4: 配置Nginx
# ==========================================
echo ""
echo "========== 阶段4: 配置Nginx =========="

log_info "创建Nginx配置..."

cat > /etc/nginx/sites-available/topivra << EOF
# API服务器
upstream api_backend {
    server 127.0.0.1:8000;
}

# 主站
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN} ${API_DOMAIN};

    # 前端静态文件
    root ${DEPLOY_DIR}/client/dist;
    index index.html;

    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 前端路由
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket支持
    location /socket.io {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

log_info "启用Nginx配置..."
ln -sf /etc/nginx/sites-available/topivra /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

log_info "测试Nginx配置..."
nginx -t && systemctl reload nginx && log_info "Nginx配置成功" || log_error "Nginx配置失败"

# ==========================================
# 阶段5: 启动应用
# ==========================================
echo ""
echo "========== 阶段5: 启动应用 =========="

log_info "创建PM2配置..."

cat > ${DEPLOY_DIR}/server/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'topivra-api',
    script: 'dist/main.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/topivra/api-error.log',
    out_file: '/var/log/topivra/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
EOF

log_info "启动应用..."
cd ${DEPLOY_DIR}/server
pm2 start ecosystem.config.js
pm2 save
pm2 startup | bash

log_info "应用状态:"
pm2 status

# ==========================================
# 阶段6: SSL证书配置
# ==========================================
echo ""
echo "========== 阶段6: SSL证书配置 =========="

read -p "是否配置SSL证书? (y/n): " CONFIGURE_SSL

if [ "$CONFIGURE_SSL" == "y" ]; then
    log_info "获取SSL证书..."
    certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} || {
        log_warn "自动获取证书失败，请手动运行: certbot --nginx -d ${DOMAIN}"
    }
fi

# ==========================================
# 阶段7: 防火墙配置
# ==========================================
echo ""
echo "========== 阶段7: 防火墙配置 =========="

if command -v ufw &> /dev/null; then
    log_info "配置UFW防火墙..."
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo "y" | ufw enable
    ufw status
else
    log_warn "未检测到UFW，请手动配置防火墙"
fi

# ==========================================
# 部署验证
# ==========================================
echo ""
echo "========== 部署验证 =========="

log_info "服务状态检查:"
echo "MySQL: $(systemctl is-active mysql)"
echo "Redis: $(systemctl is-active redis)"
echo "Nginx: $(systemctl is-active nginx)"
echo "PM2: $(pm2 jlist | grep -o '"status":"[^"]*"' | head -1)"

echo ""
log_info "端口检查:"
netstat -tulpn | grep -E ':(80|443|8000|3306|6379)' || ss -tulpn | grep -E ':(80|443|8000|3306|6379)'

echo ""
log_info "应用健康检查:"
curl -s http://localhost:8000/api/health && echo " - API健康检查通过" || echo " - API健康检查失败"

echo ""
echo "=========================================="
echo -e "${GREEN}部署完成!${NC}"
echo "=========================================="
echo ""
echo "访问地址: https://${DOMAIN}"
echo ""
echo "常用命令:"
echo "  查看日志: pm2 logs topivra-api"
echo "  重启应用: pm2 restart topivra-api"
echo "  查看状态: pm2 status"
echo ""
echo "数据库连接信息:"
echo "  Host: localhost"
echo "  Database: topivra"
echo "  User: topivra_user"
echo "  Password: ${DB_PASSWORD}"
echo ""