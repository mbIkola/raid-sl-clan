# KT Intermediate Results Upload Design

Date: 2026-05-05  
Status: Draft for review

## 1. Context

Clan Wars (KT) intermediate results need a reliable path from screenshot to production D1 with minimal operator friction and strict data safety.

The repository already has:

- a D1 competition schema (`competition_window`, `clan_wars_report`, `clan_wars_player_score`, `player_profile`, `player_alias`, `report_import`);
- an OCR CLI prototype in `tool/ocr-clan-results`;
- a Cloudflare-hosted API surface in `apps/web`.

Current requirement is not a full async ingest platform. It is a pragmatic operator pipeline:

1. OCR screenshot locally.
2. Auto-correct nicknames using current roster.
3. Show preview and confirmation.
4. Create missing players only when operator confirms.
5. Apply one authoritative `full replace` payload for one KT window.

Telegram support is out of scope for this implementation cycle, but logic boundaries must allow reusing the same pipeline later.

## 2. Goals

- Add production API endpoints to create missing players and apply intermediate KT results.
- Use strict `full replace` semantics (payload is authoritative for the window).
- Resolve/create `competition_window` by semantic `windowRef` (not pre-existing ID requirement).
- Keep CLI interaction explicit: preview, new-player confirmation, final apply confirmation.
- Keep auth simple for prototype (`X-Admin-Token`) but isolated for later migration to OAuth/JWT.
- Separate interface from logic so Telegram can reuse the same use-cases later.

## 3. Non-Goals

- No asynchronous job queue.
- No snapshot history table for every intermediate upload.
- No full Telegram OCR flow in this phase.
- No OAuth/JWT rollout in this phase.

## 4. Confirmed Product Decisions

- Import mode: `upsert latest` with `full replace` rows per KT window.
- Payload row count must match expected roster size; mismatch is a hard error.
- Unknown OCR nicknames:
  - operator can confirm creating new players via separate request;
  - if operator rejects, import is aborted.
- Window auto-resolution:
  - date source is screenshot filename first;
  - parsed in local timezone of the machine running CLI;
  - if parse fails, CLI offers auto-suggestion or manual window entry.
- Prototype auth:
  - API: one `X-Admin-Token` from ENV;
  - clients (CLI/bot): same token from ENV via shared auth helper module.
- Telegram authorization policy:
  - hardcoded whitelist by `telegram_user_id` in a dedicated module.

## 5. Architecture and Boundaries

## 5.1 Layer responsibilities

- `apps/web`
  - HTTP route handlers only.
  - Auth gate and request/response translation.
  - No D1 SQL in route files.
- `packages/application`
  - `applyClanWarsIntermediateResults` use-case.
  - `createClanWarsPlayers` use-case.
  - Cross-field business validation.
- `packages/ports`
  - contracts for repositories/services used by use-cases.
- `packages/platform`
  - D1 implementations and transactional writes.
  - admin-token verification module.
  - telegram-whitelist module.
- `tool/ocr-clan-results`
  - OCR extraction, normalization, fuzzy nickname matching, preview UI, confirmations, API calls.

## 5.2 Reuse strategy for future Telegram flow

The CLI and future Telegram adapter must call the same application use-cases and payload validators. Only the interaction shell differs:

- CLI shell: terminal prompts + preview table.
- Telegram shell: chat prompts + inline confirmation.

## 6. API Surface

Base prefix: `/api/admin/clan-wars/intermediate`

All endpoints require header: `X-Admin-Token: <token>`.

## 6.1 `POST /players`

Creates missing players before apply.

Request:

```json
{
  "players": [
    {
      "mainNickname": "NewNick1",
      "aliases": ["NewNick1"]
    }
  ]
}
```

Validation:

- `players` non-empty array.
- `mainNickname` non-empty.
- no duplicates inside request (case-insensitive normalization rules aligned with alias matching strategy).

Response:

```json
{
  "created": [
    {
      "playerId": 123,
      "mainNickname": "NewNick1"
    }
  ]
}
```

Behavior:

- Creates `player_profile`.
- Creates primary `player_alias` (`game_nickname`) for each player.
- Idempotent by alias uniqueness: existing alias returns existing player record instead of hard failure.

## 6.2 `POST /apply`

Applies authoritative intermediate results for one KT window.

Request:

