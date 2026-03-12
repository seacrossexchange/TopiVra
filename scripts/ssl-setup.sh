#!/bin/bash

# SSL证书自动申请和配置脚本
# 使用 Let's Encrypt 免费证书

set -e

echo "=========================================="
echo "TopiVra SSL 证书配置脚本"
echo "=========================================="

# 配置变量
DOMAIN="${DOMAIN:-topivra.com}"
EMAIL="${EMAIL:-admin@topivra.com}"
NGINX_CONF_DIR="/etc/nginx"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

echo "域名: $DOMAIN"
echo "邮箱: $EMAIL"
echo ""

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 请使用 root 权限运行此脚本"
    exit 1
fi

# 安装 certbot
echo "📦 检查 certbot 安装..."
if ! command -v certbot &> /dev/null; then
    echo "正在安装 certbot..."
    if [ -f /etc/debian_version ]; then
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    elif [ -f /etc/redhat-release ]; then
        yum install -y certbot python3-certbot-nginx
    else
        echo "❌ 不支持的操作系统"
        exit 1
    fi
else
    echo "✅ certbot 已安装"
fi

# 检查域名解析
echo ""
echo "🔍 检查域名解析..."
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)
SERVER_IP=$(curl -s ifconfig.me)

if [ -z "$DOMAIN_IP" ]; then
    echo "⚠️  警告: 无法解析域名 $DOMAIN"
    echo "请确保域名已正确配置 DNS 记录"
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
elif [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo "⚠️  警告: 域名解析 IP ($DOMAIN_IP) 与服务器 IP ($SERVER_IP) 不匹配"
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ 域名解析正确"
fi

# 停止 Nginx（如果正在运行）
echo ""
echo "🛑 停止 Nginx..."
systemctl stop nginx 2>/dev/null || docker-compose stop nginx 2>/dev/null || true

# 申请证书
echo ""
echo "📜 申请 SSL 证书..."
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

if [ $? -eq 0 ]; then
    echo "✅ SSL 证书申请成功"
else
    echo "❌ SSL 证书申请失败"
    exit 1
fi

# 创建证书软链接（用于 Docker）
echo ""
echo "🔗 创建证书软链接..."
mkdir -p /opt/topivra/ssl
ln -sf "$CERT_DIR/fullchain.pem" /opt/topivra/ssl/fullchain.pem
ln -sf "$CERT_DIR/privkey.pem" /opt/topivra/ssl/privkey.pem
echo "✅ 证书软链接已创建"

# 配置自动续期
echo ""
echo "⏰ 配置证书自动续期..."
CRON_JOB="0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx || docker-compose restart nginx'"
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "$CRON_JOB") | crontab -
echo "✅ 自动续期已配置（每天凌晨3点检查）"

# 测试证书续期
echo ""
echo "🧪 测试证书续期..."
certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo "✅ 证书续期测试通过"
else
    echo "⚠️  证书续期测试失败，请检查配置"
fi

# 启动 Nginx
echo ""
echo "🚀 启动 Nginx..."
systemctl start nginx 2>/dev/null || docker-compose start nginx 2>/dev/null || true

# 验证 SSL 配置
echo ""
echo "🔐 验证 SSL 配置..."
sleep 3
if curl -sSf "https://$DOMAIN" > /dev/null 2>&1; then
    echo "✅ HTTPS 访问正常"
else
    echo "⚠️  HTTPS 访问失败，请检查 Nginx 配置"
fi

echo ""
echo "=========================================="
echo "✅ SSL 证书配置完成！"
echo "=========================================="
echo ""
echo "证书路径: $CERT_DIR"
echo "证书有效期: 90 天"
echo "自动续期: 已启用"
echo ""
echo "访问测试:"
echo "  https://$DOMAIN"
echo "  https://www.$DOMAIN"
echo ""
echo "SSL 评级测试:"
echo "  https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
