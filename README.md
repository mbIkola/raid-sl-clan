# Raid SL Clan

Cloudflare-deployed monorepo foundation for the Raid SL Clan website, Telegram webhook, and future D1-backed platform adapters, with platform-neutral core boundaries to avoid vendor lock-in.

## Architecture

The current runtime deployment target is Cloudflare, with one deployable application in `apps/web`.
Core and application layers are intentionally platform-neutral so the runtime can be migrated if needed.

- `apps/web`: Next.js App Router application deployed through OpenNext on Cloudflare
- `packages/core`: pure domain primitives and business rules
- `packages/application`: use cases and orchestration
- `packages/ports`: external contracts and repository interfaces
- `packages/platform`: Cloudflare, Telegram, and D1-facing adapters
- `platform/migrations`: repository-owned SQL migrations for D1
- `docs/operator`: operator runbooks for Cloudflare bootstrap and GitHub Actions delivery-model work

Current foundation scope:

- public website;
- Telegram webhook route under the same deployable;
- repository-managed D1 migration path;
- tests and typechecking at the workspace root.

## Repository Rules

- Treat Cloudflare as the current deployment target, not a hard architectural dependency.
- Keep Cloudflare runtime code in `apps/web` and `packages/platform`.
- Keep `packages/core` free of Cloudflare SDKs, SQL, and transport concerns.
- Keep `packages/application` focused on orchestration through `packages/ports`.
- Access D1 only through repository implementations, never directly from route handlers or application services.
- Store schema changes in `platform/migrations`, not in ad hoc dashboard edits.
- Do not claim Cloudflare resources are configured until `wrangler` proves it.

## Local Development

Bootstrap the workspace with Node.js 24:

```bash
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install
```

Run the web app locally:

```bash
pnpm dev:web
```

Useful root scripts:

```bash
pnpm test
pnpm typecheck
pnpm preview:web
pnpm deploy:web
```

## D1 Migrations

The initial D1 migration lives at `platform/migrations/0001_bootstrap.sql`.

`apps/web/wrangler.jsonc` already commits a real `d1_databases` binding with `database_id`, `preview_database_id`, and `migrations_dir: "../../platform/migrations"`. Local Wrangler D1 commands use that committed binding and the repository-owned migrations directory.

The local workflow is:

```bash
pnpm --filter @raid/web exec wrangler d1 migrations apply raid-sl-clan --local
pnpm --filter @raid/web exec wrangler d1 migrations list raid-sl-clan --local
```

The local migration apply and list commands have been verified with `0001_bootstrap.sql` and `0002_clan_competition_schema.sql`; after apply, local list reports no unapplied migrations.

For remote validation (authenticated operator context), production D1 migration list has been verified to report no unapplied migrations.
Preview D1 is currently optional and may intentionally remain behind production.

Remote D1 creation, recreation, and remote migration work still require authenticated Cloudflare operator access. The repo contains committed binding IDs, but this repository does not pretend remote infrastructure can be changed without valid Cloudflare credentials.

## Preview And Deploy

Preview the Cloudflare worker bundle locally:

```bash
pnpm preview:web
```

Standard production release happens from GitHub Actions on `push` to `main`.
Delivery behavior is defined in `docs/operator/delivery-model.md`.
Set the GitHub Actions variable `PUBLIC_SITE_URL` to the canonical production hostname so the deploy path rewrites `apps/web/wrangler.jsonc` before the Cloudflare build runs.

Deploy the application manually only for bootstrap or emergency recovery:

```bash
pnpm deploy:web
```

Before a manual deploy that depends on D1:

1. authenticate Wrangler;
2. confirm the target production D1 database matches the committed binding (and check preview only if your workflow depends on preview parity), or update the binding if an authenticated operator has replaced it;
3. apply migrations remotely if the release depends on schema changes;
4. deploy.

## Operator Docs

Operator runbooks live in:

- `docs/operator/cloudflare-bootstrap.md`
- `docs/operator/delivery-model.md`
- `docs/operator/kt-intermediate-upload.md`

## KT Intermediate Upload (Operator)

- API base: `/api/admin/clan-wars/intermediate`
- `GET /roster`
- `POST /players`
- `POST /apply`
- Auth header: `X-Admin-Token`
- Local uploader:

```bash
KT_ADMIN_TOKEN=... node tool/ocr-clan-results/upload-intermediate.mjs \
  --image /absolute/path/to/screenshot.jpg \
  --api-base-url http://localhost:8787/api/admin/clan-wars/intermediate
```

## Validation

Run these from the repository root:

```bash
pnpm test
pnpm typecheck
pnpm -r run build
pnpm --filter @raid/web run cf:build
pnpm --filter @raid/web exec wrangler d1 migrations list raid-sl-clan --local
```

This mirrors the GitHub Actions validation gate before the production deploy step on `main`.
The local Wrangler command uses the committed D1 binding in `apps/web/wrangler.jsonc` and is expected to succeed. Remote D1 commands still depend on authenticated Cloudflare access, and production deployment itself is not claimed as locally verified here.
