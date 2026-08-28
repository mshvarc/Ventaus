#!/usr/bin/env bash
set -Eeuo pipefail

CADDY_CONFIG="${ANNITI_CADDY_CONFIG:-/etc/caddy/Caddyfile}"
BACKUP_DIR="${ANNITI_CADDY_BACKUP_DIR:-/var/backups/caddy/anniti-smart-preview}"
LOCK_FILE="${ANNITI_CADDY_LOCK_FILE:-/var/lock/anniti-smart-preview-caddy.lock}"
BEGIN_MARKER="# BEGIN CODEX MANAGED: ANNITI_SMART_CHROMATIC_PREVIEW"
END_MARKER="# END CODEX MANAGED: ANNITI_SMART_CHROMATIC_PREVIEW"

TEMP_FILES=()
BACKUP_FILE=""
CONFIG_OWNER=""
CONFIG_GROUP=""
CONFIG_MODE=""

log() {
  printf '[anniti-caddy-uninstall] %s\n' "$*"
}

fail() {
  printf '[anniti-caddy-uninstall] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command is missing: $1"
}

remember_temp() {
  TEMP_FILES+=("$1")
}

cleanup() {
  local temporary
  for temporary in "${TEMP_FILES[@]}"; do
    [[ -n "$temporary" ]] && rm -f -- "$temporary"
  done
}
trap cleanup EXIT

validate_config() {
  caddy validate --config "$CADDY_CONFIG" --adapter caddyfile
}

apply_service_config() {
  if grep -Eq '^[[:space:]]*admin[[:space:]]+off([[:space:]]|$)' "$CADDY_CONFIG"; then
    log "Caddy admin API is disabled; applying validated config with a controlled restart"
    systemctl daemon-reload
    systemctl restart caddy || return 1
  else
    systemctl reload caddy || return 1
  fi

  systemctl is-active --quiet caddy || return 1
  ss -ltnH | awk '{ print $4 }' | grep -Eq '(^|:)(80|443)$'
}

restore_backup() {
  local reason="$1"
  local restore_candidate
  [[ -n "$BACKUP_FILE" && -f "$BACKUP_FILE" ]] || fail "$reason; backup is unavailable"

  log "$reason; restoring $BACKUP_FILE"
  restore_candidate="$(mktemp "$(dirname -- "$CADDY_CONFIG")/.anniti-caddy-restore.XXXXXX")"
  remember_temp "$restore_candidate"
  cp --preserve=all -- "$BACKUP_FILE" "$restore_candidate"
  chown "$CONFIG_OWNER:$CONFIG_GROUP" "$restore_candidate"
  chmod "$CONFIG_MODE" "$restore_candidate"
  mv -f -- "$restore_candidate" "$CADDY_CONFIG"

  validate_config || fail "Restored Caddyfile did not validate; manual intervention is required"
  apply_service_config || fail "Caddy apply failed after restoring the backup"
  fail "$reason; original Caddyfile was restored"
}

[[ "$(id -u)" -eq 0 ]] || fail "Run with root privileges: sudo bash $0"

for command_name in caddy systemctl flock install cp mv rm awk grep mktemp sha256sum date chmod chown stat ss; do
  require_command "$command_name"
done

exec 9>"$LOCK_FILE"
flock -n 9 || fail "Another ANNITI Caddy operation is already running"

[[ -f "$CADDY_CONFIG" ]] || fail "Caddyfile does not exist: $CADDY_CONFIG"
[[ ! -L "$CADDY_CONFIG" ]] || fail "Refusing to replace a symlinked Caddyfile: $CADDY_CONFIG"
systemctl is-active --quiet caddy || fail "Caddy service is not active"
validate_config || fail "Existing Caddyfile is invalid; refusing to edit it"
CONFIG_OWNER="$(stat -c '%U' "$CADDY_CONFIG")"
CONFIG_GROUP="$(stat -c '%G' "$CADDY_CONFIG")"
CONFIG_MODE="$(stat -c '%a' "$CADDY_CONFIG")"

BEGIN_COUNT="$(grep -Fxc "$BEGIN_MARKER" "$CADDY_CONFIG" || true)"
END_COUNT="$(grep -Fxc "$END_MARKER" "$CADDY_CONFIG" || true)"
[[ "$BEGIN_COUNT" -le 1 && "$END_COUNT" -le 1 && "$BEGIN_COUNT" -eq "$END_COUNT" ]] || fail "Managed marker pair is malformed or duplicated"

if [[ "$BEGIN_COUNT" -eq 0 ]]; then
  log "Managed preview block is already absent; validation passed and no reload is needed"
  exit 0
fi

install -d -o root -g root -m 0700 "$BACKUP_DIR"
CONFIG_HASH="$(sha256sum "$CADDY_CONFIG" | awk '{ print $1 }')"
BACKUP_FILE="$BACKUP_DIR/Caddyfile.before-uninstall.$(date -u +%Y%m%dT%H%M%SZ).$$.${CONFIG_HASH}.bak"
cp --preserve=all -- "$CADDY_CONFIG" "$BACKUP_FILE"
chmod 0600 "$BACKUP_FILE"
log "Backup created: $BACKUP_FILE"

CANDIDATE="$(mktemp "$(dirname -- "$CADDY_CONFIG")/.anniti-caddy-candidate.XXXXXX")"
remember_temp "$CANDIDATE"
cp --preserve=all -- "$CADDY_CONFIG" "$CANDIDATE"
awk -v begin="$BEGIN_MARKER" -v end="$END_MARKER" '
  $0 == begin { inside = 1; next }
  $0 == end { inside = 0; next }
  !inside { print }
  END { if (inside) exit 42 }
' "$CADDY_CONFIG" >"$CANDIDATE" || restore_backup "Could not remove the managed preview block"
chown --reference="$CADDY_CONFIG" "$CANDIDATE"
chmod --reference="$CADDY_CONFIG" "$CANDIDATE"
mv -f -- "$CANDIDATE" "$CADDY_CONFIG"

validate_config || restore_backup "Caddyfile failed validation after managed block removal"
apply_service_config || restore_backup "Caddy apply failed after managed block removal"

log "ANNITI managed preview block removed; other Caddy configuration was left untouched"
log "Backup: $BACKUP_FILE"
