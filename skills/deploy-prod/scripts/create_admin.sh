#!/usr/bin/env bash
set -euo pipefail

# Create or reset admin user inside running compose stack.
# Requires: docker compose, running mysql/redis/server.

APP_DIR=${APP_DIR:-/opt/topivra}
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@topivra.com}
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-}

if [[ -z "$ADMIN_PASSWORD" ]]; then
  echo "ADMIN_PASSWORD is required" >&2
  exit 2
fi

cd "$APP_DIR"

# Mount JS runner into server container and run.
SCRIPT_PATH="$APP_DIR/create_admin.js"
if [[ ! -f "$SCRIPT_PATH" ]]; then
  echo "Missing $SCRIPT_PATH. Copy a compatible create_admin.js into repo root." >&2
  exit 2
fi

docker compose run --rm \
  -v "$SCRIPT_PATH:/app/create_admin.js:ro" \
  -e ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e ADMIN_USERNAME="$ADMIN_USERNAME" \
  -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  server node /app/create_admin.js

echo "ADMIN_READY: $ADMIN_EMAIL"
