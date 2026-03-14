#!/bin/bash
# TopiVra 一键部署脚本
# 直接在服务器上执行: curl -fsSL https://raw.githubusercontent.com/seacrossexchange/TopiVra/main/scripts/deploy/one-click-deploy.sh | bash
# 或者: wget -qO- https://raw.githubusercontent.com/seacrossexchange/TopiVra/main/scripts/deploy/one-click-deploy.sh | bash

set -e

# ==========================================
# 配置变量 (请修改以下变量)
# ==========================================
GIT_REPO="https://github.com/seacrossexchange/TopiVra.git"
DOMAIN="topivra.com"
DB_PASSWORD=""  # 留空将在运行时提示
REDIS_PASSWORD=""  # 留空则不设置密码
JWT_SECRET=""  # 留空将自动生成

# ==========================================
# 颜色定义
# ==========================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# ==========================================
# 开始部署
# ==========================================
clear
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     TopiVra 生产环境一键部署脚本         ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 检查root权限
if [ "$EUID" -ne 0 ]; then
    log_error "请使用root用户执行此脚本"
    exit 1
fi

# 获取配置信息
if [ -z "$DOMAIN" ]; then
    read -p "请输入域名 (如 topivra.com): " DOMAIN
fi

if [ -z "$DB_PASSWORD" ]; then
    read -sp "请输入数据库密码: " DB_PASSWORD
    echo ""
fi

if [ -z "$REDIS_PASSWORD" ]; then
    read -sp "请输入Redis密码 (直接回车跳过): " REDIS_PASSWORD
    echo ""
fi

if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
fi

DEPLOY_DIR="/var/www/topivra"
LOG_DIR="/var/log/topivra"

# ==========================================
# 阶段1: 系统环境准备
# ==========================================
echo ""
log_step "阶段1: 系统环境准备"
echo "─────────────────────────────────────────"

log_info "更新系统包..."
export DEBIAN_FRONTEND=noninteractive
apt update -qq
apt upgrade -y -qq

# 安装Node.js 20
if ! command -v node &> /dev/null; then
    log_info "安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt install -y nodejs >/dev/null 2>&1
fi
log_info "Node.js: $(node --version)"

# 安装MySQL
if ! command -v mysql &> /dev/null; then
    log_info "安装 MySQL..."
    apt install -y mysql-server >/dev/null 2>&1
    systemctl start mysql
    systemctl enable mysql
fi
log_info "MySQL: $(mysql --version | cut -d' ' -f4)"

# 安装Redis
if ! command -v redis-server &> /dev/null; then
    log_info "安装 Redis..."
    apt install -y redis-server >/dev/null 2>&1
    systemctl start redis
    systemctl enable redis
fi
log_info "Redis: $(redis-cli ping)"

# 安装Nginx
if ! command -v nginx &> /dev/null; then
    log_info "安装 Nginx..."
    apt install -y nginx >/dev/null 2>&1
    systemctl start nginx
    systemctl enable nginx
fi
log_info "Nginx: $(nginx -v 2>&1 | cut -d'/' -f2)"

# 安装其他工具
apt install -y git curl unzip >/dev/null 2>&1

# 安装PM2
if ! command -v pm2 &> /dev/null; then
    log_info "安装 PM2..."
    npm install -g pm2 >/dev/null 2>&1
fi
log_info "PM2: $(pm2 --version)"

# 安装Certbot
if ! command -v certbot &> /dev/null; then
    log_info "安装 Certbot..."
    apt install -y certbot python3-certbot-nginx >/dev/null 2>&1
fi

log_info "环境准备完成 ✓"

# ==========================================
# 阶段2: 数据库配置
# ==========================================
echo ""
log_step "阶段2: 数据库配置"
echo "─────────────────────────────────────────"

# 创建数据库
log_info "创建数据库..."
mysql -u root << EOF
CREATE DATABASE IF NOT EXISTS topivra CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'topivra_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON topivra.* TO 'topivra_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# 验证数据库连接
if mysql -u topivra_user -p${DB_PASSWORD} -e "USE topivra;" 2>/dev/null; then
    log_info "数据库配置成功 ✓"
else
    log_error "数据库配置失败"
    exit 1
fi

# 配置Redis密码
if [ -n "$REDIS_PASSWORD" ]; then
    log_info "配置Redis密码..."
    sed -i "s/# requirepass.*/requirepass ${REDIS_PASSWORD}/" /etc/redis/redis.conf
    systemctl restart redis
fi
log_info "Redis配置完成 ✓"

# ==========================================
# 阶段3: 部署应用代码
# ==========================================
echo ""
log_step "阶段3: 部署应用代码"
echo "─────────────────────────────────────────"

