#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const migrationsDirectory = join(process.cwd(), "platform", "migrations");

const selectHydraRankingSql = (order) => `
WITH recent_windows AS (
  SELECT id
  FROM competition_window
  WHERE activity_type = 'hydra'
  ORDER BY ends_at DESC, id DESC
  LIMIT ?
)
SELECT
  pp.main_nickname AS player_name,
  COALESCE(SUM(CASE WHEN hr.id IS NOT NULL THEN hpr.total_damage ELSE 0 END), 0) AS score
FROM player_profile pp
LEFT JOIN hydra_player_result hpr ON hpr.player_profile_id = pp.id
LEFT JOIN hydra_report hr
  ON hr.id = hpr.hydra_report_id
  AND hr.competition_window_id IN (SELECT id FROM recent_windows)
WHERE pp.status = 'active'
GROUP BY pp.id, pp.main_nickname
ORDER BY score ${order}, pp.main_nickname ASC
LIMIT ?;
`;

const selectClanWarsRankingSql = (order) => `
WITH latest_reward_reports AS (
  SELECT id
  FROM clan_wars_report
  WHERE has_personal_rewards = 1
  ORDER BY created_at DESC, id DESC
  LIMIT 4
)
SELECT
  pp.main_nickname AS player_name,
  COALESCE(SUM(cwps.points), 0) AS score
FROM player_profile pp
LEFT JOIN clan_wars_player_score cwps
  ON cwps.player_profile_id = pp.id
  AND cwps.clan_wars_report_id IN (SELECT id FROM latest_reward_reports)
WHERE pp.status = 'active'
GROUP BY pp.id, pp.main_nickname
ORDER BY score ${order}, pp.main_nickname ASC
LIMIT ?;
`;

const selectClanWarsReadinessSql = `
WITH latest_window AS (
  SELECT id, starts_at, ends_at
  FROM competition_window
  WHERE activity_type = 'clan_wars'
  ORDER BY starts_at DESC, id DESC
  LIMIT 1
), latest_report AS (
  SELECT cwr.has_personal_rewards
  FROM clan_wars_report cwr
  JOIN latest_window lw ON lw.id = cwr.competition_window_id
  ORDER BY cwr.created_at DESC, cwr.id DESC
  LIMIT 1
)
SELECT
  lw.starts_at,
  lw.ends_at,
  COALESCE(lr.has_personal_rewards, 0) AS has_personal_rewards
FROM latest_window lw
LEFT JOIN latest_report lr ON 1 = 1;
`;

const selectClanWarsArchiveHistorySql = `
WITH recent_windows AS (
  SELECT
    cw.id,
    cw.starts_at,
    cw.ends_at,
    cwr.id AS report_id,
    cwr.has_personal_rewards
  FROM competition_window cw
  JOIN clan_wars_report cwr
    ON cwr.id = (
      SELECT cwr2.id
      FROM clan_wars_report cwr2
      WHERE cwr2.competition_window_id = cw.id
      ORDER BY cwr2.created_at DESC, cwr2.id DESC
      LIMIT 1
    )
  WHERE cw.activity_type = 'clan_wars'
    AND cw.ends_at <= ?
  ORDER BY cw.starts_at DESC, cw.id DESC
  LIMIT ?
)
SELECT
  rw.starts_at,
  rw.ends_at,
  rw.has_personal_rewards AS has_personal_rewards,
  COALESCE(SUM(cwps.points), 0) AS clan_total_points,
  COALESCE(COUNT(DISTINCT CASE WHEN cwps.points > 0 THEN cwps.player_profile_id END), 0) AS active_contributors,
  COALESCE((
    SELECT pp.main_nickname
    FROM clan_wars_player_score cwps2
    JOIN player_profile pp ON pp.id = cwps2.player_profile_id
    WHERE cwps2.clan_wars_report_id = rw.report_id
    ORDER BY cwps2.points DESC, pp.main_nickname ASC
    LIMIT 1
  ), '-') AS top_player_name,
  COALESCE((
    SELECT cwps2.points
    FROM clan_wars_player_score cwps2
    JOIN player_profile pp ON pp.id = cwps2.player_profile_id
    WHERE cwps2.clan_wars_report_id = rw.report_id
    ORDER BY cwps2.points DESC, pp.main_nickname ASC
    LIMIT 1
  ), 0) AS top_player_points
FROM recent_windows rw
LEFT JOIN clan_wars_player_score cwps ON cwps.clan_wars_report_id = rw.report_id
GROUP BY rw.id, rw.starts_at, rw.ends_at, rw.has_personal_rewards, rw.report_id
ORDER BY rw.starts_at DESC, rw.id DESC;
`;

const applyMigrations = () => {
  const database = new DatabaseSync(":memory:");

  for (const fileName of [
    "0001_bootstrap.sql",
    "0002_clan_competition_schema.sql",
    "0004_clan_wars_has_personal_rewards.sql"
  ]) {
    database.exec(readFileSync(join(migrationsDirectory, fileName), "utf8"));
  }

  return database;
};

