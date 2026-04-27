#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const migrationsDirectory = join(process.cwd(), "platform", "migrations");

const applyMigrations = () => {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");

  for (const filename of readdirSync(migrationsDirectory).filter((entry) => entry.endsWith(".sql")).sort()) {
    database.exec(readFileSync(join(migrationsDirectory, filename), "utf8"));
  }

  return database;
};

const isConstraintError = (error) =>
  error instanceof Error &&
  ((typeof error.errstr === "string" && error.errstr === "constraint failed") ||
    error.message.includes("constraint failed"));

const createPlayerProfile = (database, nickname) =>
  Number(
    database
      .prepare("INSERT INTO player_profile (main_nickname, status) VALUES (?, ?)")
      .run(nickname, "active").lastInsertRowid
  );

const createReportImport = (database, uploadType, scopeKey) =>
  Number(
    database
      .prepare(
        [
          "INSERT INTO report_import",
          "(upload_type, source_kind, scope_type, scope_key, replace_existing, status)",
          "VALUES (?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(uploadType, "manual_json", "competition_window", scopeKey, 1, "applied").lastInsertRowid
  );

const createCompetitionWindow = (database, activityType, cadenceSlot, rotationNumber) =>
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
        activityType,
        2026,
        activityType === "hydra" ? 18 : 19,
        cadenceSlot,
        rotationNumber,
        activityType === "hydra" ? "2026-04-22T00:00:00Z" : "2026-04-23T00:00:00Z",
        activityType === "hydra" ? "2026-04-29T00:00:00Z" : "2026-04-30T00:00:00Z",
        `${activityType}-window`
      ).lastInsertRowid
  );

