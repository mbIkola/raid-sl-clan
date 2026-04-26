# Raid SL Clan Knowledge Base

This file is a working knowledge base for agents and humans operating in this repository.
It reflects repository state as of 2026-04-26 and should be corrected when code and docs drift.

## Current Snapshot

- Monorepo based on `pnpm` workspaces and TypeScript.
- Current application surface: a minimal Next.js app in `apps/web`.
- Internal package skeletons exist in `packages/core`, `packages/application`, `packages/ports`, and `packages/platform`.
- The repository has been reset away from the previous multi-service scaffold.
- `pnpm typecheck` passes across the current workspace skeleton.
- There are no real product features, persistence, or tests yet.

## Workspace Map

### Root

- `package.json`
  - Workspace scripts: `dev:web`, `preview:web`, `deploy:web`, `test`, `test:watch`, `typecheck`
  - Package manager pinned to `pnpm@9.0.0`
- `pnpm-workspace.yaml`
  - Workspaces: `apps/*`, `packages/*`
- `README.md`
  - High-level skeleton overview
- `tsconfig.base.json`
  - Shared TypeScript settings and path aliases
- `vitest.config.ts`
  - Test runner configuration for packages and `apps/web`

### `apps/web`

Source of truth:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`

Implemented:

- Minimal Next.js App Router scaffold
- TypeScript and ESLint configuration from `create-next-app`
- Basic root layout and home page

### `packages/core`

Contains the first shared domain entry point for future core types and constants.

### `packages/application`

Contains the application-layer package skeleton and depends on `@raid/core` and `@raid/ports`.

### `packages/ports`

Contains the boundary/interface package skeleton for future adapters and repositories.

### `packages/platform`

Contains the platform-adapter package skeleton and depends on `@raid/application` and `@raid/ports`.

## What Exists

1. A minimal monorepo skeleton with one Next.js app and four internal packages.
2. Shared TypeScript path aliases for the internal packages.
3. A root Vitest configuration ready for package and web tests.
4. A lockfile and workspace layout aligned with the current skeleton.

## What Does Not Exist Yet

- Backend API
- Admin app
- Additional removed service surfaces
- Compose/Traefik deployment scaffold
- Persistence or domain logic
- Authentication or authorization
- Automated tests

## Verification Performed

Verified directly:

- `pnpm install`
- `pnpm typecheck`
- `apps/web` has no nested `.git`

Not yet verified:

- Web app behavior in a browser
- `pnpm test` with real tests
- Any production deployment path

## Practical Reading Order

If you are new to the repo, read in this order:

1. `README.md`
2. `package.json`
3. `pnpm-workspace.yaml`
4. `tsconfig.base.json`
5. `apps/web/src/app/layout.tsx`
6. `apps/web/src/app/page.tsx`
7. `packages/core/src/index.ts`
8. `packages/application/src/index.ts`
9. `packages/ports/src/index.ts`
10. `packages/platform/src/index.ts`

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
