# Delivery Model

This repository builds and deploys through GitHub Actions.

Cloudflare is the runtime target. It is not the build orchestrator for this repository.

## Source Of Truth

- GitHub Actions installs dependencies;
- GitHub Actions runs validation;
- GitHub Actions performs the production deploy;
- Cloudflare dashboard repository builds must remain disabled.

## Trigger Model

- `pull_request`: validation only;
- `push` to `main`: validation, then production deploy;
- no preview deploys;
- no branch deploys.

## Required GitHub Secrets

- `CLOUDFLARE_API_TOKEN`
  - API token used by `wrangler` and `opennextjs-cloudflare deploy`.
- `CLOUDFLARE_ACCOUNT_ID`
  - Cloudflare account identifier used during deploy.

No `npm` publish token is required because this repository does not publish packages.

## Production Workflow

The production workflow is `.github/workflows/ci.yml`.

Step order:

1. checkout;
2. install `pnpm@10.15.1`;
3. install Node.js 20 with `pnpm` cache;
4. run `pnpm install --frozen-lockfile`;
5. run `pnpm test`;
6. run `pnpm typecheck`;
7. run `pnpm -r run build`;
8. run `pnpm deploy:web` only for `push` to `main`.

## Cloudflare Dashboard Policy

If `Workers -> raid-sl-clan-web -> Settings -> Builds` still has `Connect to repository` enabled, disable it after the GitHub workflow is active.

Running both GitHub Actions and Cloudflare-managed repository builds against the same service creates competing deploy paths and ambiguous production state.

## Failure Recovery

If the GitHub Actions deploy fails:

1. inspect the failing workflow run in GitHub;
2. fix the repository or secret configuration;
3. re-run the workflow from GitHub after the cause is corrected.

Manual `pnpm deploy:web` remains available for operator debugging or emergency use, but it is not the standard production release path.
