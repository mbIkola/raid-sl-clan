import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ClanWarsUnknownPlayerIdError,
  createD1ClanWarsIntermediateRepository
} from "@raid/platform";

type D1RunMeta = {
  last_row_id?: number;
};

type D1RunResult = {
  success: boolean;
  meta?: D1RunMeta;
};

type D1AllResult<T> = {
  results?: T[];
};

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  run<T = unknown>(): Promise<D1RunResult & T>;
  all<T>(): Promise<D1AllResult<T>>;
  first<T>(): Promise<T | null>;
};

type D1Database = {
  exec(sql: string): void;
  prepare(query: string): D1Statement;
};

type SqliteStatement = {
  run(...values: unknown[]): { lastInsertRowid: number | bigint };
  all(...values: unknown[]): unknown[];
  get(...values: unknown[]): unknown;
};

type SqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
};

type D1SqliteAdapterOptions = {
  throwAfterCommitExecution?: boolean;
};

const testDir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(testDir, "../../../platform/migrations");

const applyMigrations = (database: SqliteDatabase) => {
  for (const fileName of [
    "0001_bootstrap.sql",
    "0002_clan_competition_schema.sql",
    "0004_clan_wars_has_personal_rewards.sql"
  ]) {
    database.exec(readFileSync(join(migrationsDir, fileName), "utf8"));
  }
};

const createSqlite = (): SqliteDatabase => {
  const require = createRequire(import.meta.url);
  const { DatabaseSync } = require("node:sqlite") as {
    DatabaseSync: new (path: string) => SqliteDatabase;
  };

  const sqlite = new DatabaseSync(":memory:");
  applyMigrations(sqlite);
  return sqlite;
};

const createD1SqliteAdapter = (
  sqlite: SqliteDatabase,
  options: D1SqliteAdapterOptions = {}
): D1Database => ({
  exec(sql: string) {
    sqlite.exec(sql);
  },
  prepare(query: string) {
    const statement = sqlite.prepare(query);
    let bindValues: unknown[] = [];

    const prepared: D1Statement = {
      bind(...values: unknown[]) {
        bindValues = values;
        return prepared;
      },
      async run<T = unknown>() {
        const result = statement.run(...bindValues);
        if (options.throwAfterCommitExecution && query.trim().toUpperCase() === "COMMIT") {
          throw new Error("simulated-commit-ack-failure");
        }
        return {
          success: true,
          meta: {
            last_row_id: Number(result.lastInsertRowid)
          }
        } as D1RunResult & T;
      },
      async all<T>() {
        return { results: statement.all(...bindValues) as T[] };
      },
      async first<T>() {
        const row = statement.get(...bindValues) as T | undefined;
        return row ?? null;
      }
    };

    return prepared;
  }
});

