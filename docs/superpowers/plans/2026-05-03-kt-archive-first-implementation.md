# KT Archive-First Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/dashboard/clan-wars` as an archive-first KT page with real historical aggregates, roster stability, decline radar, and a direct KT link in dashboard navigation.

**Architecture:** Keep all DB reads in `packages/platform`, orchestration in `packages/application`, and page rendering in `apps/web`. Implement KT history queries in SQL, then compute stability/decline in a pure TypeScript metrics module to keep logic testable and deterministic. Reuse existing countdown/navigation patterns instead of introducing parallel abstractions.

**Tech Stack:** TypeScript, Next.js App Router, Vitest, D1/SQLite SQL, Cloudflare runtime adapter

---

## Scope Check

The approved spec is one subsystem: KT archive analytics page plus navigation wiring. No decomposition into additional plans is required.

## File Structure Map

- Modify: `packages/ports/src/repositories/clan-dashboard-repository.ts`
- Create: `packages/platform/src/dashboard/clan-wars-archive-sql.ts`
- Create: `packages/platform/src/dashboard/clan-wars-archive-metrics.ts`
- Modify: `packages/platform/src/dashboard/create-d1-clan-dashboard-repository.ts`
- Modify: `packages/platform/src/index.ts`
- Modify: `packages/platform/test/helpers/clan-dashboard-query-check.mjs`
- Modify: `packages/platform/test/clan-dashboard-repository.test.ts`
- Create: `packages/platform/test/clan-wars-archive-metrics.test.ts`
- Create: `packages/application/src/dashboard/get-clan-wars-archive-snapshot.ts`
- Create: `packages/application/test/get-clan-wars-archive-snapshot.test.ts`
- Modify: `packages/application/src/index.ts`
- Create: `apps/web/src/server/dashboard/get-clan-wars-archive-snapshot.ts`
- Create: `apps/web/src/components/site/dashboard-kt-header-zone.tsx`
- Create: `apps/web/src/components/site/dashboard-kt-history-zone.tsx`
- Create: `apps/web/src/components/site/dashboard-kt-stability-zone.tsx`
- Create: `apps/web/src/components/site/dashboard-kt-decline-zone.tsx`
- Create: `apps/web/src/app/dashboard/clan-wars/page.tsx`
- Create: `apps/web/src/app/dashboard/clan-wars/page.test.tsx`
- Modify: `apps/web/src/components/site/dashboard-nav.tsx`
- Modify: `apps/web/src/app/dashboard/page.test.tsx`
- Modify: `apps/web/src/app/globals.css`

### Task 1: Add KT Archive Contracts And Pure Metrics

**Files:**
- Modify: `packages/ports/src/repositories/clan-dashboard-repository.ts`
- Create: `packages/platform/src/dashboard/clan-wars-archive-metrics.ts`
- Create: `packages/platform/test/clan-wars-archive-metrics.test.ts`
- Modify: `packages/platform/src/index.ts`
- Test: `packages/platform/test/clan-wars-archive-metrics.test.ts`

- [ ] **Step 1: Write the failing metrics test**

```ts
import { describe, expect, it } from "vitest";
import {
  buildClanWarsDeclineRows,
  buildClanWarsStabilityRows,
  type ClanWarsPlayerWindowPointsRow
} from "@raid/platform";

const rows: ClanWarsPlayerWindowPointsRow[] = [
  { windowStart: "2031-04-07T10:00:00.000Z", playerName: "Alpha", points: 210 },
  { windowStart: "2031-04-07T10:00:00.000Z", playerName: "Beta", points: 40 },
  { windowStart: "2031-04-07T10:00:00.000Z", playerName: "Gamma", points: 100 },
  { windowStart: "2031-03-24T10:00:00.000Z", playerName: "Alpha", points: 240 },
  { windowStart: "2031-03-24T10:00:00.000Z", playerName: "Beta", points: 60 },
  { windowStart: "2031-03-24T10:00:00.000Z", playerName: "Gamma", points: 90 },
  { windowStart: "2031-03-10T10:00:00.000Z", playerName: "Alpha", points: 260 },
  { windowStart: "2031-03-10T10:00:00.000Z", playerName: "Beta", points: 90 },
  { windowStart: "2031-03-10T10:00:00.000Z", playerName: "Gamma", points: 80 },
  { windowStart: "2031-02-24T10:00:00.000Z", playerName: "Alpha", points: 280 },
  { windowStart: "2031-02-24T10:00:00.000Z", playerName: "Beta", points: 120 },
  { windowStart: "2031-02-24T10:00:00.000Z", playerName: "Gamma", points: 70 },
  { windowStart: "2031-02-10T10:00:00.000Z", playerName: "Alpha", points: 300 },
  { windowStart: "2031-02-10T10:00:00.000Z", playerName: "Beta", points: 140 },
  { windowStart: "2031-02-10T10:00:00.000Z", playerName: "Gamma", points: 60 },
  { windowStart: "2031-01-27T10:00:00.000Z", playerName: "Alpha", points: 320 },
  { windowStart: "2031-01-27T10:00:00.000Z", playerName: "Beta", points: 160 },
  { windowStart: "2031-01-27T10:00:00.000Z", playerName: "Gamma", points: 50 }
];

describe("KT archive metrics", () => {
  it("computes stability rows from player-window matrix", () => {
    const stability = buildClanWarsStabilityRows(rows, 6);

    expect(stability[0]).toEqual({
      playerName: "Alpha",
      windowsPlayed: 6,
      avgPoints: 268.33,
      bestPoints: 320,
      lastWindowPoints: 210,
      consistencyScore: 1
    });
  });

  it("computes decline rows using recent-3 vs baseline", () => {
    const decline = buildClanWarsDeclineRows(rows);

    expect(decline[0]).toEqual({
      playerName: "Beta",
      recentAvg: 63.33,
      baselineAvg: 140,
      delta: -76.67
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- packages/platform/test/clan-wars-archive-metrics.test.ts`

