#!/bin/bash
# ============================================================
# TopiVra Linux 生产环境停止脚本
# 功能：安全停止所有服务
# 使用：bash scripts/deploy/stop-production.sh
# ============================================================

set -e

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
# 确认停止
# ============================================================
log_step "确认停止服务"

echo ""
echo -e "${YELLOW}⚠️  警告：此操作将停止所有服务！${NC}"
echo ""
read -p "确认停止？(yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    log_warn "停止已取消"
    exit 0
fi

# ============================================================
# 备份数据
# ============================================================
log_step "备份数据"

read -p "是否在停止前备份数据？(yes/no): " backup_confirm

if [ "$backup_confirm" = "yes" ]; then
    log_info "执行备份..."
    bash scripts/deploy/backup.sh
    log_info "备份完成"
else
    log_warn "跳过备份"
fi

# ============================================================
# 停止服务
# ============================================================
log_step "停止服务"

log_info "停止所有容器..."
docker compose -f $CONFIG_DIR/docker-compose.yml -f $CONFIG_DIR/docker-compose.prod.yml down

log_info "所有服务已停止"

# ============================================================
# 完成
# ============================================================
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  ✅  服务已停止！${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  下一步："
echo "    重启服务：bash scripts/deploy/deploy-production.sh"
echo "    清理数据：docker compose -f $CONFIG_DIR/docker-compose.yml -f $CONFIG_DIR/docker-compose.prod.yml down -v"
echo ""

