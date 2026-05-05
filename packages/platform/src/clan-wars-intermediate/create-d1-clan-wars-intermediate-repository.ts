import { normalizeRosterAlias, type ClanWarsApplyRequest } from "@raid/core";
import type {
  ClanWarsCreatedPlayer,
  ClanWarsIntermediateRepository,
  ClanWarsRosterRow,
} from "@raid/ports";

type D1RunMeta = {
  last_row_id?: number;
};

type D1RunResult = {
  meta?: D1RunMeta;
};

type D1AllResult<T> = {
  results?: T[];
};

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  run<T = unknown>(): Promise<D1RunResult & T>;
  all<T = unknown>(): Promise<D1AllResult<T>>;
  first<T = unknown>(): Promise<T | null>;
};

type D1DatabaseLike = {
  prepare(query: string): D1PreparedStatement;
};

type RosterDbRow = {
  player_id: number;
  main_nickname: string;
  status: "active" | "inactive" | "removed";
  aliases_csv: string | null;
};

export class ClanWarsUnknownPlayerIdError extends Error {
  readonly playerIds: number[];

  constructor(playerIds: number[]) {
    super(`unknown-player-id:${playerIds.join(",")}`);
    this.name = "ClanWarsUnknownPlayerIdError";
    this.playerIds = playerIds;
  }
}

const buildScopeKey = (request: ClanWarsApplyRequest) =>
  `clan_wars:${request.windowRef.eventStartAt}_${request.windowRef.eventEndsAt}:intermediate`;

const buildImportNotesJson = (request: ClanWarsApplyRequest) =>
  JSON.stringify({
    opponentClanName: request.meta.opponentClanName,
    capturedAt: request.meta.capturedAt,
    clanTotalPointsMine: request.meta.clanTotalPointsMine ?? null,
  });

const getLastRowId = (result: D1RunResult): number => {
  const rowId = result.meta?.last_row_id;
  if (typeof rowId !== "number" || !Number.isFinite(rowId)) {
    throw new Error("missing-last-row-id");
  }

  return rowId;
};

const toAliasSet = (mainNickname: string, aliases: string[]) => {
  const normalized = [mainNickname, ...aliases]
    .map((alias) => normalizeRosterAlias(alias))
    .filter((alias) => alias.length > 0);

  return Array.from(new Set(normalized));
};

const uniquePositiveIntegers = (values: number[]) =>
  Array.from(new Set(values.filter((value) => Number.isInteger(value) && value > 0)));

