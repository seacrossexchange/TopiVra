# TopiVra 生产环境部署脚本 (Windows -> Linux)
# 用法: ./deploy-from-windows.ps1

param(
    [string]$ServerIP = "156.226.168.206",
    [string]$SSHPort = "22",
    [string]$SSHUser = "root",
    [string]$SSHPassword = "",
    [string]$Domain = "topivra.com",
    [string]$GitRepo = "https://github.com/seacrossexchange/TopiVra.git",
    [string]$DBPassword = "",
    [string]$RedisPassword = ""
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "TopiVra 生产环境部署脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 检查必要参数
if ([string]::IsNullOrEmpty($SSHPassword)) {
    $SSHPassword = Read-Host "请输入SSH密码"
}
if ([string]::IsNullOrEmpty($DBPassword)) {
    $DBPassword = Read-Host "请输入数据库密码" -AsSecureString
    $DBPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DBPassword))
}
if ([string]::IsNullOrEmpty($RedisPassword)) {
    $RedisPassword = Read-Host "请输入Redis密码 (可选，直接回车跳过)"
}

# 生成JWT密钥
$JWTSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

Write-Host ""
Write-Host "目标服务器: $ServerIP" -ForegroundColor Yellow
Write-Host "域名: $Domain" -ForegroundColor Yellow
Write-Host ""

# 创建部署脚本内容
$deployScript = @'
#!/bin/bash
set -e

echo "=========================================="
echo "TopiVra 生产环境部署脚本"
echo "=========================================="

DEPLOY_DIR="/var/www/topivra"
LOG_DIR="/var/log/topivra"

# 创建目录
mkdir -p ${DEPLOY_DIR}
mkdir -p ${LOG_DIR}

# 阶段1: 系统环境准备
echo ""
echo "========== 阶段1: 系统环境准备 =========="

apt update && apt upgrade -y

# 安装Node.js 20
if ! command -v node &> /dev/null; then
    echo "安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo "Node.js: $(node --version)"

# 安装MySQL
if ! command -v mysql &> /dev/null; then
    echo "安装 MySQL..."
    apt install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
fi
echo "MySQL: $(mysql --version)"

# 安装Redis
if ! command -v redis-server &> /dev/null; then
    echo "安装 Redis..."
    apt install -y redis-server
    systemctl start redis
    systemctl enable redis
fi
echo "Redis: $(redis-cli ping)"

# 安装Nginx
if ! command -v nginx &> /dev/null; then
    echo "安装 Nginx..."
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi
echo "Nginx: $(nginx -v 2>&1)"

# 安装Git
if ! command -v git &> /dev/null; then
    apt install -y git
fi

# 安装PM2
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
echo "PM2: $(pm2 --version)"

# 安装Certbot
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
fi

# 阶段2: 数据库配置
echo ""
echo "========== 阶段2: 数据库配置 =========="

# 创建数据库
mysql -u root << 'SQLEOF'
CREATE DATABASE IF NOT EXISTS topivra CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQLEOF

echo "数据库创建完成"

# 阶段3: 部署应用代码
echo ""
echo "========== 阶段3: 部署应用代码 =========="

cd ${DEPLOY_DIR}

# 克隆或更新代码
if [ -d ".git" ]; then
    echo "拉取最新代码..."
    git pull
