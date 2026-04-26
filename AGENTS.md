# Raid SL Clan Knowledge Base

This file is a working knowledge base for agents and humans operating in this repository.
It reflects repository inspection performed on 2026-04-26 and should be corrected where product reality differs from the code.

## Current Snapshot

- Monorepo based on `pnpm` workspaces and TypeScript.
- Main parts: backend API, public web SPA, admin SPA, Telegram bot, MCP server, shared package, UI package.
- Overall maturity: prototype / scaffold, not a finished product.
- Code typechecks cleanly across all workspaces with local `tsc`.
- Backend runtime was smoke-tested locally: `GET /api/health` returns `{"status":"ok"}`.
- MCP runtime was smoke-tested locally: server starts and responds on `/mcp` with protocol-level `400 No sessionId` when called without a proper MCP session.
- There are no automated tests in the repository.

## Workspace Map

### Root

- `package.json`
  - Workspace scripts: `build`, `dev`, `lint`, `typecheck`
  - Package manager pinned to `pnpm@9.0.0`
- `pnpm-workspace.yaml`
  - Workspaces: `apps/*`, `services/*`, `packages/*`
- `README.md`
  - High-level setup notes
- `infra/compose/docker-compose.yml`
  - Traefik + service wiring
- `configs/eslint/.eslintrc.cjs`
  - ESLint config exists, but is not wired into app/package directories
- `configs/prettier/.prettierrc`
  - Prettier config exists

### `apps/backend`

Source of truth: `apps/backend/src/index.ts`

- Fastify server with:
  - CORS enabled for any origin
  - WebSocket plugin enabled
  - `GET /api/health`
  - `GET /ws` WebSocket endpoint that sends a single `"hello from ws"` message
- No auth
- No persistence
- No domain logic
- No CRUD resources
- No validation layer
- Env: `PORT` (`apps/backend/.env.example`)

### `apps/web`

Main entry points:

- `apps/web/src/main.tsx`
- `apps/web/src/app.tsx`
- `apps/web/src/core/Router.tsx`

Implemented:

- React SPA on Vite
- MUI theme with custom gothic-like styling and random backgrounds
- `react-helmet-async` head/meta setup
- i18n with `i18next`
  - Supported languages: `en`, `ru`, `uk`
  - Translation files under `apps/web/src/i18n/locales/*/translation.json`
- Routes:
  - `/` -> landing page
  - `/dashboard` -> placeholder dashboard
  - `/about` -> simple about page
  - `*` -> custom 404 page

Current page status:

- Landing page (`apps/web/src/pages/landing/landing.tsx`)
  - Shows animated links to `stats`, `login`, `about`
  - `login` points to `/login`, but no such route exists
- Dashboard (`apps/web/src/pages/dashboard/dashboard.tsx`)
  - Placeholder page
  - Uses `PrimaryButton`
  - Contains `alert('Click!')`
- About (`apps/web/src/pages/about/about.tsx`)
  - Minimal heading-only page
- Not found (`apps/web/src/pages/notfound/notfound.tsx`)
  - Styled 404 page with back link

### `apps/admin`

Main files:

- `apps/admin/src/main.tsx`
- `apps/admin/src/provider.ts`

Implemented:

- React-Admin app
- `simpleRestProvider('/api')`
- One declared resource: `users`
- `ListGuesser` used as placeholder list UI

Reality:

- Backend does not implement `/api/users`
- Admin is therefore scaffolded but not functional end-to-end

### `apps/bot`

Source: `apps/bot/src/index.ts`

Implemented:

- grammY Telegram bot
- `/start` command replies with `"Hello! I am alive."`
- Any message replies with `"Got your message!"`

Missing:

- Backend integration
- Commands beyond health/echo behavior
- Any clan-specific logic

Env:

- `TELEGRAM_BOT_TOKEN`

### `services/mcp`

Source: `services/mcp/src/server.ts`

Implemented:

- FastMCP HTTP Stream server
- Tool: `ping` -> returns `"pong"`

Missing:

- Domain tools
- Integration with backend/bot/data
- Auth or access control

Env:

- `MCP_PORT`

### `packages/shared`

Source: `packages/shared/src/index.ts`

Contains only:

