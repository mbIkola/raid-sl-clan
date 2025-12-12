# Bot Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
RUN corepack enable && pnpm -v && pnpm install --frozen-lockfile
RUN pnpm --filter @raid/bot run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/bot/dist ./dist
COPY --from=build /app/apps/bot/package.json ./package.json
CMD ["node", "dist/index.js"]

