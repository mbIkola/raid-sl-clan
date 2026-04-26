# Raid SL Clan

Cloudflare-first monorepo foundation for the Raid SL Clan website, Telegram webhook, and future D1-backed platform adapters.

## Architecture

The active runtime target is Cloudflare, with one deployable application in `apps/web`.

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

- Keep Cloudflare runtime code in `apps/web` and `packages/platform`.
- Keep `packages/core` free of Cloudflare SDKs, SQL, and transport concerns.
- Keep `packages/application` focused on orchestration through `packages/ports`.
- Access D1 only through repository implementations, never directly from route handlers or application services.
- Store schema changes in `platform/migrations`, not in ad hoc dashboard edits.
- Do not claim Cloudflare resources are configured until `wrangler` proves it.

## Local Development

Bootstrap the workspace:

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

The local migrations list command has been verified to succeed and report `0001_bootstrap.sql`.

Remote D1 creation, recreation, and remote migration work still require authenticated Cloudflare operator access. The repo contains committed binding IDs, but this repository does not pretend remote infrastructure can be changed without valid Cloudflare credentials.

## Preview And Deploy

Preview the Cloudflare worker bundle locally:

```bash
pnpm preview:web
```

Standard production release happens from GitHub Actions on `push` to `main`.
Delivery behavior is defined in `docs/operator/delivery-model.md`.

Deploy the application manually only for bootstrap or emergency recovery:

```bash
pnpm deploy:web
```

Before a manual deploy that depends on D1:

1. authenticate Wrangler;
2. confirm the target production and preview D1 databases match the committed binding, or update the binding if an authenticated operator has replaced them;
3. apply migrations remotely if the release depends on schema changes;
4. deploy.

## Operator Docs

Operator runbooks live in:

- `docs/operator/cloudflare-bootstrap.md`
- `docs/operator/delivery-model.md`

## Validation

Run these from the repository root:

```bash
pnpm test
pnpm typecheck
pnpm --filter @raid/web exec wrangler d1 migrations list raid-sl-clan --local
```

The local Wrangler command uses the committed D1 binding in `apps/web/wrangler.jsonc` and is expected to succeed. Remote D1 commands still depend on authenticated Cloudflare access.
