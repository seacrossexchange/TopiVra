#!/bin/bash
# ============================================================================
# TopiVra 继续部署脚本 - 在服务器上执行
# ============================================================================
# 
# 执行方式: 复制整个脚本内容，粘贴到服务器终端
#
# ============================================================================

set -e

LOG_FILE="/var/log/topivra-deploy.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "=========================================="
log "TopiVra 继续部署"
log "=========================================="

# 配置变量
GIT_REPO="https://github.com/seacrossexchange/TopiVra.git"
DOMAIN="topivra.com"
DEPLOY_DIR="/var/www/topivra"
LOG_DIR="/var/log/topivra"
DB_PASSWORD="TopiVra@2024"
JWT_SECRET=$(openssl rand -base64 32)

# ========================================
# 清理并重新克隆代码
# ========================================
log ""
log "========== 克隆代码 =========="

# 清理旧代码
rm -rf ${DEPLOY_DIR}
mkdir -p ${DEPLOY_DIR}
mkdir -p ${LOG_DIR}

cd ${DEPLOY_DIR}

# 克隆公开仓库
log "克隆代码仓库..."
git clone ${GIT_REPO} .
log "代码克隆完成"

# ========================================
# 创建环境变量
# ========================================
log ""
log "========== 配置环境变量 =========="

cat > ${DEPLOY_DIR}/server/.env << EOF
NODE_ENV=production
PORT=8000
DATABASE_URL="mysql://topivra_user:${DB_PASSWORD}@localhost:3306/topivra"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://${DOMAIN}
UPLOAD_DIR=/var/www/topivra/uploads
MAX_FILE_SIZE=10485760
EOF

log "环境变量配置完成"
log "数据库密码: ${DB_PASSWORD}"

# ========================================
# 安装后端依赖并构建
# ========================================
log ""
log "========== 后端构建 =========="

log "安装后端依赖..."
cd ${DEPLOY_DIR}/server
npm ci --production

log "运行数据库迁移..."
npx prisma migrate deploy
npx prisma generate

log "构建后端..."
npm run build

log "后端构建完成"

# ========================================
# 安装前端依赖并构建
# ========================================
log ""
log "========== 前端构建 =========="

log "安装前端依赖..."
cd ${DEPLOY_DIR}/client
npm ci

log "构建前端..."
npm run build

log "前端构建完成"

# ========================================
# 配置Nginx
# ========================================
log ""
log "========== 配置Nginx =========="

cat > /etc/nginx/sites-available/topivra << EOF
upstream api_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN} _;
    root ${DEPLOY_DIR}/client/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }

    location /socket.io {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf /etc/nginx/sites-available/topivra /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

log "Nginx配置完成"

# ========================================
# 启动应用
# ========================================
log ""
log "========== 启动应用 =========="

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

log "应用启动完成"

# ========================================
# 防火墙配置
# ========================================
log ""
log "========== 防火墙配置 =========="

if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo "y" | ufw enable || true
    log "防火墙配置完成"
fi

# ========================================
# 部署验证
# ========================================
log ""
log "========== 部署验证 =========="

sleep 3

log "服务状态:"
log "  MySQL: $(systemctl is-active mysql)"
log "  Redis: $(systemctl is-active redis-server)"
log "  Nginx: $(systemctl is-active nginx)"
log "  PM2: $(pm2 jlist 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 || echo 'running')"

# 获取服务器IP
SERVER_IP=$(curl -s ifconfig.me)

# 健康检查
log ""
log "应用健康检查:"
if curl -s http://localhost:8000/api/health >/dev/null 2>&1; then
    log "  API: 健康 ✓"
else
    log "  API: 检查中..."
fi

if curl -s http://localhost >/dev/null 2>&1; then
    log "  Web: 正常 ✓"
else
    log "  Web: 检查中..."
fi

# ========================================
# 部署完成
# ========================================
log ""
log "=========================================="
log "部署完成!"
log "=========================================="
log ""
log "访问地址: http://${SERVER_IP}"
log "域名访问: http://${DOMAIN}"
log ""
log "后续步骤:"
log "1. 配置SSL证书:"
log "   certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
log ""
log "2. 配置支付和邮件:"
log "   nano ${DEPLOY_DIR}/server/.env"
log "   pm2 restart topivra-api"
log ""
log "常用命令:"
log "  查看日志: pm2 logs topivra-api"
log "  重启应用: pm2 restart topivra-api"
log "  查看状态: pm2 status"
log ""
log "数据库信息:"
log "  Database: topivra"
log "  User: topivra_user"
log "  Password: ${DB_PASSWORD}"
log ""