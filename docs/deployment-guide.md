# Deployment Guide

**Document type**: reference deployment guide
**Primary supported path**: Docker Compose production stack

---

## 1. Scope

This guide documents the supported deployment direction for TopiVra.

**Primary path**: Docker Compose + Nginx + monitoring stack

Reference files:

- [../config/docker-compose.prod.yml](../config/docker-compose.prod.yml)
- [../config/nginx/prod.nginx.conf](../config/nginx/prod.nginx.conf)
- [../config/docker-compose.monitoring.yml](../config/docker-compose.monitoring.yml)

The repository also includes script-based deployment assets such as [../scripts/deploy/deploy-production.sh](../scripts/deploy/deploy-production.sh). Those should be treated as legacy or transitional unless your team explicitly standardizes on them.

---

## 2. Deployment prerequisites

Before deployment, prepare:

- Linux host with Docker and Docker Compose
- production environment variables
- persistent storage strategy for MySQL, Redis, uploads, and logs
- SSL certificate/key material expected by Nginx config
- monitoring network assumptions required by monitoring compose

---

## 3. Application stack

The application runtime includes:

- MySQL
- Redis
- NestJS server
- React client
- Nginx reverse proxy

The production override file already defines runtime constraints, environment variables, mounts, and health dependencies.

---

## 4. Recommended deployment sequence

### Step 1: prepare configuration

Review and prepare:

- database credentials
- Redis password
- JWT secrets
- encryption key
- client/frontend URLs
- OAuth/payment variables if used
- SSL files mounted by Nginx

### Step 2: bring up the application stack

Use the production compose path defined by:

- [../config/docker-compose.prod.yml](../config/docker-compose.prod.yml)

### Step 3: verify service health

Use:

- [../scripts/deploy/health-check.sh](../scripts/deploy/health-check.sh)
- application health endpoints
- container status checks
- Nginx/API reachability tests

### Step 4: bring up monitoring

Start the monitoring stack defined by:

- [../config/docker-compose.monitoring.yml](../config/docker-compose.monitoring.yml)

### Step 5: verify observability

Confirm access to:

- Prometheus
- Grafana
- Alertmanager
- Loki-backed logs

---

## 5. Environment notes

### Supported production narrative

For delivery consistency, prefer one production story:

- app runtime under Docker Compose
- Nginx as reverse proxy entrypoint
- monitoring as a separate Compose stack

### Mixed deployment caution

Do not present the repository as if PM2/system-service deployment and Docker Compose deployment are simultaneously the main supported path. Choose one for operational ownership.

---

## 6. Post-deploy validation

After deployment, validate at minimum:

- login path
- product listing page
- order lookup path
- admin access path
- health endpoints
- container health
- metrics/log visibility

If the environment is intended for pilot operations, also validate:

- checkout flow
- payment callback path
- auto-delivery behavior
- refund/ticket handling path

---

## 7. Backup and restore references

Use:

- [../scripts/deploy/backup.sh](../scripts/deploy/backup.sh)
- [../scripts/deploy/restore.sh](../scripts/deploy/restore.sh)

Backups should be part of deployment acceptance, not an afterthought.

---

## 8. Related documents

- [Operations Runbook](OPERATIONS-RUNBOOK.md)
- [Troubleshooting](troubleshooting.md)
- [Security Policy](SECURITY.md)
- [Final Audit Report](FINAL-AUDIT-REPORT.md)
