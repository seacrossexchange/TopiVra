---
name: ops-runbook
description: Operations runbook: backups, restores, monitoring, alerts, certificates, incident handling. Use when taking a deployed service to an operations-ready state.
---

# ops-runbook

## Backups (minimum viable)
- MySQL: daily logical dump + retain 7/30 days
- Store off-box if possible (object storage)

## Restore drill
- Verify restore on a staging instance at least once.

## Monitoring
- Health checks: /health/live and /health/ready
- Infra: CPU/mem/disk, container restarts, nginx 5xx rate

## Certificates
- Confirm certbot renew timer
- Monthly: run a dry-run renewal

## Security baseline
- SSH keys only, disable password auth
- UFW allow 22/80/443 only
- Rotate secrets if leaked

## Incident checklist
- Identify layer: DNS/CF, TLS, nginx, backend, DB
- Gather logs: docker compose logs, nginx error log
- Rollback: revert compose + images