const emit = (payload) => {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
};

const insertReportImport = (db, scopeKey) =>
  Number(
    db
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

const insertCompetitionWindow = (db, args) =>
  Number(
    db
      .prepare(
        [
          "INSERT INTO competition_window",
          "(activity_type, season_year, week_of_year, cadence_slot, rotation_number, starts_at, ends_at, label)",
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(
        args.activityType,
        args.seasonYear,
        args.week,
        args.cadence,
        args.rotationNumber,
        args.startsAt,
        args.endsAt,
        args.label
      ).lastInsertRowid
  );

const insertPlayer = (db, nickname, status = "active") =>
  Number(
    db
      .prepare("INSERT INTO player_profile (main_nickname, status) VALUES (?, ?)")
      .run(nickname, status).lastInsertRowid
  );

const runKtLatest4WithRewards = (database) => {
  const alpha = insertPlayer(database, "Alpha");
  const beta = insertPlayer(database, "Beta");
  const gamma = insertPlayer(database, "Gamma");
  const delta = insertPlayer(database, "Delta");
  insertPlayer(database, "Epsilon");

  const windows = [1, 2, 3, 4, 5].map((index) =>
    insertCompetitionWindow(database, {
      activityType: "clan_wars",
      seasonYear: 2031,
      week: index,
      cadence: "biweekly",
      rotationNumber: null,
      startsAt: `2031-01-${String(index).padStart(2, "0")}T00:00:00Z`,
      endsAt: `2031-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
      label: `cw-${index}`
    })
  );

  const reportIds = windows.map((windowId, index) => {
    const reportImportId = insertReportImport(database, `cw-${index + 1}`);

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
          windowId,
          reportImportId,
          "unit",
          0,
          index === 1 ? 0 : 1,
          `2031-01-${String(index + 1).padStart(2, "0")}T01:00:00Z`
        ).lastInsertRowid
    );
  });

  const insertScore = (reportId, windowId, playerId, points) => {
    database
      .prepare(
        [
          "INSERT INTO clan_wars_player_score",
          "(clan_wars_report_id, competition_window_id, player_profile_id, display_name_at_import, points)",
          "VALUES (?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(reportId, windowId, playerId, `p-${playerId}`, points);
  };

  insertScore(reportIds[0], windows[0], alpha, 100);
  insertScore(reportIds[0], windows[0], beta, 90);
  insertScore(reportIds[1], windows[1], beta, 10_000);
  insertScore(reportIds[2], windows[2], alpha, 120);
  insertScore(reportIds[3], windows[3], gamma, 130);
  insertScore(reportIds[4], windows[4], delta, 140);

  const rows = database.prepare(selectClanWarsRankingSql("DESC")).all(5);

  emit({
    ok: true,
    rows
  });
};

const runHydraActiveRosterFilter = (database) => {
  const activeOne = insertPlayer(database, "ActiveOne");
  insertPlayer(database, "ActiveZero");
  const inactiveWhale = insertPlayer(database, "InactiveWhale", "inactive");

  const windowId = insertCompetitionWindow(database, {
    activityType: "hydra",
    seasonYear: 2032,
    week: 10,
    cadence: "weekly",
    rotationNumber: 2,
    startsAt: "2032-03-01T00:00:00Z",
    endsAt: "2032-03-08T00:00:00Z",
    label: "hydra-10"
  });

  const reportImportId = insertReportImport(database, "hydra-10");
  const reportId = Number(
    database
      .prepare(
        "INSERT INTO hydra_report (competition_window_id, report_import_id, source_system, is_partial) VALUES (?, ?, ?, ?)"
      )
      .run(windowId, reportImportId, "unit", 0).lastInsertRowid
  );

  database
    .prepare(
      [
        "INSERT INTO hydra_player_result",
        "(hydra_report_id, player_profile_id, display_name_at_import, total_damage, keys_used, data_completeness)",
        "VALUES (?, ?, ?, ?, ?, ?)"
      ].join(" ")
    )
    .run(reportId, activeOne, "ActiveOne", 2000, 3, "aggregate_only");

  database
    .prepare(
      [
        "INSERT INTO hydra_player_result",
        "(hydra_report_id, player_profile_id, display_name_at_import, total_damage, keys_used, data_completeness)",
        "VALUES (?, ?, ?, ?, ?, ?)"
      ].join(" ")
    )
    .run(reportId, inactiveWhale, "InactiveWhale", 999999, 3, "aggregate_only");

  const rows = database.prepare(selectHydraRankingSql("DESC")).all(8, 5);

  emit({
    ok: true,
    rows
  });
};

const runClanWarsReadinessScopedStatus = (database) => {
  const olderWindowId = insertCompetitionWindow(database, {
    activityType: "clan_wars",
    seasonYear: 2031,
    week: 10,
    cadence: "biweekly",
    rotationNumber: null,
    startsAt: "2031-03-01T00:00:00Z",
    endsAt: "2031-03-03T00:00:00Z",
    label: "older-window"
  });

  const latestWindowId = insertCompetitionWindow(database, {
    activityType: "clan_wars",
    seasonYear: 2031,
    week: 11,
    cadence: "biweekly",
    rotationNumber: null,
    startsAt: "2031-03-15T00:00:00Z",
    endsAt: "2031-03-17T00:00:00Z",
    label: "latest-window"
  });

  const olderImportId = insertReportImport(database, "older-window");
  const latestImportId = insertReportImport(database, "latest-window");

  database
    .prepare(
      [
        "INSERT INTO clan_wars_report",
        "(competition_window_id, report_import_id, source_system, is_partial, has_personal_rewards, created_at)",
        "VALUES (?, ?, ?, ?, ?, ?)"
      ].join(" ")
    )
    .run(olderWindowId, olderImportId, "unit", 0, 1, "2031-04-01T01:00:00Z");

  database
    .prepare(
      [
        "INSERT INTO clan_wars_report",
        "(competition_window_id, report_import_id, source_system, is_partial, has_personal_rewards, created_at)",
        "VALUES (?, ?, ?, ?, ?, ?)"
      ].join(" ")
    )
    .run(latestWindowId, latestImportId, "unit", 0, 0, "2031-03-20T01:00:00Z");

  const row = database.prepare(selectClanWarsReadinessSql).get();

  emit({
    ok: true,
    row
  });
};

const runKtArchiveHistoryAggregate = (database) => {
  const alpha = insertPlayer(database, "Alpha");
  const beta = insertPlayer(database, "Beta");
  const gamma = insertPlayer(database, "Gamma");

  const latestWindowId = insertCompetitionWindow(database, {
    activityType: "clan_wars",
    seasonYear: 2031,
    week: 11,
    cadence: "biweekly",
    rotationNumber: null,
    startsAt: "2031-04-12T00:00:00Z",
    endsAt: "2031-04-14T00:00:00Z",
    label: "cw-a"
  });

  const previousWindowId = insertCompetitionWindow(database, {
    activityType: "clan_wars",
    seasonYear: 2031,
    week: 10,
    cadence: "biweekly",
    rotationNumber: null,
    startsAt: "2031-03-29T00:00:00Z",
    endsAt: "2031-03-31T00:00:00Z",
    label: "cw-b"
  });

  const latestImportId = insertReportImport(database, "cw-a");
  const previousImportId = insertReportImport(database, "cw-b");

  const latestReportId = Number(
    database
      .prepare(
        [
          "INSERT INTO clan_wars_report",
          "(competition_window_id, report_import_id, source_system, is_partial, has_personal_rewards, created_at)",
          "VALUES (?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(
        latestWindowId,
        latestImportId,
        "unit",
        0,
        1,
        "2031-04-12T02:00:00Z"
      ).lastInsertRowid
  );

  const previousReportId = Number(
    database
      .prepare(
        [
          "INSERT INTO clan_wars_report",
          "(competition_window_id, report_import_id, source_system, is_partial, has_personal_rewards, created_at)",
          "VALUES (?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(
        previousWindowId,
        previousImportId,
        "unit",
        0,
        0,
        "2031-03-29T02:00:00Z"
      ).lastInsertRowid
  );

  const insertScore = (reportId, windowId, playerId, playerName, points) => {
    database
      .prepare(
        [
          "INSERT INTO clan_wars_player_score",
          "(clan_wars_report_id, competition_window_id, player_profile_id, display_name_at_import, points)",
          "VALUES (?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(reportId, windowId, playerId, playerName, points);
  };

  insertScore(latestReportId, latestWindowId, alpha, "Alpha", 220);
  insertScore(latestReportId, latestWindowId, beta, "Beta", 110);
  insertScore(latestReportId, latestWindowId, gamma, "Gamma", 100);
  insertScore(previousReportId, previousWindowId, alpha, "Alpha", 180);
  insertScore(previousReportId, previousWindowId, beta, "Beta", 50);

  const rows = database
    .prepare(selectClanWarsArchiveHistorySql)
    .all("2031-05-01T00:00:00Z", 12);

  emit({
    ok: true,
    rows
  });
};

const database = applyMigrations();
const command = process.argv[2];

switch (command) {
  case "kt-latest-4-rewards":
    runKtLatest4WithRewards(database);
    break;
  case "hydra-active-roster-filter":
    runHydraActiveRosterFilter(database);
    break;
  case "kt-readiness-window-scoped-status":
    runClanWarsReadinessScopedStatus(database);
    break;
  case "kt-archive-history-aggregate":
    runKtArchiveHistoryAggregate(database);
    break;
  default:
    emit({ ok: false, error: `unknown-command:${command}` });
    process.exitCode = 1;
}
