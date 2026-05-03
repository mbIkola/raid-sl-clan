import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createD1ClanDashboardRepository } from "../src/dashboard/create-d1-clan-dashboard-repository";

type D1QueryResult<T> = { results?: T[] };
type D1PreparedStatementLike = {
  bind(...values: unknown[]): D1PreparedStatementLike;
  all<T>(): Promise<D1QueryResult<T>>;
};
type D1DatabaseLike = { prepare(query: string): D1PreparedStatementLike };
type SqliteStatement = {
  run(...values: unknown[]): { lastInsertRowid: number | bigint };
  all(...values: unknown[]): unknown[];
};
type SqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
};

type CompetitionWindowInput = {
  activityType: "clan_wars";
  seasonYear: number;
  week: number;
  startsAt: string;
  endsAt: string;
  label: string;
};

const applyDashboardMigrations = (database: SqliteDatabase) => {
  for (const fileName of [
    "0001_bootstrap.sql",
    "0002_clan_competition_schema.sql",
    "0004_clan_wars_has_personal_rewards.sql"
  ]) {
    database.exec(readFileSync(join(process.cwd(), "platform", "migrations", fileName), "utf8"));
  }
};

const createD1SqliteAdapter = () => {
  const require = createRequire(import.meta.url);
  const { DatabaseSync } = require("node:sqlite") as {
    DatabaseSync: new (path: string) => SqliteDatabase;
  };
  const sqlite = new DatabaseSync(":memory:");
  applyDashboardMigrations(sqlite);

  const d1: D1DatabaseLike = {
    prepare(query: string) {
      const statement = sqlite.prepare(query);
      let bindValues: unknown[] = [];

      const prepared: D1PreparedStatementLike = {
        bind(...values: unknown[]) {
          bindValues = values;
          return prepared;
        },
        async all<T>() {
          const rows = statement.all(...bindValues) as T[];
          return { results: rows };
        }
      };

      return prepared;
    }
  };

  return { sqlite, d1 };
};