Expected: FAIL with module/type/function not found for KT archive metrics exports.

- [ ] **Step 3: Add contracts and minimal metrics implementation**

```ts
// packages/ports/src/repositories/clan-dashboard-repository.ts
export type ClanWarsHeader = {
  targetAt: string;
  targetKind: "start" | "reset";
  eventStartAt: string;
  eventEndsAt: string;
  hasPersonalRewards: boolean;
};

export type ClanWarsArchiveHistoryRow = {
  windowStart: string;
  windowEnd: string;
  hasPersonalRewards: boolean;
  clanTotalPoints: number;
  activeContributors: number;
  topPlayerName: string;
  topPlayerPoints: number;
};

export type ClanWarsArchiveStabilityRow = {
  playerName: string;
  windowsPlayed: number;
  avgPoints: number;
  bestPoints: number;
  lastWindowPoints: number;
  consistencyScore: number;
};

export type ClanWarsArchiveDeclineRow = {
  playerName: string;
  recentAvg: number;
  baselineAvg: number;
  delta: number;
};

export type ClanWarsArchiveData = {
  header: ClanWarsHeader;
  history: ClanWarsArchiveHistoryRow[];
  stability: ClanWarsArchiveStabilityRow[];
  decline: ClanWarsArchiveDeclineRow[];
};

export type ClanWarsArchiveRepository = {
  getClanWarsArchive(input: { nowIso: string; windowLimit: number }): Promise<ClanWarsArchiveData>;
};
```

```ts
// packages/platform/src/dashboard/clan-wars-archive-metrics.ts
import type {
  ClanWarsArchiveDeclineRow,
  ClanWarsArchiveStabilityRow
} from "@raid/ports";

export type ClanWarsPlayerWindowPointsRow = {
  windowStart: string;
  playerName: string;
  points: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const getSortedWindowsDesc = (rows: ClanWarsPlayerWindowPointsRow[]) =>
  Array.from(new Set(rows.map((row) => row.windowStart))).sort((a, b) =>
    a < b ? 1 : a > b ? -1 : 0
  );

const groupPlayerPoints = (rows: ClanWarsPlayerWindowPointsRow[]) => {
  const grouped = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const perPlayer = grouped.get(row.playerName) ?? new Map<string, number>();
    perPlayer.set(row.windowStart, row.points);
    grouped.set(row.playerName, perPlayer);
  }

  return grouped;
};

export const buildClanWarsStabilityRows = (
  rows: ClanWarsPlayerWindowPointsRow[],
  selectedWindows: number
): ClanWarsArchiveStabilityRow[] => {
  const windows = getSortedWindowsDesc(rows).slice(0, selectedWindows);
  const grouped = groupPlayerPoints(rows);

  return Array.from(grouped.entries())
    .map(([playerName, pointsByWindow]) => {
      const values = windows.map((windowStart) => pointsByWindow.get(windowStart) ?? 0);
      const windowsPlayed = values.filter((points) => points > 0).length;
      const avgPoints = values.length === 0 ? 0 : round2(values.reduce((sum, value) => sum + value, 0) / values.length);
      const bestPoints =
        values.length === 0
          ? 0
          : values.reduce((maxValue, currentValue) =>
              currentValue > maxValue ? currentValue : maxValue
            , values[0]);
      const lastWindowPoints = values.length === 0 ? 0 : values[0];
      const consistencyScore = values.length === 0 ? 0 : round2(windowsPlayed / values.length);

      return {
        playerName,
        windowsPlayed,
        avgPoints,
        bestPoints,
        lastWindowPoints,
        consistencyScore
      };
    })
    .sort((a, b) =>
      b.consistencyScore - a.consistencyScore ||
      b.avgPoints - a.avgPoints ||
      a.playerName.localeCompare(b.playerName)
    );
};

export const buildClanWarsDeclineRows = (
  rows: ClanWarsPlayerWindowPointsRow[]
): ClanWarsArchiveDeclineRow[] => {
  const windows = getSortedWindowsDesc(rows);
  const recentWindows = windows.slice(0, 3);
  const precedingWindows = windows.slice(3);
  const baselineWindows =
    precedingWindows.length > 6 ? precedingWindows.slice(0, 6) : precedingWindows;
  const grouped = groupPlayerPoints(rows);

  if (recentWindows.length < 3 || baselineWindows.length === 0) {
    return [];
  }

  return Array.from(grouped.entries())
    .map(([playerName, pointsByWindow]) => {
      const recentValues = recentWindows.map((windowStart) => pointsByWindow.get(windowStart) ?? 0);
      const baselineValues = baselineWindows.map((windowStart) => pointsByWindow.get(windowStart) ?? 0);
      const windowsPlayed = windows.filter((windowStart) => (pointsByWindow.get(windowStart) ?? 0) > 0).length;

      if (windowsPlayed < 3) {
        return null;
      }

      const recentAvg = round2(recentValues.reduce((sum, value) => sum + value, 0) / recentValues.length);
      const baselineAvg = round2(
        baselineValues.reduce((sum, value) => sum + value, 0) / baselineValues.length
      );
      const delta = round2(recentAvg - baselineAvg);

      return { playerName, recentAvg, baselineAvg, delta };
    })
    .filter((row): row is ClanWarsArchiveDeclineRow => row !== null && row.delta < 0)
    .sort((a, b) => a.delta - b.delta || a.playerName.localeCompare(b.playerName));
};
```

