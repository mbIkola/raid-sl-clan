# Raid Clan Competition Data Model And Import Design

Date: 2026-04-27
Status: Draft for review
Related issue: `raid-sl-clan-5f2`

## 1. Context

The next product step is not a generic statistics feature. It is a clan competition data foundation that must support recurring weekly and biweekly activity windows, preserve enough detail for future analysis, and survive imperfect source data.

The current real-world inputs are uneven:

- Hydra aggregate statistics can be pulled from the legacy Supabase-backed site.
- Hydra and Chimera detail is currently assembled manually from game screenshots, OCR, and locally prepared JSON.
- Clan Wars currently exposes player-to-points totals plus whether the source used personal rewards mode.
- Siege is much more complex, but current practical needs stop at match-level results.

The design must avoid over-normalization, avoid EAV patterns, and still leave room for richer analytics later.

## 2. Goals

Design a pragmatic first data model and import strategy that:

- uses a shared calendar layer across Hydra, Chimera, Clan Wars, and Siege;
- treats `Hydra report` as the root report entity for Hydra data;
- supports player identity through internal profiles plus aliases;
- supports current aggregate imports and future detailed team imports;
- allows week-window replacement imports instead of row-by-row surgery;
- preserves room for future champion and team analytics;
- keeps mode-specific data in mode-specific structures instead of forcing one fake universal schema.

## 3. Non-Goals

This design does not attempt to solve:

- automatic collection from the game client;
- complete raw artifact archival inside the service database;
- full Siege combat modeling;
- a fully trustworthy global player identifier from Plarium;
- a perfect roster inventory for every player;
- final API or admin UI behavior beyond the import concepts needed by the model.

## 4. Domain Rhythm

The calendar is not incidental. It is the backbone of the model.

- Hydra runs weekly, from Wednesday to Wednesday.
- Chimera runs weekly, from Thursday to Thursday.
- Hydra has 4 round-robin rotations.
- Chimera has 3 round-robin rotations.
- Clan Wars runs every two weeks on Tuesdays.
- Siege also runs every two weeks.

The meaningful reporting axis is therefore not a generic date range string from an external source. It is the clan competition window for a known activity type and a known week cadence.

## 5. Design Principles

### Shared calendar, typed reports

There should be one shared calendar layer for cross-activity analytics, but separate report tables for different activity types.

Hydra, Chimera, Clan Wars, and Siege do not have the same data shape. Pretending otherwise would only produce a mess with better branding.

### Internal identity over source labels

The system should track an internal `player_profile` and treat game nicknames and Telegram handles as aliases. Source names are evidence, not truth.

### Replace-by-window imports

The default operational workflow is replacement of one competition window at a time. If a weekly Hydra report is wrong, the operator should be able to say, in effect, "delete the old Hydra week and ingest this one again."

### Detail is optional, not imaginary

Hydra and Chimera must support detailed teams and champion-level data, but those layers can remain empty when only aggregate data exists.

### Practical denormalization is allowed

Frequently queried analytics paths should not be made awkward just to satisfy relational purity. If duplicating stable references in a child table makes reads simpler, that is acceptable.

## 6. Core Entities

### 6.1 `competition_window`

Shared calendar anchor for every tracked activity cycle.

Suggested fields:

- `id`
- `activity_type` with values such as `hydra`, `chimera`, `clan_wars`, `siege`
- `season_year`
- `week_of_year`
- `cadence_slot`
- `rotation_number`
- `starts_at`
- `ends_at`
- `label`

Notes:

- `rotation_number` is required for Hydra and Chimera windows and null for other activity types.
- `cadence_slot` distinguishes weekly and biweekly windows in a query-friendly way.
- `starts_at` and `ends_at` are stored even if they can be inferred. Querying and debugging are easier when dates are explicit.
- The schema should enforce a unique constraint on `(activity_type, season_year, week_of_year, cadence_slot)`.

Expected uniqueness is by the semantic activity window, not by an opaque external ID.

### 6.2 `player_profile`

Internal representation of a clan member or former clan member.

Suggested fields:

- `id`
- `main_nickname`
- `status`
- `joined_at`
- `left_at`
- `notes`

`status` should support operational states such as:

- `active`
- `inactive`
- `removed`

This is the entity that analytics should target. Names are attached to it, not the other way around.

### 6.3 `player_alias`

Known names and handles attached to a player profile.

Suggested fields:

- `id`
- `player_profile_id`
- `alias_type`
- `alias_value`
- `is_primary`
- `first_seen_at`
- `last_seen_at`

Suggested `alias_type` values:

- `game_nickname`
- `telegram_handle`

This table exists because game nicknames and Telegram handles both change, only with different levels of annoyance.

### 6.4 `report_import`

Operational log for import attempts and replacements.

Suggested fields:

- `id`
- `upload_type`
- `source_kind`
- `scope_type`
- `scope_key`
- `replace_existing`
- `status`
- `started_at`
- `finished_at`
- `notes`

Examples of `upload_type`:

