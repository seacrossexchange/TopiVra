#!/bin/bash
# ============================================================
# TopiVra Linux 生产环境一键部署脚本
# 功能：完整的生产环境部署、初始化、健康检查
# 要求：Linux 服务器、Docker、Docker Compose
# 使用：bash scripts/deploy/deploy-production.sh
# ============================================================

set -e

APP_DIR="/opt/topivra"
ENV_FILE=".env"
CONFIG_DIR="config"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

# ============================================================
# 前置检查
# ============================================================
log_step "前置环境检查"

if ! command -v docker &>/dev/null; then
    log_error "Docker 未安装"
    echo "  安装命令：curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if docker compose version &>/dev/null 2>&1; then
    DC="docker compose"
elif command -v docker-compose &>/dev/null; then
    DC="docker-compose"
else
    log_error "Docker Compose 未安装"
    exit 1
fi

log_info "Docker 版本：$(docker --version)"
log_info "Compose 命令：$DC"

# ============================================================
# 切换到项目目录
# ============================================================
log_step "初始化项目目录"

mkdir -p "$APP_DIR"
cd "$APP_DIR"
log_info "项目目录：$(pwd)"

# ============================================================
# 检查环境变量文件
# ============================================================
log_step "检查环境变量配置"

if [ ! -f "$ENV_FILE" ]; then
    log_error ".env 文件不存在！"
    echo ""
    echo "请执行以下步骤："
    echo "  1. 从本地生成密钥："
    echo "     powershell -ExecutionPolicy Bypass -File gen-keys.ps1 -Domain yourdomain.com"
    echo ""
    echo "  2. 上传 server/.env 到服务器 $APP_DIR/.env"
    echo ""
    echo "  3. 重新运行此脚本"
    echo ""
    exit 1
fi

log_info ".env 文件已就绪"

# 验证必需的环境变量
required_vars=("MYSQL_ROOT_PASSWORD" "MYSQL_PASSWORD" "JWT_SECRET" "JWT_REFRESH_SECRET" "DATABASE_URL" "CLIENT_URL")
for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" "$ENV_FILE"; then
        log_error "缺少必需的环境变量：$var"
        exit 1
    fi
done

log_info "环境变量验证通过"

# ============================================================
# 创建必需的目录
# ============================================================
log_step "创建必需的目录"

mkdir -p server/uploads server/logs
mkdir -p /backup/mysql /backup/redis
chmod 755 server/uploads server/logs

log_info "目录创建完成"

# ============================================================
# 备份现有数据（如果存在）
# ============================================================
log_step "备份现有数据"

if $DC ps 2>/dev/null | grep -q "Up"; then
    log_info "检测到运行中的服务，执行备份..."
    BACKUP_DIR="backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/pre-deploy-$(date +%Y%m%d_%H%M%S).sql"
    
    if $DC exec -T mysql mysqldump \
        -u root -p"$(grep MYSQL_ROOT_PASSWORD $ENV_FILE | cut -d= -f2)" \
        --single-transaction --quick \
        "$(grep MYSQL_DATABASE $ENV_FILE | cut -d= -f2)" > "$BACKUP_FILE" 2>/dev/null; then
        log_info "数据库备份完成：$BACKUP_FILE"
    else
        log_warn "数据库备份失败，继续..."
        rm -f "$BACKUP_FILE"
    fi
else
    log_info "首次部署，跳过备份"
fi

# ============================================================
# 构建 Docker 镜像
# ============================================================
log_step "构建 Docker 镜像"

log_info "构建 Server 镜像..."
$DC -f $CONFIG_DIR/docker-compose.yml -f $CONFIG_DIR/docker-compose.prod.yml build --no-cache server

log_info "构建 Client 镜像..."
$DC -f $CONFIG_DIR/docker-compose.yml -f $CONFIG_DIR/docker-compose.prod.yml build --no-cache client

log_info "镜像构建完成"