```ts
// packages/platform/src/index.ts
export * from "./dashboard/clan-wars-archive-metrics";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- packages/platform/test/clan-wars-archive-metrics.test.ts`

Expected: PASS with both stability and decline cases green.

- [ ] **Step 5: Commit**

```bash
git add packages/ports/src/repositories/clan-dashboard-repository.ts \
  packages/platform/src/dashboard/clan-wars-archive-metrics.ts \
  packages/platform/src/index.ts \
  packages/platform/test/clan-wars-archive-metrics.test.ts
git commit -m "feat: add KT archive metric contracts and calculators"
```

### Task 2: Add KT Archive SQL And Repository Integration

**Files:**
- Create: `packages/platform/src/dashboard/clan-wars-archive-sql.ts`
- Modify: `packages/platform/src/dashboard/create-d1-clan-dashboard-repository.ts`
- Modify: `packages/platform/src/index.ts`
- Modify: `packages/platform/test/helpers/clan-dashboard-query-check.mjs`
- Modify: `packages/platform/test/clan-dashboard-repository.test.ts`
- Test: `packages/platform/test/clan-dashboard-repository.test.ts`

- [ ] **Step 1: Add failing repository query test**

```ts
// packages/platform/test/clan-dashboard-repository.test.ts
it("aggregates KT archive history rows with contributors and top player", () => {
  const result = runCheck<{
    ok: boolean;
    rows: Array<{
      starts_at: string;
      has_personal_rewards: number;
      clan_total_points: number;
      active_contributors: number;
      top_player_name: string;
      top_player_points: number;
    }>;
  }>("kt-archive-history-aggregate");

  expect(result.ok).toBe(true);
  expect(result.rows[0]).toEqual({
    starts_at: "2031-04-12T00:00:00Z",
    has_personal_rewards: 1,
    clan_total_points: 430,
    active_contributors: 3,
    top_player_name: "Alpha",
    top_player_points: 220
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- packages/platform/test/clan-dashboard-repository.test.ts`

Expected: FAIL with `unknown-command:kt-archive-history-aggregate`.

- [ ] **Step 3: Implement KT archive SQL + repository method + helper command**

```ts
// packages/platform/src/dashboard/clan-wars-archive-sql.ts
export const selectClanWarsArchiveHistorySql = `
WITH recent_windows AS (
  SELECT id, starts_at, ends_at
  FROM competition_window
  WHERE activity_type = 'clan_wars'
  ORDER BY starts_at DESC, id DESC
  LIMIT ?
)
SELECT
  rw.id AS window_id,
  rw.starts_at,
  rw.ends_at,
  COALESCE(cwr.has_personal_rewards, 0) AS has_personal_rewards,
  COALESCE(SUM(cwps.points), 0) AS clan_total_points,
  COALESCE(COUNT(DISTINCT CASE WHEN cwps.points > 0 THEN cwps.player_profile_id END), 0) AS active_contributors,
  COALESCE((
    SELECT pp2.main_nickname
    FROM clan_wars_player_score cwps2
    JOIN player_profile pp2 ON pp2.id = cwps2.player_profile_id
    WHERE cwps2.competition_window_id = rw.id
    ORDER BY cwps2.points DESC, pp2.main_nickname ASC
    LIMIT 1
  ), '—') AS top_player_name,
  COALESCE((
    SELECT cwps2.points
    FROM clan_wars_player_score cwps2
    JOIN player_profile pp2 ON pp2.id = cwps2.player_profile_id
    WHERE cwps2.competition_window_id = rw.id
    ORDER BY cwps2.points DESC, pp2.main_nickname ASC
    LIMIT 1
  ), 0) AS top_player_points
