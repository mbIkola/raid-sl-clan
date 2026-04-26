# Cloudflare MVP Foundation Design

**Date:** 2026-04-26

## Goal

Replace the current legacy scaffold with a Cloudflare-first monorepo foundation that can ship:

- a publicly reachable website;
- a minimal Telegram webhook bot;
- explicit architectural boundaries that keep business logic independent from Cloudflare.

This is a foundation spec for the first sub-project only. It does not attempt to design the full product roadmap.

## Scope

### In scope

- remove the current legacy delivery/infrastructure scaffold from the active path;
- establish a Cloudflare-first monorepo structure;
- create one `Next.js + OpenNext` deployable for both site delivery and Telegram webhook handling;
- define architectural boundaries for `core`, `application`, `ports`, `platform`, and `apps/web`;
- initialize `beads` in this repository with GitHub integration;
- record working rules in `AGENTS.md`;
- define repository interfaces and `D1` integration boundaries;
- store SQL migrations in the repository;
- define provider contracts for future LLM and vector search integrations;
- define testing and error-handling expectations for the MVP.

### Out of scope

- `admin`;
- `MCP`;
- `Workers AI`;
- `Vectorize`;
- `cron jobs`;
- authentication or authorization;
- markdown guide rendering;
- stateful bot behavior;
- a complete data model for the future product;
- production-grade analytics, observability, or multi-service infrastructure.

## Product Boundaries

The first MVP contains exactly two user-facing surfaces.

### 1. Public website

The website is a minimal landing/site shell deployed on Cloudflare through `Next.js + OpenNext`.

Expected characteristics:

- publicly accessible URL;
- simple landing-style experience;
- no auth;
- no admin functionality;
- no runtime dependency on `D1`;
- no markdown-content rendering in MVP.

### 2. Telegram webhook bot

The bot is intentionally simple and is delivered through `POST /api/telegram/webhook` in the same deployable.

Expected behavior:

- responds to `/start`;
- responds to `/help`;
- can return fixed text;
- can return a link to the website;
- does not store conversation state;
- does not perform domain-specific actions;
- does not depend on cron jobs.

## Architectural Direction

The target architecture is a modular monorepo with a hexagonal migration path.

This means:

- the MVP is not a full "clean architecture" ceremony;
- boundaries are established immediately;
- Cloudflare-specific concerns stay at the edges;
- future evolution toward stricter hexagonal architecture remains possible without rewriting the whole system.

## Repository Shape

Proposed high-level structure:

```text
apps/
  web/                     # Next.js + OpenNext delivery layer
packages/
  core/                    # pure business logic
  application/             # use cases / orchestration
  ports/                   # external contracts
  platform/                # Cloudflare / Telegram / D1 adapters
platform/
  migrations/              # SQL migrations stored in repo
docs/
  superpowers/
    specs/
    plans/
```

### `apps/web`

Responsibilities:

- `Next.js + OpenNext` app;
- public website delivery;
- Telegram webhook route;
- request parsing;
- response formatting;
- runtime composition and dependency wiring.

Non-responsibilities:

- business rules;
- SQL access;
- Cloudflare-independent use case logic.

### `packages/core`

Responsibilities:

- pure domain logic;
- entities, value objects, and domain rules;
- domain rules that do not depend on platform or transport.

Must not know about:

- Cloudflare;
- `Request` / `Response`;
- Telegram SDK details;
- SQL;
- D1;
- `fetch`;
- OpenNext;
- Next.js runtime objects.

### `packages/application`

Responsibilities:

- use cases;
- orchestration of domain logic;
- calls to external dependencies through `ports`;
- neutral result objects for delivery layers to map into HTTP responses.

Must not know about:

- Cloudflare bindings;
- Telegram transport details;
- direct SQL access;
- D1 SDK or client specifics.

### `packages/ports`

Responsibilities:

- contracts for infrastructure-facing needs;
- repository interfaces;
- provider interfaces such as `LlmProvider` and `SearchProvider`;
- neutral contracts that belong outside core business rules, such as `Clock` or `IdGenerator`, when a use case requires them.

This package defines what the application needs from the outside world without dictating how the outside world is implemented.

