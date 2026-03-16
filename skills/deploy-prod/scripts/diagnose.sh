#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/topivra}
cd "$APP_DIR"

echo "== docker compose ps =="
docker compose ps || true

echo

echo "== nginx config test =="
docker compose exec -T nginx nginx -t || true

echo

echo "== last 120 lines: nginx =="
docker compose logs --tail=120 nginx || true

echo

echo "== last 120 lines: server =="
docker compose logs --tail=120 server || true

echo

echo "== health checks (localhost) =="
curl -k -sS -o /dev/null -w "http_home=%{http_code}\n" http://localhost/ || true
curl -k -sS -o /dev/null -w "https_home=%{http_code}\n" https://localhost/ || true
curl -k -sS -o /dev/null -w "health_live=%{http_code}\n" http://localhost/health/live || true
curl -k -sS -o /dev/null -w "products=%{http_code}\n" http://localhost/api/v1/products || true

echo

echo "== common Cloudflare/TLS hints =="
echo "- If Cloudflare shows 525/526: ensure SSL/TLS = Full (strict) and origin cert exists at /etc/letsencrypt/live/..."
echo "- If 522: firewall/security group; ensure ports 80/443 open and server reachable"
