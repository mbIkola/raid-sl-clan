# KT Intermediate Upload Runbook

## Prerequisites

- `KT_ADMIN_TOKEN` is available in shell (or pass `--token` explicitly).
- API base URL is reachable (`KT_ADMIN_API_BASE_URL` or `--api-base-url`), for example:
  - `http://localhost:8787/api/admin/clan-wars/intermediate` for local worker preview
  - `https://vibr-clan.org/api/admin/clan-wars/intermediate` for production
- Swift runtime is installed and available as `swift` on `PATH` (uploader executes `tool/ocr-clan-results/ocr-clan-results.swift`).
- Node.js runtime is available for `upload-intermediate.mjs`.

## Flow

1. Run the uploader from repository root:

```bash
KT_ADMIN_TOKEN=... node tool/ocr-clan-results/upload-intermediate.mjs \
  --image /absolute/path/to/screenshot.jpg \
  --api-base-url https://vibr-clan.org/api/admin/clan-wars/intermediate
```

2. Uploader calls `GET /roster` and runs OCR against roster aliases.
3. If screenshot filename does not match expected date pattern, uploader offers fallback:
   - auto-detected KT window candidate from anchor calendar, or
   - manual `start/end` UTC timestamp input.
4. Review preview details (window, totals context, and row count).
5. If prompted, approve missing player creation (`POST /players`).
6. Approve final apply confirmation (`POST /apply`).
7. Validate `Apply result` output in terminal and keep it with operator logs.

## Common Errors

- `invalid-admin-token`
  - Cause: missing/incorrect `X-Admin-Token`.
  - Action: refresh token source and rerun with valid `KT_ADMIN_TOKEN`.
- `roster-size-mismatch`
  - Cause: apply payload player count does not match `rosterExpectation.expectedCount`.
  - Action: re-run OCR, confirm full roster mapping, and retry upload.
- `invalid-apply-request` (with `codes` in response body)
  - Cause: apply payload failed domain validation (for example, unresolved roster rows or count mismatch).
  - Action: inspect returned `codes`, reconcile roster/aliases, then rerun upload.
  - Example `codes`:
    - `unknown-player-id` with `unknownPlayerIds` means one or more `playerId` values do not exist in roster profiles.
- `apply-failed`
  - Cause: runtime write failure during apply phase.
  - Action: inspect worker logs and DB health; rerun once underlying failure is resolved.