### `packages/platform`

Responsibilities:

- Cloudflare-specific adapters;
- Telegram transport adapter logic;
- `D1` repository implementations;
- runtime env/binding access abstractions;
- later, thin cron trigger adapters.

This is the only package where platform-specific implementation detail is expected to accumulate.

### `platform/migrations`

Responsibilities:

- versioned SQL migrations stored in Git;
- schema changes for future `D1` usage;
- shared source of truth for local and remote schema evolution.

The application must never rely on manual schema changes performed only in a cloud dashboard.

## Runtime Model

There is one deployable in the MVP:

- `apps/web` deployed through `Next.js + OpenNext` on Cloudflare.

That single deployable serves:

- the public website;
- `POST /api/telegram/webhook`.

There are no separate Workers, no separate bot service, and no separate admin surface in this first iteration.

## Request Flow

### Website request flow

1. A user requests a website route.
2. `apps/web` renders the route as a static or near-static Next page.
3. If no external dependency is required, the route stays entirely within delivery code.
4. The route returns the rendered page response.

### Telegram webhook flow

1. Telegram sends a `POST` request to `/api/telegram/webhook`.
2. The route handler in `apps/web` receives the raw request.
3. The route delegates payload parsing and transport adaptation to `packages/platform`.
4. The platform adapter converts the payload into a neutral application input.
5. `packages/application` executes the appropriate use case.
6. `packages/core` applies any business rule needed.
7. The result is mapped back into a transport response.
8. The route returns a controlled HTTP response, typically `200 OK`.

## Cloudflare Boundaries

Cloudflare-specific runtime knowledge is allowed only in:

- `apps/web`;
- `packages/platform`.

This implies the following rules:

- `core` must not import Cloudflare types or bindings;
- `application` must not know whether a request came from a Worker, OpenNext, or any other runtime;
- `ports` may describe dependencies, but never platform SDK implementations;
- route handlers may compose dependencies, but must not contain business logic.

These boundaries are the main anti-lock-in mechanism for the MVP.

## Data Boundaries

### `D1` in MVP

`D1` is part of platform readiness, not a functional dependency of the first MVP.

This means:

- a `D1` database may be created as part of environment setup;
- bindings may be prepared;
- migrations must exist in the repository;
- the website and simple bot must still function even if no runtime data path is exercised.

### Repository rule

Access to `D1` is allowed only through repository implementations.

That means:

- no SQL inside route handlers;
- no direct D1 client access inside `application`;
- no schema knowledge leaking into `core`;
- future database behavior is consumed only through interfaces defined in `ports`.

This rule exists even before repositories are actively used in runtime. The point is to prevent "temporary" shortcuts from becoming permanent architecture.

### SQL migrations

SQL migrations must be stored in Git under a repository path such as:

- `platform/migrations`.

Required properties:

- migrations are versioned;
- schema evolution is reproducible;
- local and remote environments derive from repository state, not dashboard-only actions.

## Provider Contracts

Even though LLM and vector search are out of scope for the first MVP runtime, their architectural boundaries are established now.

### `LlmProvider`

Rules:

- all future LLM access goes through `LlmProvider`;
- `application` may depend on the interface;
- no direct use of Workers AI APIs outside platform adapters.

### `SearchProvider`

Rules:

- all future vector or similar search access goes through `SearchProvider`;
- `application` may depend on the interface;
- no direct use of `Vectorize` outside platform adapters.

These contracts preserve replaceability and keep the future product from hard-wiring platform choices into use cases.

## Markdown Guide Rule

Markdown guides are not part of the first MVP feature set, but the rule is established now:

- markdown guides live outside core business logic;
- content may reside in GitHub and may move elsewhere later;
- content access must remain replaceable;
- application logic must not assume a fixed hosting location for markdown content.

The MVP website therefore does not implement markdown rendering, but the architecture does not treat markdown content as application-internal truth.

## Operational Workflow Constraints

The expected startup path for operators is:

1. create a Cloudflare account;
2. open `Workers & Pages`;
3. create a Hello World Worker;
4. verify a `*.workers.dev` URL;
5. create a `D1` database;
6. install `Wrangler` locally;
7. create the `Next.js + OpenNext` app in this repository;
8. bind Cloudflare resources;
9. add `/api/telegram/webhook`;
10. do not create cron jobs in this MVP.