- `User` type with `id` and `username`
- `isProd()` helper

This is currently a seed package, not a real shared domain module.

### `packages/ui`

Source: `packages/ui/src/index.tsx`

Contains only:

- `PrimaryButton` wrapper over MUI `Button`

This is also a seed package, not yet a real design system.

## What Is Already Done

If stripped to facts, this is what the repository already provides:

1. A monorepo skeleton with separated apps/services/packages.
2. A minimal Fastify backend that can answer health checks and accept a stub WebSocket connection.
3. A styled React public site with routing, head tags, and localization.
4. A scaffolded React-Admin panel wired to a REST base path.
5. A minimal Telegram bot that responds to messages.
6. A minimal MCP server that exposes a single tool.
7. Shared/UI packages ready to grow, though barely inhabited.
8. Dockerfiles and Compose wiring intended for local orchestration, though not yet trustworthy.

## What Is Not Done

The codebase does **not** currently contain the following:

- Real business/domain model for a Raid SL Clan product
- Database layer or ORM
- Authentication or authorization
- User/resource CRUD on the backend
- API contract for admin or web consumption
- Real dashboard/statistics logic
- Login flow
- Bot workflows beyond echo behavior
- MCP tools beyond demo ping
- Automated tests
- CI/CD configuration
- Proper lint wiring

## Known Gaps And Contradictions

These are the most important mismatches between intent and implementation.

### Product / feature gaps

- The landing page links to `/login`, but the router has no `/login` route.
- The dashboard is placeholder-only.
- The admin app expects `/api/users`, but backend only exposes `/api/health` and `/ws`.
- The shared and UI packages are mostly placeholders.

### Quality / tooling gaps

- No tests exist anywhere in the repository.
- ESLint scripts are declared in packages, but running ESLint from the repo currently fails because no config is discovered from app/package paths.
- The repository contains `configs/eslint/.eslintrc.cjs`, but package scripts do not point to it.

### Infrastructure gaps

- Dockerfiles run `pnpm install --frozen-lockfile`, but they do not copy `pnpm-lock.yaml` into the image build context.
  - That makes the current Docker builds likely to fail or behave inconsistently.
- Final runtime Docker stages for `backend`, `bot`, and `mcp` copy only compiled `dist` and `package.json`.
  - They do not install or copy runtime dependencies like `fastify`, `grammy`, or `fastmcp`.
  - As written, those containers are likely to fail at runtime.
- `apps/web` uses `BrowserRouter`, but the Nginx image has no SPA fallback config.
  - Direct reloads on `/about` or `/dashboard` will likely 404 in containerized deployment.
- `apps/admin/dist/index.html` references assets via absolute `/assets/...` paths.
  - In Compose, admin is mounted behind `/admin` with Traefik strip-prefix middleware.
  - Asset requests are therefore likely to be routed incorrectly unless base paths are fixed.

### Environment caveat observed during inspection

- In this local environment, `pnpm` invocation through Corepack attempted to fetch `pnpm@9.0.0` and failed on TLS certificate verification.
- Existing `node_modules` were already present, so direct local binaries and direct runtime commands still worked for inspection.
- This caveat may be environment-specific, not a repository bug, but it matters for onboarding.

## How To Start The Project

### Standard Intended Flow

From repo root:

```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm install
```

Then start services individually:

```bash
pnpm --filter @raid/backend dev
pnpm --filter @raid/web dev
pnpm --filter @raid/admin dev
pnpm --filter @raid/bot dev
pnpm --filter @raid/mcp dev
```

Expected default ports:

- Backend: `3000`
- Web Vite dev server: `5173`
- Admin Vite dev server: `5174`
- MCP: `8080`

### Environment Variables

- Backend: `PORT`
- Bot: `TELEGRAM_BOT_TOKEN`
- MCP: `MCP_PORT`

No env example files exist for `apps/web` or `apps/admin`.

### Smoke Checks

Backend:

```bash
curl http://localhost:3000/api/health
```

Expected:

```json
{"status":"ok"}
```

MCP:

```bash
curl -i http://localhost:8080/mcp
```

Expected:

- An MCP protocol error such as `400 No sessionId` when hitting the endpoint without a proper MCP session.
- That still proves the server is listening.

