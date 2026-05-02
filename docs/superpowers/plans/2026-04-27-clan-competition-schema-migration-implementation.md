# Clan Competition Schema Migration Implementation Plan

Status: Completed for local and production schema state (validated on 2026-05-03); preview migration parity is optional and currently not enforced

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first D1 migration for clan competition tracking, covering shared competition windows, player identity, mode-specific reports, team-level Hydra/Chimera detail, and summary roster observations.

**Architecture:** Keep the schema explicit and mode-specific. Use one shared calendar table and separate report/result tables per activity type, with pragmatic denormalization on team tables for read-heavy queries. Validate the migration with an automated schema-contract test that executes the SQL in in-memory SQLite before running Wrangler against local D1.

**Tech Stack:** D1/SQLite SQL migrations, Vitest, Node `node:sqlite`, Wrangler local D1

---

### Task 1: Add Schema Contract Tests

**Files:**
- Create: `packages/platform/test/clan-competition-schema.test.ts`
- Test: `packages/platform/test/clan-competition-schema.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

const migrationFiles = ["0001_bootstrap.sql", "0002_clan_competition_schema.sql"];
const migrationsDir = resolve(process.cwd(), "platform/migrations");

const applyMigrations = () => {
  const db = new DatabaseSync(":memory:");

  for (const fileName of migrationFiles) {
    db.exec(readFileSync(resolve(migrationsDir, fileName), "utf8"));
  }

  return db;
};

describe("clan competition schema migration", () => {
  it("creates the shared competition window table with the semantic unique constraint", () => {
    const db = applyMigrations();
    const indexes = db
      .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'competition_window'")
      .all() as Array<{ name: string; sql: string | null }>;

    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sql: expect.stringContaining("activity_type, season_year, week_of_year, cadence_slot")
        })
      ])
    );
  });

  it("creates distinct Hydra and Chimera champion performance tables", () => {
    const db = applyMigrations();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: Record<string, unknown>) => row.name);

    expect(tables).toContain("hydra_team_champion_performance");
    expect(tables).toContain("chimera_team_champion_performance");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm test -- packages/platform/test/clan-competition-schema.test.ts`

Expected: FAIL because `0002_clan_competition_schema.sql` and the new tables do not exist yet.

- [x] **Step 3: Extend the test with the most important constraints**

```ts
it("stores champion roster observations as a summary table with a unique player/champion key", () => {
  const db = applyMigrations();
  const indexes = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'champion_roster_observation'")
    .all() as Array<{ sql: string | null }>;

  expect(indexes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sql: expect.stringContaining("player_profile_id, champion_code")
      })
    ])
  );
});

it("constrains Hydra and Chimera data completeness fields", () => {
  const db = applyMigrations();
  const hydraColumns = db.prepare("PRAGMA table_info(hydra_player_result)").all();
  const chimeraColumns = db.prepare("PRAGMA table_info(chimera_team_run)").all();

  expect(hydraColumns).toEqual(expect.arrayContaining([expect.objectContaining({ name: "data_completeness" })]));
  expect(chimeraColumns).toEqual(expect.arrayContaining([expect.objectContaining({ name: "data_completeness" })]));
});
```

- [x] **Step 4: Run test to verify it still fails for the right reason**

Run: `pnpm test -- packages/platform/test/clan-competition-schema.test.ts`

Expected: FAIL because the migration still has not been implemented, not because the test file is malformed.

- [x] **Step 5: Commit**

```bash
git add packages/platform/test/clan-competition-schema.test.ts
git commit -m "test: add clan competition schema contract tests"
```

### Task 2: Add The D1 Migration

**Files:**
- Create: `platform/migrations/0002_clan_competition_schema.sql`
- Modify: `packages/platform/test/clan-competition-schema.test.ts`

- [x] **Step 1: Write the migration SQL**

