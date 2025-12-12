# Backend Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
RUN corepack enable && pnpm -v && pnpm install --frozen-lockfile
RUN pnpm --filter @raid/backend run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
RUN npm pkg delete devDependencies && npm pkg delete scripts.dev && npm pkg delete scripts.lint && npm pkg delete scripts.typecheck
CMD ["node", "dist/index.js"]