# 创建目录
mkdir -p ${DEPLOY_DIR}
mkdir -p ${LOG_DIR}

# 克隆代码
cd ${DEPLOY_DIR}
if [ -d ".git" ]; then
    log_info "拉取最新代码..."
    git fetch --all
    git reset --hard origin/main
else
    log_info "克隆代码仓库..."
    git clone ${GIT_REPO} .
fi

# 创建环境变量文件
log_info "配置环境变量..."
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

# 安装后端依赖
log_info "安装后端依赖..."
cd ${DEPLOY_DIR}/server
npm ci --production --silent 2>/dev/null || npm ci --production

# 运行数据库迁移
log_info "运行数据库迁移..."
npx prisma migrate deploy --silent 2>/dev/null || npx prisma migrate deploy
npx prisma generate --silent 2>/dev/null || npx prisma generate

# 构建后端
log_info "构建后端..."
npm run build

# 安装前端依赖
log_info "安装前端依赖..."
cd ${DEPLOY_DIR}/client
npm ci --silent 2>/dev/null || npm ci

# 构建前端
log_info "构建前端..."
npm run build

log_info "应用代码部署完成 ✓"

# ==========================================
# 阶段4: 配置Nginx
# ==========================================
echo ""
log_step "阶段4: 配置Nginx"
echo "─────────────────────────────────────────"

cat > /etc/nginx/sites-available/topivra << EOF
# API服务器
upstream api_backend {
    server 127.0.0.1:8000;
}

# 主站
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

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

ln -sf /etc/nginx/sites-available/topivra /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx
log_info "Nginx配置完成 ✓"

# ==========================================
# 阶段5: 启动应用
# ==========================================
echo ""
log_step "阶段5: 启动应用"
echo "─────────────────────────────────────────"

cat > ${DEPLOY_DIR}/server/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'topivra-api',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '${LOG_DIR}/api-error.log',
    out_file: '${LOG_DIR}/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
EOF

cd ${DEPLOY_DIR}/server

# 停止旧进程
pm2 delete topivra-api 2>/dev/null || true

# 启动新进程
pm2 start ecosystem.config.js
pm2 save

# 设置开机启动
pm2_startup=$(pm2 startup 2>&1 | grep -oP 'sudo \K.*' | head -1)
if [ -n "$pm2_startup" ]; then
    eval "$pm2_startup" 2>/dev/null || true
fi

log_info "应用启动完成 ✓"

# ==========================================
# 阶段6: 防火墙配置
# ==========================================
echo ""
log_step "阶段6: 防火墙配置"
echo "─────────────────────────────────────────"

if command -v ufw &> /dev/null; then
    ufw allow 22/tcp >/dev/null 2>&1
    ufw allow 80/tcp >/dev/null 2>&1
    ufw allow 443/tcp >/dev/null 2>&1
    echo "y" | ufw enable >/dev/null 2>&1
    log_info "防火墙配置完成 ✓"
else
    log_warn "未检测到UFW，跳过防火墙配置"
fi

# ==========================================
# 部署验证
# ==========================================
echo ""
log_step "部署验证"
echo "─────────────────────────────────────────"

echo ""
echo "服务状态:"
echo "  ├─ MySQL:  $(systemctl is-active mysql)"
echo "  ├─ Redis:  $(systemctl is-active redis)"
echo "  ├─ Nginx:  $(systemctl is-active nginx)"
echo "  └─ PM2:    $(pm2 jlist 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 | tr -d '"')"

echo ""
log_info "应用健康检查:"
if curl -s http://localhost:8000/api/health >/dev/null 2>&1; then
    echo "  └─ API: 健康 ✓"
else
    echo "  └─ API: 检查中..."
fi

if curl -s http://localhost >/dev/null 2>&1; then
    echo "  └─ Web: 正常 ✓"
else
    echo "  └─ Web: 检查中..."
fi

# ==========================================
# 部署完成
# ==========================================
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║           🎉 部署完成!                   ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "访问地址: http://${DOMAIN}"
echo ""
echo "后续步骤:"
echo "  1. 配置SSL证书:"
echo "     certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo ""
echo "  2. 配置支付和邮件 (编辑环境变量):"
echo "     nano ${DEPLOY_DIR}/server/.env"
echo "     pm2 restart topivra-api"
echo ""
echo "常用命令:"
echo "  查看日志: pm2 logs topivra-api"
echo "  重启应用: pm2 restart topivra-api"
echo "  查看状态: pm2 status"
echo ""
echo "数据库信息:"
echo "  Host: localhost"
echo "  Database: topivra"
echo "  User: topivra_user"
echo "  Password: ${DB_PASSWORD}"
echo ""