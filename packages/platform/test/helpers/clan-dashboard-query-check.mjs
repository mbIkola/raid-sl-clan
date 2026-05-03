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

const database = applyMigrations();
const command = process.argv[2];

switch (command) {
  case "kt-latest-4-rewards":
    runKtLatest4WithRewards(database);
    break;
  case "hydra-active-roster-filter":
    runHydraActiveRosterFilter(database);
    break;
  default:
    emit({ ok: false, error: `unknown-command:${command}` });
    process.exitCode = 1;
}
