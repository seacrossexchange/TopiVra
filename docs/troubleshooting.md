# Troubleshooting

**Document type**: incident reference
**Use with**: [Operations Runbook](OPERATIONS-RUNBOOK.md)

---

## 1. How to use this document

Use this file as the first reference when:

- the service is down
- login/auth flows fail
- payment callbacks do not update orders
- auto-delivery does not complete
- realtime updates stop working
- infrastructure health appears degraded

---

## 2. First-response checklist

Start with:

- [../scripts/deploy/health-check.sh](../scripts/deploy/health-check.sh)
- [../scripts/deploy/diagnose.sh](../scripts/deploy/diagnose.sh)

Then verify:

1. container status
2. API health endpoints
3. MySQL connectivity
4. Redis connectivity
5. Nginx reachability
6. monitoring visibility

---

## 3. Common issue classes

## 3.1 Services fail to start

Check for:

- missing environment variables
- failed database dependency
- failed Redis dependency
- invalid mount paths
- Nginx SSL file problems
- image/build mismatch

Also confirm the deployment path you are using matches the environment assumptions in your compose/config files.

---

## 3.2 Payment callback does not update order state

Check:

- server logs around payment webhook handling
- callback URL reachability
- payment record status in database
- gateway credentials and callback secrets
- whether the environment exposes the callback route publicly

---

## 3.3 Auto-delivery fails after payment

Check:

- product auto-delivery setting
- available inventory count
- order item delivery fields
- server logs around delivery events
- post-payment order state transitions

This is a priority business incident because it directly affects revenue and support burden.

---

## 3.4 SSE or realtime delivery progress stops updating

Check:

- backend route health
- proxy behavior for long-lived connections
- Nginx buffering/timeouts
- frontend auth/session continuity
- network/proxy/CDN interruption of long connections

### Important caution

The current production Nginx config should be reviewed carefully for long-lived connection compatibility before strong production claims are made.

---

## 3.5 WebSocket notifications fail

Check:

- upgrade headers
- proxy route alignment
- frontend connection path
- auth and token continuity
- server gateway startup

---

## 3.6 Build fails in backend risk/OCR area

Known dependency-sensitive area:

- `server/src/common/risk/ocr.service.ts`

This module imports:

- `tesseract.js`
- `jsqr`
- `sharp`

If build/runtime fails here, decide one of the following explicitly:

- install and support the dependencies
- feature-flag or disable the module
- isolate it from the formal supported deployment path

Do not leave this ambiguous in production delivery.

---

## 4. Escalation guidance

Escalate immediately when any of the following occurs:

- login unavailable for all users
- order creation unavailable
- payments accepted but orders not updated
- paid orders not delivered
- admin console unavailable during live support window
- backup restore path uncertain during active incident

---

## 5. Evidence to capture during incidents

Always capture:

- time of incident
- affected environment
- affected route or service
- logs/screenshots/query evidence
- whether issue is reproducible
- rollback decision and result

---

## 6. Related documents

- [Operations Runbook](OPERATIONS-RUNBOOK.md)
- [Deployment Guide](deployment-guide.md)
- [Final Audit Report](FINAL-AUDIT-REPORT.md)
