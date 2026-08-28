#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd -P)"

CADDY_CONFIG="${ANNITI_CADDY_CONFIG:-/etc/caddy/Caddyfile}"
SNIPPET_FILE="${ANNITI_CADDY_SNIPPET:-$PROJECT_ROOT/deploy/Caddyfile.chromatic-preview}"
BACKUP_DIR="${ANNITI_CADDY_BACKUP_DIR:-/var/backups/caddy/anniti-smart-preview}"
LOCK_FILE="${ANNITI_CADDY_LOCK_FILE:-/var/lock/anniti-smart-preview-caddy.lock}"
PRIMARY_PREVIEW_HOSTNAME="polini.shvlab.ru"
FALLBACK_PREVIEW_HOSTNAME="chromatic-preview.77-91-193-144.sslip.io"
PREVIEW_HOSTNAMES=("$PRIMARY_PREVIEW_HOSTNAME" "$FALLBACK_PREVIEW_HOSTNAME")
PREVIEW_SITE_ADDRESS="$PRIMARY_PREVIEW_HOSTNAME, $FALLBACK_PREVIEW_HOSTNAME"
PREVIEW_PORT="3086"
CONTAINER_NAME="anniti-smart-preview"
ACCESS_LOG="${ANNITI_CADDY_ACCESS_LOG:-/var/log/caddy/anniti-smart-preview-access.log}"
CADDY_SERVICE_USER="${ANNITI_CADDY_SERVICE_USER:-caddy}"
CADDY_SERVICE_GROUP="${ANNITI_CADDY_SERVICE_GROUP:-caddy}"
BEGIN_MARKER="# BEGIN CODEX MANAGED: ANNITI_SMART_CHROMATIC_PREVIEW"
END_MARKER="# END CODEX MANAGED: ANNITI_SMART_CHROMATIC_PREVIEW"

TEMP_FILES=()
BACKUP_FILE=""
CONFIG_OWNER=""
CONFIG_GROUP=""
CONFIG_MODE=""

log() {
  printf '[anniti-caddy-install] %s\n' "$*"
}

