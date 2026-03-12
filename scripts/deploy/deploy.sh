#!/bin/bash
# ============================================================
# TopiVra 服务器一键部署脚本
# 使用方法：bash deploy.sh
# 适用：首次部署 / 更新部署
# ============================================================

set -e

APP_DIR="/opt/topivra"
ENV_FILE=".env"

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
    log_error "Docker 未安装，请先安装 Docker"
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

# compose 命令封装：自动附带两个 compose 文件
dc() { $DC -f docker-compose.yml -f docker-compose.prod.yml "$@"; }

log_info "Docker 版本：$(docker --version)"
log_info "Compose 命令：$DC"

# ============================================================
# 切换到项目目录
# ============================================================
log_step "切换到项目目录"

mkdir -p "$APP_DIR"
cd "$APP_DIR"
log_info "当前目录：$(pwd)"

# ============================================================
# 检查环境变量文件
# ============================================================
log_step "检查环境变量"

if [ ! -f "$ENV_FILE" ]; then
    if [ -f ".env.production.example" ]; then
        cp .env.production.example "$ENV_FILE"
        log_warn ".env 文件不存在，已从模板创建"
        log_warn "请编辑 $APP_DIR/.env 填写真实配置后重新运行此脚本！"
        echo ""
        echo "  编辑命令：nano $APP_DIR/.env"
        echo ""
        exit 1
    else
        log_error ".env 文件不存在，且没有找到 .env.production.example 模板"
        exit 1
    fi
fi

log_info ".env 文件已就绪"

# ============================================================
# 备份（更新部署时）
# ============================================================
log_step "备份当前数据"

if dc ps 2>/dev/null | grep -q "Up"; then
    log_info "检测到运行中的服务，执行快速备份..."
    BACKUP_DIR="$APP_DIR/backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/pre-deploy-$(date +%Y%m%d_%H%M%S).sql"
    if dc exec -T mysql mysqldump \
        -u root -p"${MYSQL_ROOT_PASSWORD:-root}" \
        --single-transaction --quick \
        "${MYSQL_DATABASE:-topivra_prod}" > "$BACKUP_FILE" 2>/dev/null; then
        log_info "数据库备份完成：$BACKUP_FILE"
    else
        log_warn "数据库备份失败，继续..."
        rm -f "$BACKUP_FILE"
    fi
else
    log_info "首次部署，跳过备份"
fi

# ============================================================
# 构建镜像
# ============================================================
log_step "构建 Docker 镜像"

log_info "构建 Server 镜像..."
dc build --no-cache server

log_info "构建 Client 镜像..."
dc build --no-cache client

log_info "镜像构建完成"

# ============================================================
# 启动服务
# ============================================================
log_step "启动服务"

log_info "启动数据库和 Redis..."
dc up -d mysql redis

log_info "等待数据库就绪（最多60秒）..."
for i in $(seq 1 12); do
    if dc exec -T mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
        log_info "数据库已就绪"
        break
    fi
    echo -n "."
    sleep 5
done
echo ""

log_info "启动全部服务..."
dc up -d

# ============================================================
# 数据库迁移
# ============================================================
log_step "数据库迁移"

log_info "等待 Server 容器启动（30秒）..."
sleep 30

log_info "执行 Prisma 迁移..."
if dc exec -T server npx prisma migrate deploy; then
    log_info "数据库迁移成功"
else
    log_warn "数据库迁移失败，可能已是最新版本"
fi

log_info "初始化种子数据..."
dc exec -T server npx prisma db seed 2>/dev/null || log_warn "种子数据已存在或初始化失败，跳过"

# ============================================================
# 健康检查
# ============================================================
log_step "健康检查"

log_info "等待服务完全就绪（15秒）..."
sleep 15

FAILED=0

for svc in mysql redis server client nginx; do
    STATUS=$(dc ps --status running 2>/dev/null | grep -c "$svc" || true)
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
    log_info "  ✓ API 健康检查通过（通过Nginx）"
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
    echo -e "${YELLOW}  ⚠️  部署完成，但有 $FAILED 个服务异常，请检查日志${NC}"
fi
echo -e "${GREEN}============================================================${NC}"
echo ""
SERVER_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo "  访问地址："
echo "    前端：    http://$SERVER_IP"
echo "    API文档： http://$SERVER_IP/api/docs"
echo ""
echo "  常用命令（在 $APP_DIR 目录执行）："
echo "    查看状态：  $DC -f docker-compose.yml -f docker-compose.prod.yml ps"
echo "    查看日志：  $DC -f docker-compose.yml -f docker-compose.prod.yml logs -f server"
echo "    重启服务：  $DC -f docker-compose.yml -f docker-compose.prod.yml restart"
echo "    停止服务：  $DC -f docker-compose.yml -f docker-compose.prod.yml down"
echo ""
