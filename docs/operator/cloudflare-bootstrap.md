# Cloudflare Bootstrap

This repository deploys from `apps/web` as a Cloudflare-first Next.js + OpenNext application.
There is one deployable surface in the current foundation:

- the public web application;
- the Telegram webhook route served from the same deployable;
- a repository-owned D1 migration directory under `platform/migrations`.

Do not improvise infrastructure state in the Cloudflare dashboard and pretend the repo knows about it. The dashboard is a control plane, not a source of truth.

## Delivery Model

Primary CI/CD for this repository lives in GitHub Actions. Read `docs/operator/delivery-model.md` before changing build or deployment behavior.

Cloudflare remains the runtime target, but Cloudflare dashboard repository builds are not the source of truth for production delivery.

## Prerequisites

- Node.js 24 or newer
- `corepack` enabled
- Cloudflare account access for the target account
- `wrangler` access through `wrangler login` or `CLOUDFLARE_API_TOKEN`

## Bootstrap Checklist

1. Create or log into the Cloudflare account for this environment.
2. Open `Developer Platform -> Workers & Pages`.
3. Create a temporary Hello World Worker to verify the account can issue a `*.workers.dev` URL.
4. Run `pnpm --filter @raid/web exec wrangler login`.
5. Confirm auth with `pnpm --filter @raid/web exec wrangler whoami`.
6. Confirm the committed D1 binding in `apps/web/wrangler.jsonc` still matches the intended `raid-sl-clan` and `raid-sl-clan-preview` databases.
7. Create or replace those D1 databases only if an authenticated operator is intentionally changing remote infrastructure, then update `apps/web/wrangler.jsonc` with the returned IDs and keep `migrations_dir` set to `../../platform/migrations`.
8. Create `.dev.vars` from `apps/web/.dev.vars.example`.
9. Apply migrations locally with the committed binding, and apply them remotely only when authenticated Cloudflare access is available for the target database.
10. Deploy with `pnpm deploy:web`.
11. Register the Telegram webhook with `curl`.

If step 5 fails, stop. Without Cloudflare auth the rest of the checklist is ceremony without substance.

## Workspace Bootstrap

From the repository root:

```bash
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install
```

Validate the current workspace before touching Cloudflare resources:

```bash
pnpm test
pnpm typecheck
```

## Cloudflare Authentication

Interactive auth:

```bash
pnpm --filter @raid/web exec wrangler login
pnpm --filter @raid/web exec wrangler whoami
```

Token-based auth:

```bash
export CLOUDFLARE_API_TOKEN=replace-me
pnpm --filter @raid/web exec wrangler whoami
```

If `wrangler whoami` reports that authentication is missing, stop there. You cannot create or replace remote D1 databases, update committed D1 IDs, or run remote migrations without valid auth.

## Workers Platform Sanity Check

In the Cloudflare dashboard:

1. Open `Developer Platform -> Workers & Pages`.
2. Create a temporary Hello World Worker.
3. Confirm Cloudflare assigns a working `*.workers.dev` URL.
4. Delete the temporary worker if your account policy requires a clean slate.

This step proves the account is actually provisioned for Workers before you waste time debugging local tooling.

## Local Development

Run the Next.js development server:

```bash
pnpm dev:web
```

Expected local app URL:

```text
http://localhost:3000
```

For local worker-style preview with OpenNext:

```bash
pnpm preview:web
```

Create the local vars file before testing webhook flows:

```bash
cp apps/web/.dev.vars.example apps/web/.dev.vars
```

## D1 Bootstrap

The initial repository migration lives at:

```text
platform/migrations/0001_bootstrap.sql
```

`apps/web/wrangler.jsonc` already commits a real `d1_databases` binding with `database_id`, `preview_database_id`, and `migrations_dir: "../../platform/migrations"`. Local Wrangler D1 migration commands use that committed binding and the repository-owned migrations directory.

Use the committed binding to create the local D1 database and apply migrations:

```bash
pnpm --filter @raid/web exec wrangler d1 migrations apply raid-sl-clan --local
pnpm --filter @raid/web exec wrangler d1 migrations list raid-sl-clan --local
```

The local migrations list command has already been verified to succeed and report `0001_bootstrap.sql`.

Create or replace the remote databases only after authentication succeeds and only when operator work actually requires new database IDs:

```bash
pnpm --filter @raid/web exec wrangler d1 create raid-sl-clan
pnpm --filter @raid/web exec wrangler d1 create raid-sl-clan-preview
```

If those commands return replacement IDs, update `apps/web/wrangler.jsonc` so the committed binding remains accurate:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "raid-sl-clan",
    "database_id": "<production database id>",
    "preview_database_id": "<preview database id>",
    "migrations_dir": "../../platform/migrations"
  }
]
```

Apply migrations locally through the committed binding:

```bash
pnpm --filter @raid/web exec wrangler d1 migrations apply raid-sl-clan --local
pnpm --filter @raid/web exec wrangler d1 migrations list raid-sl-clan --local
```

Apply migrations to the remote database only when authenticated Cloudflare access is available:

```bash
pnpm --filter @raid/web exec wrangler d1 migrations apply raid-sl-clan --remote
```

## Preview And Deploy

Preview the worker bundle locally:

```bash
pnpm preview:web
```

Deploy the Cloudflare application manually only when doing operator bootstrap or emergency recovery:

```bash
pnpm deploy:web
```

Normal production delivery should happen from GitHub Actions on `push` to `main` as described in `docs/operator/delivery-model.md`.

The standard production workflow now applies remote D1 migrations in GitHub Actions before the deploy step on `main`. If that migration step fails, treat the release as blocked instead of trying to outrun the schema mismatch by wishful thinking.

## Telegram Webhook Registration

After deploy, register the webhook against the production site URL:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<your-workers-domain>/api/telegram/webhook"}'
```

Verify the response from Telegram reports success before assuming the bot is reachable.

## Repository Rules

- Keep Cloudflare-specific runtime code in `apps/web` and `packages/platform`.
- Keep domain logic in `packages/core`.
- Keep orchestration in `packages/application`.
- Keep infrastructure contracts in `packages/ports`.
- Access D1 only through repository implementations in `packages/platform`.
- Store schema changes only in `platform/migrations`.
- Do not hard-code fake Cloudflare IDs into `wrangler.jsonc`.

## Validation Checklist

Run these from the repository root:

```bash
pnpm --filter @raid/web exec wrangler whoami
pnpm --filter @raid/web exec wrangler d1 migrations list raid-sl-clan --local
pnpm test
pnpm typecheck
```

The local D1 command should use the committed binding and succeed. If remote D1 commands fail without Cloudflare authentication, that is expected; remote creation, replacement, and migration work remain operator-gated.
