#!/bin/bash
# TopiVra C2C — Enhanced Database Backup Script v2.0
# Features: Integrity check, SHA256 checksum, S3 upload, Telegram alerts
# Usage: ./scripts/backup-enhanced.sh
# Cron:  0 3 * * * /path/to/scripts/backup-enhanced.sh >> /var/log/backup.log 2>&1

set -euo pipefail

# ==================== Configuration ====================
DB_HOST="${DB_HOST:-mysql}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASS="${MYSQL_ROOT_PASSWORD:-}"
DB_NAME="${DB_NAME:-topivra}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAILY=7
KEEP_WEEKLY=4
MIN_FILE_SIZE_KB=1  # Minimum file size in KB

# S3 Configuration (optional)
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-database-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Telegram Configuration
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
ALERT_TELEGRAM_CHAT_ID="${ALERT_TELEGRAM_CHAT_ID:-}"

# ==================== Helper Functions ====================

send_telegram() {
  local level="$1"
  local message="$2"
  
  if [ -n "${TELEGRAM_BOT_TOKEN}" ] && [ -n "${ALERT_TELEGRAM_CHAT_ID}" ]; then
    local emoji="ℹ️"
    case "$level" in
      "success") emoji="✅" ;;
      "error") emoji="❌" ;;
      "warning") emoji="⚠️" ;;
    esac
    
    local encoded_message="${emoji}%20${message}"
    curl -s --connect-timeout 10 \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${ALERT_TELEGRAM_CHAT_ID}&text=${encoded_message}" > /dev/null 2>&1 || true
  fi
}

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error_exit() {
  log "ERROR: $1"
  send_telegram "error" "Backup%20Failed:%20$1"
  exit 1
}

check_disk_space() {
  local required_mb="${1:-100}"
  local available_kb
  
  available_kb=$(df -k "$BACKUP_DIR" 2>/dev/null | awk 'NR==2 {print $4}')
  
  if [ -z "$available_kb" ]; then
    log "Warning: Could not check disk space"
    return 0
  fi
  
  local available_mb=$((available_kb / 1024))
  
  if [ "$available_mb" -lt "$required_mb" ]; then
    error_exit "Insufficient disk space. Available: ${available_mb}MB, Required: ${required_mb}MB"
  fi
  
  log "Disk space check passed: ${available_mb}MB available"
}

verify_backup_integrity() {
  local backup_file="$1"
  local file_size_kb
  
  # Check file size
  file_size_kb=$(du -k "$backup_file" | cut -f1)
  
  if [ "$file_size_kb" -lt "$MIN_FILE_SIZE_KB" ]; then
    return 1
  fi
  
  # Verify gzip integrity
  if ! gzip -t "$backup_file" 2>/dev/null; then
    log "ERROR: Gzip integrity check failed for $backup_file"
    return 1
  fi
  
  log "Backup integrity verified: $backup_file (${file_size_kb}KB)"
  return 0
}

generate_checksum() {
  local backup_file="$1"
  local checksum_file="${backup_file}.sha256"
  
  sha256sum "$backup_file" > "$checksum_file"
  
  log "Checksum generated: $(cut -d' ' -f1 "$checksum_file")"
}

upload_to_s3() {
  local backup_file="$1"
  local checksum_file="${backup_file}.sha256"
  
  if [ -z "$S3_BUCKET" ]; then
    log "S3 upload skipped (S3_BUCKET not configured)"
    return 0
  fi
  
  if ! command -v aws &> /dev/null; then
    log "Warning: AWS CLI not installed, skipping S3 upload"
    return 0
  fi
  
  local s3_path="s3://${S3_BUCKET}/${S3_PREFIX}/$(basename "$backup_file")"
  local s3_checksum_path="s3://${S3_BUCKET}/${S3_PREFIX}/$(basename "$checksum_file")"
  
  log "Uploading to S3: $s3_path"
  
  if aws s3 cp "$backup_file" "$s3_path" --region "$AWS_REGION" 2>/dev/null; then
    aws s3 cp "$checksum_file" "$s3_checksum_path" --region "$AWS_REGION" 2>/dev/null || true
    log "S3 upload completed successfully"
  else
    log "Warning: S3 upload failed"
    return 1
  fi
}