FROM recent_windows rw
LEFT JOIN clan_wars_report cwr ON cwr.competition_window_id = rw.id
LEFT JOIN clan_wars_player_score cwps ON cwps.competition_window_id = rw.id
GROUP BY rw.id, rw.starts_at, rw.ends_at, cwr.has_personal_rewards
ORDER BY rw.starts_at DESC, rw.id DESC;
`;

export const selectClanWarsArchivePlayerWindowSql = `
WITH recent_windows AS (
  SELECT id, starts_at
  FROM competition_window
  WHERE activity_type = 'clan_wars'
  ORDER BY starts_at DESC, id DESC
  LIMIT ?
), active_players AS (
  SELECT id, main_nickname
  FROM player_profile
  WHERE status = 'active'
)
SELECT
  rw.starts_at AS window_start,
  ap.main_nickname AS player_name,
  COALESCE(cwps.points, 0) AS points
FROM recent_windows rw
CROSS JOIN active_players ap
LEFT JOIN clan_wars_player_score cwps
  ON cwps.competition_window_id = rw.id
  AND cwps.player_profile_id = ap.id
ORDER BY rw.starts_at DESC, ap.main_nickname ASC;
`;
```

```ts
// packages/platform/src/dashboard/create-d1-clan-dashboard-repository.ts
import { buildClanWarsDeclineRows, buildClanWarsStabilityRows, type ClanWarsPlayerWindowPointsRow } from "./clan-wars-archive-metrics";
import { selectClanWarsArchiveHistorySql, selectClanWarsArchivePlayerWindowSql } from "./clan-wars-archive-sql";

type ClanWarsArchiveHistoryRow = {
  starts_at: string;
  ends_at: string;
  has_personal_rewards: number;
  clan_total_points: number;
  active_contributors: number;
  top_player_name: string;
  top_player_points: number;
};

type ClanWarsArchivePlayerWindowDbRow = {
  window_start: string;
  player_name: string;
  points: number;
};

// inside returned object:
async getClanWarsArchive({ nowIso, windowLimit }) {
  const [historyRows, playerWindowRows] = await Promise.all([
    queryRows<ClanWarsArchiveHistoryRow>(selectClanWarsArchiveHistorySql, windowLimit),
    queryRows<ClanWarsArchivePlayerWindowDbRow>(selectClanWarsArchivePlayerWindowSql, windowLimit)
  ]);

  const clanWarsAnchor = getClanWarsAnchorStateUtc(nowIso);
  const playerRows: ClanWarsPlayerWindowPointsRow[] = playerWindowRows.map((row) => ({
    windowStart: row.window_start,
    playerName: row.player_name,
    points: row.points
  }));

  return {
    header: {
      targetAt: clanWarsAnchor.targetAt,
      targetKind: clanWarsAnchor.targetKind,
      eventStartAt: clanWarsAnchor.eventStartAt,
      eventEndsAt: clanWarsAnchor.eventEndsAt,
      hasPersonalRewards: clanWarsAnchor.hasPersonalRewards
    },
    history: historyRows.map((row) => ({
      windowStart: row.starts_at,
      windowEnd: row.ends_at,
      hasPersonalRewards: row.has_personal_rewards === 1,
      clanTotalPoints: row.clan_total_points,
      activeContributors: row.active_contributors,
      topPlayerName: row.top_player_name,
      topPlayerPoints: row.top_player_points
    })),
    stability: buildClanWarsStabilityRows(playerRows, windowLimit),
    decline: buildClanWarsDeclineRows(playerRows)
  };
}
```

```ts
// packages/platform/test/helpers/clan-dashboard-query-check.mjs (new command)
const selectClanWarsArchiveHistorySql = `
WITH recent_windows AS (
  SELECT id, starts_at, ends_at
  FROM competition_window
  WHERE activity_type = 'clan_wars'
  ORDER BY starts_at DESC, id DESC
  LIMIT ?
)
SELECT
  rw.starts_at,
  COALESCE(cwr.has_personal_rewards, 0) AS has_personal_rewards,
  COALESCE(SUM(cwps.points), 0) AS clan_total_points,
  COALESCE(COUNT(DISTINCT CASE WHEN cwps.points > 0 THEN cwps.player_profile_id END), 0) AS active_contributors,
  COALESCE((
    SELECT pp2.main_nickname
    FROM clan_wars_player_score cwps2
    JOIN player_profile pp2 ON pp2.id = cwps2.player_profile_id
    WHERE cwps2.competition_window_id = rw.id
    ORDER BY cwps2.points DESC, pp2.main_nickname ASC
    LIMIT 1
  ), '—') AS top_player_name,
  COALESCE((
    SELECT cwps2.points
    FROM clan_wars_player_score cwps2
    JOIN player_profile pp2 ON pp2.id = cwps2.player_profile_id
    WHERE cwps2.competition_window_id = rw.id
    ORDER BY cwps2.points DESC, pp2.main_nickname ASC
    LIMIT 1
  ), 0) AS top_player_points