```sql
CREATE TABLE IF NOT EXISTS competition_window (
  id INTEGER PRIMARY KEY,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('hydra', 'chimera', 'clan_wars', 'siege')),
  season_year INTEGER NOT NULL,
  week_of_year INTEGER NOT NULL,
  cadence_slot TEXT NOT NULL CHECK (cadence_slot IN ('weekly', 'biweekly')),
  rotation_number INTEGER,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (activity_type, season_year, week_of_year, cadence_slot)
);

CREATE TABLE IF NOT EXISTS player_profile (...);
CREATE TABLE IF NOT EXISTS player_alias (...);
CREATE TABLE IF NOT EXISTS report_import (...);
CREATE TABLE IF NOT EXISTS hydra_report (...);
CREATE TABLE IF NOT EXISTS hydra_player_result (...);
CREATE TABLE IF NOT EXISTS hydra_team_run (...);
CREATE TABLE IF NOT EXISTS hydra_team_champion_performance (...);
CREATE TABLE IF NOT EXISTS chimera_report (...);
CREATE TABLE IF NOT EXISTS chimera_player_result (...);
CREATE TABLE IF NOT EXISTS chimera_team_run (...);
CREATE TABLE IF NOT EXISTS chimera_team_champion_performance (...);
CREATE TABLE IF NOT EXISTS clan_wars_report (...);
CREATE TABLE IF NOT EXISTS clan_wars_player_score (...);
CREATE TABLE IF NOT EXISTS siege_report (...);
CREATE TABLE IF NOT EXISTS champion_roster_observation (...);
```

- [x] **Step 2: Include the critical constraints**

```sql
CHECK (data_completeness IN ('aggregate_only', 'partial_detail', 'full_detail'))
CHECK (difficulty IN ('normal', 'hard', 'brutal', 'nightmare'))
CHECK (difficulty IN ('easy', 'normal', 'hard', 'brutal', 'nightmare', 'ultra_nightmare'))
UNIQUE (hydra_report_id, player_profile_id)
UNIQUE (hydra_player_result_id, team_index)
UNIQUE (hydra_team_run_id, slot_index)
UNIQUE (chimera_report_id, player_profile_id)
UNIQUE (chimera_player_result_id, team_index)
UNIQUE (chimera_team_run_id, slot_index)
UNIQUE (player_profile_id, champion_code)
```

- [x] **Step 3: Run the schema contract test**

Run: `pnpm test -- packages/platform/test/clan-competition-schema.test.ts`

Expected: PASS

- [x] **Step 4: Refine the test if the SQL needs one more assertion**

```ts
it("stores Hydra keys as keys_used", () => {
  const db = applyMigrations();
  const columns = db.prepare("PRAGMA table_info(hydra_player_result)").all();

  expect(columns).toEqual(expect.arrayContaining([expect.objectContaining({ name: "keys_used" })]));
});
```

- [x] **Step 5: Commit**

```bash
git add platform/migrations/0002_clan_competition_schema.sql packages/platform/test/clan-competition-schema.test.ts
git commit -m "feat: add clan competition schema migration"
```

### Task 3: Verify Against Local D1

**Files:**
- Modify: none unless verification reveals a real schema bug

- [x] **Step 1: Run the focused tests**

Run: `pnpm test -- packages/platform/test/clan-competition-schema.test.ts`

Expected: PASS

- [x] **Step 2: Run the full test suite**

Run: `pnpm test`

Expected: PASS with the existing suite still green.

- [x] **Step 3: Apply local D1 migrations**

Run: `pnpm --filter @raid/web exec wrangler d1 migrations apply raid-sl-clan --local`

Expected: SUCCESS with `0001_bootstrap.sql` and `0002_clan_competition_schema.sql` applied locally.

- [x] **Step 4: List local migrations**

Run: `pnpm --filter @raid/web exec wrangler d1 migrations list raid-sl-clan --local`

Expected: both migrations listed as applied locally.

- [x] **Step 5: Commit verification-only fixes if needed**

```bash
git add <any adjusted files>
git commit -m "fix: align clan competition migration with local D1"
```