- `supabase_hydra_aggregate`
- `ocr_hydra_detail`
- `ocr_chimera_detail`
- `manual_clan_wars`
- `admin_bulk_json`

This is not intended to be a full archival store of screenshots or raw source artifacts. The operator already keeps those locally, which is sufficient for the current workflow.

## 7. Mode-Specific Reports

### 7.1 `hydra_report`

Root report entity for one Hydra competition window.

Suggested fields:

- `id`
- `competition_window_id`
- `report_import_id`
- `source_report_key`
- `source_system`
- `is_partial`

There should be one current Hydra report per Hydra competition window after a successful replace import.

### 7.2 `hydra_player_result`

Player aggregate result inside a Hydra report.

Suggested fields:

- `id`
- `hydra_report_id`
- `player_profile_id`
- `display_name_at_import`
- `total_damage`
- `keys_used`
- `clan_rank`
- `data_completeness`

This row captures the player-level aggregate even when team detail is absent.

`keys_used` is the imported count of Hydra keys consumed by the player in that window.

`data_completeness` should be a constrained enum-like field with values:

- `aggregate_only`
- `partial_detail`
- `full_detail`

### 7.3 `hydra_team_run`

One Hydra team attempt for a player inside a Hydra report.

Suggested fields:

- `id`
- `hydra_player_result_id`
- `hydra_report_id`
- `competition_window_id`
- `player_profile_id`
- `team_index`
- `difficulty`
- `total_damage`
- `attempt_order`
- `data_completeness`

Important decisions:

- `difficulty` is mandatory and Hydra-specific.
- `team_index` is limited to `1..3`.
- `player_profile_id` is intentionally duplicated here for simpler analytical reads.
- `competition_window_id` is also useful here for the same reason.
- `data_completeness` uses the same constrained values as `hydra_player_result`.

For D1, `difficulty` should be implemented as a constrained text field with a Hydra-specific allowed set rather than a fake shared enum with Chimera.

This denormalization is deliberate. A common query like "show me Myroslav's Hydra teams in the previous rotation" should not require unnecessary gymnastics.

### 7.4 `hydra_team_champion_performance`

Champion-level participation inside a Hydra team run.

Suggested fields:

- `id`
- `hydra_team_run_id`
- `player_profile_id`
- `competition_window_id`
- `champion_code`
- `slot_index`
- `damage_done`
- `build_summary_json`

Notes:

- `slot_index` is limited to `1..6`.
- `champion_code` should be a stable internal champion key, not just free text, once the champion dictionary exists.
- `build_summary_json` can start as a JSON field because build detail will evolve and is not the first implementation priority.

### 7.5 `chimera_report`, `chimera_player_result`, `chimera_team_run`

Chimera follows the same shape as Hydra with smaller team count.

Important differences:

- `chimera_team_run.team_index` is limited to `1..2`.
- `difficulty` is mandatory here as well, but it uses a Chimera-specific allowed set.
- Chimera windows carry `rotation_number` on the shared calendar layer.
- `data_completeness` uses the same constrained values as Hydra.

### 7.6 `chimera_team_champion_performance`

Champion-level participation inside a Chimera team run.

Suggested fields:

- `id`
- `chimera_team_run_id`
- `player_profile_id`
- `competition_window_id`
- `champion_code`
- `slot_index`
- `damage_done`
- `build_summary_json`

This table intentionally mirrors the Hydra structure rather than forcing a generic cross-mode foreign key. If a shared read surface is useful later, expose it through a database view.

### 7.7 `clan_wars_report`

One Clan Wars report for one competition window.

Suggested fields:

- `id`
- `competition_window_id`
- `report_import_id`
- `source_system`
- `is_partial`
- `has_personal_rewards`

### 7.8 `clan_wars_player_score`

Player points for one Clan Wars window.

Suggested fields:

- `id`
- `clan_wars_report_id`
- `competition_window_id`
- `player_profile_id`
- `display_name_at_import`
- `points`

This mode remains intentionally simple for now because the source data is simple.

### 7.9 `siege_report`

Current Siege model stops at match-level outcome.

Suggested fields:

- `id`
- `competition_window_id`
- `report_import_id`
- `opponent_clan_name`
- `result`
- `our_score`
- `their_score`
- `notes`

Current `result` values can simply be:

- `win`
- `loss`

Detailed Siege attack and defense modeling is explicitly deferred.

### 7.10 `champion_roster_observation`

Summary observation that a player owns or used a champion.

Suggested fields:

- `id`
- `player_profile_id`
- `champion_code`
- `first_seen_at`
- `last_seen_at`
- `evidence_type`
- `evidence_ref_id`

This table should enforce uniqueness on `(player_profile_id, champion_code)` and should be maintained through upsert semantics.

This is not a declaration of the player's full roster, and it is not a full evidence log. It is a summary table that can support "which champions do we know this player has?" without exploding in size.

## 8. Query Shape Expectations

The schema should make common questions direct rather than ceremonial.