FROM recent_windows rw
LEFT JOIN clan_wars_report cwr ON cwr.competition_window_id = rw.id
LEFT JOIN clan_wars_player_score cwps ON cwps.competition_window_id = rw.id
GROUP BY rw.id, rw.starts_at, cwr.has_personal_rewards
ORDER BY rw.starts_at DESC, rw.id DESC;
`;

const runKtArchiveHistoryAggregate = (database) => {
  const alpha = insertPlayer(database, "Alpha");
  const beta = insertPlayer(database, "Beta");
  const gamma = insertPlayer(database, "Gamma");

  const firstWindow = insertCompetitionWindow(database, {
    activityType: "clan_wars",
    seasonYear: 2031,
    week: 11,
    cadence: "biweekly",
    rotationNumber: null,
    startsAt: "2031-04-12T00:00:00Z",
    endsAt: "2031-04-14T00:00:00Z",
    label: "cw-a"
  });

  const secondWindow = insertCompetitionWindow(database, {
    activityType: "clan_wars",
    seasonYear: 2031,
    week: 10,
    cadence: "biweekly",
    rotationNumber: null,
    startsAt: "2031-03-29T00:00:00Z",
    endsAt: "2031-03-31T00:00:00Z",
    label: "cw-b"
  });

  const firstImport = insertReportImport(database, "cw-a");
  const secondImport = insertReportImport(database, "cw-b");

  const firstReportId = Number(
    database.prepare("INSERT INTO clan_wars_report (competition_window_id, report_import_id, source_system, is_partial, has_personal_rewards, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      firstWindow,
      firstImport,
      "unit",
      0,
      1,
      "2031-04-12T02:00:00Z"
    ).lastInsertRowid
  );
  const secondReportId = Number(
    database.prepare("INSERT INTO clan_wars_report (competition_window_id, report_import_id, source_system, is_partial, has_personal_rewards, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      secondWindow,
      secondImport,
      "unit",
      0,
      0,
      "2031-03-29T02:00:00Z"
    ).lastInsertRowid
  );

  database.prepare("INSERT INTO clan_wars_player_score (clan_wars_report_id, competition_window_id, player_profile_id, display_name_at_import, points) VALUES (?, ?, ?, ?, ?)").run(firstReportId, firstWindow, alpha, "Alpha", 220);
  database.prepare("INSERT INTO clan_wars_player_score (clan_wars_report_id, competition_window_id, player_profile_id, display_name_at_import, points) VALUES (?, ?, ?, ?, ?)").run(firstReportId, firstWindow, beta, "Beta", 110);
  database.prepare("INSERT INTO clan_wars_player_score (clan_wars_report_id, competition_window_id, player_profile_id, display_name_at_import, points) VALUES (?, ?, ?, ?, ?)").run(firstReportId, firstWindow, gamma, "Gamma", 100);
  database.prepare("INSERT INTO clan_wars_player_score (clan_wars_report_id, competition_window_id, player_profile_id, display_name_at_import, points) VALUES (?, ?, ?, ?, ?)").run(secondReportId, secondWindow, alpha, "Alpha", 180);
  database.prepare("INSERT INTO clan_wars_player_score (clan_wars_report_id, competition_window_id, player_profile_id, display_name_at_import, points) VALUES (?, ?, ?, ?, ?)").run(secondReportId, secondWindow, beta, "Beta", 50);

  const rows = database.prepare(selectClanWarsArchiveHistorySql).all(12);
  emit({ ok: true, rows });
};

// in switch(command)
case "kt-archive-history-aggregate":
  runKtArchiveHistoryAggregate(database);
  break;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- packages/platform/test/clan-dashboard-repository.test.ts`

Expected: PASS with existing 3 tests plus new KT archive aggregation test.

- [ ] **Step 5: Commit**

```bash
git add packages/platform/src/dashboard/clan-wars-archive-sql.ts \
  packages/platform/src/dashboard/create-d1-clan-dashboard-repository.ts \
  packages/platform/src/index.ts \
  packages/platform/test/helpers/clan-dashboard-query-check.mjs \
  packages/platform/test/clan-dashboard-repository.test.ts
git commit -m "feat: add KT archive SQL and D1 repository snapshot"
```

### Task 3: Add Application Use Case For KT Archive Snapshot

**Files:**
- Create: `packages/application/src/dashboard/get-clan-wars-archive-snapshot.ts`
- Create: `packages/application/test/get-clan-wars-archive-snapshot.test.ts`
- Modify: `packages/application/src/index.ts`
- Test: `packages/application/test/get-clan-wars-archive-snapshot.test.ts`

- [ ] **Step 1: Write the failing application test**