```json
{
  "windowRef": {
    "activityType": "clan_wars",
    "eventStartAt": "2026-05-05T09:00:00.000Z",
    "eventEndsAt": "2026-05-07T09:00:00.000Z"
  },
  "meta": {
    "hasPersonalRewards": true,
    "opponentClanName": "Best in Raid",
    "sourceKind": "ocr_cli_intermediate",
    "capturedAt": "2026-05-05T10:15:00+03:00"
  },
  "rosterExpectation": {
    "expectedCount": 30
  },
  "players": [
    {
      "playerId": 11,
      "displayNameAtImport": "AZAZEL",
      "points": 167681
    }
  ]
}
```

Validation:

- `windowRef.activityType === "clan_wars"`.
- valid ISO timestamps and `eventStartAt < eventEndsAt`.
- KT duration constraint: 48 hours.
- `players.length === rosterExpectation.expectedCount` (hard requirement).
- `playerId` unique in payload.
- `points` integer `>= 0`.
- all `playerId` must exist.

Total-points consistency rule:

- `meta.clanTotalPointsMine` is optional in this phase.
- if provided, enforce `sum(players.points) === meta.clanTotalPointsMine`;
- if absent, skip this check.

Response:

```json
{
  "ok": true,
  "competitionWindowId": 456,
  "clanWarsReportId": 789,
  "replacedRows": 30
}
```

## 7. Window Resolution and Creation

`apply` must not require a pre-existing `competition_window_id`.

Server behavior:

1. find matching row by semantic key:
   - `activity_type = "clan_wars"`,
   - `starts_at = eventStartAt`,
   - `ends_at = eventEndsAt`;
2. if missing, create `competition_window`:
   - `cadence_slot = "biweekly"`,
   - `rotation_number = NULL`,
   - derive `season_year` and `week_of_year` from `eventStartAt`.

This keeps API stable even when operator uploads a fresh window before any scheduled seeding task.

## 8. Transaction Semantics (`full replace`)

`POST /apply` executes in one transaction:

1. resolve/create `competition_window`;
2. create `report_import` record;
3. upsert/create `clan_wars_report` for window and apply report metadata;
4. delete existing `clan_wars_player_score` rows for that report/window;
5. insert all payload rows;
6. set `report_import.status = "applied"` and `finished_at`.

On any validation or write failure:

- rollback transaction fully;
- mark import failed where possible (or return explicit failure if transaction never opened).

## 9. CLI Flow

1. OCR screenshot.
2. Determine candidate window from filename date in local machine timezone.
3. If unresolved:
   - offer auto-suggested window; or
   - manual window entry.
4. Load current roster and aliases.
5. Fuzzy-match OCR names to known players.
6. Build preview:
   - window/meta summary,
   - player rows,
   - roster-size check,
   - new-player candidates.
7. If new players exist:
   - ask confirmation to create;
   - call `/players` if confirmed;
   - abort process if rejected.
8. Ask final apply confirmation.
9. Call `/apply`.
10. Print concise success/failure result.

## 10. Error Model

Standardized error codes:

- `401 invalid-admin-token`
- `400 invalid-window-ref`
- `400 roster-size-mismatch`
- `400 duplicate-player-id`
- `400 unknown-player-id`
- `409 inconsistent-total-points`
- `409 import-conflict`
- `500 apply-failed`

CLI must map these to actionable operator text and stop on hard errors.

## 11. Security and Policy Modules

Prototype auth modules:

- `getAdminAuthHeaders()` for clients (CLI now, Telegram later).
- `verifyAdminToken()` for server route guard.

Telegram policy module:

- `isTelegramUserAllowed(telegramUserId)` (hardcoded allowlist in this phase).

Keeping these modules isolated avoids refactoring blast radius when replacing token auth with OAuth/JWT.

## 12. Testing Strategy

Application unit tests:

- payload validator rules.
- windowRef duration and activity checks.
- roster-size enforcement.

Platform integration tests (D1):

- create window on first apply when absent.
- `full replace` removes old rows and inserts new set.
- rollback on roster mismatch.
- rollback on unknown players.

CLI tests:

- new players confirmed => `/players` then `/apply`.
- new players rejected => abort without `/apply`.
- filename parse fallback path (auto-suggest/manual input).

## 13. Rollout Plan (Implementation Order)

1. Add ports and application use-cases.
2. Implement platform repositories/transactions in D1.
3. Add web API routes and auth guard.
4. Extend OCR CLI with preview/confirm/create/apply flow.
5. Add tests across layers.
6. Run root quality gates (`pnpm test`, `pnpm typecheck`, build checks).

## 14. Open Follow-Ups (Out of Current Scope)

- Replace `X-Admin-Token` with stronger auth (OAuth/JWT/Access).
- Unify CLI and Telegram interaction adapters on shared import orchestration service.
- Evaluate if `Idempotency-Key` is required immediately or in next iteration.
