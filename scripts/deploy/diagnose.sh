#!/bin/bash
# ============================================================
# TopiVra 诊断脚本
# 功能：收集系统信息、容器日志、性能指标
# 使用：bash scripts/deploy/diagnose.sh
# ============================================================

set -e

CONFIG_DIR="config"
REPORT_DIR="diagnostics"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/diagnostic_report_$TIMESTAMP.txt"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_step()  { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

# ============================================================
# 创建报告目录
# ============================================================
mkdir -p "$REPORT_DIR"

{
    echo "============================================================"
    echo "TopiVra 诊断报告"
    echo "生成时间：$(date)"
    echo "============================================================"
    echo ""

    # ==================== 系统信息 ====================
    echo "==================== 系统信息 ===================="
    echo "操作系统：$(uname -s)"
    echo "内核版本：$(uname -r)"
    echo "主机名：$(hostname)"
    echo "当前用户：$(whoami)"
    echo ""

    # ==================== Docker 信息 ====================
    echo "==================== Docker 信息 ===================="
    docker --version
    docker compose version
    echo ""

    # ==================== 容器状态 ====================
    echo "==================== 容器状态 ===================="
    docker compose -f $CONFIG_DIR/docker-compose.yml ps
    echo ""

    # ==================== 资源使用 ====================
    echo "==================== 资源使用 ===================="
    echo "CPU 使用率："
    top -bn1 | grep "Cpu(s)" || echo "N/A"
    echo ""
    echo "内存使用："
    free -h
    echo ""
    echo "磁盘使用："
    df -h
    echo ""

    # ==================== 容器资源使用 ====================
    echo "==================== 容器资源使用 ===================="
    docker stats --no-stream
    echo ""

    # ==================== 网络连接 ====================
    echo "==================== 网络连接 ===================="
    echo "监听端口："
    netstat -tulpn 2>/dev/null | grep LISTEN || echo "N/A"
    echo ""

    # ==================== MySQL 日志 ====================
    echo "==================== MySQL 日志（最后 50 行） ===================="
    docker compose -f $CONFIG_DIR/docker-compose.yml logs --tail=50 mysql 2>/dev/null || echo "无法获取日志"
    echo ""

    # ==================== Redis 日志 ====================
    echo "==================== Redis 日志（最后 50 行） ===================="
    docker compose -f $CONFIG_DIR/docker-compose.yml logs --tail=50 redis 2>/dev/null || echo "无法获取日志"
    echo ""

    # ==================== Server 日志 ====================
    echo "==================== Server 日志（最后 100 行） ===================="
    docker compose -f $CONFIG_DIR/docker-compose.yml logs --tail=100 server 2>/dev/null || echo "无法获取日志"
    echo ""

    # ==================== Client 日志 ====================
    echo "==================== Client 日志（最后 50 行） ===================="
    docker compose -f $CONFIG_DIR/docker-compose.yml logs --tail=50 client 2>/dev/null || echo "无法获取日志"
    echo ""

    # ==================== Nginx 日志 ====================
    echo "==================== Nginx 日志（最后 50 行） ===================="
    docker compose -f $CONFIG_DIR/docker-compose.yml logs --tail=50 nginx 2>/dev/null || echo "无法获取日志"
    echo ""

    # ==================== 数据库检查 ====================
    echo "==================== 数据库检查 ===================="
    echo "数据库列表："
    docker compose -f $CONFIG_DIR/docker-compose.yml exec -T mysql mysql -uroot -proot -e "SHOW DATABASES;" 2>/dev/null || echo "无法连接"
    echo ""
    echo "表统计："
    docker compose -f $CONFIG_DIR/docker-compose.yml exec -T mysql mysql -uroot -proot -e "SELECT TABLE_SCHEMA, COUNT(*) as TABLE_COUNT FROM INFORMATION_SCHEMA.TABLES GROUP BY TABLE_SCHEMA;" 2>/dev/null || echo "无法获取"
    echo ""

    # ==================== Redis 检查 ====================
    echo "==================== Redis 检查 ===================="
    docker compose -f $CONFIG_DIR/docker-compose.yml exec -T redis redis-cli INFO 2>/dev/null || echo "无法连接"
    echo ""

    # ==================== API 健康检查 ====================
    echo "==================== API 健康检查 ===================="
    echo "Liveness 检查："
    curl -s http://localhost:3001/health/live || echo "无法连接"
    echo ""
    echo "Readiness 检查："
    curl -s http://localhost:3001/health/ready || echo "无法连接"
    echo ""

    # ==================== 环境变量检查 ====================
    echo "==================== 环境变量检查 ===================="
    echo "Server 环境变量："
    docker compose -f $CONFIG_DIR/docker-compose.yml exec -T server env | grep -E "NODE_ENV|DATABASE_URL|REDIS" || echo "无法获取"
    echo ""

    # ==================== 磁盘空间 ====================
    echo "==================== 磁盘空间详情 ===================="
    du -sh * 2>/dev/null | sort -rh | head -20
    echo ""

    echo "============================================================"
    echo "诊断报告生成完成"
    echo "============================================================"

} | tee "$REPORT_FILE"

log_step "诊断完成"
log_info "报告已保存：$REPORT_FILE"
echo ""
echo "查看报告："
echo "  cat $REPORT_FILE"
echo ""