### Docker / Compose Status

Intended command:

```bash
cd infra/compose
docker compose up --build
```

Current assessment:

- Treat Docker/Compose as incomplete until the Dockerfiles are fixed.
- Static web/admin images may build more easily than backend/bot/mcp, but the Node service images are not production-correct today.

### Verification Performed During Inspection

Verified directly:

- TypeScript typecheck passes for:
  - `packages/shared`
  - `packages/ui`
  - `apps/backend`
  - `apps/web`
  - `apps/admin`
  - `apps/bot`
  - `services/mcp`
- `apps/backend/dist/index.js` starts and answers `/api/health`
- `services/mcp/dist/server.js` starts and answers on `/mcp`

Not verified:

- `pnpm` workspace scripts in this exact shell environment
- Docker builds
- End-to-end UI behavior in browser
- Telegram bot with a real token
- Admin panel talking to a real API resource

## Recommended Work Plan

This is the plan suggested by the codebase as it exists now, not by wishful thinking.

### Phase 1: Make The Repository Honest

Goal:

- Make local setup, linting, and container builds reflect reality.

Tasks:

- Decide the canonical Node/pnpm bootstrap path and document it
- Wire ESLint config so `lint` actually works
- Commit and use a real workspace lockfile
- Fix Dockerfiles:
  - copy lockfile
  - install production dependencies for runtime services
  - fix SPA serving strategy
- Validate `docker compose up --build`

### Phase 2: Define The Actual Product Contract

Goal:

- Turn the monorepo from a scaffold into a system with a real domain.

Tasks:

- Decide what entities exist:
  - users
  - clans
  - players
  - statistics
  - raids
  - auth sessions
- Define backend API resources and payload shapes
- Decide whether WebSocket is needed now or later
- Decide what the MCP server is supposed to expose
- Decide whether the bot is read-only, administrative, or interactive

### Phase 3: Make Backend And Admin Meet In Reality

Goal:

- Replace placeholder assumptions with working API-backed flows.

Tasks:

- Implement real REST resources in backend
- Add storage layer
- Add validation and error handling
- Align admin resources to real endpoints
- Remove `ListGuesser` once schemas are known

### Phase 4: Make Web Useful

Goal:

- Replace presentation-only pages with actual product flows.

Tasks:

- Implement or remove `/login`
- Replace placeholder dashboard with real statistics/features
- Connect web to backend API
- Decide auth model for public vs admin areas
- Add proper loading/error/empty states

### Phase 5: Make Bot And MCP Earn Their Place

Goal:

- Ensure both integrations serve the same domain model rather than drifting into toy demos.

Tasks:

- Connect bot to backend/domain logic
- Define concrete bot commands
- Replace MCP `ping` with real tools
- Add auth, scopes, or trusted deployment boundaries where needed

### Phase 6: Add Safety Nets

Goal:

- Stop relying on luck.

Tasks:

- Add unit/integration tests
- Add basic end-to-end coverage for web/admin
- Add CI for typecheck, lint, tests, and build
- Add runtime health checks beyond a trivial ping

## Questions To Resolve When Aligning With Reality

These are the questions worth answering before major implementation begins.

1. What is the actual product scope of "Raid SL Clan"?
2. Which surfaces truly matter in phase one: public web, admin, Telegram bot, MCP server?
3. What is the primary source of truth for clan/player/stat data?
4. Is authentication required for web, admin, bot, MCP, or only some of them?
5. Is WebSocket actually needed, or is it just scaffold residue?
6. Is Docker Compose the real local-dev path, or only an aspirational one?

## Practical Reading Order For New Agents

If you are new to the repo, read in this order:

1. `README.md`
2. `package.json`
3. `infra/compose/docker-compose.yml`
4. `apps/backend/src/index.ts`
5. `apps/web/src/core/Router.tsx`
6. `apps/web/src/pages/landing/landing.tsx`
7. `apps/admin/src/main.tsx`
8. `apps/bot/src/index.ts`
9. `services/mcp/src/server.ts`
10. `packages/shared/src/index.ts`
11. `packages/ui/src/index.tsx`

That is enough to understand the whole system, such as it is.

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
