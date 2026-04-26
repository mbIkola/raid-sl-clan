# Raid SL Clan Knowledge Base

This file is a working knowledge base for agents and humans operating in this repository.
It reflects repository state as of 2026-04-26 and should be corrected when code and docs drift.

## Current Snapshot

- Monorepo based on `pnpm` workspaces and TypeScript.
- Cloudflare-first architecture with one active deployable in `apps/web`.
- Runtime model: public website plus Telegram webhook served from the same Cloudflare deployment.
- Internal package boundaries exist in `packages/core`, `packages/application`, `packages/ports`, and `packages/platform`.
- Repository-owned D1 migrations live in `platform/migrations`.
- `pnpm typecheck` passes across the current workspace skeleton.
- Tests exist and should be run from the workspace root with `pnpm test`.

## Workspace Map

### Root

- `package.json`
  - Workspace scripts: `dev:web`, `preview:web`, `deploy:web`, `test`, `test:watch`, `typecheck`
  - Package manager pinned to `pnpm@9.0.0`
- `pnpm-workspace.yaml`
  - Workspaces: `apps/*`, `packages/*`
- `README.md`
  - Cloudflare-first architecture, workflow, and validation guide
- `tsconfig.base.json`
  - Shared TypeScript settings and path aliases
- `vitest.config.ts`
  - Test runner configuration for packages and `apps/web`
- `platform/migrations`
  - Repository-owned SQL migrations for D1
- `docs/operator`
  - Operator runbooks for Cloudflare bootstrap and deploy work

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
- Commented D1 binding scaffold pending authenticated Cloudflare setup

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

1. A Cloudflare-first monorepo with one active deployable surface in `apps/web`.
2. Shared package boundaries for domain, application, ports, and platform code.
3. A root Vitest configuration with repository-level tests.
4. A repository-owned D1 migration directory.
5. Operator documentation for Cloudflare bootstrap work.

## What Does Not Exist Yet

- Additional deployable services
- Production D1 bindings committed with real IDs
- Authenticated Cloudflare bootstrap state in this repository
- Broader product/domain implementation
- Authentication or authorization

## Verification Performed

Verified directly:

- `pnpm install`
- `pnpm typecheck`
- `pnpm test`
- `apps/web` has no nested `.git`

Not yet verified:

- Authenticated Cloudflare resource creation from this environment
- Real `d1_databases` binding IDs in `apps/web/wrangler.jsonc`
- Any production deployment path

## Architecture Rules

- Treat Cloudflare as the platform target unless the user explicitly changes direction.
- Keep Cloudflare-specific code in `apps/web` and `packages/platform`.
- Keep domain rules in `packages/core`.
- Keep orchestration in `packages/application`.
- Keep infrastructure contracts in `packages/ports`.
- Access D1 only through repository implementations, never directly from route handlers or application services.
- Store schema changes under `platform/migrations`.
- Do not fabricate Cloudflare IDs, tokens, or deployment readiness.
- Prefer repo-owned commands and runbooks over dashboard-only manual steps.

## Workflow Rules

- Use `pnpm test` and `pnpm typecheck` as baseline validation for code changes.
- For Cloudflare work, prefer `pnpm --filter @raid/web exec wrangler ...` from the repo root.
- If Cloudflare auth is missing, report the blocker plainly instead of pretending the environment is deploy-ready.
- When changing architecture docs, preserve the beads workflow block at the end of this file.

## Practical Reading Order

If you are new to the repo, read in this order:

1. `README.md`
2. `package.json`
3. `pnpm-workspace.yaml`
4. `tsconfig.base.json`
5. `apps/web/wrangler.jsonc`
6. `docs/operator/cloudflare-bootstrap.md`
7. `apps/web/src/app/layout.tsx`
8. `apps/web/src/app/page.tsx`
9. `apps/web/src/app/api/telegram/webhook/route.ts`
10. `packages/core/src/index.ts`
11. `packages/application/src/index.ts`
12. `packages/ports/src/index.ts`
13. `packages/platform/src/index.ts`

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
