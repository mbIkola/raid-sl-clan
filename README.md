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
- `docs/operator`: operator runbooks for Cloudflare bootstrap and deploy work

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
corepack prepare pnpm@9.0.0 --activate
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

Local Wrangler D1 migration commands are blocked until `apps/web/wrangler.jsonc` contains a real, uncommented `d1_databases` binding with `migrations_dir: "../../platform/migrations"`. With the current commented scaffold, Wrangler falls back to `apps/web/migrations` and the local migration commands fail.

Once the real binding exists, the local workflow is:

```bash
pnpm --filter @raid/web exec wrangler d1 migrations apply raid-sl-clan --local
pnpm --filter @raid/web exec wrangler d1 migrations list raid-sl-clan --local
```

Remote D1 setup requires Cloudflare authentication and real database IDs. Until `wrangler d1 create` has been run by an authenticated operator, `apps/web/wrangler.jsonc` intentionally contains only a commented scaffold for the `d1_databases` binding.

## Preview And Deploy

Preview the Cloudflare worker bundle locally:

```bash
pnpm preview:web
```

Deploy the application:

```bash
pnpm deploy:web
```

Before a real deploy that depends on D1:

1. authenticate Wrangler;
2. create the production and preview D1 databases;
3. update `apps/web/wrangler.jsonc` with the real IDs;
4. apply migrations remotely;
5. deploy.

## Operator Docs

Cloudflare bootstrap and operator commands live in:

- `docs/operator/cloudflare-bootstrap.md`

## Validation

Run these from the repository root:

```bash
pnpm test
pnpm typecheck
pnpm --filter @raid/web exec wrangler d1 migrations list raid-sl-clan --local
```

The Wrangler command is expected to fail until the real D1 binding is present in `apps/web/wrangler.jsonc`. Remote D1 commands and real binding IDs depend on Cloudflare authentication.