fail() {
  printf '[anniti-caddy-install] ERROR: %s\n' "$*" >&2
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

for command_name in caddy systemctl flock install cp mv rm awk grep cmp mktemp stat ss sha256sum date readlink tail cat chmod chown touch; do
  require_command "$command_name"
done

exec 9>"$LOCK_FILE"
flock -n 9 || fail "Another ANNITI Caddy operation is already running"

[[ -f "$CADDY_CONFIG" ]] || fail "Caddyfile does not exist: $CADDY_CONFIG"
[[ ! -L "$CADDY_CONFIG" ]] || fail "Refusing to replace a symlinked Caddyfile: $CADDY_CONFIG"
[[ -f "$SNIPPET_FILE" ]] || fail "Preview snippet does not exist: $SNIPPET_FILE"
[[ -z "$(grep -F "$BEGIN_MARKER" "$SNIPPET_FILE" || true)" ]] || fail "Snippet must not contain managed markers"
[[ "$(grep -Fxc "$PREVIEW_SITE_ADDRESS {" "$SNIPPET_FILE" || true)" -eq 1 ]] || fail "Snippet address does not match the expected hostnames: $PREVIEW_SITE_ADDRESS"
grep -Fq "reverse_proxy 127.0.0.1:${PREVIEW_PORT}" "$SNIPPET_FILE" || fail "Snippet reverse_proxy port does not match $PREVIEW_PORT"
systemctl is-active --quiet caddy || fail "Caddy service is not active"
validate_config || fail "Existing Caddyfile is invalid; refusing to edit it"
CONFIG_OWNER="$(stat -c '%U' "$CADDY_CONFIG")"
CONFIG_GROUP="$(stat -c '%G' "$CADDY_CONFIG")"
CONFIG_MODE="$(stat -c '%a' "$CADDY_CONFIG")"

# `caddy validate` may create configured log files as root. Normalize only the
# dedicated preview log before the service user opens it during a restart.
touch "$ACCESS_LOG"
chown "$CADDY_SERVICE_USER:$CADDY_SERVICE_GROUP" "$ACCESS_LOG"
chmod 0640 "$ACCESS_LOG"

BEGIN_COUNT="$(grep -Fxc "$BEGIN_MARKER" "$CADDY_CONFIG" || true)"
END_COUNT="$(grep -Fxc "$END_MARKER" "$CADDY_CONFIG" || true)"
[[ "$BEGIN_COUNT" -le 1 && "$END_COUNT" -le 1 && "$BEGIN_COUNT" -eq "$END_COUNT" ]] || fail "Managed marker pair is malformed or duplicated"

EXPECTED_BLOCK="$(mktemp /tmp/anniti-caddy-expected.XXXXXX)"
EXISTING_BLOCK="$(mktemp /tmp/anniti-caddy-existing.XXXXXX)"
BASE_CONFIG="$(mktemp /tmp/anniti-caddy-base.XXXXXX)"
remember_temp "$EXPECTED_BLOCK"
remember_temp "$EXISTING_BLOCK"
remember_temp "$BASE_CONFIG"

{
  printf '%s\n' "$BEGIN_MARKER"
  cat "$SNIPPET_FILE"
  [[ -z "$(tail -c 1 "$SNIPPET_FILE")" ]] || printf '\n'
  printf '%s\n' "$END_MARKER"
} >"$EXPECTED_BLOCK"

awk -v begin="$BEGIN_MARKER" -v end="$END_MARKER" '
  $0 == begin { inside = 1 }
  inside { print }
  $0 == end { inside = 0 }
' "$CADDY_CONFIG" >"$EXISTING_BLOCK"

if [[ "$BEGIN_COUNT" -eq 1 ]] && cmp -s "$EXPECTED_BLOCK" "$EXISTING_BLOCK"; then
  log "Managed preview block is already current; validation passed and no reload is needed"
  exit 0
fi

awk -v begin="$BEGIN_MARKER" -v end="$END_MARKER" '
  $0 == begin { inside = 1; next }
  $0 == end { inside = 0; next }
  !inside { print }
  END { if (inside) exit 42 }
' "$CADDY_CONFIG" >"$BASE_CONFIG" || fail "Could not isolate the managed preview block"

for preview_hostname in "${PREVIEW_HOSTNAMES[@]}"; do
  if grep -Fq "$preview_hostname" "$BASE_CONFIG"; then
    fail "Hostname conflict outside the ANNITI managed block: $preview_hostname"
  fi
done
if grep -Fq "127.0.0.1:${PREVIEW_PORT}" "$BASE_CONFIG"; then
  fail "Reverse-proxy port conflict outside the ANNITI managed block: $PREVIEW_PORT"
fi

if ss -ltnH | awk '{ print $4 }' | grep -Eq "(^|:)${PREVIEW_PORT}$"; then
  if ! command -v docker >/dev/null 2>&1; then
    fail "Port $PREVIEW_PORT is occupied and Docker is unavailable to verify its owner"
  fi
  EXPECTED_MAPPING="$(docker port "$CONTAINER_NAME" 3086/tcp 2>/dev/null || true)"
  [[ "$EXPECTED_MAPPING" == *"127.0.0.1:${PREVIEW_PORT}"* ]] || fail "Port $PREVIEW_PORT is occupied by a process other than $CONTAINER_NAME"
  log "Port $PREVIEW_PORT belongs to the expected preview container"
else
  log "Port $PREVIEW_PORT is currently free; Caddy can be installed before the preview container starts"
fi

install -d -o root -g root -m 0700 "$BACKUP_DIR"
CONFIG_HASH="$(sha256sum "$CADDY_CONFIG" | awk '{ print $1 }')"
BACKUP_FILE="$BACKUP_DIR/Caddyfile.$(date -u +%Y%m%dT%H%M%SZ).$$.${CONFIG_HASH}.bak"
cp --preserve=all -- "$CADDY_CONFIG" "$BACKUP_FILE"
chmod 0600 "$BACKUP_FILE"
log "Backup created: $BACKUP_FILE"

CANDIDATE="$(mktemp "$(dirname -- "$CADDY_CONFIG")/.anniti-caddy-candidate.XXXXXX")"
remember_temp "$CANDIDATE"
cp --preserve=all -- "$CADDY_CONFIG" "$CANDIDATE"
cat "$BASE_CONFIG" >"$CANDIDATE"
printf '\n' >>"$CANDIDATE"
cat "$EXPECTED_BLOCK" >>"$CANDIDATE"
chown --reference="$CADDY_CONFIG" "$CANDIDATE"
chmod --reference="$CADDY_CONFIG" "$CANDIDATE"
mv -f -- "$CANDIDATE" "$CADDY_CONFIG"

validate_config || restore_backup "Candidate Caddyfile failed validation"
apply_service_config || restore_backup "Caddy apply failed"

log "Preview block installed and Caddy config applied"
log "Primary hostname: https://$PRIMARY_PREVIEW_HOSTNAME"
log "Fallback hostname: https://$FALLBACK_PREVIEW_HOSTNAME"
log "Backup: $BACKUP_FILE"