```ts
import { describe, expect, it, vi } from "vitest";
import { createGetClanWarsArchiveSnapshot } from "@raid/application";
import type { ClanWarsArchiveRepository } from "@raid/ports";

describe("createGetClanWarsArchiveSnapshot", () => {
  it("returns generatedAt plus KT archive data from repository", async () => {
    const repository: ClanWarsArchiveRepository = {
      getClanWarsArchive: vi.fn(async () => ({
        header: {
          targetAt: "2026-05-05T10:00:00.000Z",
          targetKind: "start",
          eventStartAt: "2026-05-05T10:00:00.000Z",
          eventEndsAt: "2026-05-07T10:00:00.000Z",
          hasPersonalRewards: true
        },
        history: [],
        stability: [],
        decline: []
      }))
    };

    const getSnapshot = createGetClanWarsArchiveSnapshot({
      repository,
      now: () => new Date("2026-05-03T14:00:00.000Z"),
      windowLimit: 12
    });

    const snapshot = await getSnapshot();

    expect(repository.getClanWarsArchive).toHaveBeenCalledWith({
      nowIso: "2026-05-03T14:00:00.000Z",
      windowLimit: 12
    });
    expect(snapshot.generatedAt).toBe("2026-05-03T14:00:00.000Z");
    expect(snapshot.header.targetKind).toBe("start");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- packages/application/test/get-clan-wars-archive-snapshot.test.ts`

Expected: FAIL because `createGetClanWarsArchiveSnapshot` does not exist yet.

- [ ] **Step 3: Implement KT archive application use case**

```ts
// packages/application/src/dashboard/get-clan-wars-archive-snapshot.ts
import type { ClanWarsArchiveData, ClanWarsArchiveRepository } from "@raid/ports";

export type ClanWarsArchiveSnapshot = ClanWarsArchiveData & {
  generatedAt: string;
};

export type GetClanWarsArchiveSnapshotDeps = {
  repository: ClanWarsArchiveRepository;
  now?: () => Date;
  windowLimit?: number;
};

export const createGetClanWarsArchiveSnapshot = ({
  repository,
  now = () => new Date(),
  windowLimit = 12
}: GetClanWarsArchiveSnapshotDeps) => {
  return async (): Promise<ClanWarsArchiveSnapshot> => {
    const nowIso = now().toISOString();
    const data = await repository.getClanWarsArchive({
      nowIso,
      windowLimit
    });

    return {
      generatedAt: nowIso,
      header: data.header,
      history: data.history,
      stability: data.stability,
      decline: data.decline
    };
  };
};
```

```ts
// packages/application/src/index.ts
export * from "./dashboard/get-clan-wars-archive-snapshot";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- packages/application/test/get-clan-wars-archive-snapshot.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/application/src/dashboard/get-clan-wars-archive-snapshot.ts \
  packages/application/src/index.ts \
  packages/application/test/get-clan-wars-archive-snapshot.test.ts
git commit -m "feat: add KT archive application snapshot use case"
```

### Task 4: Add KT Page, Components, Navigation Link, and UI Tests

**Files:**
- Create: `apps/web/src/server/dashboard/get-clan-wars-archive-snapshot.ts`
- Create: `apps/web/src/components/site/dashboard-kt-header-zone.tsx`
- Create: `apps/web/src/components/site/dashboard-kt-history-zone.tsx`
- Create: `apps/web/src/components/site/dashboard-kt-stability-zone.tsx`
- Create: `apps/web/src/components/site/dashboard-kt-decline-zone.tsx`
- Create: `apps/web/src/app/dashboard/clan-wars/page.tsx`
- Create: `apps/web/src/app/dashboard/clan-wars/page.test.tsx`
- Modify: `apps/web/src/components/site/dashboard-nav.tsx`
- Modify: `apps/web/src/app/dashboard/page.test.tsx`
- Modify: `apps/web/src/app/globals.css`
- Test: `apps/web/src/app/dashboard/clan-wars/page.test.tsx`
- Test: `apps/web/src/app/dashboard/page.test.tsx`

- [ ] **Step 1: Write failing KT page render test**

```ts
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../server/dashboard/get-clan-wars-archive-snapshot", () => ({
  getClanWarsArchiveSnapshot: vi.fn(async () => ({
    generatedAt: "2026-05-03T14:00:00.000Z",
    header: {
      targetAt: "2026-05-05T10:00:00.000Z",
      targetKind: "start",
      eventStartAt: "2026-05-05T10:00:00.000Z",
      eventEndsAt: "2026-05-07T10:00:00.000Z",
      hasPersonalRewards: true
    },
    history: [
      {
        windowStart: "2026-04-21T10:00:00.000Z",
        windowEnd: "2026-04-23T10:00:00.000Z",
        hasPersonalRewards: true,
        clanTotalPoints: 4100,
        activeContributors: 28,
        topPlayerName: "Alpha",
        topPlayerPoints: 420
      }
    ],
    stability: [
      {
        playerName: "Alpha",
        windowsPlayed: 12,
        avgPoints: 301.2,
        bestPoints: 440,
        lastWindowPoints: 420,
        consistencyScore: 1
      }
    ],
    decline: [
      {
        playerName: "Beta",
        recentAvg: 145,
        baselineAvg: 220,
        delta: -75
      }
    ]
  }))
}));

import ClanWarsPage from "./page";

describe("ClanWarsPage", () => {
  it("renders archive-first KT blocks and nav link", async () => {
    const html = renderToStaticMarkup(await ClanWarsPage());

    expect(html).toContain("Клановый турнир: архив");
    expect(html).toContain("История окон КТ");
    expect(html).toContain("Стабильность состава");
    expect(html).toContain("Кто проседает");
    expect(html).toContain("Alpha");
    expect(html).toContain("Beta");
    expect(html).toContain('href="/dashboard/clan-wars"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- apps/web/src/app/dashboard/clan-wars/page.test.tsx`

