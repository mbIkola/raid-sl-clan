# GitHub Actions Delivery Model Design

**Date:** 2026-04-26

## Goal

Replace Cloudflare-managed repository builds with a repository-owned delivery model where GitHub Actions is the only build and production deployment orchestrator.

This design standardizes the toolchain on current `pnpm`, keeps Cloudflare as the deployment target rather than the build controller, and records the delivery rules in repository documentation and agent guidance.

## Scope

### In scope

- upgrade the repository package manager pin from `pnpm@9` to current `pnpm@10`;
- regenerate the lockfile under `pnpm@10`;
- convert the existing GitHub Actions workflow into a single validation-plus-production-deploy pipeline;
- run production deploys only on `push` to `main`;
- keep pull requests limited to validation without preview deployment;
- document the delivery model under `docs/operator`;
- add an `AGENTS.md` reference to the delivery model document.

### Out of scope

- preview deployments;
- branch environments;
- public or private package publishing;
- release automation unrelated to Cloudflare deployment;
- replacing `OpenNext` or changing the target runtime away from Cloudflare;
- changing application architecture beyond what is required for delivery.

## Chosen Approach

The repository will use one GitHub Actions workflow as the source of truth for CI and CD.

Behavior:

- `pull_request` runs validation only;
- `push` to `main` runs the same validation and then performs the production deploy;
- Cloudflare dashboard repository builds are not used for this repository.

This is intentionally simple. Splitting validation and deployment into separate workflows is unnecessary at the current scale and increases maintenance overhead without a concrete operational gain.

## Delivery Model

### Source of truth

GitHub Actions is the only orchestrator allowed to:

- install dependencies for CI/CD;
- build the workspace;
- validate the workspace before release;
- trigger the production Cloudflare deployment.

Cloudflare remains the platform target and runtime host. It is not the build source of truth.

### Trigger model

- `pull_request`: run validation steps only;
- `push` to `main`: run validation steps, then production deploy;
- no deploys for any other branch;
- no preview deployments.

### Workflow shape

The existing `.github/workflows/ci.yml` will be updated rather than introducing a second workflow.

Expected step order:

1. checkout repository;
2. install `pnpm@10`;
3. install `Node.js 20` with `pnpm` cache;
4. run `pnpm install --frozen-lockfile`;
5. run `pnpm test`;
6. run `pnpm typecheck`;
7. run `pnpm -r run build`;
8. run `pnpm deploy:web` only when the event is `push` on `main`.

The deploy step must be guarded by workflow conditions rather than by human convention.

## Secrets And Environment

The production deploy requires only the Cloudflare credentials needed by `wrangler` and `OpenNext` deployment tooling:

- `CLOUDFLARE_API_TOKEN`;
- `CLOUDFLARE_ACCOUNT_ID`.

These secrets belong in GitHub Actions repository secrets. They are not to be committed to the repository and are not to be modeled as dashboard-only operator knowledge.

No `npm` authentication, registry tokens, or publish credentials are part of this design.

## Documentation Changes

Add a dedicated operator document at `docs/operator/delivery-model.md`.

That document must state:

- GitHub Actions owns build and production deploy orchestration;
- Cloudflare dashboard repository builds must remain disabled;
- production deploy happens only from `main`;
- preview environments are intentionally unsupported;
- required GitHub secrets and their purpose;
- the practical recovery path when a deploy fails.

## Agent Guidance Changes

`AGENTS.md` must reference `docs/operator/delivery-model.md` and treat it as the authoritative delivery policy for this repository.

The guidance should be brief and explicit:

- CI/CD and deployment changes must follow `docs/operator/delivery-model.md`;
- agents must not introduce Cloudflare dashboard-managed builds as an alternate path;
- agents must not add package publishing flows unless the user explicitly changes repository policy.

## Migration Notes

If `Connect to repository` is currently enabled for the Cloudflare Worker service, it must be disabled once the GitHub Actions production deploy is in place.

Running both systems against the same production target creates competing deploy paths, ambiguous release state, and unnecessary failure modes.

## Verification

Before merging the implementation of this design, the following must pass from the repository root:

- `pnpm install --frozen-lockfile`;
- `pnpm test`;
- `pnpm typecheck`;
- `pnpm -r run build`.

The updated GitHub Actions workflow must also be reviewed to confirm:

- the deploy step is gated to `push` on `main`;
- pull requests never deploy;
- no preview or publish logic exists.

## Risks And Mitigations

### Risk: toolchain drift

If local development, CI, and deployment use different `pnpm` majors, lockfile churn and inconsistent installs follow quickly.

Mitigation:

- pin `pnpm@10` in the repository;
- use the same major explicitly in GitHub Actions.

### Risk: dual deploy control planes

If both GitHub Actions and Cloudflare-managed builds remain enabled, production state becomes difficult to reason about.

Mitigation:

- document GitHub Actions as the single orchestrator;
- disable Cloudflare repository builds for this Worker.

### Risk: accidental scope growth

Delivery changes often attract unrelated “while we are here” automation.

Mitigation:

- keep the implementation limited to package-manager alignment, one workflow, one operator document, and one `AGENTS.md` reference.
