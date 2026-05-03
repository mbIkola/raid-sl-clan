# Clan Global Results + Trends TODO

Date: 2026-05-03
Status: Backlog (not in current implementation scope)

## Why this exists

Current dashboard trends show only aggregate score (`total_score`) for Hydra/Chimera.
We do not persist clan place and outcome for those windows, so UI cannot render:

- place in tournament;
- victory/defeat marker.

Example source screenshots (manual capture):

- `/Users/nkharche/Library/Containers/ru.keepcoder.Telegram/Data/tmp/telegram-cloud-photo-size-2-5444889964706469782-y.jpg`
- `/Users/nkharche/Library/Containers/ru.keepcoder.Telegram/Data/tmp/telegram-cloud-photo-size-2-5449831109832151956-y.jpg`

Observed fields from examples:

- activity: Hydra / Chimera;
- place (`5`);
- keys spent (`76` / `37`);
- clan score (`60,05B` / `36,09B`);
- clan name + tag (`Вільне Братство [BiБр]`);
- clan level (`19`).

## Current schema gap

`clan_wars_report` stores only report metadata + `has_personal_rewards`, and does not store place/outcome.
Hydra/Chimera trends are computed only from player totals and do not include clan placement/outcome data.

## Proposed data model (new)

### 1) `clan_competition_leaderboard_snapshot`

One snapshot per competition window for clan-level leaderboard data.

Columns:

- `id INTEGER PRIMARY KEY`
- `competition_window_id INTEGER NOT NULL UNIQUE REFERENCES competition_window(id)`
- `source_kind TEXT NOT NULL` (`game_screenshot`, `clan_chat`, `manual_json`)
- `source_ref TEXT` (message id, file name, URL, etc.)
- `captured_at TEXT NOT NULL` (ISO UTC capture timestamp)
- `created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`

### 2) `clan_competition_leaderboard_entry`

Rows of leaderboard positions from snapshot (top N + our clan row at minimum).

Columns:

- `id INTEGER PRIMARY KEY`
- `snapshot_id INTEGER NOT NULL REFERENCES clan_competition_leaderboard_snapshot(id) ON DELETE CASCADE`
- `place INTEGER NOT NULL CHECK (place > 0)`
- `clan_name TEXT NOT NULL`
- `clan_tag TEXT`
- `clan_level INTEGER`
- `keys_spent INTEGER CHECK (keys_spent IS NULL OR keys_spent >= 0)`
- `total_score INTEGER NOT NULL CHECK (total_score >= 0)`
- `is_our_clan INTEGER NOT NULL DEFAULT 0 CHECK (is_our_clan IN (0, 1))`
- `created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`

Indexes and constraints:

- `UNIQUE (snapshot_id, place)`
- `UNIQUE (snapshot_id, clan_name, clan_tag)`
- index on `(snapshot_id, is_our_clan)`

## Outcome semantics for trends

Store outcome as derived value in application layer:

- `victory` when `place <= 3`;
- `defeat` when `place > 3`;
- `unknown` when place is missing.

For Siege, prefer native `siege_report.result` (`win`/`loss`) when present.

## Dashboard trends changes

### Contract updates

Extend trend point shape with:

- `clanPlace: number | null`
- `outcome: "victory" | "defeat" | "unknown"`

### SQL/repository updates

- keep existing Hydra/Chimera `total_score` aggregation;
- join latest snapshot per `competition_window`;
- pick `is_our_clan = 1` row to extract `place` and optional clan-level score overrides;
- fallback to `null` place and `unknown` outcome when no snapshot exists.

### UI updates (`Dashboard Trends`)

Add columns:

- `Place` (`#5`, `#1`, or `—`);
- `Outcome` (`Victory` / `Defeat` / `—`).

Display rule:

- keep current compact number rendering for score;
- do not block row render if place/outcome missing.

## Ingestion notes

Input source can be clan chat/history messages and/or screenshots.
Need parser normalization rules for score strings:

- `"60,05B"` -> `60050000000`
- `"36,09B"` -> `36090000000`

Prefer import payload schema that accepts:

- activity + window (`competition_window_id` or starts/ends);
- leaderboard entries array;
- explicit `is_our_clan`.

## TODO checklist

- [ ] Add D1 migration for new leaderboard snapshot tables.
- [ ] Add import command/path for clan-level leaderboard snapshots.
- [ ] Add repository query for `place + outcome` per trend row.
- [ ] Extend `@raid/ports` trend contracts with `clanPlace` and `outcome`.
- [ ] Render new columns in `apps/web` trends zone.
- [ ] Add tests for missing snapshot fallback and top-3 boundary (`place=3` vs `place=4`).
