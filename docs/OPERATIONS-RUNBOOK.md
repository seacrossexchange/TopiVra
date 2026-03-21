# Operations Runbook

**Document type**: Operations guide
**Primary audience**: DevOps, support, delivery, takeover team
**Supported production path**: Docker Compose + Nginx + monitoring stack

---

## 1. Purpose

This runbook defines the primary operating path for TopiVra in a controlled production or trial-operations environment.

It consolidates:

- deployment entry points
- health checks
- monitoring access
- backup and restore references
- rollback orientation
- incident triage starting points

---

## 2. Official operating position

For formal delivery and operations, treat the **Docker Compose production path** as the primary supported route:

- application stack: [config/docker-compose.prod.yml](../config/docker-compose.prod.yml)
- reverse proxy: [config/nginx/prod.nginx.conf](../config/nginx/prod.nginx.conf)
- monitoring stack: [config/docker-compose.monitoring.yml](../config/docker-compose.monitoring.yml)

The repository also contains legacy/script-driven deployment assets such as `scripts/deploy/deploy-production.sh`, but those should be treated as **secondary or transitional**, not the main delivery narrative.

---

## 3. Runtime components

### Application stack

- MySQL
- Redis
- NestJS server
- React client
- Nginx

### Monitoring stack

- Prometheus
- Grafana
- Alertmanager
- Loki
- Promtail
- Node Exporter
- cAdvisor

---

## 4. Deployment flow

### 4.1 Prepare environment

Before deployment, confirm:

- Docker and Docker Compose are available
- required environment variables are prepared
- SSL files expected by Nginx are provisioned if HTTPS is enabled through the provided config
- shared Docker network assumptions are satisfied where required by monitoring stack

### 4.2 Start application stack

Reference configuration:

- [config/docker-compose.prod.yml](../config/docker-compose.prod.yml)

Recommended operator flow:

1. prepare production env file(s)
2. review mounted volumes and SSL paths
3. bring up the application stack
4. confirm database and Redis health
5. confirm API health endpoints
6. verify Nginx routing

### 4.3 Start monitoring stack

Reference configuration:

- [config/docker-compose.monitoring.yml](../config/docker-compose.monitoring.yml)

Bring up monitoring separately after the application stack is healthy.

---

## 5. Health checks

Primary script:

- [scripts/deploy/health-check.sh](../scripts/deploy/health-check.sh)

Use health checks to validate:

- Docker availability
- compose accessibility
- container runtime status
- MySQL connectivity
- Redis connectivity
- API health endpoint responsiveness
- basic host resource checks

### Important note

The health check script currently mixes assumptions from non-prod/local environments. Operators should use it as a **baseline check**, but must verify endpoint/port alignment with the actual deployed topology.

---

## 6. Monitoring and observability

### Observability evidence in repo

- monitoring compose: [config/docker-compose.monitoring.yml](../config/docker-compose.monitoring.yml)
- Grafana provisioning: [config/monitoring/grafana/provisioning/](../config/monitoring/grafana/provisioning/)
- dashboards: [config/monitoring/grafana/dashboards/](../config/monitoring/grafana/dashboards/)

### Operator expectations

At minimum, operations should track:

- container health
- HTTP/API availability
- server memory and CPU
- error spikes
- log anomalies
- payment/order processing failures

---

## 7. Backup and restore

Reference scripts:

- [scripts/deploy/backup.sh](../scripts/deploy/backup.sh)
- [scripts/deploy/restore.sh](../scripts/deploy/restore.sh)

### Minimum operating standard

- database backups must be scheduled
- restore procedure must be tested in a non-production environment
- uploaded assets, if operationally required, must be included in backup scope

---

## 8. Rollback guidance

If deployment causes service degradation:

1. stop further rollout
2. keep current data state intact
3. restore prior known-good application image/config set
4. verify API health
5. verify core flows: login, browse, order lookup, admin access
6. inspect logs and metrics before attempting another rollout

If rollback requires data recovery, involve the backup/restore path rather than ad hoc manual intervention.

---

## 9. Incident entry points

Use the following as first triage references:

- [Troubleshooting](troubleshooting.md)
- [scripts/deploy/diagnose.sh](../scripts/deploy/diagnose.sh)
- [scripts/deploy/health-check.sh](../scripts/deploy/health-check.sh)

Priority incident classes:

- API unavailable
- login/auth failures
- payment callback failures
- auto-delivery failure
- SSE/WebSocket realtime failure
- inventory mismatch
- refund processing backlog

---

## 10. Known operational cautions

- deployment narrative is not fully unified across all scripts and docs
- OCR/risk-related optional dependencies have known closure issues in build workflows
- some docs still reflect legacy local or mixed environment assumptions
- long-lived connection flows should be revalidated before high-confidence production claims

---

## 11. What “operationally acceptable” means for this repo today

TopiVra can be treated as operationally acceptable for:

- demos
- internal environments
- controlled pilot launch
- supervised trial operations

It should not yet be treated as evidence of a zero-risk mature production estate without additional validation and documentation alignment.
