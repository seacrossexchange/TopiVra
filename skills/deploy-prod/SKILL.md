---
name: deploy-prod
description: Production deployment runbook for TopiVra-like full-stack apps (React+Vite + NestJS+Prisma + MySQL+Redis + Nginx + Cloudflare). Use when deploying to Ubuntu server, setting up HTTPS (Let's Encrypt), Cloudflare Full (strict), health checks, and post-deploy validation.
---

# deploy-prod (TopiVra) — Production Runbook

## Non-negotiables (safety)
- Never print secrets to chat/logs.
- Any destructive action (drop DB, docker volume wipe) must require explicit confirmation.
- Prefer SSH key auth; disable root password login after stabilization.

## Required inputs
- Domain(s): `topivra.com`, `www`, `stg` etc.
- Server IP + SSH access method
- Cloudflare status: DNS records + SSL/TLS mode (Full strict)

## Standard deployment architecture
- Docker Compose on Ubuntu 22.04+
- Services: mysql, redis, server, client, nginx
- Nginx terminates TLS and proxies `/api` and `/ws` to backend.

## Procedure (happy path)
1) **Server baseline**
   - Install: docker + compose, git, ufw, certbot
   - Open ports: 22/80/443

2) **Fetch code**
   - Clone to `/opt/topivra`

3) **Generate env**
   - Create `.env` with strong secrets (store backup root-only)

4) **Build & up**
   - `docker compose up -d --build`

5) **DB init**
   - Prefer deterministic schema init (prisma db push or migrate deploy if migrations are clean)

6) **HTTPS**
   - Use certbot webroot at `config/nginx/www`
   - Switch nginx conf to TLS and redirect HTTP→HTTPS

7) **Validation checklist**
   - `GET /` => 200
   - `GET /health/live` => 200
   - `GET /health/ready` => 200
   - `GET /api/v1/products` => 200

## Output artifacts
- `DEPLOYMENT.md` (exact commands + rollback)
- `RUNBOOK.md` (ops checklist)