# ==================== Main Backup Process ====================

DATE=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)
BACKUP_FILE="${BACKUP_DIR}/daily/${DB_NAME}_${DATE}.sql.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

log "=== TopiVra Database Backup v2.0 ==="
log "Time: $(date)"
log "Database: ${DB_NAME}"
log "Host: ${DB_HOST}:${DB_PORT}"

# Create backup directories
mkdir -p "${BACKUP_DIR}/daily" "${BACKUP_DIR}/weekly"

# Check disk space (require at least 100MB)
check_disk_space 100

# Run mysqldump
log "Starting database dump..."
export MYSQL_PWD="$DB_PASS"

if ! mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
  --single-transaction --routines --triggers \
  "$DB_NAME" 2>/dev/null | gzip > "$BACKUP_FILE"; then
  error_exit "mysqldump failed"
fi

# Unset password for security
unset MYSQL_PWD

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup created: $BACKUP_FILE ($FILESIZE)"

# Verify backup integrity
log "Verifying backup integrity..."
if ! verify_backup_integrity "$BACKUP_FILE"; then
  rm -f "$BACKUP_FILE"
  error_exit "Backup integrity verification failed"
fi

# Generate checksum
generate_checksum "$BACKUP_FILE"

# Weekly backup (every Sunday)
if [ "$DAY_OF_WEEK" -eq 7 ]; then
  WEEKLY_FILE="${BACKUP_DIR}/weekly/${DB_NAME}_weekly_${DATE}.sql.gz"
  cp "$BACKUP_FILE" "$WEEKLY_FILE"
  cp "${BACKUP_FILE}.sha256" "${WEEKLY_FILE}.sha256"
  log "Weekly backup created: $WEEKLY_FILE"
fi

# Cleanup old daily backups
log "Cleaning up old daily backups..."
find "${BACKUP_DIR}/daily" -name "*.sql.gz" -mtime +${KEEP_DAILY} -delete
find "${BACKUP_DIR}/daily" -name "*.sha256" -mtime +${KEEP_DAILY} -delete
log "Cleaned daily backups older than ${KEEP_DAILY} days"

# Cleanup old weekly backups
log "Cleaning up old weekly backups..."
find "${BACKUP_DIR}/weekly" -name "*.sql.gz" -mtime +$((KEEP_WEEKLY * 7)) -delete
find "${BACKUP_DIR}/weekly" -name "*.sha256" -mtime +$((KEEP_WEEKLY * 7)) -delete
log "Cleaned weekly backups older than ${KEEP_WEEKLY} weeks"

# Upload to S3
upload_to_s3 "$BACKUP_FILE"

# Generate backup report
BACKUP_COUNT_DAILY=$(find "${BACKUP_DIR}/daily" -name "*.sql.gz" | wc -l)
BACKUP_COUNT_WEEKLY=$(find "${BACKUP_DIR}/weekly" -name "*.sql.gz" | wc -l)

log "=== Backup Report ==="
log "Daily backups: ${BACKUP_COUNT_DAILY}"
log "Weekly backups: ${BACKUP_COUNT_WEEKLY}"
log "Latest backup: $BACKUP_FILE ($FILESIZE)"

# Send success notification
send_telegram "success" "DB%20Backup%20Complete%0AFile:%20${BACKUP_FILE}%0ASize:%20${FILESIZE}%0ADaily:%20${BACKUP_COUNT_DAILY}%0AWeekly:%20${BACKUP_COUNT_WEEKLY}"

log "=== Backup Complete ==="

exit 0