#!/bin/bash
# ============================================================
# TopiVra 健康检查脚本
# 功能：检查所有服务的运行状态和健康情况
# 使用：bash scripts/deploy/health-check.sh
# ============================================================

set -e

CONFIG_DIR="config"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[✓]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[!]${NC}  $1"; }
log_error() { echo -e "${RED}[✗]${NC}  $1"; }
log_step()  { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

FAILED=0
PASSED=0

# ============================================================
# 检查 Docker
# ============================================================
log_step "检查 Docker 环境"

if ! command -v docker &>/dev/null; then
    log_error "Docker 未安装"
    FAILED=$((FAILED + 1))
else
    log_info "Docker 已安装"
    PASSED=$((PASSED + 1))
fi

if ! docker info >/dev/null 2>&1; then
    log_error "Docker 未运行"
    FAILED=$((FAILED + 1))
else
    log_info "Docker 正在运行"
    PASSED=$((PASSED + 1))
fi

# ============================================================
# 检查容器状态
# ============================================================
log_step "检查容器状态"

if ! docker compose -f $CONFIG_DIR/docker-compose.yml ps >/dev/null 2>&1; then
    log_error "无法连接到 Docker Compose"
    FAILED=$((FAILED + 1))
else
    log_info "Docker Compose 可用"
    PASSED=$((PASSED + 1))
fi

for svc in mysql redis server client nginx; do
    STATUS=$(docker compose -f $CONFIG_DIR/docker-compose.yml ps --status running 2>/dev/null | grep -c "$svc" || true)
    if [ "$STATUS" -gt 0 ]; then
        log_info "$svc 容器运行中"
        PASSED=$((PASSED + 1))
    else
        log_warn "$svc 容器未运行"
        FAILED=$((FAILED + 1))
    fi
done

# ============================================================
# 检查数据库连接
# ============================================================
log_step "检查数据库连接"

if docker compose -f $CONFIG_DIR/docker-compose.yml exec -T mysql mysqladmin ping -h localhost -uroot -proot >/dev/null 2>&1; then
    log_info "MySQL 连接正常"
    PASSED=$((PASSED + 1))
else
    log_error "MySQL 连接失败"
    FAILED=$((FAILED + 1))
fi

if docker compose -f $CONFIG_DIR/docker-compose.yml exec -T redis redis-cli ping >/dev/null 2>&1; then
    log_info "Redis 连接正常"
    PASSED=$((PASSED + 1))
else
    log_error "Redis 连接失败"
    FAILED=$((FAILED + 1))
fi

# ============================================================
# 检查 API 健康
# ============================================================
log_step "检查 API 健康状态"

if curl -sf http://localhost:3001/health/live >/dev/null 2>&1; then
    log_info "API 健康检查通过"
    PASSED=$((PASSED + 1))
elif curl -sf http://localhost/health/live >/dev/null 2>&1; then
    log_info "API 健康检查通过（通过 Nginx）"
    PASSED=$((PASSED + 1))
else
    log_warn "API 健康检查未响应"
    FAILED=$((FAILED + 1))
fi

# ============================================================
# 检查端口
# ============================================================
log_step "检查端口占用"

PORTS=(80 3001 3306 5174 6379)
for port in "${PORTS[@]}"; do
    if netstat -tulpn 2>/dev/null | grep -q ":$port "; then
        log_info "端口 $port 已占用"
        PASSED=$((PASSED + 1))
    else
        log_warn "端口 $port 未占用"
        FAILED=$((FAILED + 1))
    fi
done

# ============================================================
# 检查磁盘空间
# ============================================================
log_step "检查磁盘空间"

DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    log_info "磁盘使用率：$DISK_USAGE%"
    PASSED=$((PASSED + 1))
else
    log_warn "磁盘使用率过高：$DISK_USAGE%"
    FAILED=$((FAILED + 1))
fi

# ============================================================
# 检查内存
# ============================================================
log_step "检查内存使用"

MEM_USAGE=$(free | awk 'NR==2 {printf("%.0f", $3/$2 * 100)}')
if [ "$MEM_USAGE" -lt 80 ]; then
    log_info "内存使用率：$MEM_USAGE%"
    PASSED=$((PASSED + 1))
else
    log_warn "内存使用率过高：$MEM_USAGE%"
    FAILED=$((FAILED + 1))
fi

# ============================================================
# 总结
# ============================================================
echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "  检查完成"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "  通过：${GREEN}$PASSED${NC}  失败：${RED}$FAILED${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅  所有检查通过！${NC}"
    echo ""
    exit 0
else
    echo -e "${YELLOW}⚠️  有 $FAILED 项检查失败${NC}"
    echo ""
    exit 1
fi










