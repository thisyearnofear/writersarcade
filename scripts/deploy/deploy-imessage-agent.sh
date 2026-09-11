#!/usr/bin/env bash
# Deploy Flynn (the iMessage agent) as a long-lived PM2 process.
#
# Layout mirrors the writersarcade-api deploy:
#   /opt/imessage-agent/
#     shared/.env
#     shared/logs/
#     releases/<git-sha>/
#     current -> releases/<git-sha>
#
# cloud.ts runs under tsx (Node 22 on the VPS — no bun). The cloud provider
# connects OUTBOUND to Photon's managed lines, so no inbound ports or health
# endpoint are involved — deploy verification is "PM2 process online + logs".
#
# First run: seed /opt/imessage-agent/shared/.env with the local
# apps/imessage-agent/.env (SPECTRUM_PROJECT_ID/SECRET, IMESSAGE_API_SECRET,
# WRITERSARCADE_API_URL=https://writersarcade.vercel.app).

set -euo pipefail

HOST="${HOST:-snel-bot}"
REMOTE_ROOT="${REMOTE_ROOT:-/opt/imessage-agent}"
PM2_NAME="${PM2_NAME:-flynn-imessage}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
DRY_RUN=0

usage() {
  cat <<EOF
Usage: $0 [options]

Options:
  --host <host>          SSH host. Default: ${HOST}
  --remote-root <path>   Remote release root. Default: ${REMOTE_ROOT}
  --pm2-name <name>      PM2 process name. Default: ${PM2_NAME}
  --keep <n>             Number of releases to keep. Default: ${KEEP_RELEASES}
  --seed-env             Copy local apps/imessage-agent/.env to shared/.env first.
  --dry-run              Print operations without changing remote files.
  -h, --help             Show this help.
EOF
}

SEED_ENV=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --remote-root) REMOTE_ROOT="$2"; shift 2 ;;
    --pm2-name) PM2_NAME="$2"; shift 2 ;;
    --keep) KEEP_RELEASES="$2"; shift 2 ;;
    --seed-env) SEED_ENV=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

command -v git >/dev/null || { echo "git is required" >&2; exit 1; }
command -v rsync >/dev/null || { echo "rsync is required" >&2; exit 1; }

REPO_ROOT="$(git rev-parse --show-toplevel)"
APP_DIR="${REPO_ROOT}/apps/imessage-agent"
[[ -d "${APP_DIR}/src" ]] || { echo "Agent app not found at ${APP_DIR}" >&2; exit 1; }

SHA="$(git -C "${REPO_ROOT}" rev-parse --short=12 HEAD)"
RELEASE_DIR="${REMOTE_ROOT}/releases/${SHA}"
BUILD_DIR="${TMPDIR:-/tmp}/imessage-agent-release-${SHA}"

echo "Preparing ${PM2_NAME} release ${SHA}"
echo "Local app: ${APP_DIR}"
echo "Remote: ${HOST}:${RELEASE_DIR}"

rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

rsync -a \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'logs' \
  --exclude 'node_modules' \
  --exclude '.DS_Store' \
  "${APP_DIR}/" "${BUILD_DIR}/"

echo "Installing production dependencies locally (omit dev — keeps @spectrum-ts/imessage-local's native deps out)"
(
  cd "${BUILD_DIR}"
  if [[ -f package-lock.json ]]; then
    npm ci --omit=dev
  else
    npm install --omit=dev
  fi
)

RSYNC_FLAGS=(-az --delete)
if [[ "${DRY_RUN}" -eq 1 ]]; then
  RSYNC_FLAGS+=(--dry-run)
fi

echo "Ensuring remote release directories"
if [[ "${DRY_RUN}" -eq 0 ]]; then
  ssh "${HOST}" "mkdir -p '${REMOTE_ROOT}/releases' '${REMOTE_ROOT}/shared/logs'"
else
  echo "DRY RUN: ssh ${HOST} mkdir -p '${REMOTE_ROOT}/releases' '${REMOTE_ROOT}/shared/logs'"
fi

if [[ "${SEED_ENV}" -eq 1 ]]; then
  if [[ ! -f "${APP_DIR}/.env" ]]; then
    echo "--seed-env requested but ${APP_DIR}/.env does not exist" >&2
    exit 1
  fi
  echo "Seeding shared/.env from local .env (only if absent)"
  if [[ "${DRY_RUN}" -eq 0 ]]; then
    ssh "${HOST}" "if [ ! -f '${REMOTE_ROOT}/shared/.env' ]; then cat > '${REMOTE_ROOT}/shared/.env'; else echo 'shared/.env already exists — leaving it'; fi" < "${APP_DIR}/.env"
  fi
fi

echo "Uploading release artifact"
rsync "${RSYNC_FLAGS[@]}" "${BUILD_DIR}/" "${HOST}:${RELEASE_DIR}/"

if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "DRY RUN complete. No remote symlink or PM2 changes made."
  exit 0
fi

echo "Activating release"
ssh "${HOST}" "set -euo pipefail
  if [ ! -f '${REMOTE_ROOT}/shared/.env' ]; then
    echo 'Missing ${REMOTE_ROOT}/shared/.env — re-run with --seed-env' >&2
    exit 1
  fi
  ln -sfn '${REMOTE_ROOT}/shared/.env' '${RELEASE_DIR}/.env'
  ln -sfn '${REMOTE_ROOT}/shared/logs' '${RELEASE_DIR}/logs'
  ln -sfn '${RELEASE_DIR}' '${REMOTE_ROOT}/current'
"

echo "Starting or reloading PM2 process"
ssh "${HOST}" "cd '${REMOTE_ROOT}/current' && pm2 startOrReload ecosystem.config.cjs --only '${PM2_NAME}' --update-env && pm2 save >/dev/null 2>&1 || true"

echo "Verifying process is online"
ssh "${HOST}" "sleep 4 && pm2 describe '${PM2_NAME}' | grep -qE 'status.*online' && pm2 logs '${PM2_NAME}' --lines 10 --nostream"

echo "Pruning old releases, keeping ${KEEP_RELEASES}"
ssh "${HOST}" "set -euo pipefail
  cd '${REMOTE_ROOT}/releases'
  ls -1dt */ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
"

echo "Deployed ${PM2_NAME} ${SHA}"
