# 🚀 TopiVra 生产环境部署指南

## 服务器信息

- **IP**: 156.226.168.206
- **SSH端口**: 22
- **用户**: root
- **密码**: XBLc!1TmD1u8d02q9O

---

## 方式一: 手动部署 (推荐)

### 步骤1: 连接服务器

打开命令提示符或PowerShell，执行：

```bash
ssh root@156.226.168.206
```

输入密码: `XBLc!1TmD1u8d02q9O`

### 步骤2: 执行部署脚本

连接成功后，直接粘贴以下完整命令执行：

```bash
curl -fsSL https://raw.githubusercontent.com/seacrossexchange/TopiVra/main/scripts/deploy/one-click-deploy.sh | bash
```

或者如果GitHub不可用，手动创建脚本：

```bash
cat > /tmp/deploy.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

echo "=========================================="
echo "TopiVra 生产环境一键部署脚本"
echo "=========================================="

# 配置变量
GIT_REPO="https://github.com/seacrossexchange/TopiVra.git"
DOMAIN="topivra.com"
DEPLOY_DIR="/var/www/topivra"
LOG_DIR="/var/log/topivra"

# 获取密码
read -sp "请输入数据库密码: " DB_PASSWORD
echo ""
read -sp "请输入Redis密码 (直接回车跳过): " REDIS_PASSWORD
echo ""

# 生成JWT密钥
JWT_SECRET=$(openssl rand -base64 32)

# 阶段1: 系统环境准备
echo ""
echo "========== 阶段1: 系统环境准备 =========="

export DEBIAN_FRONTEND=noninteractive
apt update -qq
apt upgrade -y -qq

# 安装Node.js 20
if ! command -v node &> /dev/null; then
    echo "安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt install -y nodejs >/dev/null 2>&1
fi
echo "Node.js: $(node --version)"

# 安装MySQL
if ! command -v mysql &> /dev/null; then
    echo "安装 MySQL..."
    apt install -y mysql-server >/dev/null 2>&1
    systemctl start mysql
    systemctl enable mysql
fi
echo "MySQL: $(mysql --version | cut -d' ' -f4)"

# 安装Redis
if ! command -v redis-server &> /dev/null; then
    echo "安装 Redis..."
    apt install -y redis-server >/dev/null 2>&1
    systemctl start redis
    systemctl enable redis
fi
echo "Redis: $(redis-cli ping)"

# 安装Nginx
if ! command -v nginx &> /dev/null; then
    echo "安装 Nginx..."
    apt install -y nginx >/dev/null 2>&1
    systemctl start nginx
    systemctl enable nginx
fi
echo "Nginx: $(nginx -v 2>&1 | cut -d'/' -f2)"

# 安装PM2
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2 >/dev/null 2>&1
fi
echo "PM2: $(pm2 --version)"

# 安装Certbot
apt install -y certbot python3-certbot-nginx >/dev/null 2>&1

# 阶段2: 数据库配置
echo ""
echo "========== 阶段2: 数据库配置 =========="

mysql -u root << EOF
CREATE DATABASE IF NOT EXISTS topivra CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'topivra_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON topivra.* TO 'topivra_user'@'localhost';
FLUSH PRIVILEGES;
EOF

if [ -n "$REDIS_PASSWORD" ]; then
    sed -i "s/# requirepass.*/requirepass ${REDIS_PASSWORD}/" /etc/redis/redis.conf
    systemctl restart redis
fi

echo "数据库配置完成"

# 阶段3: 部署应用代码
echo ""
echo "========== 阶段3: 部署应用代码 =========="

mkdir -p ${DEPLOY_DIR}
mkdir -p ${LOG_DIR}

cd ${DEPLOY_DIR}
if [ -d ".git" ]; then
    git fetch --all
    git reset --hard origin/main
else
    git clone ${GIT_REPO} .
fi

# 创建环境变量
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

if [ -n "$REDIS_PASSWORD" ]; then
    echo "REDIS_PASSWORD=${REDIS_PASSWORD}" >> ${DEPLOY_DIR}/server/.env
fi

# 安装依赖
cd ${DEPLOY_DIR}/server
npm ci --production
npx prisma migrate deploy
npx prisma generate
npm run build

cd ${DEPLOY_DIR}/client
npm ci
npm run build

echo "应用代码部署完成"

# 阶段4: 配置Nginx
echo ""
echo "========== 阶段4: 配置Nginx =========="

cat > /etc/nginx/sites-available/topivra << EOF
upstream api_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    root ${DEPLOY_DIR}/client/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

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
        proxy_set_header X-Forwarded-Proto \$scheme;
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

echo "Nginx配置完成"

# 阶段5: 启动应用
echo ""
echo "========== 阶段5: 启动应用 =========="

cat > ${DEPLOY_DIR}/server/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'topivra-api',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production' },
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
pm2 delete topivra-api 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup | bash

echo "应用启动完成"

# 阶段6: 防火墙配置
echo ""
echo "========== 阶段6: 防火墙配置 =========="

if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo "y" | ufw enable
fi

# 部署验证
echo ""
echo "=========================================="
echo "部署完成!"
echo "=========================================="
echo ""
echo "访问地址: http://${DOMAIN}"
echo ""
echo "后续步骤:"
echo "1. 配置SSL: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo "2. 配置支付邮件: nano ${DEPLOY_DIR}/server/.env && pm2 restart topivra-api"
echo ""
DEPLOY_SCRIPT

chmod +x /tmp/deploy.sh
/tmp/deploy.sh
```

---

## 方式二: 使用PowerShell脚本

在项目根目录执行：

```powershell
.\scripts\deploy\deploy-from-windows.ps1 -SSHPassword "XBLc!1TmD1u8d02q9O" -DBPassword "your_db_password"
```

---

## 部署后操作

### 1. 配置SSL证书

```bash
certbot --nginx -d topivra.com -d www.topivra.com
```

### 2. 配置支付和邮件

```bash
nano /var/www/topivra/server/.env
# 添加以下配置:
# STRIPE_SECRET_KEY=sk_live_xxx
# PAYPAL_CLIENT_ID=xxx
# PAYPAL_SECRET=xxx
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=xxx
# SMTP_PASSWORD=xxx

# 重启应用
pm2 restart topivra-api
```

### 3. 常用命令

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs topivra-api

# 重启应用
pm2 restart topivra-api

# 查看Nginx状态
systemctl status nginx
```

---

## 预计部署时间

- 环境准备: 10-15分钟
- 代码部署: 10-15分钟
- 总计: 20-30分钟