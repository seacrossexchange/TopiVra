#!/usr/bin/env bash
set -euo pipefail

# TopiVra Production Deploy (Docker Compose)
# - Ubuntu 22.04+
# - Requires: curl, git, openssl, python3 (optional), certbot (optional)
# - Does NOT print secrets.

APP_DIR=${APP_DIR:-/opt/topivra}
REPO_URL=${REPO_URL:-https://github.com/seacrossexchange/TopiVra.git}
BRANCH=${BRANCH:-main}

# Domains are not fixed in your setup: pass DOMAINS="example.com www.example.com stg.example.com"
DOMAINS=${DOMAINS:-}
LE_EMAIL=${LE_EMAIL:-admin@localhost}

# Modes
ENABLE_HTTPS=${ENABLE_HTTPS:-1}            # 1=issue cert + enable https
DB_INIT_MODE=${DB_INIT_MODE:-dbpush}       # dbpush|migrate|skip
ALLOW_DESTRUCTIVE=${ALLOW_DESTRUCTIVE:-0}  # 1 allows docker compose down -v

log(){ echo "[deploy] $*"; }

die(){ echo "[deploy] ERROR: $*" >&2; exit 1; }

need(){ command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"; }

need ssh || true # not required on server shell
need git
need curl
need openssl
need docker

if ! docker compose version >/dev/null 2>&1; then
  die "docker compose plugin missing. Install Docker with compose plugin first."
fi

if [[ -z "${DOMAINS}" ]]; then
  die "DOMAINS is required. Example: DOMAINS=\"topivra.com www.topivra.com stg.topivra.com\""
fi

# 1) fetch code
log "prepare app dir: ${APP_DIR}"
mkdir -p "${APP_DIR%/*}"
if [[ ! -d "${APP_DIR}/.git" ]]; then
  log "cloning repo"
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"
log "sync branch: $BRANCH"
git fetch --all
# best-effort: support main/master
if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
  git reset --hard "origin/$BRANCH"
else
  git reset --hard origin/main || git reset --hard origin/master
fi

# 2) generate env if missing
if [[ ! -f .env ]]; then
  log "generating .env (stored root-only backup)"
  mkdir -p /root/topivra && chmod 700 /root/topivra

  MYSQL_ROOT_PASSWORD=$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-32)
  MYSQL_DATABASE=topivra_prod
  MYSQL_USER=topivra_user
  MYSQL_PASSWORD=$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-32)
  REDIS_PASSWORD=$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-32)
  JWT_SECRET=$(openssl rand -base64 96 | tr -d '=+/' | cut -c1-64)
  JWT_REFRESH_SECRET=$(openssl rand -base64 96 | tr -d '=+/' | cut -c1-64)
  ENCRYPTION_KEY=$(openssl rand -base64 64 | tr -d '=+/' | cut -c1-32)
  DATABASE_URL="mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@mysql:3306/${MYSQL_DATABASE}"

  cat > .env <<EOF
# TopiVra (prod)
DOMAINS=${DOMAINS}
NODE_ENV=production
PORT=8000
APP_PORT=8000
API_VERSION=v1

MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_DATABASE=${MYSQL_DATABASE}
MYSQL_USER=${MYSQL_USER}
MYSQL_PASSWORD=${MYSQL_PASSWORD}

REDIS_PASSWORD=${REDIS_PASSWORD}

DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Optional
CLIENT_URL=https://$(echo "$DOMAINS" | awk '{print $1}')
FRONTEND_URL=https://$(echo "$DOMAINS" | awk '{print $1}')
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://$(echo "$DOMAINS" | awk '{print $1}')/api/v1/auth/google/callback
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
USDT_WALLET_ADDRESS=
USDT_CALLBACK_SECRET=
SENTRY_DSN=
EOF

  chmod 600 .env
  cp -f .env /root/topivra/.env.backup && chmod 600 /root/topivra/.env.backup
else
  log ".env exists (not regenerating)"
fi

# 3) ensure nginx webroot
mkdir -p config/nginx/www

# 4) destructive reset (optional)
if [[ "$ALLOW_DESTRUCTIVE" == "1" ]]; then
  log "destructive mode: docker compose down -v"
  docker compose down -v || true
fi

# 5) build + up (http first)
log "up (http)"
docker compose up -d --build

# 6) wait mysql
log "wait mysql"
for i in $(seq 1 90); do
  if docker compose exec -T mysql sh -lc 'mysqladmin ping -uroot -p"$MYSQL_ROOT_PASSWORD" --silent' >/dev/null 2>&1; then
    break
  fi
  sleep 2
  if [[ "$i" == "90" ]]; then
    docker compose logs --tail=200 mysql || true
    die "mysql not ready"
  fi
done

# 7) init db
case "$DB_INIT_MODE" in
  dbpush)
    log "DB init: prisma db push"
    docker compose run --rm --build server npx prisma db push --accept-data-loss
    ;;
  migrate)
    log "DB init: prisma migrate deploy"
    docker compose run --rm --build server npx prisma migrate deploy
    ;;
  skip)
    log "DB init: skip"
    ;;
  *)
    die "unknown DB_INIT_MODE=$DB_INIT_MODE (use dbpush|migrate|skip)"
    ;;
esac

docker compose up -d --build server

# 8) HTTPS (certbot webroot)
if [[ "$ENABLE_HTTPS" == "1" ]]; then
  need certbot
  log "issue/renew certs via certbot webroot"
  # Use first domain folder name for LE live path
  PRIMARY_DOMAIN=$(echo "$DOMAINS" | awk '{print $1}')

  # HTTP must be reachable from the internet for HTTP-01.
  certbot certonly --webroot -w "${APP_DIR}/config/nginx/www" \
    $(for d in $DOMAINS; do printf -- "-d %s " "$d"; done) \
    --agree-tos -m "$LE_EMAIL" --non-interactive --keep-until-expiring

  log "switch nginx to https config"
  # Assumes your compose mounts /etc/letsencrypt and nginx https conf.
  if [[ -f "${APP_DIR}/config/nginx/nginx.prod.https.conf" ]]; then
    :
  else
    die "missing nginx https config: ${APP_DIR}/config/nginx/nginx.prod.https.conf"
  fi

  # Make sure docker-compose mounts the https conf; if not, patch.
  python3 - <<'PY'
import yaml
from pathlib import Path
p=Path('/opt/topivra/docker-compose.yml')
data=yaml.safe_load(p.read_text())
ng=data['services']['nginx']
vols=ng.get('volumes',[])
new=[]
replaced=False
for v in vols:
    if '/etc/nginx/nginx.conf' in v:
        new.append('./config/nginx/nginx.prod.https.conf:/etc/nginx/nginx.conf:ro')
        replaced=True
    else:
        new.append(v)
if not replaced:
    new.append('./config/nginx/nginx.prod.https.conf:/etc/nginx/nginx.conf:ro')
ng['volumes']=new
# ensure letsencrypt mounted
if not any('/etc/letsencrypt' in v for v in new):
    ng['volumes'].append('/etc/letsencrypt:/etc/letsencrypt:ro')
# ensure webroot
if not any('/var/www/certbot' in v for v in new):
    ng['volumes'].append('./config/nginx/www:/var/www/certbot:ro')
p.write_text(yaml.safe_dump(data, sort_keys=False))
print('compose updated')
PY

  docker compose up -d --force-recreate nginx
fi

log "DONE"
