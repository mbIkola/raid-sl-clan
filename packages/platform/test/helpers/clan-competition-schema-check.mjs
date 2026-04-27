import { execPath } from "node:process";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const migrationsDirectory = resolve(process.cwd(), "platform/migrations");

const applyMigrations = () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");

  for (const fileName of readdirSync(migrationsDirectory).filter((name) => name.endsWith(".sql")).sort()) {
    db.exec(readFileSync(resolve(migrationsDirectory, fileName), "utf8"));
  }

  return db;
};

const lastInsertId = (db) => {
  const row = db.prepare("SELECT last_insert_rowid() AS id").get();
  return Number(row.id);
};

const createPlayerProfile = (db, nickname) => {
  db.prepare("INSERT INTO player_profile (main_nickname, status) VALUES (?, ?)").run(nickname, "active");
  return lastInsertId(db);
};

const createReportImport = (db, uploadType, scopeKey) => {
  db.prepare(
    [
      "INSERT INTO report_import (upload_type, source_kind, scope_type, scope_key, replace_existing, status)",
      "VALUES (?, ?, ?, ?, ?, ?)"
    ].join(" ")
  ).run(uploadType, "manual_json", "competition_window", scopeKey, 1, "applied");

  return lastInsertId(db);
};

const createCompetitionWindow = (db, activityType, cadenceSlot, rotationNumber) => {
  db.prepare(
    [
      "INSERT INTO competition_window",
      "(activity_type, season_year, week_of_year, cadence_slot, rotation_number, starts_at, ends_at, label)",
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ].join(" ")
  ).run(
    activityType,
    2026,
    activityType === "hydra" ? 18 : 19,
    cadenceSlot,
    rotationNumber,
    activityType === "hydra" ? "2026-04-22T00:00:00Z" : "2026-04-23T00:00:00Z",
    activityType === "hydra" ? "2026-04-29T00:00:00Z" : "2026-04-30T00:00:00Z",
    `${activityType}-window`
  );

  return lastInsertId(db);
};

const seedHydraContext = (db) => {
  const competitionWindowId = createCompetitionWindow(db, "hydra", "weekly", 2);
  const playerProfileId = createPlayerProfile(db, "MiroslavUA");
  const reportImportId = createReportImport(db, "ocr_hydra_detail", "hydra:2026:18");

  db.prepare(
    "INSERT INTO hydra_report (competition_window_id, report_import_id, source_system, is_partial) VALUES (?, ?, ?, ?)"
  ).run(competitionWindowId, reportImportId, "ocr_json", 0);
  const hydraReportId = lastInsertId(db);

  db.prepare(
    [
      "INSERT INTO hydra_player_result",
      "(hydra_report_id, player_profile_id, display_name_at_import, total_damage, keys_used, clan_rank, data_completeness)",
      "VALUES (?, ?, ?, ?, ?, ?, ?)"
    ].join(" ")
  ).run(hydraReportId, playerProfileId, "MiroslavUA", 1_250_000_000, 3, 1, "full_detail");
  const hydraPlayerResultId = lastInsertId(db);

  return { competitionWindowId, playerProfileId, hydraReportId, hydraPlayerResultId };
};

const seedChimeraContext = (db) => {
  const competitionWindowId = createCompetitionWindow(db, "chimera", "weekly", 3);
  const playerProfileId = createPlayerProfile(db, "Belkins");
  const reportImportId = createReportImport(db, "ocr_chimera_detail", "chimera:2026:19");

  db.prepare(
    "INSERT INTO chimera_report (competition_window_id, report_import_id, source_system, is_partial) VALUES (?, ?, ?, ?)"
  ).run(competitionWindowId, reportImportId, "ocr_json", 0);
  const chimeraReportId = lastInsertId(db);

  db.prepare(
    [
      "INSERT INTO chimera_player_result",
      "(chimera_report_id, player_profile_id, display_name_at_import, total_damage, keys_used, clan_rank, data_completeness)",
      "VALUES (?, ?, ?, ?, ?, ?, ?)"
    ].join(" ")
  ).run(chimeraReportId, playerProfileId, "Belkins", 950_000_000, 2, 1, "partial_detail");
  const chimeraPlayerResultId = lastInsertId(db);

  return { competitionWindowId, playerProfileId, chimeraReportId, chimeraPlayerResultId };
};

const command = process.argv[2];