Expected: FAIL because route/components/server loader are missing.

- [ ] **Step 3: Implement route, server loader, KT components, and nav link**

```ts
// apps/web/src/server/dashboard/get-clan-wars-archive-snapshot.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createGetClanWarsArchiveSnapshot } from "@raid/application";
import { createD1ClanDashboardRepository } from "@raid/platform";

export const getClanWarsArchiveSnapshot = async () => {
  const { env } = await getCloudflareContext<Record<string, unknown> & CloudflareEnv>({
    async: true
  });

  return createGetClanWarsArchiveSnapshot({
    repository: createD1ClanDashboardRepository(env.DB),
    windowLimit: 12
  })();
};
```

```tsx
// apps/web/src/components/site/dashboard-kt-header-zone.tsx
import React from "react";
import type { ClanWarsHeader } from "@raid/ports";
import { CountdownTimer } from "./countdown-timer";
import { LocalizedDateTime } from "./localized-date-time";

type DashboardKtHeaderZoneProps = {
  header: ClanWarsHeader;
};

export function DashboardKtHeaderZone({ header }: DashboardKtHeaderZoneProps) {
  const statusLabel =
    header.targetKind === "start" ? "До начала следующего КТ" : "До конца текущего КТ";

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">Клановый турнир: архив</h2>
      <p>{statusLabel}</p>
      <p>
        <CountdownTimer
          targetIso={header.targetAt}
          endedLabel="Закончено, идет подсчет результатов"
        />
      </p>
      <p>Личные награды: {header.hasPersonalRewards ? "с личными наградами" : "без"}</p>
      <p>
        Окно: <LocalizedDateTime iso={header.eventStartAt} /> -{" "}
        <LocalizedDateTime iso={header.eventEndsAt} />
      </p>
    </section>
  );
}
```

```tsx
// apps/web/src/app/dashboard/clan-wars/page.tsx
import React from "react";
import { BrandMark } from "../../../components/site/brand-mark";
import { DashboardKtDeclineZone } from "../../../components/site/dashboard-kt-decline-zone";
import { DashboardKtHeaderZone } from "../../../components/site/dashboard-kt-header-zone";
import { DashboardKtHistoryZone } from "../../../components/site/dashboard-kt-history-zone";
import { DashboardKtStabilityZone } from "../../../components/site/dashboard-kt-stability-zone";
import { DashboardNav } from "../../../components/site/dashboard-nav";
import { getClanWarsArchiveSnapshot } from "../../../server/dashboard/get-clan-wars-archive-snapshot";

export const dynamic = "force-dynamic";

export default async function ClanWarsPage() {
  const snapshot = await getClanWarsArchiveSnapshot();

  return (
    <main className="dashboard-shell dashboard-shell--clan">
      <header className="panel-card panel-card--padded dashboard-header">
        <div className="dashboard-stack">
          <BrandMark />
          <h1 className="display-face">KT</h1>
          <p className="dashboard-meta">Snapshot generated: {snapshot.generatedAt}</p>
        </div>
        <DashboardNav />
      </header>

      <DashboardKtHeaderZone header={snapshot.header} />
      <DashboardKtHistoryZone rows={snapshot.history} />
      <div className="dashboard-kt-grid">
        <DashboardKtStabilityZone rows={snapshot.stability} />
        <DashboardKtDeclineZone rows={snapshot.decline} />
      </div>
    </main>
  );
}
```

```tsx
// apps/web/src/components/site/dashboard-kt-history-zone.tsx
import React from "react";
import type { ClanWarsArchiveHistoryRow } from "@raid/ports";
import { LocalizedDateTime } from "./localized-date-time";

type DashboardKtHistoryZoneProps = {
  rows: ClanWarsArchiveHistoryRow[];
};

export function DashboardKtHistoryZone({ rows }: DashboardKtHistoryZoneProps) {
  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">История окон КТ</h2>
      <table className="dashboard-kt-table">
        <thead>
          <tr>
            <th>Окно</th>
            <th>Лички</th>
            <th>Очки клана</th>
            <th>Активные</th>
            <th>Топ-1</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.windowStart}>
              <td>
                <LocalizedDateTime iso={row.windowStart} /> -{" "}
                <LocalizedDateTime iso={row.windowEnd} />
              </td>
              <td>{row.hasPersonalRewards ? "да" : "нет"}</td>
              <td>{row.clanTotalPoints.toLocaleString("en-US")}</td>
              <td>{row.activeContributors}</td>
              <td>
                {row.topPlayerName} ({row.topPlayerPoints.toLocaleString("en-US")})
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

```tsx
// apps/web/src/components/site/dashboard-kt-stability-zone.tsx
import React from "react";
import type { ClanWarsArchiveStabilityRow } from "@raid/ports";