This workflow is operational guidance, not application architecture. Platform setup must not dictate the shape of `core` or `application`.

## `beads` And GitHub Integration

The first spec includes:

- installing and initializing `beads` in this repository;
- connecting `beads` to GitHub;
- documenting usage rules in `AGENTS.md`.

The first spec does not include:

- a heavy mandatory process framework;
- advanced workflow automation;
- turning `beads` into a central runtime dependency.

`beads` is a repository workflow tool, not part of product architecture.

## Legacy Removal

The following legacy scaffold is intentionally removed from the repository:

- `apps/backend`;
- `apps/admin`;
- `apps/bot`;
- `services/mcp`;
- `infra/compose`.

These pieces represent a previous direction that conflicts with the Cloudflare-first MVP foundation and should not remain as semi-supported baggage.

## Error Handling

### Route handlers

Rules:

- route handlers must return controlled HTTP responses;
- route handlers must not leak raw platform/internal errors;
- route handlers must stay thin and delegate application work outward.

### Application layer

Rules:

- use cases return explicit success/failure results or clearly typed application errors;
- use cases do not encode HTTP-specific or Cloudflare-specific details.

### Telegram webhook behavior

Rules:

- valid update -> controlled `200 OK`;
- invalid payload -> controlled `4xx`;
- internal failure -> controlled `5xx`;
- no stack traces or infrastructure details in outward responses.

### Logging

Logging belongs in delivery and platform layers, not in `core`.

## Testing Strategy

The MVP needs real tests, but only where they pay rent.

### Required testing layers

- unit tests for `packages/core`;
- unit tests for `packages/application`;
- contract or adapter tests where `ports` boundaries need verification;
- route/webhook request-response tests for `apps/web`;
- smoke validation for the OpenNext deployable path.

### Not required in first iteration

- large end-to-end suites;
- heavy D1 integration tests for flows that do not yet use runtime persistence;
- broad infrastructure testing for out-of-scope features.

The principle is simple: test meaningful logic and critical boundaries, not imaginary complexity.

## `AGENTS.md` Rules To Record

The repository rules to capture in `AGENTS.md` include at minimum:

- core logic does not know about Cloudflare;
- `D1` is accessed only through repositories;
- LLM access is allowed only through `LlmProvider`;
- vector search access is allowed only through `SearchProvider`;
- markdown guides live outside application internals and may move;
- SQL migrations are stored in the repository;
- cron jobs call ordinary functions and must not contain business logic;
- route handlers stay thin;
- platform-specific code belongs in `apps/web` or `packages/platform`.

## Success Criteria

The first MVP foundation is successful when:

- the repository no longer carries the old delivery/infrastructure scaffold as an active path;
- the new modular monorepo structure exists;
- `apps/web` is the single Cloudflare deployable;
- the website is publicly reachable;
- the Telegram webhook endpoint is reachable and responds predictably;
- architectural rules are written into `AGENTS.md`;
- `beads` is initialized with GitHub integration;
- repository interfaces exist for later data/provider work;
- SQL migrations are stored in Git;
- the codebase keeps Cloudflare-specific logic out of `core` and `application`.

## Risks And Non-Goals

### Main risks

- letting Next/OpenNext delivery concerns leak into application logic;
- reintroducing direct platform calls because "it is faster for now";
- leaving legacy scaffold partially alive and confusing future work;
- treating Cloudflare resource setup as a substitute for architecture.

### Non-goals

- designing the full future product;
- solving persistence-heavy workflows now;
- introducing AI/vector features before they are needed;
- preserving old infrastructure because it already exists.

## Design Summary

This spec defines a focused first step:

- one Cloudflare deployable;
- one public website;
- one minimal Telegram webhook bot;
- modular package boundaries that isolate business logic from platform concerns;
- contracts for data, LLM, and search without prematurely implementing integrations;
- repository-owned operational artifacts such as migrations and working rules.

The purpose is not to over-engineer the MVP. The purpose is to prevent the MVP from hardening into platform-coupled sludge.