Example Hydra team query path:

`competition_window -> hydra_report -> hydra_player_result -> hydra_team_run -> hydra_team_champion_performance`

Because `hydra_team_run` duplicates `player_profile_id` and `competition_window_id`, the practical query can often reduce to:

- filter `hydra_team_run` by `player_profile_id`
- filter `hydra_team_run` by `competition_window_id`
- join `hydra_team_champion_performance`
- order by `team_index, slot_index`

This is preferred over forcing every analytics query through deeper joins just to appear "clean."

## 9. Import Strategy

### 9.1 Replacement scope

The default unit of replacement is one `competition_window` for one activity type.

Examples:

- Hydra week 18 of 2026
- Chimera week 18 of 2026
- Clan Wars biweekly window covering a given Tuesday cycle

Default behavior:

- locate or create the matching `competition_window`
- create a new `report_import`
- delete the existing mode-specific report for that window
- insert the new report and children

This keeps correction flows simple and predictable.

An append or merge mode is not part of the first implementation. It invites ambiguity before the ingestion rules are mature.

### 9.2 Aggregate Hydra import from Supabase

The current legacy site exposes aggregate Hydra results only.

That import should:

- resolve the Hydra `competition_window`
- create `hydra_report`
- resolve players through `player_alias`
- insert `hydra_player_result`
- leave `hydra_team_run` empty when no detail exists

The external string identifier from Supabase may be retained as `source_report_key`, but it is not the canonical business key.

### 9.3 Detailed Hydra and Chimera import from OCR/Admin JSON

Detailed JSON imports should target the same window concept, but populate deeper structures.

They should:

- resolve the same `competition_window`
- create or replace the mode-specific report
- create or update `*_player_result`
- insert `*_team_run`
- insert `hydra_team_champion_performance` or `chimera_team_champion_performance`
- insert `champion_roster_observation`

If the detailed import includes player aggregate totals, those totals become the preferred version for that window.

### 9.4 Import precedence

Detailed imports outrank aggregate imports for the same activity window.

Simple rule:

- aggregate import is acceptable when it is the best available data
- detailed import replaces the aggregate view of that same window when it arrives later

This is both operationally simple and faithful to data quality reality.

### 9.5 Future admin endpoint

The future admin endpoint should accept multiple prepared JSON payloads and group them by activity window.

The endpoint should not attempt to be clever beyond:

- validation
- grouping by scope
- replace import execution
- error reporting per window

The operator workflow remains local-first: prepare or fix the files locally, then re-upload a clean replacement batch.

## 10. Identity Resolution Rules

The system cannot rely on Plarium identifiers because those are not realistically available in this workflow.

Resolution rules:

1. Match incoming names or handles against exact known aliases.
2. If no alias matches, create a new `player_profile` with the imported display name as the initial `main_nickname`.
3. Allow later manual alias consolidation when two imported identities are discovered to belong to the same person.

This preserves data continuity without pretending source names are stable forever.

## 11. Validation Rules

### Hydra

- one Hydra report per Hydra window after successful replacement
- one aggregate player result per player per Hydra report
- no more than 3 team runs per player result
- `difficulty` required on every team run and constrained to Hydra values
- no more than 6 champions per team run
- unique `slot_index` inside a team run
- `data_completeness` constrained to `aggregate_only`, `partial_detail`, `full_detail`

### Chimera

- one Chimera report per Chimera window after successful replacement
- one aggregate player result per player per Chimera report
- no more than 2 team runs per player result
- `difficulty` required on every team run and constrained to Chimera values
- no more than 6 champions per team run
- `data_completeness` constrained to `aggregate_only`, `partial_detail`, `full_detail`

### Clan Wars

- one score row per player per Clan Wars report
- `points` required and non-negative
- `has_personal_rewards` required and constrained to boolean semantics (`0` or `1`)

### Siege

- one Siege report per Siege window
- `opponent_clan_name` required
- `result` required
- `our_score` and `their_score` required

## 12. Testing Expectations For The Later Implementation Plan

The design implies these tests once implementation begins:

- compute `competition_window` from activity type and date
- create correct `rotation_number` for Hydra and Chimera windows
- replace import deletes and recreates a mode-specific report cleanly
- aggregate Hydra import creates player results without team runs
- detailed Hydra import creates team runs and Hydra champion rows
- detailed Chimera import creates team runs and Chimera champion rows
- detailed import wins over aggregate import for the same window
- alias resolution maps repeated names to the same `player_profile`
- manual alias consolidation preserves historical results

## 13. Recommended First Implementation Slice

The first implementation slice should stay narrow:

1. shared `competition_window`
2. `player_profile` and `player_alias`
3. `report_import`
4. Hydra aggregate report path
5. Hydra detailed team path

That slice is enough to prove:

- calendar modeling
- identity resolution
- replace-by-window imports
- future-ready team and champion detail

Chimera can then reuse the same patterns with lower risk. Clan Wars and Siege can follow as thinner mode-specific additions.