describe("createD1ClanWarsIntermediateRepository", () => {
  it("replaces existing score rows for the same report/window", async () => {
    const sqlite = createD1SqliteAdapter(createSqlite());
    const repository = createD1ClanWarsIntermediateRepository(sqlite as unknown as D1Database);

    const azazel = await sqlite
      .prepare("INSERT INTO player_profile (main_nickname, status) VALUES (?, ?)")
      .bind("AZAZEL", "active")
      .run();
    const ksondr = await sqlite
      .prepare("INSERT INTO player_profile (main_nickname, status) VALUES (?, ?)")
      .bind("Ksondr", "active")
      .run();
    const legacy = await sqlite
      .prepare("INSERT INTO player_profile (main_nickname, status) VALUES (?, ?)")
      .bind("Legacy", "active")
      .run();

    const competitionWindow = await sqlite
      .prepare(
        [
          "INSERT INTO competition_window",
          "(activity_type, season_year, week_of_year, cadence_slot, rotation_number, starts_at, ends_at, label)",
          "VALUES ('clan_wars', ?, ?, 'biweekly', NULL, ?, ?, ?)"
        ].join(" ")
      )
      .bind(2026, 19, "2026-05-05T09:00:00.000Z", "2026-05-07T09:00:00.000Z", "seed-window")
      .run();

    const seededImport = await sqlite
      .prepare(
        [
          "INSERT INTO report_import",
          "(upload_type, source_kind, scope_type, scope_key, replace_existing, status, notes)",
          "VALUES ('manual_json', 'seed', 'competition_window', 'seed-window', 1, 'applied', '{}')"
        ].join(" ")
      )
      .bind()
      .run();

    const seededReport = await sqlite
      .prepare(
        [
          "INSERT INTO clan_wars_report",
          "(competition_window_id, report_import_id, source_system, is_partial, has_personal_rewards)",
          "VALUES (?, ?, 'seed', 1, 0)"
        ].join(" ")
      )
      .bind(competitionWindow.meta?.last_row_id, seededImport.meta?.last_row_id)
      .run();

    await sqlite
      .prepare(
        [
          "INSERT INTO clan_wars_player_score",
          "(clan_wars_report_id, competition_window_id, player_profile_id, display_name_at_import, points)",
          "VALUES (?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .bind(
        seededReport.meta?.last_row_id,
        competitionWindow.meta?.last_row_id,
        azazel.meta?.last_row_id,
        "AZAZEL",
        1
      )
      .run();
    await sqlite
      .prepare(
        [
          "INSERT INTO clan_wars_player_score",
          "(clan_wars_report_id, competition_window_id, player_profile_id, display_name_at_import, points)",
          "VALUES (?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .bind(
        seededReport.meta?.last_row_id,
        competitionWindow.meta?.last_row_id,
        ksondr.meta?.last_row_id,
        "Ksondr",
        2
      )
      .run();
    await sqlite
      .prepare(
        [
          "INSERT INTO clan_wars_player_score",
          "(clan_wars_report_id, competition_window_id, player_profile_id, display_name_at_import, points)",
          "VALUES (?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .bind(
        seededReport.meta?.last_row_id,
        competitionWindow.meta?.last_row_id,
        legacy.meta?.last_row_id,
        "Legacy",
        3
      )
      .run();

    const result = await repository.applyResults({
      request: {
        windowRef: {
          activityType: "clan_wars",
          eventStartAt: "2026-05-05T09:00:00.000Z",
          eventEndsAt: "2026-05-07T09:00:00.000Z"
        },
        meta: {
          hasPersonalRewards: true,
          opponentClanName: "Best in Raid",
          sourceKind: "ocr_cli_intermediate",
          capturedAt: "2026-05-05T12:00:00+03:00"
        },
        rosterExpectation: { expectedCount: 2 },
        players: [
          {
            playerId: Number(azazel.meta?.last_row_id),
            displayNameAtImport: "AZAZEL",
            points: 167681
          },
          {
            playerId: Number(ksondr.meta?.last_row_id),
            displayNameAtImport: "Ksondr",
            points: 158050
          }
        ]
      }
    });

    expect(result.replacedRows).toBe(2);
    expect(result.competitionWindowId).toBe(Number(competitionWindow.meta?.last_row_id));
    expect(result.clanWarsReportId).toBe(Number(seededReport.meta?.last_row_id));

    const scoreRows = await sqlite
      .prepare("SELECT points FROM clan_wars_player_score ORDER BY player_profile_id")
      .bind()
      .all<{ points: number }>();

    expect(scoreRows.results ?? []).toEqual([{ points: 167681 }, { points: 158050 }]);

    const legacyRows = await sqlite
      .prepare(
        [
          "SELECT COUNT(*) AS count",
          "FROM clan_wars_player_score",
          "WHERE clan_wars_report_id = ? AND player_profile_id = ?"
        ].join(" ")
      )
      .bind(seededReport.meta?.last_row_id, legacy.meta?.last_row_id)
      .first<{ count: number }>();

    expect(legacyRows?.count ?? 0).toBe(0);
  });

  it("uses case-insensitive main_nickname fallback to avoid duplicate player creation", async () => {
    const sqlite = createD1SqliteAdapter(createSqlite());
    const repository = createD1ClanWarsIntermediateRepository(sqlite as unknown as D1Database);

    const existing = await sqlite
      .prepare("INSERT INTO player_profile (main_nickname, status) VALUES (?, ?)")
      .bind("AZAZEL", "active")
      .run();

    const created = await repository.createPlayers({
      players: [{ mainNickname: "azazel", aliases: [] }]
    });

    expect(created).toHaveLength(1);
    expect(created[0].playerId).toBe(Number(existing.meta?.last_row_id));

    const profiles = await sqlite
      .prepare("SELECT COUNT(*) AS count FROM player_profile")
      .bind()
      .first<{ count: number }>();

    expect(profiles?.count ?? 0).toBe(1);
  });

  it("throws unknown-player-id validation error and marks import as failed", async () => {
    const sqlite = createD1SqliteAdapter(createSqlite());
    const repository = createD1ClanWarsIntermediateRepository(sqlite as unknown as D1Database);

    const azazel = await sqlite
      .prepare("INSERT INTO player_profile (main_nickname, status) VALUES (?, ?)")
      .bind("AZAZEL", "active")
      .run();

    const request = {
      windowRef: {
        activityType: "clan_wars" as const,
        eventStartAt: "2026-05-05T09:00:00.000Z",
        eventEndsAt: "2026-05-07T09:00:00.000Z"
      },
      meta: {
        hasPersonalRewards: true,
        opponentClanName: "Best in Raid",
        sourceKind: "ocr_cli_intermediate",
        capturedAt: "2026-05-05T12:00:00+03:00"
      },
      rosterExpectation: { expectedCount: 2 },
      players: [
        {
          playerId: Number(azazel.meta?.last_row_id),
          displayNameAtImport: "AZAZEL",
          points: 167681
        },
        {
          playerId: 999999,
          displayNameAtImport: "Ghost",
          points: 158050
        }
      ]
    };

    let caughtError: unknown;
    try {
      await repository.applyResults({ request });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(ClanWarsUnknownPlayerIdError);
    expect(caughtError).toEqual(
      expect.objectContaining({
        name: "ClanWarsUnknownPlayerIdError",
        playerIds: [999999]
      })
    );

    const latestImport = await sqlite
      .prepare("SELECT status FROM report_import ORDER BY id DESC LIMIT 1")
      .bind()
      .first<{ status: string }>();

    expect(latestImport?.status).toBe("failed");
  });

  it("marks import failed and rolls back score writes when applyResults errors in transaction", async () => {
    const sqlite = createD1SqliteAdapter(createSqlite());
    const repository = createD1ClanWarsIntermediateRepository(sqlite as unknown as D1Database);

    const azazel = await sqlite
      .prepare("INSERT INTO player_profile (main_nickname, status) VALUES (?, ?)")
      .bind("AZAZEL", "active")
      .run();
    const ksondr = await sqlite
      .prepare("INSERT INTO player_profile (main_nickname, status) VALUES (?, ?)")
      .bind("Ksondr", "active")
      .run();

    const competitionWindow = await sqlite
      .prepare(
        [
          "INSERT INTO competition_window",
          "(activity_type, season_year, week_of_year, cadence_slot, rotation_number, starts_at, ends_at, label)",
          "VALUES ('clan_wars', ?, ?, 'biweekly', NULL, ?, ?, ?)"
        ].join(" ")
      )
      .bind(2026, 19, "2026-05-05T09:00:00.000Z", "2026-05-07T09:00:00.000Z", "seed-window")
      .run();

    const seededImport = await sqlite
      .prepare(
        [
          "INSERT INTO report_import",
          "(upload_type, source_kind, scope_type, scope_key, replace_existing, status, notes)",
          "VALUES ('manual_json', 'seed', 'competition_window', 'seed-window', 1, 'applied', '{}')"
        ].join(" ")
      )
      .bind()
      .run();

    const seededReport = await sqlite
      .prepare(
        [
          "INSERT INTO clan_wars_report",
          "(competition_window_id, report_import_id, source_system, is_partial, has_personal_rewards)",
          "VALUES (?, ?, 'seed', 1, 0)"
        ].join(" ")
      )
      .bind(competitionWindow.meta?.last_row_id, seededImport.meta?.last_row_id)
      .run();

    await sqlite
      .prepare(
        [
          "INSERT INTO clan_wars_player_score",
          "(clan_wars_report_id, competition_window_id, player_profile_id, display_name_at_import, points)",
          "VALUES (?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .bind(
        seededReport.meta?.last_row_id,
        competitionWindow.meta?.last_row_id,
        azazel.meta?.last_row_id,
        "AZAZEL",
        111
      )
      .run();

    await expect(
      repository.applyResults({
        request: {
          windowRef: {
            activityType: "clan_wars",
            eventStartAt: "2026-05-05T09:00:00.000Z",
            eventEndsAt: "2026-05-07T09:00:00.000Z"
          },
          meta: {
            hasPersonalRewards: true,
            opponentClanName: "Best in Raid",
            sourceKind: "ocr_cli_intermediate",
            capturedAt: "2026-05-05T12:00:00+03:00"
          },
          rosterExpectation: { expectedCount: 2 },
          players: [
            {
              playerId: Number(azazel.meta?.last_row_id),
              displayNameAtImport: "AZAZEL",
              points: 999
            },
            {
              playerId: Number(azazel.meta?.last_row_id),
              displayNameAtImport: "AZAZEL-dupe",
              points: 555
            }
          ]
        }
      })
    ).rejects.toBeInstanceOf(Error);

    const latestImport = await sqlite
      .prepare("SELECT status FROM report_import ORDER BY id DESC LIMIT 1")
      .bind()
      .first<{ status: string }>();

    expect(latestImport?.status).toBe("failed");

    const scoreRows = await sqlite
      .prepare(
        [
          "SELECT player_profile_id, display_name_at_import, points",
          "FROM clan_wars_player_score",
          "WHERE clan_wars_report_id = ?",
          "ORDER BY player_profile_id"
        ].join(" ")
      )
      .bind(seededReport.meta?.last_row_id)
      .all<{ player_profile_id: number; display_name_at_import: string; points: number }>();

    expect(scoreRows.results ?? []).toEqual([
      {
        player_profile_id: Number(azazel.meta?.last_row_id),
        display_name_at_import: "AZAZEL",
        points: 111
      }
    ]);

    const untouchedPlayer = await sqlite
      .prepare("SELECT COUNT(*) AS count FROM player_profile WHERE id = ?")
      .bind(ksondr.meta?.last_row_id)
      .first<{ count: number }>();

    expect(untouchedPlayer?.count ?? 0).toBe(1);
  });

  it("does not leave report_import pending when commit acknowledgment fails after execution", async () => {
    const sqlite = createD1SqliteAdapter(createSqlite(), { throwAfterCommitExecution: true });
    const repository = createD1ClanWarsIntermediateRepository(sqlite as unknown as D1Database);

    const azazel = await sqlite
      .prepare("INSERT INTO player_profile (main_nickname, status) VALUES (?, ?)")
      .bind("AZAZEL", "active")
      .run();
    const ksondr = await sqlite
      .prepare("INSERT INTO player_profile (main_nickname, status) VALUES (?, ?)")
      .bind("Ksondr", "active")
      .run();

    await expect(
      repository.applyResults({
        request: {
          windowRef: {
            activityType: "clan_wars",
            eventStartAt: "2026-05-05T09:00:00.000Z",
            eventEndsAt: "2026-05-07T09:00:00.000Z"
          },
          meta: {
            hasPersonalRewards: true,
            opponentClanName: "Best in Raid",
            sourceKind: "ocr_cli_intermediate",
            capturedAt: "2026-05-05T12:00:00+03:00"
          },
          rosterExpectation: { expectedCount: 2 },
          players: [
            {
              playerId: Number(azazel.meta?.last_row_id),
              displayNameAtImport: "AZAZEL",
              points: 167681
            },
            {
              playerId: Number(ksondr.meta?.last_row_id),
              displayNameAtImport: "Ksondr",
              points: 158050
            }
          ]
        }
      })
    ).rejects.toThrow("simulated-commit-ack-failure");

    const latestImport = await sqlite
      .prepare("SELECT status, finished_at FROM report_import ORDER BY id DESC LIMIT 1")
      .bind()
      .first<{ status: string; finished_at: string | null }>();

    expect(latestImport?.status).toBe("failed");
    expect(latestImport?.status).not.toBe("pending");
    expect(latestImport?.finished_at).not.toBeNull();
  });
});
