#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
DEFAULT_SOURCE_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd -P)"

SOURCE_DIR="${ANNITI_SOURCE_DIR:-$DEFAULT_SOURCE_DIR}"
BASE_DIR="${ANNITI_BASE_DIR:-/srv/www/anniti-smart}"
RELEASES_DIR="$BASE_DIR/releases"
SHARED_DIR="$BASE_DIR/shared"
CURRENT_LINK="$BASE_DIR/current"
COMPOSE_FILE="$SHARED_DIR/compose.preview.yml"
SUBMISSIONS_DIR="${ANNITI_SUBMISSIONS_DIR:-/var/lib/anniti-smart-preview/submissions}"
HOST_PORT="${ANNITI_HOST_PORT:-3086}"
HEALTH_ATTEMPTS="${ANNITI_HEALTH_ATTEMPTS:-30}"
HEALTH_URL="http://127.0.0.1:${HOST_PORT}/healthz"
CONTAINER_NAME="anniti-smart-preview"
LOCK_FILE="/tmp/anniti-smart-preview-deploy.lock"
BUILD_ROOT="${ANNITI_BUILD_ROOT:-/var/tmp/anniti-smart-preview-build}"
BUILDER_IMAGE="${ANNITI_BUILDER_IMAGE:-node:22.15.0-alpine}"
PNPM_VERSION="${ANNITI_PNPM_VERSION:-11.19.0}"
BUILD_DIR=""

log() {
  printf '[anniti-deploy] %s\n' "$*"
}

fail() {
  printf '[anniti-deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command is missing: $1"
}

as_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

docker_as_root() {
  if docker info >/dev/null 2>&1; then
    docker "$@"
  else
    as_root docker "$@"
  fi
}

cleanup_build_dir() {
  [[ -n "$BUILD_DIR" && -d "$BUILD_DIR" ]] || return 0

  local resolved_build_root resolved_build_dir
  resolved_build_root="$(readlink -f "$BUILD_ROOT")"
  resolved_build_dir="$(readlink -f "$BUILD_DIR")"
  if [[ "$resolved_build_dir" != "$resolved_build_root/"* ]]; then
    log "Refusing to remove unexpected build directory: $resolved_build_dir"
    return 1
  fi

  rm -rf --one-file-system -- "$resolved_build_dir"
}

run_builder() {
  local host_uid host_gid
  host_uid="$(id -u)"
  host_gid="$(id -g)"

  docker_as_root run --rm --init \
    --name "anniti-smart-builder-${RELEASE_ID}" \
    --user "${host_uid}:${host_gid}" \
    --workdir /workspace \
    --volume "$BUILD_DIR:/workspace" \
    --tmpfs /tmp:rw,exec,nosuid,size=1g,mode=1777 \
    --env HOME=/tmp/home \
    --env NPM_CONFIG_PREFIX=/tmp/npm-global \
    --env PNPM_HOME=/tmp/pnpm-home \
    --env PNPM_VERSION="$PNPM_VERSION" \
    --security-opt no-new-privileges:true \
    --cap-drop ALL \
    "$BUILDER_IMAGE" \
    sh -euc '
      export PATH="$NPM_CONFIG_PREFIX/bin:$PNPM_HOME:$PATH"
      npm install --global --ignore-scripts "pnpm@$PNPM_VERSION"
      pnpm --version
      pnpm install --frozen-lockfile
      pnpm run lint
      pnpm run typecheck
      pnpm run test:unit
      pnpm run build
    '
}

