# MCP Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY services ./services
RUN corepack enable && pnpm -v && pnpm install --frozen-lockfile
RUN pnpm --filter @raid/mcp run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/services/mcp/dist ./dist
COPY --from=build /app/services/mcp/package.json ./package.json
CMD ["node", "dist/server.js"]

