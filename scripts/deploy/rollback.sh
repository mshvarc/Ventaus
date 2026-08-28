#!/usr/bin/env bash
set -Eeuo pipefail

BASE_DIR="${ANNITI_BASE_DIR:-/srv/www/anniti-smart}"
RELEASES_DIR="$BASE_DIR/releases"
SHARED_DIR="$BASE_DIR/shared"
CURRENT_LINK="$BASE_DIR/current"
COMPOSE_FILE="$SHARED_DIR/compose.preview.yml"
SUBMISSIONS_DIR="${ANNITI_SUBMISSIONS_DIR:-/var/lib/anniti-smart-preview/submissions}"
HOST_PORT="${ANNITI_HOST_PORT:-3086}"
HEALTH_ATTEMPTS="${ANNITI_HEALTH_ATTEMPTS:-30}"
HEALTH_URL="http://127.0.0.1:${HOST_PORT}/healthz"
LOCK_FILE="/tmp/anniti-smart-preview-deploy.lock"

fail() {
  printf '[anniti-rollback] ERROR: %s\n' "$*" >&2
  exit 1
}

as_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

compose_for() {
  local release_path="$1"
  local build_id="$2"
  shift 2
  local env_args=(
    ANNITI_RELEASE_PATH="$release_path"
    ANNITI_BUILD_ID="$build_id"
    ANNITI_HOST_PORT="$HOST_PORT"
    ANNITI_SUBMISSIONS_DIR="$SUBMISSIONS_DIR"
    ANNITI_RATE_LIMIT_WINDOW_MS="${ANNITI_RATE_LIMIT_WINDOW_MS:-600000}"
    ANNITI_RATE_LIMIT_MAX="${ANNITI_RATE_LIMIT_MAX:-5}"
    ANNITI_IDEMPOTENCY_TTL_MS="${ANNITI_IDEMPOTENCY_TTL_MS:-86400000}"
  )

  if docker info >/dev/null 2>&1; then
    env "${env_args[@]}" docker compose -f "$COMPOSE_FILE" "$@"
  else
    as_root env "${env_args[@]}" docker compose -f "$COMPOSE_FILE" "$@"
  fi
}

atomic_link() {
  local target="$1"
  local temporary_link="$BASE_DIR/.current.$$.tmp"
  as_root ln -s "$target" "$temporary_link"
  as_root mv -Tf "$temporary_link" "$CURRENT_LINK"
}

health_check() {
  local expected_build="$1"
  local attempt payload
  for ((attempt = 1; attempt <= HEALTH_ATTEMPTS; attempt += 1)); do
    payload="$(wget --quiet --output-document=- --timeout=3 "$HEALTH_URL" 2>/dev/null || true)"
    if [[ "$payload" == *"\"buildId\":\"${expected_build}\""* ]]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

restore_current_release() {
  local reason="$1"
  local current_id
  current_id="$(basename -- "$CURRENT_RELEASE")"

  printf '[anniti-rollback] %s; restoring %s\n' "$reason" "$current_id" >&2
  atomic_link "$CURRENT_RELEASE"
  compose_for "$CURRENT_RELEASE" "$current_id" up -d --no-build --force-recreate --remove-orphans \
    || fail "Could not restart the original release $current_id"
  health_check "$current_id" || fail "Rollback target and automatic restore both failed"
  fail "$reason; restored $current_id"
}

command -v docker >/dev/null 2>&1 || fail "docker is required"
command -v wget >/dev/null 2>&1 || fail "wget is required"
command -v flock >/dev/null 2>&1 || fail "flock is required"
if [[ "$(id -u)" -ne 0 ]]; then
  command -v sudo >/dev/null 2>&1 || fail "sudo is required"
fi

exec 9>"$LOCK_FILE"
flock -n 9 || fail "A deployment or rollback is already running"

[[ -L "$CURRENT_LINK" ]] || fail "No current release is linked"
[[ -f "$COMPOSE_FILE" ]] || fail "Compose file is missing: $COMPOSE_FILE"

CURRENT_RELEASE="$(readlink -f "$CURRENT_LINK")"
[[ "$CURRENT_RELEASE" == "$RELEASES_DIR/"* ]] || fail "current points outside the release directory"

TARGET_ID="${1:-}"
if [[ -z "$TARGET_ID" ]]; then
  CURRENT_ID="$(basename -- "$CURRENT_RELEASE")"
  TARGET_ID="$(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d ! -name '.*' -printf '%f\n' | sort -r | awk -v current="$CURRENT_ID" '$0 < current { print; exit }')"
  [[ -n "$TARGET_ID" ]] || fail "No earlier release is available"
fi

[[ "$TARGET_ID" =~ ^[A-Za-z0-9._-]+$ ]] || fail "Invalid release id"
TARGET_RELEASE="$RELEASES_DIR/$TARGET_ID"
[[ -d "$TARGET_RELEASE" && -f "$TARGET_RELEASE/Dockerfile" && -f "$TARGET_RELEASE/dist/index.html" ]] || fail "Release is incomplete: $TARGET_RELEASE"

if ! (docker image inspect "anniti-smart-preview:$TARGET_ID" >/dev/null 2>&1 || as_root docker image inspect "anniti-smart-preview:$TARGET_ID" >/dev/null 2>&1); then
  printf '[anniti-rollback] Rebuilding missing image %s\n' "$TARGET_ID"
  compose_for "$TARGET_RELEASE" "$TARGET_ID" build preview
fi

printf '[anniti-rollback] Switching to %s\n' "$TARGET_ID"
atomic_link "$TARGET_RELEASE"
if ! compose_for "$TARGET_RELEASE" "$TARGET_ID" up -d --no-build --force-recreate --remove-orphans; then
  restore_current_release "Target $TARGET_ID failed to start"
fi

if ! health_check "$TARGET_ID"; then
  restore_current_release "Target $TARGET_ID failed health-check"
fi

printf '[anniti-rollback] Active release: %s\n' "$(readlink -f "$CURRENT_LINK")"
