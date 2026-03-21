#!/bin/bash
# ============================================================
# TopiVra 数据库备份脚本
# 功能：完整备份 MySQL 和 Redis 数据
# 使用：bash scripts/deploy/backup.sh
# ============================================================

set -e

CONFIG_DIR="config"
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

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
# 创建备份目录
# ============================================================
log_step "准备备份"

mkdir -p "$BACKUP_DIR"
log_info "备份目录：$BACKUP_DIR"

# ============================================================
# 备份 MySQL
# ============================================================
log_step "备份 MySQL 数据库"

MYSQL_BACKUP="$BACKUP_DIR/mysql_backup_$TIMESTAMP.sql"

if docker compose -f $CONFIG_DIR/docker-compose.yml exec -T mysql mysqldump \
    -u root -p"$(grep MYSQL_ROOT_PASSWORD .env | cut -d= -f2)" \
    --single-transaction --quick \
    --all-databases > "$MYSQL_BACKUP" 2>/dev/null; then
    
    SIZE=$(du -h "$MYSQL_BACKUP" | cut -f1)
    log_info "MySQL 备份完成：$MYSQL_BACKUP ($SIZE)"
else
    log_error "MySQL 备份失败"
    rm -f "$MYSQL_BACKUP"
    exit 1
fi

# ============================================================
# 备份 Redis
# ============================================================
log_step "备份 Redis 数据"

REDIS_BACKUP="$BACKUP_DIR/redis_backup_$TIMESTAMP.rdb"

if docker compose -f $CONFIG_DIR/docker-compose.yml exec -T redis redis-cli BGSAVE >/dev/null 2>&1; then
    sleep 2
    if docker compose -f $CONFIG_DIR/docker-compose.yml cp redis:/data/dump.rdb "$REDIS_BACKUP" 2>/dev/null; then
        SIZE=$(du -h "$REDIS_BACKUP" | cut -f1)
        log_info "Redis 备份完成：$REDIS_BACKUP ($SIZE)"
    else
        log_warn "Redis 备份复制失败，跳过"
    fi
else
    log_warn "Redis 备份失败，跳过"
fi

# ============================================================
# 备份上传文件
# ============================================================
log_step "备份上传文件"

if [ -d "server/uploads" ]; then
    UPLOADS_BACKUP="$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz"
    if tar -czf "$UPLOADS_BACKUP" -C server uploads 2>/dev/null; then
        SIZE=$(du -h "$UPLOADS_BACKUP" | cut -f1)
        log_info "上传文件备份完成：$UPLOADS_BACKUP ($SIZE)"
    else
        log_warn "上传文件备份失败"
    fi
else
    log_warn "上传文件目录不存在，跳过"
fi

# ============================================================
# 清理旧备份（保留最近 7 天）
# ============================================================
log_step "清理旧备份"

DAYS_TO_KEEP=7
find "$BACKUP_DIR" -type f -mtime +$DAYS_TO_KEEP -delete 2>/dev/null || true

log_info "已删除 $DAYS_TO_KEEP 天前的备份"

# ============================================================
# 备份完成
# ============================================================
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  ✅  备份完成！${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  备份文件位置："
echo "    $BACKUP_DIR/"
echo ""
echo "  备份文件列表："
ls -lh "$BACKUP_DIR" | tail -5
echo ""