export const createD1ClanWarsIntermediateRepository = (
  db: D1DatabaseLike,
): ClanWarsIntermediateRepository => {
  const run = async (sql: string, ...values: unknown[]) => db.prepare(sql).bind(...values).run();

  const all = async <T>(sql: string, ...values: unknown[]) => {
    const result = await db.prepare(sql).bind(...values).all<T>();
    return result.results ?? [];
  };

  const first = async <T>(sql: string, ...values: unknown[]) =>
    db.prepare(sql).bind(...values).first<T>();

  const findOrCreateClanWarsWindow = async (request: ClanWarsApplyRequest): Promise<number> => {
    const existing = await first<{ id: number }>(
      [
        "SELECT id",
        "FROM competition_window",
        "WHERE activity_type = 'clan_wars' AND starts_at = ? AND ends_at = ?",
        "LIMIT 1",
      ].join(" "),
      request.windowRef.eventStartAt,
      request.windowRef.eventEndsAt,
    );

    if (existing) {
      return existing.id;
    }

    const calendar = await first<{ season_year: number; week_of_year: number }>(
      [
        "SELECT",
        "CAST(strftime('%Y', ?) AS INTEGER) AS season_year,",
        "CASE",
        "WHEN CAST(strftime('%W', ?) AS INTEGER) + 1 > 53 THEN 53",
        "ELSE CAST(strftime('%W', ?) AS INTEGER) + 1",
        "END AS week_of_year",
      ].join(" "),
      request.windowRef.eventEndsAt,
      request.windowRef.eventEndsAt,
      request.windowRef.eventEndsAt,
    );

    if (!calendar) {
      throw new Error("failed-to-derive-window-calendar");
    }

    await run(
      [
        "INSERT INTO competition_window",
        "(activity_type, season_year, week_of_year, cadence_slot, rotation_number, starts_at, ends_at, label)",
        "VALUES ('clan_wars', ?, ?, 'biweekly', NULL, ?, ?, ?)",
      ].join(" "),
      calendar.season_year,
      calendar.week_of_year,
      request.windowRef.eventStartAt,
      request.windowRef.eventEndsAt,
      `clan_wars:${request.windowRef.eventStartAt}`,
    );

    const created = await first<{ id: number }>(
      [
        "SELECT id",
        "FROM competition_window",
        "WHERE activity_type = 'clan_wars' AND starts_at = ? AND ends_at = ?",
        "LIMIT 1",
      ].join(" "),
      request.windowRef.eventStartAt,
      request.windowRef.eventEndsAt,
    );

    if (!created) {
      throw new Error("failed-to-create-window");
    }

    return created.id;
  };

  return {
    async getRoster({ includeInactive }): Promise<ClanWarsRosterRow[]> {
      const rows = await all<RosterDbRow>(
        [
          "SELECT",
          "pp.id AS player_id,",
          "pp.main_nickname,",
          "pp.status,",
          "GROUP_CONCAT(pa.alias_value, '||') AS aliases_csv",
          "FROM player_profile pp",
          "LEFT JOIN player_alias pa",
          "ON pa.player_profile_id = pp.id",
          "AND pa.alias_type = 'game_nickname'",
          "WHERE (? = 1 OR pp.status = 'active')",
          "GROUP BY pp.id, pp.main_nickname, pp.status",
          "ORDER BY pp.main_nickname COLLATE NOCASE ASC, pp.id ASC",
        ].join(" "),
        includeInactive ? 1 : 0,
      );

      return rows.map((row) => {
        const parsedAliases =
          row.aliases_csv
            ?.split("||")
            .map((alias) => alias.trim())
            .filter((alias) => alias.length > 0) ?? [];

        return {
          playerId: row.player_id,
          mainNickname: row.main_nickname,
          aliases: parsedAliases.length > 0 ? Array.from(new Set(parsedAliases)) : [row.main_nickname],
          status: row.status,
        };
      });
    },

    async createPlayers({ players }): Promise<ClanWarsCreatedPlayer[]> {
      const created: ClanWarsCreatedPlayer[] = [];
      let inTransaction = false;

      try {
        await run("BEGIN IMMEDIATE TRANSACTION");
        inTransaction = true;

        for (const player of players) {
          const aliases = toAliasSet(player.mainNickname, player.aliases);
          if (aliases.length === 0) {
            continue;
          }

          const placeholders = aliases.map(() => "?").join(", ");
          let existing = await first<{ player_id: number; main_nickname: string }>(
            [
              "SELECT pp.id AS player_id, pp.main_nickname",
              "FROM player_profile pp",
              "JOIN player_alias pa ON pa.player_profile_id = pp.id",
              "WHERE pa.alias_type = 'game_nickname'",
              `AND pa.alias_value IN (${placeholders})`,
              "ORDER BY pp.id ASC",
              "LIMIT 1",
            ].join(" "),
            ...aliases,
          );

          if (!existing) {
            existing = await first<{ player_id: number; main_nickname: string }>(
              [
                "SELECT pp.id AS player_id, pp.main_nickname",
                "FROM player_profile pp",
                "WHERE lower(trim(pp.main_nickname)) = lower(trim(?))",
                "ORDER BY pp.id ASC",
                "LIMIT 1",
              ].join(" "),
              player.mainNickname,
            );
          }

          if (existing) {
            for (const alias of aliases) {
              await run(
                [
                  "INSERT OR IGNORE INTO player_alias",
                  "(player_profile_id, alias_type, alias_value, is_primary)",
                  "VALUES (?, 'game_nickname', ?, ?)",
                ].join(" "),
                existing.player_id,
                alias,
                alias === normalizeRosterAlias(existing.main_nickname) ? 1 : 0,
              );
            }

            created.push({
              playerId: existing.player_id,
              mainNickname: existing.main_nickname,
              aliases,
            });
            continue;
          }

          const insertedProfile = await run(
            "INSERT INTO player_profile (main_nickname, status) VALUES (?, 'active')",
            player.mainNickname,
          );
          const playerId = getLastRowId(insertedProfile);
          const primaryAlias = normalizeRosterAlias(player.mainNickname);

          for (const alias of aliases) {
            await run(
              [
                "INSERT OR IGNORE INTO player_alias",
                "(player_profile_id, alias_type, alias_value, is_primary)",
                "VALUES (?, 'game_nickname', ?, ?)",
              ].join(" "),
              playerId,
              alias,
              alias === primaryAlias ? 1 : 0,
            );
          }

          created.push({
            playerId,
            mainNickname: player.mainNickname,
            aliases,
          });
        }

        await run("COMMIT");
        inTransaction = false;
        return created;
      } catch (error) {
        if (inTransaction) {
          try {
            await run("ROLLBACK");
          } catch {
            // no-op: preserve original error
          }
        }

        throw error;
      }
    },

    async applyResults({ request }) {
      const scopeKey = buildScopeKey(request);
      const notes = buildImportNotesJson(request);

      const pendingImport = await run(
        [
          "INSERT INTO report_import",
          "(upload_type, source_kind, scope_type, scope_key, replace_existing, status, notes)",
          "VALUES ('admin_clan_wars_intermediate', ?, 'competition_window', ?, 1, 'pending', ?)",
        ].join(" "),
        request.meta.sourceKind,
        scopeKey,
        notes,
      );
      const reportImportId = getLastRowId(pendingImport);

      let inTransaction = false;
      let committed = false;

      try {
        await run("BEGIN IMMEDIATE TRANSACTION");
        inTransaction = true;

        const competitionWindowId = await findOrCreateClanWarsWindow(request);

        await run(
          [
            "INSERT INTO clan_wars_report",
            "(competition_window_id, report_import_id, source_system, is_partial, has_personal_rewards)",
            "VALUES (?, ?, ?, 1, ?)",
            "ON CONFLICT(competition_window_id) DO UPDATE SET",
            "report_import_id = excluded.report_import_id,",
            "source_system = excluded.source_system,",
            "is_partial = excluded.is_partial,",
            "has_personal_rewards = excluded.has_personal_rewards",
          ].join(" "),
          competitionWindowId,
          reportImportId,
          request.meta.sourceKind,
          request.meta.hasPersonalRewards ? 1 : 0,
        );

        const report = await first<{ id: number }>(
          "SELECT id FROM clan_wars_report WHERE competition_window_id = ? LIMIT 1",
          competitionWindowId,
        );

        if (!report) {
          throw new Error("missing-clan-wars-report");
        }

        const requestedPlayerIds = uniquePositiveIntegers(request.players.map((row) => row.playerId));
        if (requestedPlayerIds.length > 0) {
          const placeholders = requestedPlayerIds.map(() => "?").join(", ");
          const existingPlayerRows = await all<{ id: number }>(
            `SELECT id FROM player_profile WHERE id IN (${placeholders})`,
            ...requestedPlayerIds,
          );
          const existingIds = new Set(existingPlayerRows.map((row) => row.id));
          const unknownPlayerIds = requestedPlayerIds.filter((playerId) => !existingIds.has(playerId));
          if (unknownPlayerIds.length > 0) {
            throw new ClanWarsUnknownPlayerIdError(unknownPlayerIds);
          }
        }

        await run("DELETE FROM clan_wars_player_score WHERE clan_wars_report_id = ?", report.id);

        for (const row of request.players) {
          await run(
            [
              "INSERT INTO clan_wars_player_score",
              "(clan_wars_report_id, competition_window_id, player_profile_id, display_name_at_import, points)",
              "VALUES (?, ?, ?, ?, ?)",
            ].join(" "),
            report.id,
            competitionWindowId,
            row.playerId,
            row.displayNameAtImport,
            row.points,
          );
        }

        await run(
          "UPDATE report_import SET status = 'applied', finished_at = CURRENT_TIMESTAMP WHERE id = ?",
          reportImportId,
        );

        await run("COMMIT");
        committed = true;
        inTransaction = false;

        return {
          competitionWindowId,
          clanWarsReportId: report.id,
          replacedRows: request.players.length,
        };
      } catch (error) {
        if (inTransaction) {
          try {
            await run("ROLLBACK");
          } catch {
            // no-op: preserve original error
          }
        }

        if (!committed) {
          try {
            await run(
              "UPDATE report_import SET status = 'failed', finished_at = CURRENT_TIMESTAMP WHERE id = ?",
              reportImportId,
            );
          } catch {
            // no-op: preserve original error
          }
        }

        throw error;
      }
    },
  };
};