# ============================================================
# 启动服务
# ============================================================
log_step "启动服务"

log_info "启动数据库和 Redis..."
$DC -f $CONFIG_DIR/docker-compose.yml -f $CONFIG_DIR/docker-compose.prod.yml up -d mysql redis

log_info "等待数据库就绪（最多 60 秒）..."
for i in $(seq 1 12); do
    if $DC -f $CONFIG_DIR/docker-compose.yml -f $CONFIG_DIR/docker-compose.prod.yml exec -T mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
        log_info "数据库已就绪"
        break
    fi
    echo -n "."
    sleep 5
done
echo ""

log_info "启动全部服务..."
$DC -f $CONFIG_DIR/docker-compose.yml -f $CONFIG_DIR/docker-compose.prod.yml up -d

# ============================================================
# 数据库迁移
# ============================================================
log_step "数据库迁移"

log_info "等待 Server 容器启动（30 秒）..."
sleep 30

log_info "执行 Prisma 迁移..."
if $DC -f $CONFIG_DIR/docker-compose.yml -f $CONFIG_DIR/docker-compose.prod.yml exec -T server npx prisma migrate deploy; then
    log_info "数据库迁移成功"
else
    log_warn "数据库迁移失败，可能已是最新版本"
fi

log_info "初始化种子数据..."
$DC -f $CONFIG_DIR/docker-compose.yml -f $CONFIG_DIR/docker-compose.prod.yml exec -T server npx prisma db seed 2>/dev/null || log_warn "种子数据已存在或初始化失败"

# ============================================================
# 健康检查
# ============================================================
log_step "健康检查"

log_info "等待服务完全就绪（15 秒）..."
sleep 15

FAILED=0

for svc in mysql redis server client nginx; do
    STATUS=$($DC -f $CONFIG_DIR/docker-compose.yml -f $CONFIG_DIR/docker-compose.prod.yml ps --status running 2>/dev/null | grep -c "$svc" || true)
    if [ "$STATUS" -gt 0 ]; then
        log_info "  ✓ $svc 运行正常"
    else
        log_warn "  ✗ $svc 未运行"
        FAILED=$((FAILED + 1))
    fi
done

if curl -sf http://localhost:3001/health/live >/dev/null 2>&1; then
    log_info "  ✓ API 健康检查通过"
elif curl -sf http://localhost/health/live >/dev/null 2>&1; then
    log_info "  ✓ API 健康检查通过（通过 Nginx）"
else
    log_warn "  ✗ API 健康检查未响应（服务可能仍在启动中）"
fi

# ============================================================
# 部署结果
# ============================================================
echo ""
echo -e "${GREEN}============================================================${NC}"
if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}  ✅  TopiVra 部署成功！${NC}"
else
    echo -e "${YELLOW}  ⚠️  部署完成，但有 $FAILED 个服务异常${NC}"
fi
echo -e "${GREEN}============================================================${NC}"
echo ""

SERVER_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo "  访问地址："
echo "    前端：    http://$SERVER_IP"
echo "    API 文档： http://$SERVER_IP/api/v1/docs"
echo ""
echo "  常用命令（在 $APP_DIR 目录执行）："
echo "    查看状态：  $DC -f $CONFIG_DIR/docker-compose.yml -f $CONFIG_DIR/docker-compose.prod.yml ps"
echo "    查看日志：  $DC -f $CONFIG_DIR/docker-compose.yml -f $CONFIG_DIR/docker-compose.prod.yml logs -f server"
echo "    重启服务：  $DC -f $CONFIG_DIR/docker-compose.yml -f $CONFIG_DIR/docker-compose.prod.yml restart"
echo "    停止服务：  $DC -f $CONFIG_DIR/docker-compose.yml -f $CONFIG_DIR/docker-compose.prod.yml down"
echo ""
echo "  下一步："
echo "    1. 配置 SSL 证书（可选）"
echo "    2. 配置防火墙规则"
echo "    3. 设置定时备份"
echo ""