const insertReportImport = (database: SqliteDatabase, scopeKey: string) =>
  Number(
    database
      .prepare(
        [
          "INSERT INTO report_import",
          "(upload_type, source_kind, scope_type, scope_key, replace_existing, status)",
          "VALUES (?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run("manual_json", "unit_test", "competition_window", scopeKey, 1, "applied")
      .lastInsertRowid
  );

const insertCompetitionWindow = (database: SqliteDatabase, input: CompetitionWindowInput) =>
  Number(
    database
      .prepare(
        [
          "INSERT INTO competition_window",
          "(activity_type, season_year, week_of_year, cadence_slot, rotation_number, starts_at, ends_at, label)",
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(
        input.activityType,
        input.seasonYear,
        input.week,
        "biweekly",
        null,
        input.startsAt,
        input.endsAt,
        input.label
      ).lastInsertRowid
  );

const insertPlayer = (database: SqliteDatabase, nickname: string, status = "active") =>
  Number(
    database
      .prepare("INSERT INTO player_profile (main_nickname, status) VALUES (?, ?)")
      .run(nickname, status).lastInsertRowid
  );

const insertClanWarsReport = (
  database: SqliteDatabase,
  input: {
    windowId: number;
    scopeKey: string;
    hasPersonalRewards: number;
    createdAt: string;
  }
) => {
  const reportImportId = insertReportImport(database, input.scopeKey);

  return Number(
    database
      .prepare(
        [
          "INSERT INTO clan_wars_report",
          "(competition_window_id, report_import_id, source_system, is_partial, has_personal_rewards, created_at)",
          "VALUES (?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(
        input.windowId,
        reportImportId,
        "unit",
        0,
        input.hasPersonalRewards,
        input.createdAt
      ).lastInsertRowid
  );
};

const insertClanWarsScore = (
  database: SqliteDatabase,
  input: {
    reportId: number;
    competitionWindowId: number;
    playerId: number;
    displayName: string;
    points: number;
  }
) => {
  database
    .prepare(
      [
        "INSERT INTO clan_wars_player_score",
        "(clan_wars_report_id, competition_window_id, player_profile_id, display_name_at_import, points)",
        "VALUES (?, ?, ?, ?, ?)"
      ].join(" ")
    )
    .run(
      input.reportId,
      input.competitionWindowId,
      input.playerId,
      input.displayName,
      input.points
    );
};

const helperPath = resolve(
  process.cwd(),
  "packages/platform/test/helpers/clan-dashboard-query-check.mjs"
);

const runCheck = <T>(command: string) => {
  const output = execFileSync("node", ["--no-warnings", helperPath, command], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  return JSON.parse(output) as T;
};

describe("clan dashboard SQL", () => {
  it("calculates KT ranking by latest 4 personal-rewards reports", () => {
    const result = runCheck<{ ok: boolean; rows: Array<{ player_name: string; score: number }> }>(
      "kt-latest-4-rewards"
    );

    expect(result.ok).toBe(true);
    expect(result.rows).toHaveLength(5);
    expect(result.rows[0]).toEqual({ player_name: "Alpha", score: 220 });
    expect(result.rows[1]).toEqual({ player_name: "Delta", score: 140 });
    expect(result.rows[2]).toEqual({ player_name: "Gamma", score: 130 });
    expect(result.rows[3]).toEqual({ player_name: "Beta", score: 90 });
    expect(result.rows[4]).toEqual({ player_name: "Epsilon", score: 0 });
  });

  it("excludes inactive roster from hydra ranking and keeps active zero rows", () => {
    const result = runCheck<{ ok: boolean; rows: Array<{ player_name: string; score: number }> }>(
      "hydra-active-roster-filter"
    );

    expect(result.ok).toBe(true);
    expect(result.rows[0]).toEqual({ player_name: "ActiveOne", score: 2000 });
    expect(result.rows.some((row) => row.player_name === "InactiveWhale")).toBe(false);
    expect(result.rows.some((row) => row.player_name === "ActiveZero" && row.score === 0)).toBe(true);
  });

  it("uses rewards flag from the selected latest KT window, not global latest report", () => {
    const result = runCheck<{
      ok: boolean;
      row: { starts_at: string; ends_at: string; has_personal_rewards: number };
    }>("kt-readiness-window-scoped-status");

    expect(result.ok).toBe(true);
    expect(result.row.starts_at).toBe("2031-03-15T00:00:00Z");
    expect(result.row.ends_at).toBe("2031-03-17T00:00:00Z");
    expect(result.row.has_personal_rewards).toBe(0);
  });

  it("aggregates KT archive history for the latest windows", () => {
    const result = runCheck<{
      ok: boolean;
      rows: Array<{
        starts_at: string;
        ends_at: string;
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
      ends_at: "2031-04-14T00:00:00Z",
      has_personal_rewards: 1,
      clan_total_points: 430,
      active_contributors: 3,
      top_player_name: "Alpha",
      top_player_points: 220
    });
  });

  it("maps getClanWarsArchive from D1 repository using report-linked score joins", async () => {
    const { sqlite, d1 } = createD1SqliteAdapter();
    const alpha = insertPlayer(sqlite, "Alpha");
    const beta = insertPlayer(sqlite, "Beta");
    const gamma = insertPlayer(sqlite, "Gamma");

    const window1 = insertCompetitionWindow(sqlite, {
      activityType: "clan_wars",
      seasonYear: 2031,
      week: 9,
      startsAt: "2031-03-01T00:00:00Z",
      endsAt: "2031-03-03T00:00:00Z",
      label: "cw-1"
    });
    const window2 = insertCompetitionWindow(sqlite, {
      activityType: "clan_wars",
      seasonYear: 2031,
      week: 10,
      startsAt: "2031-03-15T00:00:00Z",
      endsAt: "2031-03-17T00:00:00Z",
      label: "cw-2"
    });
    const window3 = insertCompetitionWindow(sqlite, {
      activityType: "clan_wars",
      seasonYear: 2031,
      week: 11,
      startsAt: "2031-03-29T00:00:00Z",
      endsAt: "2031-03-31T00:00:00Z",
      label: "cw-3"
    });
    const window4 = insertCompetitionWindow(sqlite, {
      activityType: "clan_wars",
      seasonYear: 2031,
      week: 12,
      startsAt: "2031-04-12T00:00:00Z",
      endsAt: "2031-04-14T00:00:00Z",
      label: "cw-4"
    });
    const window5InProgress = insertCompetitionWindow(sqlite, {
      activityType: "clan_wars",
      seasonYear: 2031,
      week: 13,
      startsAt: "2031-05-01T00:00:00Z",
      endsAt: "2031-05-15T00:00:00Z",
      label: "cw-5-in-progress"
    });

    const report1 = insertClanWarsReport(sqlite, {
      windowId: window1,
      scopeKey: "cw-1",
      hasPersonalRewards: 0,
      createdAt: "2031-03-01T01:00:00Z"
    });
    const report2 = insertClanWarsReport(sqlite, {
      windowId: window2,
      scopeKey: "cw-2",
      hasPersonalRewards: 0,
      createdAt: "2031-03-15T01:00:00Z"
    });
    const report3 = insertClanWarsReport(sqlite, {
      windowId: window3,
      scopeKey: "cw-3",
      hasPersonalRewards: 0,
      createdAt: "2031-03-29T01:00:00Z"
    });
    const report4 = insertClanWarsReport(sqlite, {
      windowId: window4,
      scopeKey: "cw-4",
      hasPersonalRewards: 1,
      createdAt: "2031-04-12T01:00:00Z"
    });
    const report5InProgress = insertClanWarsReport(sqlite, {
      windowId: window5InProgress,
      scopeKey: "cw-5",
      hasPersonalRewards: 1,
      createdAt: "2031-05-01T01:00:00Z"
    });

    insertClanWarsScore(sqlite, {
      reportId: report1,
      competitionWindowId: window1,
      playerId: alpha,
      displayName: "Alpha",
      points: 300
    });
    insertClanWarsScore(sqlite, {
      reportId: report1,
      competitionWindowId: window1,
      playerId: beta,
      displayName: "Beta",
      points: 50
    });
    insertClanWarsScore(sqlite, {
      reportId: report2,
      competitionWindowId: window2,
      playerId: alpha,
      displayName: "Alpha",
      points: 80
    });
    insertClanWarsScore(sqlite, {
      reportId: report2,
      competitionWindowId: window2,
      playerId: beta,
      displayName: "Beta",
      points: 60
    });
    insertClanWarsScore(sqlite, {
      reportId: report3,
      competitionWindowId: window3,
      playerId: alpha,
      displayName: "Alpha",
      points: 90
    });
    insertClanWarsScore(sqlite, {
      reportId: report3,
      competitionWindowId: window3,
      playerId: beta,
      displayName: "Beta",
      points: 70
    });
    insertClanWarsScore(sqlite, {
      reportId: report4,
      competitionWindowId: window4,
      playerId: alpha,
      displayName: "Alpha",
      points: 100
    });
    insertClanWarsScore(sqlite, {
      reportId: report4,
      competitionWindowId: window1,
      playerId: beta,
      displayName: "Beta",
      points: 80
    });
    insertClanWarsScore(sqlite, {
      reportId: report4,
      competitionWindowId: window4,
      playerId: gamma,
      displayName: "Gamma",
      points: 20
    });
    insertClanWarsScore(sqlite, {
      reportId: report5InProgress,
      competitionWindowId: window5InProgress,
      playerId: alpha,
      displayName: "Alpha",
      points: 999
    });

    const repository = createD1ClanDashboardRepository(d1);
    const archive = await repository.getClanWarsArchive({
      nowIso: "2031-05-03T11:22:00.000Z",
      windowLimit: 12
    });

    expect(archive.history[0]).toEqual({
      windowStart: "2031-04-12T00:00:00Z",
      windowEnd: "2031-04-14T00:00:00Z",
      hasPersonalRewards: true,
      clanTotalPoints: 200,
      activeContributors: 3,
      topPlayerName: "Alpha",
      topPlayerPoints: 100
    });

    const oldestWindow = archive.history.find(
      (row) => row.windowStart === "2031-03-01T00:00:00Z"
    );
    const inProgressWindow = archive.history.find(
      (row) => row.windowStart === "2031-05-01T00:00:00Z"
    );

    expect(oldestWindow?.clanTotalPoints).toBe(350);
    expect(inProgressWindow).toBeUndefined();
    expect(archive.stability.length).toBeGreaterThan(0);
    expect(archive.stability.some((row) => row.playerName === "Alpha")).toBe(true);

    const alphaDecline = archive.decline.find((row) => row.playerName === "Alpha");
    expect(alphaDecline).toEqual({
      playerName: "Alpha",
      recentAvg: 90,
      baselineAvg: 300,
      delta: -210
    });
  });

  it("maps readiness snapshot using locale-neutral data primitives", async () => {
    const { d1 } = createD1SqliteAdapter();
    const repository = createD1ClanDashboardRepository(d1);

    const snapshot = await repository.getSnapshot({
      nowIso: "2026-05-06T00:00:00.000Z",
      trendWeeks: 4
    });

    expect(snapshot.readiness[0]).toMatchObject({
      activity: "hydra",
      title: "Hydra",
      targetKind: "reset",
      href: "/dashboard/hydra",
      metricKind: "keys_and_damage",
      keysSpent: 0,
      totalScore: 0,
      hasPersonalRewards: null
    });

    const clanWarsCard = snapshot.readiness.find((card) => card.activity === "clan_wars");
    expect(clanWarsCard).toMatchObject({
      activity: "clan_wars",
      href: "/dashboard/clan-wars",
      metricKind: "clan_wars_state",
      clanWarsState: "active",
      hasPersonalRewards: true
    });

    const siegeCard = snapshot.readiness.find((card) => card.activity === "siege");
    expect(siegeCard).toMatchObject({
      activity: "siege",
      href: "/dashboard/siege",
      metricKind: "siege_preparation",
      hasPersonalRewards: null
    });

    expect("statusLabel" in snapshot.readiness[0]).toBe(false);
    expect("primaryValue" in snapshot.readiness[0]).toBe(false);
  });
});
