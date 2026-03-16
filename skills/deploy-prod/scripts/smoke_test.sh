#!/usr/bin/env bash
set -euo pipefail

# Smoke test for TopiVra deployment
BASE_URL=${BASE_URL:-https://topivra.com}

req(){
  local url="$1"
  local expect="${2:-200}"
  local code
  code=$(curl -k -sS -o /dev/null -w "%{http_code}" "$url" || true)
  echo "$url -> $code"
  if [[ "$code" != "$expect" ]]; then
    echo "FAIL: expected $expect" >&2
    return 1
  fi
}

req "$BASE_URL/" 200
req "$BASE_URL/health/live" 200
req "$BASE_URL/api/v1/products" 200

echo "SMOKE_OK"
