# Raid SL Clan

Cloudflare-first skeleton for the Raid SL Clan project.

## Layout

- `apps/web`: Next.js app router application
- `packages/core`: shared domain primitives
- `packages/application`: application services
- `packages/ports`: boundary interfaces
- `packages/platform`: platform adapters

## Scripts

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm dev:web
```

## Notes

- Workspace packages are defined in `pnpm-workspace.yaml`.
- TypeScript path aliases are defined in `tsconfig.base.json`.
- The repository currently contains a minimal web app and empty internal package skeletons only.
