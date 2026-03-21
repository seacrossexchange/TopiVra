# TopiVra

**Delivery status**: Controlled pilot / trial-operations ready

TopiVra is a multi-role digital goods marketplace covering buyer, seller, and admin workflows across product listing, inventory, orders, payments, refunds, support tickets, messaging, blog/content, and operational back office.

This repository should be read as a **delivery package under active hardening**, not as a zero-risk finished product. The project already contains broad business coverage and deployment assets, but its current readiness is best described as:

- suitable for demos and controlled trial operations
- suitable for technical review and handoff preparation
- **not yet something that should be marketed as fully production-ready with low residual risk**

---

## What this project includes

### Product scope

- Buyer flows: register, login, browse, cart, checkout, orders, refunds, tickets
- Seller flows: products, inventory, orders, finance, messages, blog management
- Admin flows: users, sellers, orders, refunds, payments, blogs, settings, SEO/OAuth/Telegram config
- Extended capabilities: coupons, membership, referrals, realtime notifications, analytics, content/blog

### Technical stack

- Frontend: React + Vite + TypeScript
- Backend: NestJS + Prisma + MySQL + Redis
- Realtime: Socket.IO / SSE-related flows
- Infra: Docker Compose + Nginx
- Monitoring: Prometheus + Grafana + Alertmanager + Loki + Promtail

---

## Delivery reading order

If you are reviewing this repository for delivery, operations, investment, or handoff, start here:

1. [Final Audit Report](docs/FINAL-AUDIT-REPORT.md)
2. [Delivery Standards](docs/DELIVERY-STANDARDS.md)
3. [Operations Runbook](docs/OPERATIONS-RUNBOOK.md)
4. [Handoff Summary](docs/HANDOFF-SUMMARY.md)
5. [Documentation Index](docs/README.md)

---

## Current readiness

### What is already strong

- Broad feature coverage across buyer / seller / admin roles
- Clear backend module structure
- Extensive data model for marketplace, orders, refunds, blog, messaging, and operations
- Production-oriented deployment, monitoring, backup, restore, and health-check assets present in the repo

### What still needs caution

- Deployment narrative is not yet fully unified
- Some docs drift from the actual configs and scripts
- OCR/risk-related optional dependencies have known build closure issues
- Stability claims should remain conservative until validation is tightened

**Bottom line**: this is a serious project with meaningful delivery value, but it should currently be positioned as **trial-operations ready**, not “finished and risk-free.”

---

## Recommended operating position

Use TopiVra for:

- internal demos
- stakeholder review
- controlled customer pilots
- trial operations with clear rollback/support ownership

Do not use the current repository state to claim:

- zero defects
- fully proven production stability
- fully unified deployment and support process

---

## Core evidence in the repository

Key files that support the delivery assessment:

- Frontend routes: [client/src/router.tsx](client/src/router.tsx)
- Backend modules: [server/src/app.module.ts](server/src/app.module.ts)
- Data model: [server/prisma/schema.prisma](server/prisma/schema.prisma)
- E2E flows: [e2e/tests/complete-user-journey.spec.ts](e2e/tests/complete-user-journey.spec.ts), [e2e/tests/auto-delivery.spec.ts](e2e/tests/auto-delivery.spec.ts)
- Production deployment: [config/docker-compose.prod.yml](config/docker-compose.prod.yml)
- Monitoring stack: [config/docker-compose.monitoring.yml](config/docker-compose.monitoring.yml)
- Nginx entrypoint: [config/nginx/prod.nginx.conf](config/nginx/prod.nginx.conf)
- Deployment scripts: [scripts/deploy/](scripts/deploy/)

---

## Documentation map

### Decision and governance

- [Final Audit Report](docs/FINAL-AUDIT-REPORT.md)
- [Delivery Standards](docs/DELIVERY-STANDARDS.md)
- [Handoff Summary](docs/HANDOFF-SUMMARY.md)

### Operations

- [Operations Runbook](docs/OPERATIONS-RUNBOOK.md)
- [Deployment Guide](docs/deployment-guide.md)
- [Troubleshooting](docs/troubleshooting.md)

### Engineering reference

- [API Reference](docs/API.md)
- [Database Schema](docs/database-schema.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Security Policy](docs/SECURITY.md)
- [Contributing Guide](docs/CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

---

## Delivery principles for this repository

- keep delivery claims evidence-based
- treat process files as internal/archive material, not formal delivery assets
- prefer one supported deployment path over multiple competing narratives
- document known risks explicitly instead of hiding them under marketing language

---

## Version note

This repository contains substantial implementation work and operational assets, but the correct delivery label at this stage is:

> **Ready for controlled trial operations and handoff preparation, pending further stability and deployment-path consolidation.**
