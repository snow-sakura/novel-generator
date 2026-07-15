#!/usr/bin/env bash
# ============================================================
# AISQA 数据库备份脚本 (4.2.5)
# 定时备份 MySQL + Qdrant snapshot
# 用法:
#   ./scripts/backup_db.sh                   # 完整备份
#   ./scripts/backup_db.sh --mysql-only      # 仅 MySQL
#   ./scripts/backup_db.sh --qdrant-only     # 仅 Qdrant
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/../backups"
MYSQL_CONTAINER="aisqa-mysql"
QDRANT_CONTAINER="aisqa-qdrant"
MYSQL_USER="aisqa"
MYSQL_PASS="${MYSQL_PASSWORD:-aisqa_pass}"
MYSQL_DB="aisqa"
RETENTION_DAYS=7
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

mkdir -p "${BACKUP_DIR}/mysql" "${BACKUP_DIR}/qdrant"

log_info()  { echo -e "\033[0;36m[INFO]\033[0m  $1"; }
log_ok()    { echo -e "\033[0;32m[OK]\033[0m    $1"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

# ==================== MySQL 备份 ====================

backup_mysql() {
    log_info "开始 MySQL 备份..."

    local filename="aisqa_mysql_${TIMESTAMP}.sql.gz"
    local filepath="${BACKUP_DIR}/mysql/${filename}"

    if docker ps --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER}$"; then
        docker exec "${MYSQL_CONTAINER}" \
            mysqldump -u"${MYSQL_USER}" -p"${MYSQL_PASS}" "${MYSQL_DB}" \
            --single-transaction --quick --lock-tables=false \
            | gzip > "${filepath}"
        log_ok "MySQL 备份完成: ${filepath}"
    else
        # 本地 MySQL 备份
        mysqldump -u"${MYSQL_USER}" -p"${MYSQL_PASS}" "${MYSQL_DB}" \
            --single-transaction --quick \
            | gzip > "${filepath}"
        log_ok "MySQL 本地备份完成: ${filepath}"
    fi
}

# ==================== Qdrant 快照 ====================

backup_qdrant() {
    log_info "开始 Qdrant 快照..."

    local snapshot_dir="${BACKUP_DIR}/qdrant/${TIMESTAMP}"
    mkdir -p "${snapshot_dir}"

    if docker ps --format '{{.Names}}' | grep -q "^${QDRANT_CONTAINER}$"; then
        # 通过 Qdrant API 创建快照
        local response
        response=$(curl -s -X POST "http://localhost:6333/snapshots" \
            -H "Content-Type: application/json")
        echo "${response}" > "${snapshot_dir}/snapshot_response.json"

        # 检查是否有快照文件需要复制
        docker cp "${QDRANT_CONTAINER}:/qdrant/snapshots/." "${snapshot_dir}/" 2>/dev/null || true
        log_ok "Qdrant 快照完成: ${snapshot_dir}"
    else
        log_warn "Qdrant 容器未运行，跳过快照"
    fi
}

# ==================== 清理旧备份 ====================

cleanup_old() {
    log_info "清理 ${RETENTION_DAYS} 天前的备份..."
    find "${BACKUP_DIR}/mysql" -name "aisqa_mysql_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
    find "${BACKUP_DIR}/qdrant" -mindepth 1 -maxdepth 1 -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} +
    log_ok "清理完成"
}

# ==================== 主入口 ====================

case "${1:-}" in
    --mysql-only)
        backup_mysql
        ;;
    --qdrant-only)
        backup_qdrant
        ;;
    *)
        backup_mysql
        backup_qdrant
        cleanup_old
        ;;
esac

log_ok "所有备份任务完成"
