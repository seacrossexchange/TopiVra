#!/bin/bash
# ============================================================
# TopiVra 数据恢复脚本
# 功能：从备份恢复 MySQL 和 Redis 数据
# 使用：bash scripts/deploy/restore.sh <backup_file>
# 示例：bash scripts/deploy/restore.sh backups/mysql_backup_20240101_120000.sql
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
# 参数检查
# ============================================================
if [ -z "$1" ]; then
    log_error "缺少备份文件参数"
    echo ""
    echo "使用方法："
    echo "  bash scripts/deploy/restore.sh <backup_file>"
    echo ""
    echo "示例："
    echo "  bash scripts/deploy/restore.sh backups/mysql_backup_20240101_120000.sql"
    echo "  bash scripts/deploy/restore.sh backups/redis_backup_20240101_120000.rdb"
    echo ""
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    log_error "备份文件不存在：$BACKUP_FILE"
    exit 1
fi

log_step "准备恢复"
log_info "备份文件：$BACKUP_FILE"
log_info "文件大小：$(du -h "$BACKUP_FILE" | cut -f1)"

# ============================================================
# 确认恢复
# ============================================================
echo ""
echo -e "${YELLOW}⚠️  警告：此操作将覆盖现有数据！${NC}"
echo ""
read -p "确认恢复？(yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    log_warn "恢复已取消"
    exit 0
fi

# ============================================================
# 判断备份类型
# ============================================================
if [[ "$BACKUP_FILE" == *"mysql"* ]]; then
    log_step "恢复 MySQL 数据库"
    
    if cat "$BACKUP_FILE" | docker compose -f $CONFIG_DIR/docker-compose.yml exec -T mysql mysql \
        -u root -p"$(grep MYSQL_ROOT_PASSWORD .env | cut -d= -f2)" 2>/dev/null; then
        log_info "MySQL 数据恢复成功"
    else
        log_error "MySQL 数据恢复失败"
        exit 1
    fi

elif [[ "$BACKUP_FILE" == *"redis"* ]]; then
    log_step "恢复 Redis 数据"
    
    # 停止 Redis
    docker compose -f $CONFIG_DIR/docker-compose.yml exec -T redis redis-cli SHUTDOWN NOSAVE 2>/dev/null || true
    sleep 2
    
    # 复制备份文件
    if docker compose -f $CONFIG_DIR/docker-compose.yml cp "$BACKUP_FILE" redis:/data/dump.rdb 2>/dev/null; then
        # 重启 Redis
        docker compose -f $CONFIG_DIR/docker-compose.yml restart redis
        sleep 3
        log_info "Redis 数据恢复成功"
    else
        log_error "Redis 数据恢复失败"
        exit 1
    fi

elif [[ "$BACKUP_FILE" == *"uploads"* ]]; then
    log_step "恢复上传文件"
    
    if tar -xzf "$BACKUP_FILE" -C . 2>/dev/null; then
        log_info "上传文件恢复成功"
    else
        log_error "上传文件恢复失败"
        exit 1
    fi

else
    log_error "无法识别备份文件类型"
    exit 1
fi

# ============================================================
# 恢复完成
# ============================================================
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  ✅  数据恢复完成！${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  下一步："
echo "    1. 验证数据完整性"
echo "    2. 运行健康检查：bash scripts/deploy/health-check.sh"
echo ""