compose_for() {
  local release_path="$1"
  local build_id="$2"
  shift 2

  if docker info >/dev/null 2>&1; then
    env \
      ANNITI_RELEASE_PATH="$release_path" \
      ANNITI_BUILD_ID="$build_id" \
      ANNITI_HOST_PORT="$HOST_PORT" \
      ANNITI_SUBMISSIONS_DIR="$SUBMISSIONS_DIR" \
      ANNITI_RATE_LIMIT_WINDOW_MS="${ANNITI_RATE_LIMIT_WINDOW_MS:-600000}" \
      ANNITI_RATE_LIMIT_MAX="${ANNITI_RATE_LIMIT_MAX:-5}" \
      ANNITI_IDEMPOTENCY_TTL_MS="${ANNITI_IDEMPOTENCY_TTL_MS:-86400000}" \
      docker compose -f "$COMPOSE_FILE" "$@"
  else
    as_root env \
      ANNITI_RELEASE_PATH="$release_path" \
      ANNITI_BUILD_ID="$build_id" \
      ANNITI_HOST_PORT="$HOST_PORT" \
      ANNITI_SUBMISSIONS_DIR="$SUBMISSIONS_DIR" \
      ANNITI_RATE_LIMIT_WINDOW_MS="${ANNITI_RATE_LIMIT_WINDOW_MS:-600000}" \
      ANNITI_RATE_LIMIT_MAX="${ANNITI_RATE_LIMIT_MAX:-5}" \
      ANNITI_IDEMPOTENCY_TTL_MS="${ANNITI_IDEMPOTENCY_TTL_MS:-86400000}" \
      docker compose -f "$COMPOSE_FILE" "$@"
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

restore_previous() {
  local previous_release="$1"
  local failed_release="$2"
  local failed_build="$3"

  if [[ -n "$previous_release" && -d "$previous_release" ]]; then
    local previous_build
    previous_build="$(basename -- "$previous_release")"
    log "Health-check failed; restoring $previous_build"
    atomic_link "$previous_release"
    compose_for "$previous_release" "$previous_build" up -d --no-build --force-recreate
    health_check "$previous_build" || fail "Automatic rollback also failed; inspect the container and Caddy logs"
    fail "Release $failed_build failed health-check and was rolled back to $previous_build"
  fi

  log "First release failed health-check; stopping the failed preview container"
  compose_for "$failed_release" "$failed_build" down --remove-orphans || true
  as_root rm -f "$CURRENT_LINK"
  fail "Release $failed_build failed health-check; no previous release existed"
}

HOST_COMMANDS=(
  git docker wget flock install find du tar readlink mktemp ss awk grep wc tr
  cp mv ln touch chown chmod date basename sleep rm
)
for command_name in "${HOST_COMMANDS[@]}"; do
  require_command "$command_name"
done
if [[ "$(id -u)" -ne 0 ]]; then
  require_command sudo
fi
docker_as_root compose version >/dev/null 2>&1 || fail "Docker Compose v2 plugin is required"

exec 9>"$LOCK_FILE"
flock -n 9 || fail "Another ANNITI preview deployment is already running"

[[ -d "$SOURCE_DIR" ]] || fail "Source directory does not exist: $SOURCE_DIR"
[[ "$BUILD_ROOT" == /* ]] || fail "ANNITI_BUILD_ROOT must be an absolute path"
cd "$SOURCE_DIR"
GIT=(git -c "safe.directory=$SOURCE_DIR")

"${GIT[@]}" rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Source directory is not a Git repository"
[[ -z "$("${GIT[@]}" status --porcelain --untracked-files=normal)" ]] || fail "Working tree is not clean; commit or remove pending changes first"
[[ -f pnpm-lock.yaml ]] || fail "pnpm-lock.yaml is required for a reproducible frozen install"
[[ -f Dockerfile && -f server/index.mjs && -f deploy/compose.preview.yml ]] || fail "Runtime/deploy files are incomplete"

COMMIT_HASH="$("${GIT[@]}" rev-parse HEAD)"
SHORT_HASH="$("${GIT[@]}" rev-parse --short=12 HEAD)"
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)-${SHORT_HASH}"
INCOMING_DIR="$RELEASES_DIR/.incoming-${RELEASE_ID}"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"

as_root install -d -m 0750 -o "$(id -u)" -g "$(id -g)" "$BUILD_ROOT"
BUILD_DIR="$(mktemp -d "$BUILD_ROOT/${RELEASE_ID}.XXXXXX")"
trap cleanup_build_dir EXIT

log "Exporting clean commit into local build directory"
"${GIT[@]}" archive --format=tar HEAD | tar -xf - -C "$BUILD_DIR"

log "Running frozen pnpm install, lint, typecheck, unit tests and build in $BUILDER_IMAGE"
run_builder

[[ -f "$BUILD_DIR/dist/index.html" ]] || fail "dist/index.html was not produced"
[[ "$(find "$BUILD_DIR/dist" -type f | wc -l | tr -d ' ')" -ge 2 ]] || fail "dist contains too few files"
[[ -z "$(find "$BUILD_DIR/dist" -type l -print -quit)" ]] || fail "dist must not contain symbolic links"
[[ -z "$(find "$BUILD_DIR/dist" -type f \( -name '.env*' -o -name '*.pem' -o -name '*.key' \) -print -quit)" ]] || fail "dist contains a forbidden secret-like file"

DIST_KIB="$(du -sk "$BUILD_DIR/dist" | awk '{print $1}')"
[[ "$DIST_KIB" -le 262144 ]] || fail "dist exceeds the 256 MiB safety limit"

if ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "(^|:)${HOST_PORT}$"; then
  RUNNING_OWNER="$(docker_as_root ps --filter "name=^/${CONTAINER_NAME}$" --format '{{.Names}}' || true)"
  [[ "$RUNNING_OWNER" == "$CONTAINER_NAME" ]] || fail "Port $HOST_PORT is already occupied by another process"
fi

PREVIOUS_RELEASE=""
if [[ -L "$CURRENT_LINK" ]]; then
  PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK")"
  [[ "$PREVIOUS_RELEASE" == "$RELEASES_DIR/"* ]] || fail "current points outside the release directory"
fi

as_root install -d -m 0755 "$RELEASES_DIR" "$SHARED_DIR"
as_root install -d -m 0750 -o 1000 -g 1000 "$SUBMISSIONS_DIR"
as_root touch "$SUBMISSIONS_DIR/test-submissions.jsonl"
as_root chown 1000:1000 "$SUBMISSIONS_DIR/test-submissions.jsonl"
as_root chmod 0640 "$SUBMISSIONS_DIR/test-submissions.jsonl"
as_root install -m 0644 "$BUILD_DIR/deploy/compose.preview.yml" "$COMPOSE_FILE"

as_root install -d -m 0755 "$INCOMING_DIR"
as_root cp -a "$BUILD_DIR/dist" "$INCOMING_DIR/dist"
as_root cp -a "$BUILD_DIR/server" "$INCOMING_DIR/server"
as_root install -m 0644 "$BUILD_DIR/Dockerfile" "$INCOMING_DIR/Dockerfile"

METADATA_FILE="$(mktemp)"
printf '{"buildId":"%s","gitCommit":"%s","createdAt":"%s","distKiB":%s,"builderImage":"%s","pnpmVersion":"%s"}\n' \
  "$RELEASE_ID" "$COMMIT_HASH" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$DIST_KIB" "$BUILDER_IMAGE" "$PNPM_VERSION" >"$METADATA_FILE"
as_root install -m 0644 "$METADATA_FILE" "$INCOMING_DIR/release.json"
rm -f "$METADATA_FILE"
as_root mv "$INCOMING_DIR" "$RELEASE_DIR"

log "Building immutable runtime image $RELEASE_ID"
compose_for "$RELEASE_DIR" "$RELEASE_ID" build preview

log "Switching current symlink atomically"
atomic_link "$RELEASE_DIR"
if ! compose_for "$RELEASE_DIR" "$RELEASE_ID" up -d --no-build --force-recreate --remove-orphans; then
  restore_previous "$PREVIOUS_RELEASE" "$RELEASE_DIR" "$RELEASE_ID"
fi

if ! health_check "$RELEASE_ID"; then
  restore_previous "$PREVIOUS_RELEASE" "$RELEASE_DIR" "$RELEASE_ID"
fi

log "Deployment passed health-check: $HEALTH_URL"
log "Release: $RELEASE_DIR"
log "Current: $(readlink -f "$CURRENT_LINK")"
log "Test submissions: $SUBMISSIONS_DIR/test-submissions.jsonl"
