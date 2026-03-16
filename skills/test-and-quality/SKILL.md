---
name: test-and-quality
description: Establish quality gates: lint, typecheck, unit/integration tests, e2e smoke, and CI checks. Use when raising confidence for production delivery.
---

# test-and-quality

## Minimum gates
- Lint passes
- Typecheck passes
- Unit tests for critical modules
- Smoke test script for deployment

## Outputs
- `QUALITY.md`: commands + expected output
- `SMOKE_TEST.sh`: repeatable health/API checks
