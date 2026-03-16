# deploy-prod/scripts

- `deploy_prod.sh`: one-shot production deploy (compose + db init + optional https)
- `smoke_test.sh`: minimal acceptance tests
- `create_admin.sh`: create/reset admin account (requires `create_admin.js` in repo root)
- `diagnose.sh`: quick diagnostics (logs + nginx test + curl)

## Notes
- Domains are **not fixed**. Pass `DOMAINS="a.com www.a.com stg.a.com"` when deploying.
- Destructive actions are guarded by `ALLOW_DESTRUCTIVE=1`.
- Secrets are never printed; `.env` is backed up to `/root/topivra/.env.backup` on the server.
