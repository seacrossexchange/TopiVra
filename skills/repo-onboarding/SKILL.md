---
name: repo-onboarding
description: Rapidly onboard and map a codebase. Use when you need a repo overview: architecture, entrypoints, modules, data model, API surface, risks, and a prioritized execution plan. Especially for unfamiliar full-stack repos.
---

# Repo Onboarding Skill

## Goal
Produce a **practical map** of the project so engineers (and agents) can ship safely.

## Inputs to ask for (if missing)
- Target repo path
- Current goal: ship feature / fix bug / deploy / audit
- Environment: local/dev/staging/prod

## Procedure
1) **Inventory**
   - Read: README, package.json(s), Dockerfile(s), compose/k8s, .env.example, docs/
   - Output: tree of top-level folders + what each does

2) **Architecture map (1 page)**
   - Frontend: framework, router entry, build tool
   - Backend: framework, entrypoint, modules
   - Data: DB, ORM schema, migrations/seed
   - Infra: nginx, cert, monitoring

3) **Execution plan**
   - 10–20 tasks with priority (P0/P1/P2)
   - For each: owner type (FE/BE/DevOps), risk, expected time

4) **“Where to look first” cheat-sheet**
   - Top 10 files/dirs to open for changes

## Output format
- `REPORT.md` with sections: Overview / Architecture / Data model / APIs / Risks / Plan
- Optional: `ARCH.md` (diagram placeholders)