const seedHydraContext = (database) => {
  const competitionWindowId = createCompetitionWindow(database, "hydra", "weekly", 2);
  const playerProfileId = createPlayerProfile(database, "MiroslavUA");
  const reportImportId = createReportImport(database, "ocr_hydra_detail", "hydra:2026:18");

  const hydraReportId = Number(
    database
      .prepare(
        "INSERT INTO hydra_report (competition_window_id, report_import_id, source_system, is_partial) VALUES (?, ?, ?, ?)"
      )
      .run(competitionWindowId, reportImportId, "ocr_json", 0).lastInsertRowid
  );

  const hydraPlayerResultId = Number(
    database
      .prepare(
        [
          "INSERT INTO hydra_player_result",
          "(hydra_report_id, player_profile_id, display_name_at_import, total_damage, keys_used, clan_rank, data_completeness)",
          "VALUES (?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(hydraReportId, playerProfileId, "MiroslavUA", 1_250_000_000, 3, 1, "full_detail").lastInsertRowid
  );

  return { competitionWindowId, playerProfileId, hydraReportId, hydraPlayerResultId };
};

const seedChimeraContext = (database) => {
  const competitionWindowId = createCompetitionWindow(database, "chimera", "weekly", 3);
  const playerProfileId = createPlayerProfile(database, "Belkins");
  const reportImportId = createReportImport(database, "ocr_chimera_detail", "chimera:2026:19");

  const chimeraReportId = Number(
    database
      .prepare(
        "INSERT INTO chimera_report (competition_window_id, report_import_id, source_system, is_partial) VALUES (?, ?, ?, ?)"
      )
      .run(competitionWindowId, reportImportId, "ocr_json", 0).lastInsertRowid
  );

  const chimeraPlayerResultId = Number(
    database
      .prepare(
        [
          "INSERT INTO chimera_player_result",
          "(chimera_report_id, player_profile_id, display_name_at_import, total_damage, keys_used, clan_rank, data_completeness)",
          "VALUES (?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(chimeraReportId, playerProfileId, "Belkins", 950_000_000, 2, 1, "partial_detail").lastInsertRowid
  );

  return { competitionWindowId, playerProfileId, chimeraReportId, chimeraPlayerResultId };
};

const emit = (payload) => {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
};

const run = (command) => {
  const database = applyMigrations();

  switch (command) {
    case "tables": {
      const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
      emit({ ok: true, tables });
      return;
    }

    case "duplicate-window": {
      createCompetitionWindow(database, "hydra", "weekly", 1);

      let duplicateRejected = false;
      try {
        createCompetitionWindow(database, "hydra", "weekly", 2);
      } catch (error) {
        if (!isConstraintError(error)) {
          throw error;
        }
        duplicateRejected = true;
      }

      emit({ ok: true, duplicateRejected });
      return;
    }

    case "difficulty-constraints": {
      const hydra = seedHydraContext(database);
      const chimera = seedChimeraContext(database);

      let hydraRejected = false;
      let chimeraRejected = false;

      try {
        database
          .prepare(
            [
              "INSERT INTO hydra_team_run",
              "(hydra_player_result_id, hydra_report_id, competition_window_id, player_profile_id, team_index, difficulty, total_damage, data_completeness)",
              "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            ].join(" ")
          )
          .run(
            hydra.hydraPlayerResultId,
            hydra.hydraReportId,
            hydra.competitionWindowId,
            hydra.playerProfileId,
            1,
            "ultra_nightmare",
            400_000_000,
            "full_detail"
          );
      } catch (error) {
        if (!isConstraintError(error)) {
          throw error;
        }
        hydraRejected = true;
      }

      try {
        database
          .prepare(
            [
              "INSERT INTO chimera_team_run",
              "(chimera_player_result_id, chimera_report_id, competition_window_id, player_profile_id, team_index, difficulty, total_damage, data_completeness)",
              "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            ].join(" ")
          )
          .run(
            chimera.chimeraPlayerResultId,
            chimera.chimeraReportId,
            chimera.competitionWindowId,
            chimera.playerProfileId,
            1,
            "impossible",
            300_000_000,
            "partial_detail"
          );
      } catch (error) {
        if (!isConstraintError(error)) {
          throw error;
        }
        chimeraRejected = true;
      }

      database
        .prepare(
          [
            "INSERT INTO chimera_team_run",
            "(chimera_player_result_id, chimera_report_id, competition_window_id, player_profile_id, team_index, difficulty, total_damage, data_completeness)",
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
          ].join(" ")
        )
        .run(
          chimera.chimeraPlayerResultId,
          chimera.chimeraReportId,
          chimera.competitionWindowId,
          chimera.playerProfileId,
          1,
          "ultra_nightmare",
          300_000_000,
          "partial_detail"
        );

      emit({ ok: true, hydraRejected, chimeraRejected });
      return;
    }

    case "data-completeness": {
      const hydra = seedHydraContext(database);

      let invalidRejected = false;
      try {
        database
          .prepare(
            [
              "INSERT INTO hydra_team_run",
              "(hydra_player_result_id, hydra_report_id, competition_window_id, player_profile_id, team_index, difficulty, total_damage, data_completeness)",
              "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            ].join(" ")
          )
          .run(
            hydra.hydraPlayerResultId,
            hydra.hydraReportId,
            hydra.competitionWindowId,
            hydra.playerProfileId,
            1,
            "nightmare",
            400_000_000,
            "unknown_state"
          );
      } catch (error) {
        if (!isConstraintError(error)) {
          throw error;
        }
        invalidRejected = true;
      }

      emit({ ok: true, invalidRejected });
      return;
    }

    case "roster-summary-unique": {
      const playerProfileId = createPlayerProfile(database, "Radoran");

      database
        .prepare(
          [
            "INSERT INTO champion_roster_observation",
            "(player_profile_id, champion_code, first_seen_at, last_seen_at, evidence_type, evidence_ref_id)",
            "VALUES (?, ?, ?, ?, ?, ?)"
          ].join(" ")
        )
        .run(
          playerProfileId,
          "lydia_the_deathsiren",
          "2026-04-22T00:00:00Z",
          "2026-04-22T00:00:00Z",
          "hydra",
          101
        );

      let duplicateRejected = false;
      try {
        database
          .prepare(
            [
              "INSERT INTO champion_roster_observation",
              "(player_profile_id, champion_code, first_seen_at, last_seen_at, evidence_type, evidence_ref_id)",
              "VALUES (?, ?, ?, ?, ?, ?)"
            ].join(" ")
          )
          .run(
            playerProfileId,
            "lydia_the_deathsiren",
            "2026-04-23T00:00:00Z",
            "2026-04-23T00:00:00Z",
            "chimera",
            202
          );
      } catch (error) {
        if (!isConstraintError(error)) {
          throw error;
        }
        duplicateRejected = true;
      }

      emit({ ok: true, duplicateRejected });
      return;
    }

    default:
      throw new Error(`Unknown command: ${command}`);
  }
};

try {
  const command = process.argv[2];
  if (!command) {
    throw new Error("Missing command");
  }

  run(command);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