try {
  const db = applyMigrations();

  switch (command) {
    case "tables": {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map((row) => row.name);

      console.log(JSON.stringify({ ok: true, tables }));
      break;
    }

    case "duplicate-window": {
      createCompetitionWindow(db, "hydra", "weekly", 1);

      let duplicateRejected = false;

      try {
        createCompetitionWindow(db, "hydra", "weekly", 2);
      } catch {
        duplicateRejected = true;
      }

      console.log(JSON.stringify({ ok: true, duplicateRejected }));
      break;
    }

    case "difficulty-constraints": {
      const hydra = seedHydraContext(db);
      const chimera = seedChimeraContext(db);

      let hydraRejected = false;
      let chimeraRejected = false;

      try {
        db.prepare(
          [
            "INSERT INTO hydra_team_run",
            "(hydra_player_result_id, hydra_report_id, competition_window_id, player_profile_id, team_index, difficulty, total_damage, data_completeness)",
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
          ].join(" ")
        ).run(
          hydra.hydraPlayerResultId,
          hydra.hydraReportId,
          hydra.competitionWindowId,
          hydra.playerProfileId,
          1,
          "ultra_nightmare",
          400_000_000,
          "full_detail"
        );
      } catch {
        hydraRejected = true;
      }

      try {
        db.prepare(
          [
            "INSERT INTO chimera_team_run",
            "(chimera_player_result_id, chimera_report_id, competition_window_id, player_profile_id, team_index, difficulty, total_damage, data_completeness)",
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
          ].join(" ")
        ).run(
          chimera.chimeraPlayerResultId,
          chimera.chimeraReportId,
          chimera.competitionWindowId,
          chimera.playerProfileId,
          1,
          "impossible",
          300_000_000,
          "partial_detail"
        );
      } catch {
        chimeraRejected = true;
      }

      db.prepare(
        [
          "INSERT INTO chimera_team_run",
          "(chimera_player_result_id, chimera_report_id, competition_window_id, player_profile_id, team_index, difficulty, total_damage, data_completeness)",
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      ).run(
        chimera.chimeraPlayerResultId,
        chimera.chimeraReportId,
        chimera.competitionWindowId,
        chimera.playerProfileId,
        1,
        "ultra_nightmare",
        300_000_000,
        "partial_detail"
      );

      console.log(JSON.stringify({ ok: true, hydraRejected, chimeraRejected }));
      break;
    }

    case "data-completeness": {
      const hydra = seedHydraContext(db);

      let invalidRejected = false;

      try {
        db.prepare(
          [
            "INSERT INTO hydra_team_run",
            "(hydra_player_result_id, hydra_report_id, competition_window_id, player_profile_id, team_index, difficulty, total_damage, data_completeness)",
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
          ].join(" ")
        ).run(
          hydra.hydraPlayerResultId,
          hydra.hydraReportId,
          hydra.competitionWindowId,
          hydra.playerProfileId,
          1,
          "nightmare",
          400_000_000,
          "unknown_state"
        );
      } catch {
        invalidRejected = true;
      }

      console.log(JSON.stringify({ ok: true, invalidRejected }));
      break;
    }

    case "roster-summary-unique": {
      const playerProfileId = createPlayerProfile(db, "Radoran");

      db.prepare(
        [
          "INSERT INTO champion_roster_observation",
          "(player_profile_id, champion_code, first_seen_at, last_seen_at, evidence_type, evidence_ref_id)",
          "VALUES (?, ?, ?, ?, ?, ?)"
        ].join(" ")
      ).run(playerProfileId, "lydia_the_deathsiren", "2026-04-22T00:00:00Z", "2026-04-22T00:00:00Z", "hydra", 101);

      let duplicateRejected = false;

      try {
        db.prepare(
          [
            "INSERT INTO champion_roster_observation",
            "(player_profile_id, champion_code, first_seen_at, last_seen_at, evidence_type, evidence_ref_id)",
            "VALUES (?, ?, ?, ?, ?, ?)"
          ].join(" ")
        ).run(
          playerProfileId,
          "lydia_the_deathsiren",
          "2026-04-23T00:00:00Z",
          "2026-04-23T00:00:00Z",
          "chimera",
          202
        );
      } catch {
        duplicateRejected = true;
      }

      console.log(JSON.stringify({ ok: true, duplicateRejected }));
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
