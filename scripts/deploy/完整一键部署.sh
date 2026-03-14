#!/bin/bash
# ============================================================================
# TopiVra 完整一键部署脚本 - 复制整个脚本到服务器终端执行
# ============================================================================

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         TopiVra 完整一键部署脚本                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ========================================
# 配置变量
# ========================================
GIT_REPO="https://github.com/seacrossexchange/TopiVra.git"
DOMAIN="topivra.com"
DEPLOY_DIR="/var/www/topivra"
LOG_DIR="/var/log/topivra"
DB_NAME="topivra"
DB_USER="topivra_user"
DB_PASSWORD="TopiVra@2024"
JWT_SECRET=$(openssl rand -base64 32)

echo "配置信息:"
echo "  域名: ${DOMAIN}"
echo "  部署目录: ${DEPLOY_DIR}"
echo "  数据库: ${DB_NAME}"
echo "  数据库用户: ${DB_USER}"
echo "  数据库密码: ${DB_PASSWORD}"
echo ""

# ========================================
# 阶段1: 系统环境准备
# ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "【阶段1/7】系统环境准备"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

export DEBIAN_FRONTEND=noninteractive

echo "► 更新系统包..."
apt update -qq
apt upgrade -y -qq

# 安装Node.js 20
if ! command -v node &> /dev/null; then
    echo "► 安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo "✓ Node.js: $(node --version)"

# 安装MySQL
if ! command -v mysql &> /dev/null; then
    echo "► 安装 MySQL..."
    apt install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
fi
echo "✓ MySQL: $(mysql --version | cut -d' ' -f4)"

# 安装Redis
if ! command -v redis-server &> /dev/null; then
    echo "► 安装 Redis..."
    apt install -y redis-server
    systemctl start redis-server
    systemctl enable redis-server
fi
echo "✓ Redis: $(redis-cli ping)"

# 安装Nginx
if ! command -v nginx &> /dev/null; then
    echo "► 安装 Nginx..."
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi
echo "✓ Nginx: $(nginx -v 2>&1 | cut -d'/' -f2)"

# 安装Git和工具
apt install -y git curl unzip

# 安装PM2
if ! command -v pm2 &> /dev/null; then
    echo "► 安装 PM2..."
    npm install -g pm2
fi
echo "✓ PM2: $(pm2 --version)"

# 安装Certbot
apt install -y certbot python3-certbot-nginx

echo "✓ 系统环境准备完成"

# ========================================
# 阶段2: 数据库配置
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "【阶段2/7】数据库配置"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "► 创建数据库和用户..."

# 删除旧用户（如果存在）
mysql -u root -e "DROP USER IF EXISTS '${DB_USER}'@'localhost';" 2>/dev/null || true

# 创建数据库和用户
mysql -u root << EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

# 验证数据库连接
if mysql -u ${DB_USER} -p${DB_PASSWORD} -e "USE ${DB_NAME};" 2>/dev/null; then
    echo "✓ 数据库配置成功"
else
    echo "✗ 数据库配置失败"
    exit 1
fi

# ========================================
# 阶段3: 克隆代码
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "【阶段3/7】克隆代码"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 清理旧代码
rm -rf ${DEPLOY_DIR}
mkdir -p ${DEPLOY_DIR}
mkdir -p ${LOG_DIR}

cd ${DEPLOY_DIR}

echo "► 克隆代码仓库..."
git clone ${GIT_REPO} .
echo "✓ 代码克隆完成"

# ========================================
# 阶段4: 配置环境变量
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "【阶段4/7】配置环境变量"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cat > ${DEPLOY_DIR}/server/.env << EOF
NODE_ENV=production
PORT=8000

# 数据库配置
DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@localhost:3306/${DB_NAME}"

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT配置
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# CORS配置
CORS_ORIGIN=https://${DOMAIN}

# 文件上传配置
UPLOAD_DIR=/var/www/topivra/uploads
MAX_FILE_SIZE=10485760
EOF

echo "✓ 环境变量配置完成"

# ========================================
# 阶段5: 安装依赖并构建
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "【阶段5/7】安装依赖并构建"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 后端
echo "► 安装后端依赖..."
cd ${DEPLOY_DIR}/server
npm install --production --ignore-engines

echo "► 运行数据库迁移..."
npx prisma migrate deploy
npx prisma generate

echo "► 构建后端..."
npm run build
echo "✓ 后端构建完成"

# 前端
echo "► 安装前端依赖..."
cd ${DEPLOY_DIR}/client
npm install --ignore-engines

echo "► 构建前端..."
npm run build
echo "✓ 前端构建完成"

# ========================================
# 阶段6: 配置Nginx
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "【阶段6/7】配置Nginx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cat > /etc/nginx/sites-available/topivra << 'NGINX_CONF'
upstream api_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER _;
    root DEPLOY_DIR_PLACEHOLDER/client/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_CONF

# 替换变量
sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" /etc/nginx/sites-available/topivra
sed -i "s|DEPLOY_DIR_PLACEHOLDER|${DEPLOY_DIR}|g" /etc/nginx/sites-available/topivra

ln -sf /etc/nginx/sites-available/topivra /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "✓ Nginx配置完成"

# ========================================
# 阶段7: 启动应用
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "【阶段7/7】启动应用"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

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
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
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

echo "✓ 应用启动完成"

# ========================================
# 防火墙配置
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "【防火墙配置】"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo "y" | ufw enable || true
    echo "✓ 防火墙配置完成"
fi

# ========================================
# 部署验证
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "【部署验证】"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

sleep 3

echo ""
echo "服务状态:"
echo "  ├─ MySQL:  $(systemctl is-active mysql)"
echo "  ├─ Redis:  $(systemctl is-active redis-server)"
echo "  ├─ Nginx:  $(systemctl is-active nginx)"
echo "  └─ PM2:    $(pm2 jlist 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 | tr -d '"' || echo 'running')"

# 获取服务器IP
SERVER_IP=$(curl -s ifconfig.me)

echo ""
echo "应用健康检查:"
sleep 2
if curl -s http://localhost:8000/api/health >/dev/null 2>&1; then
    echo "  └─ API: 健康 ✓"
else
    echo "  └─ API: 启动中..."
fi

if curl -s http://localhost >/dev/null 2>&1; then
    echo "  └─ Web: 正常 ✓"
else
    echo "  └─ Web: 检查中..."
fi

# ========================================
# 部署完成
# ========================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  🎉 部署完成!                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "【访问地址】"
echo "  http://${SERVER_IP}"
echo "  http://${DOMAIN}"
echo ""
echo "【后续步骤】"
echo "1. 配置SSL证书:"
echo "   certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo ""
echo "2. 配置支付和邮件:"
echo "   nano ${DEPLOY_DIR}/server/.env"
echo "   pm2 restart topivra-api"
echo ""
echo "【常用命令】"
echo "  查看日志: pm2 logs topivra-api"
echo "  重启应用: pm2 restart topivra-api"
echo "  查看状态: pm2 status"
echo ""
echo "【数据库信息】"
echo "  Database: ${DB_NAME}"
echo "  User: ${DB_USER}"
echo "  Password: ${DB_PASSWORD}"
echo ""