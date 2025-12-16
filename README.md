# Raid SL Clan Monorepo

Stack: pnpm workspaces, TypeScript, Fastify backend (REST/WebSocket), React SPA (MUI, i18n), React-Admin, Telegram bot (grammy), MCP server (fastmcp), Traefik reverse proxy.

## Workspaces
- apps/backend
- apps/web
- apps/admin
- apps/bot
- services/mcp
- packages/shared
- packages/ui

## Quick start

1. Install pnpm (Corepack):

```
corepack enable
corepack prepare pnpm@latest --activate
```

2. Install deps:

```
pnpm install
```

3. Dev (per app):

```
pnpm --filter @raid/backend dev
pnpm --filter @raid/web dev
pnpm --filter @raid/admin dev
pnpm --filter @raid/bot dev
pnpm --filter @raid/mcp dev
```

4. Build all:

```
pnpm build
```

5. Docker compose (Traefik + services):

```
cd infra/compose
docker compose up --build
```

Traefik dashboard: http://localhost:8080

Routes:
- Web: http://localhost/
- Admin: http://localhost/admin
- Backend API: http://localhost/api
- Backend WS: ws://localhost/ws
- MCP: http://localhost/mcp

## Env variables
- apps/backend: `PORT`
- apps/bot: `TELEGRAM_BOT_TOKEN`
- services/mcp: `MCP_PORT`
