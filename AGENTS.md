# Raid SL Clan Knowledge Base

This file is a working knowledge base for agents and humans operating in this repository.
It reflects repository state as of 2026-05-04 and should be corrected when code and docs drift.

## Current Snapshot

- Monorepo based on `pnpm` workspaces and TypeScript.
- GitHub Actions is the source of truth for production build and deploy orchestration.
- Cloudflare deployment with one active deployable in `apps/web`, while core architecture remains platform-neutral.
- Runtime model: public website plus Telegram webhook served from the same Cloudflare deployment.
- Internal package boundaries exist in `packages/core`, `packages/application`, `packages/ports`, and `packages/platform`.
- Repository-owned D1 migrations live in `platform/migrations`.
- D1 schema migrations `0001_bootstrap.sql` and `0002_clan_competition_schema.sql` are applied for local development and the remote production database.
- Remote preview D1 is currently not maintained as a required baseline and may intentionally lag behind production schema.
- Countdown display contract is `days + hours` for `>= 24h` and `hours + minutes` for `< 24h` (no `0d` prefix).
- KT countdown anchor is currently a biweekly Tuesday `09:00 UTC` start with `48h` duration; known personal rewards seed anchor is `2026-05-05T09:00:00.000Z`.
- `pnpm typecheck` passes across the current workspace skeleton.
- Tests exist and should be run from the workspace root with `pnpm test`.

## Workspace Map

### Root

- `package.json`
  - Workspace scripts: `dev:web`, `preview:web`, `deploy:web`, `test`, `test:watch`, `typecheck`
  - Package manager pinned to `pnpm@10.15.1`
- `pnpm-workspace.yaml`
  - Workspaces: `apps/*`, `packages/*`
- `README.md`
  - Cloudflare deployment model, platform-neutral architecture rules, workflow, and validation guide
- `tsconfig.base.json`
  - Shared TypeScript settings and path aliases
- `vitest.config.ts`
  - Test runner configuration for packages and `apps/web`
- `platform/migrations`
  - Repository-owned SQL migrations for D1
- `docs/operator`
  - Operator runbooks for Cloudflare bootstrap, delivery model, and deploy work
- `docs/research`
  - Repository-owned research documents and imported external research reports

### `apps/web`

Source of truth:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/api/telegram/webhook/route.ts`
- `apps/web/wrangler.jsonc`

Implemented:

- Next.js App Router application
- OpenNext + Wrangler configuration for Cloudflare deployment
- Telegram webhook route handled in the same deployable
- Committed D1 binding in `apps/web/wrangler.jsonc` with real `database_id`, `preview_database_id`, and `migrations_dir: "../../platform/migrations"`

### `packages/core`

Contains pure domain primitives and rules. This package must remain free of Cloudflare, SQL, and transport-specific code.

### `packages/application`

Contains application orchestration and use cases. It may depend on `@raid/core` and `@raid/ports`, but not on Cloudflare SDKs or direct D1 access.

### `packages/ports`

Contains boundary interfaces for repositories and provider contracts.

### `packages/platform`

Contains Cloudflare, Telegram, and future D1-backed adapter implementations.

### `platform/migrations`

Contains the versioned SQL source of truth for D1 schema changes.

## What Exists

1. A monorepo currently deployed on Cloudflare with one active deployable surface in `apps/web`.
2. Shared package boundaries for domain, application, ports, and platform code.
3. A root Vitest configuration with repository-level tests.
4. A repository-owned D1 migration directory.
5. A committed `d1_databases` binding in `apps/web/wrangler.jsonc` pointing at the repository-owned D1 migrations directory.
6. Operator documentation for Cloudflare bootstrap, delivery model, and deploy work.

## What Does Not Exist Yet

- Additional deployable services
- Broader product/domain implementation
- Authentication or authorization

## Verification Performed

Verified directly:

- `pnpm install`
- `pnpm typecheck`
- `pnpm test`
- `pnpm -r run build`
- `pnpm --filter @raid/web run cf:build`
- `pnpm --filter @raid/web exec wrangler d1 migrations apply raid-sl-clan --local`
- `pnpm --filter @raid/web exec wrangler d1 migrations list raid-sl-clan --local` reports no unapplied migrations after local apply
- `pnpm --filter @raid/web exec wrangler whoami` with token-based auth (`CLOUDFLARE_API_TOKEN`)
- `pnpm --filter @raid/web exec wrangler d1 migrations list raid-sl-clan --remote` reports no unapplied migrations for production
- `pnpm --filter @raid/web exec wrangler d1 execute raid-sl-clan --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"` lists the expected competition schema tables on production
- `pnpm --filter @raid/web exec wrangler d1 migrations list raid-sl-clan --remote --preview` reports unapplied migrations for preview
- `apps/web` has no nested `.git`

Not yet verified:

- Authenticated Cloudflare resource creation or recreation from this environment
- Remote preview D1 migration apply from this environment (preview is currently optional and not treated as a release gate)
- Any production deployment path

## Architecture Rules

- Treat Cloudflare as the current runtime target while keeping architecture portable and migration-ready.
- Keep Cloudflare-specific code in `apps/web` and `packages/platform`.
- Keep domain and orchestration layers platform-neutral to avoid vendor lock-in.
- Keep domain rules in `packages/core`.
- Keep orchestration in `packages/application`.
- Keep infrastructure contracts in `packages/ports`.
- Access D1 only through repository implementations, never directly from route handlers or application services.
- Store schema changes under `platform/migrations`.
- Do not fabricate Cloudflare IDs, tokens, or deployment readiness.
- Prefer repo-owned commands and runbooks over dashboard-only manual steps.

## Workflow Rules

- Use `pnpm test`, `pnpm typecheck`, `pnpm -r run build`, `pnpm --filter @raid/web run cf:build`, and `pnpm --filter @raid/web exec wrangler d1 migrations list raid-sl-clan --local` as the baseline validation gate for code changes.
- For Cloudflare work, prefer `pnpm --filter @raid/web exec wrangler ...` from the repo root.
- If Cloudflare auth is missing, report the blocker plainly instead of pretending the environment is deploy-ready.
- When changing architecture docs, preserve the beads workflow block at the end of this file.
- Keep all research documents under `docs/research`.
- GitHub Actions is the source of truth for production delivery; do not reintroduce Cloudflare dashboard-managed repository builds.
- Follow docs/operator/delivery-model.md when changing CI/CD, deploy triggers, or Cloudflare delivery flow.
- Do not add package publishing flows unless the user explicitly changes repository policy.

## Practical Reading Order

If you are new to the repo, read in this order:

1. `README.md`
2. `package.json`
3. `pnpm-workspace.yaml`
4. `tsconfig.base.json`
5. `apps/web/wrangler.jsonc`
6. `docs/operator/cloudflare-bootstrap.md`
7. `docs/operator/delivery-model.md`
8. `apps/web/src/app/layout.tsx`
9. `apps/web/src/app/page.tsx`
10. `apps/web/src/app/api/telegram/webhook/route.ts`
11. `packages/core/src/index.ts`
12. `packages/application/src/index.ts`
13. `packages/ports/src/index.ts`
14. `packages/platform/src/index.ts`

That is enough to understand the current skeleton.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
