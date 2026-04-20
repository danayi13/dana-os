#!/usr/bin/env bash
# Daily backup for Dana OS.
# Dumps the dana_os postgres database and tars the uploads/ directory,
# writing timestamped files to ~/Documents/dana-os-backups/.
# Prunes backups older than 30 days.
#
# Run manually:   bash scripts/backup.sh
# Scheduled via:  infra/com.danaos.backup.plist (daily at 02:00)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKUP_DIR="$HOME/Documents/dana-os-backups"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M)"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Load .env so POSTGRES_USER / POSTGRES_DB are available.
ENV_FILE="$REPO_ROOT/.env"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-dana_os}"

# --- Database dump ---
DUMP_FILE="$BACKUP_DIR/dana_os_${TIMESTAMP}.dump.gz"
echo "[backup] dumping database '$POSTGRES_DB' → $DUMP_FILE"
docker exec dana_os_postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  | gzip > "$DUMP_FILE"
echo "[backup] database dump complete ($(du -sh "$DUMP_FILE" | cut -f1))"

# --- Uploads dir ---
# uploads/ doesn't exist yet but will once file-storage features land.
UPLOADS_DIR="$REPO_ROOT/uploads"
if [[ -d "$UPLOADS_DIR" ]]; then
  UPLOADS_FILE="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"
  echo "[backup] archiving uploads/ → $UPLOADS_FILE"
  tar -czf "$UPLOADS_FILE" -C "$REPO_ROOT" uploads/
  echo "[backup] uploads archive complete ($(du -sh "$UPLOADS_FILE" | cut -f1))"
else
  echo "[backup] uploads/ not found, skipping"
fi

# --- 30-day retention ---
echo "[backup] pruning files older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name "dana_os_*.dump.gz" -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz"  -mtime +"$RETENTION_DAYS" -delete

echo "[backup] done — $TIMESTAMP"