type DashboardKtStabilityZoneProps = {
  rows: ClanWarsArchiveStabilityRow[];
};

export function DashboardKtStabilityZone({ rows }: DashboardKtStabilityZoneProps) {
  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">Стабильность состава</h2>
      <ul className="dashboard-ranking-list">
        {rows.slice(0, 10).map((row) => (
          <li key={row.playerName}>
            <span>
              {row.playerName} ({row.windowsPlayed} окон, score {row.consistencyScore})
            </span>
            <span>{row.avgPoints.toLocaleString("en-US")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// apps/web/src/components/site/dashboard-kt-decline-zone.tsx
import React from "react";
import type { ClanWarsArchiveDeclineRow } from "@raid/ports";

type DashboardKtDeclineZoneProps = {
  rows: ClanWarsArchiveDeclineRow[];
};

export function DashboardKtDeclineZone({ rows }: DashboardKtDeclineZoneProps) {
  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">Кто проседает</h2>
      <ul className="dashboard-ranking-list">
        {rows.slice(0, 10).map((row) => (
          <li key={row.playerName}>
            <span>{row.playerName}</span>
            <span>
              {row.recentAvg.toLocaleString("en-US")} vs {row.baselineAvg.toLocaleString("en-US")} (
              {row.delta.toLocaleString("en-US")})
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// apps/web/src/components/site/dashboard-nav.tsx
import React from "react";
import Link from "next/link";

export function DashboardNav() {
  return (
    <details className="dashboard-nav">
      <summary>Menu</summary>
      <nav className="dashboard-nav__links" aria-label="Dashboard">
        <Link href="/">Landing</Link>
        <Link href="/dashboard/clan-wars">KT</Link>
        <Link href="/about">About</Link>
      </nav>
    </details>
  );
}
```

```ts
// apps/web/src/app/dashboard/page.test.tsx (append in existing test)
expect(html).toContain('href="/dashboard/clan-wars"');
```

```css
/* apps/web/src/app/globals.css */
.dashboard-kt-grid {
  display: grid;
  gap: 1rem;
}

.dashboard-kt-table {
  width: 100%;
  border-collapse: collapse;
}

.dashboard-kt-table th,
.dashboard-kt-table td {
  border-bottom: 1px solid var(--site-border);
  padding: 0.5rem;
  text-align: left;
}

@media (min-width: 901px) {
  .dashboard-kt-grid {
    grid-template-columns: 1fr 1fr;
  }
}
```

- [ ] **Step 4: Run page tests to verify they pass**

Run: `pnpm test -- apps/web/src/app/dashboard/clan-wars/page.test.tsx apps/web/src/app/dashboard/page.test.tsx`

Expected: PASS with KT page rendering and dashboard nav link assertions.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/dashboard/get-clan-wars-archive-snapshot.ts \
  apps/web/src/components/site/dashboard-kt-header-zone.tsx \
  apps/web/src/components/site/dashboard-kt-history-zone.tsx \
  apps/web/src/components/site/dashboard-kt-stability-zone.tsx \
  apps/web/src/components/site/dashboard-kt-decline-zone.tsx \
  apps/web/src/app/dashboard/clan-wars/page.tsx \
  apps/web/src/app/dashboard/clan-wars/page.test.tsx \
  apps/web/src/components/site/dashboard-nav.tsx \
  apps/web/src/app/dashboard/page.test.tsx \
  apps/web/src/app/globals.css
git commit -m "feat: add archive-first KT page and dashboard KT navigation"
```

### Task 5: Full Verification Gate For KT Archive Rollout

**Files:**
- Modify: none unless failures require targeted fixes
- Test: repository-wide validation commands

- [ ] **Step 1: Run focused suite for changed areas**

Run:

```bash
pnpm test -- packages/platform/test/clan-wars-archive-metrics.test.ts \
  packages/platform/test/clan-dashboard-repository.test.ts \
  packages/application/test/get-clan-wars-archive-snapshot.test.ts \
  apps/web/src/app/dashboard/clan-wars/page.test.tsx \
  apps/web/src/app/dashboard/page.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run: `pnpm test`

Expected: PASS without regressions.

- [ ] **Step 4: Run baseline build gates**

Run:

```bash
pnpm -r run build
pnpm --filter @raid/web run cf:build
```

Expected: both commands PASS.

- [ ] **Step 5: Commit final fixes from verification**

```bash
git status --short
```

Expected: empty output. If non-empty output appears after verification commands, stop and add a focused follow-up fix task instead of creating an unscoped commit.
