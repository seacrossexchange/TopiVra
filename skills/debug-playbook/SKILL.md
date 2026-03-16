---
name: debug-playbook
description: Debug and fix failures systematically: reproduce, isolate, patch, verify, and prevent regressions. Use for runtime errors, deployment failures, flaky builds, and production incidents.
---

# debug-playbook

## Steps
1) Reproduce and capture logs (exact command + error)
2) Classify layer: build / container / network / app / DB
3) Narrow to smallest failing component
4) Apply minimal fix, then add regression test or guard
5) Verify with a smoke test checklist
6) Document the root cause and prevention in docs/runbook