else
    echo "克隆代码仓库..."
    rm -rf ${DEPLOY_DIR}/*
    git clone __GIT_REPO__ .
fi

# 创建环境变量文件
echo "配置环境变量..."

cat > ${DEPLOY_DIR}/server/.env << 'ENVEOF'
NODE_ENV=production
PORT=8000
DATABASE_URL="mysql://topivra_user:__DB_PASS__@localhost:3306/topivra"
REDIS_HOST=localhost
REDIS_PORT=6379
__REDIS_PASS_LINE__
JWT_SECRET=__JWT_SECRET__
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://__DOMAIN__
UPLOAD_DIR=/var/www/topivra/uploads
MAX_FILE_SIZE=10485760
ENVEOF

# 安装依赖
echo "安装后端依赖..."
cd ${DEPLOY_DIR}/server
npm ci --production

echo "安装前端依赖..."
cd ${DEPLOY_DIR}/client
npm ci

# 构建前端
echo "构建前端..."
cd ${DEPLOY_DIR}/client
npm run build

# 运行数据库迁移
echo "运行数据库迁移..."
cd ${DEPLOY_DIR}/server
npx prisma migrate deploy
npx prisma generate

# 构建后端
echo "构建后端..."
cd ${DEPLOY_DIR}/server
npm run build

# 阶段4: 配置Nginx
echo ""
echo "========== 阶段4: 配置Nginx =========="

cat > /etc/nginx/sites-available/topivra << 'NGINXEOF'
upstream api_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name __DOMAIN__ www.__DOMAIN__;
    root /var/www/topivra/client/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

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
        proxy_set_header X-Forwarded-Proto $scheme;
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
NGINXEOF

ln -sf /etc/nginx/sites-available/topivra /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "Nginx配置完成"

# 阶段5: 启动应用
echo ""
echo "========== 阶段5: 启动应用 =========="

cat > ${DEPLOY_DIR}/server/ecosystem.config.js << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'topivra-api',
    script: 'dist/main.js',
    instances: 2,
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production' },
    error_file: '/var/log/topivra/api-error.log',
    out_file: '/var/log/topivra/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
PM2EOF

cd ${DEPLOY_DIR}/server
pm2 delete topivra-api 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# 设置开机启动
pm2_startup=$(pm2 startup 2>&1 | grep "sudo" | head -1)
if [ -n "$pm2_startup" ]; then
    eval "$pm2_startup"
fi

echo "应用启动完成"

# 阶段6: 防火墙配置
echo ""
echo "========== 阶段6: 防火墙配置 =========="

if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo "y" | ufw enable
    ufw status
fi

# 阶段7: 部署验证
echo ""
echo "========== 部署验证 =========="

echo "服务状态:"
echo "  MySQL: $(systemctl is-active mysql)"
echo "  Redis: $(systemctl is-active redis)"
echo "  Nginx: $(systemctl is-active nginx)"
echo "  PM2: $(pm2 jlist 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 || echo 'running')"

echo ""
echo "=========================================="
echo "部署完成!"
echo "=========================================="
echo ""
echo "访问地址: http://__DOMAIN__"
echo ""
echo "后续步骤:"
echo "1. 配置SSL证书: certbot --nginx -d __DOMAIN__ -d www.__DOMAIN__"
echo "2. 配置支付和邮件环境变量: nano /var/www/topivra/server/.env"
echo "3. 重启应用: pm2 restart topivra-api"
echo ""
'@

# 替换变量
$deployScript = $deployScript -replace '__GIT_REPO__', $GitRepo
$deployScript = $deployScript -replace '__DB_PASS__', $DBPassword
$deployScript = $deployScript -replace '__JWT_SECRET__', $JWTSecret
$deployScript = $deployScript -replace '__DOMAIN__', $Domain
$deployScript = $deployScript -replace '__REDIS_PASS_LINE__', $(if ($RedisPassword) { "REDIS_PASSWORD=$RedisPassword" } else { "" })

# 保存部署脚本
$scriptPath = "$PSScriptRoot\temp-deploy.sh"
$deployScript | Out-File -FilePath $scriptPath -Encoding UTF8 -NoNewline

Write-Host "部署脚本已生成: $scriptPath" -ForegroundColor Green

# 使用SSH部署
Write-Host ""
Write-Host "开始部署..." -ForegroundColor Yellow

# 检查是否可以使用plink (PuTTY)
$plinkPath = Get-Command plink -ErrorAction SilentlyContinue
if ($plinkPath) {
    Write-Host "使用plink进行SSH连接..." -ForegroundColor Yellow
    
    # 上传并执行脚本
    $commands = @"
cd /tmp && cat > deploy.sh << 'DEPLOYEOF'
$deployScript
DEPLOYEOF
chmod +x deploy.sh && ./deploy.sh
"@
    
    echo y | plink -ssh -P $SSHPort -pw $SSHPassword "$SSHUser@$ServerIP" $commands
}
else {
    Write-Host "请手动执行以下步骤:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. 打开新的终端窗口，连接到服务器:" -ForegroundColor Cyan
    Write-Host "   ssh $SSHUser@$ServerIP -p $SSHPort" -ForegroundColor White
    Write-Host "   密码: $SSHPassword" -ForegroundColor White
    Write-Host ""
    Write-Host "2. 连接后，将以下脚本粘贴执行:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host $deployScript -ForegroundColor Gray
    Write-Host ""
    
    # 将脚本复制到剪贴板
    try {
        Set-Clipboard -Value $deployScript
        Write-Host "[提示] 部署脚本已复制到剪贴板!" -ForegroundColor Green
    } catch {
        Write-Host "[提示] 无法复制到剪贴板，请手动复制上面的脚本" -ForegroundColor Yellow
    }
}