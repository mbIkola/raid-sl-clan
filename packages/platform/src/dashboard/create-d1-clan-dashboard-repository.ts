import type {
  ClanDashboardData,
  ClanDashboardRepository,
  ClanWarsArchiveData,
  ClanWarsArchiveRepository,
  DashboardRankingRow,
  DashboardReadinessCard,
  DashboardTrendPoint,
  DashboardTopBottom
} from "@raid/ports";
import {
  buildClanWarsDeclineRows,
  buildClanWarsStabilityRows,
  type ClanWarsPlayerWindowPointsRow
} from "./clan-wars-archive-metrics";
import {
  selectClanWarsArchiveHistorySql,
  selectClanWarsArchivePlayerWindowSql
} from "./clan-wars-archive-sql";
import {
  selectChimeraRankingSql,
  selectChimeraReadinessSql,
  selectChimeraTrendSql,
  selectClanWarsRankingSql,
  selectHydraRankingSql,
  selectHydraReadinessSql,
  selectHydraTrendSql,
  selectSiegeReadinessSql
} from "./clan-dashboard-sql";
import {
  getClanWarsAnchorStateUtc,
  getNextChimeraResetAnchorUtc,
  getNextHydraResetAnchorUtc
} from "./reset-anchors";

type D1QueryResult<T> = { results?: T[] };
type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T>(): Promise<D1QueryResult<T>>;
};
type D1DatabaseLike = { prepare(query: string): D1PreparedStatement };

type ReadinessRow = {
  starts_at: string;
  ends_at: string;
  total_score?: number;
  keys_spent?: number;
};

type RankingRow = {
  player_name: string;
  score: number;
};

type TrendRow = {
  ends_at: string;
  total_score: number;
};

type ClanWarsArchiveHistoryDbRow = {
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
  player_id: number;
  player_name: string;
  points: number;
};

const mapRankingRows = (rows: RankingRow[]): DashboardRankingRow[] =>
  rows.map((row) => ({
    playerName: row.player_name,
    score: row.score
  }));

const asNumber = (value: number | undefined) => (typeof value === "number" ? value : 0);

const formatNumber = (value: number) => value.toLocaleString("en-US");

const computeNextBiweeklyStart = (startIso: string | null, nowIso: string): string | null => {
  if (!startIso) {
    return null;
  }

  const current = new Date(startIso);
  const now = new Date(nowIso);

  if (Number.isNaN(current.valueOf()) || Number.isNaN(now.valueOf())) {
    return null;
  }

  while (current.valueOf() <= now.valueOf()) {
    current.setUTCDate(current.getUTCDate() + 14);
  }

  return current.toISOString();
};

const toTopBottom = (topRows: RankingRow[], bottomRows: RankingRow[]): DashboardTopBottom => ({
  top5: mapRankingRows(topRows),
  bottom5: mapRankingRows(bottomRows)
});

const toTrend = (rows: TrendRow[]): DashboardTrendPoint[] =>
  rows.map((row) => ({
    endsAt: row.ends_at,
    totalScore: row.total_score
  }));

export const createD1ClanDashboardRepository = (
  db: D1DatabaseLike
): ClanDashboardRepository & ClanWarsArchiveRepository => {
  const queryRows = async <T>(sql: string, ...bindValues: unknown[]) => {
    const prepared = db.prepare(sql).bind(...bindValues);
    const result = await prepared.all<T>();
    return result.results ?? [];
  };

  return {
    async getSnapshot({ nowIso, trendWeeks }): Promise<ClanDashboardData> {
      const [
        hydraReadinessRows,
        chimeraReadinessRows,
        siegeReadinessRows,
        hydraTop,
        hydraBottom,
        chimeraTop,
        chimeraBottom,
        clanWarsTop,
        clanWarsBottom,
        hydraTrendRows,
        chimeraTrendRows
      ] = await Promise.all([
        queryRows<ReadinessRow>(selectHydraReadinessSql),
        queryRows<ReadinessRow>(selectChimeraReadinessSql),
        queryRows<ReadinessRow>(selectSiegeReadinessSql),
        queryRows<RankingRow>(selectHydraRankingSql("DESC"), trendWeeks, 5),
        queryRows<RankingRow>(selectHydraRankingSql("ASC"), trendWeeks, 5),
        queryRows<RankingRow>(selectChimeraRankingSql("DESC"), trendWeeks, 5),
        queryRows<RankingRow>(selectChimeraRankingSql("ASC"), trendWeeks, 5),
        queryRows<RankingRow>(selectClanWarsRankingSql("DESC"), 5),
        queryRows<RankingRow>(selectClanWarsRankingSql("ASC"), 5),
        queryRows<TrendRow>(selectHydraTrendSql, trendWeeks),
        queryRows<TrendRow>(selectChimeraTrendSql, trendWeeks)
      ]);

      const [hydraReadiness] = hydraReadinessRows;
      const [chimeraReadiness] = chimeraReadinessRows;
      const [siegeReadiness] = siegeReadinessRows;
      const clanWarsAnchor = getClanWarsAnchorStateUtc(nowIso);
      const hydraKeysSpent = asNumber(hydraReadiness?.keys_spent);
      const hydraTotalScore = asNumber(hydraReadiness?.total_score);
      const chimeraKeysSpent = asNumber(chimeraReadiness?.keys_spent);
      const chimeraTotalScore = asNumber(chimeraReadiness?.total_score);

      const readiness: DashboardReadinessCard[] = [
        {
          activity: "hydra",
          title: "Hydra",
          targetAt: getNextHydraResetAnchorUtc(nowIso),
          targetKind: "reset",
          statusLabel: "Сброс окна",
          primaryValue: `Ключи: ${hydraKeysSpent} • Урон: ${formatNumber(hydraTotalScore)}`,
          keysSpent: hydraKeysSpent,
          totalScore: hydraTotalScore,
          href: "/dashboard/hydra"
        },
        {
          activity: "chimera",
          title: "Chimera",
          targetAt: getNextChimeraResetAnchorUtc(nowIso),
          targetKind: "reset",
          statusLabel: "Сброс окна",
          primaryValue: `Ключи: ${chimeraKeysSpent} • Урон: ${formatNumber(chimeraTotalScore)}`,
          keysSpent: chimeraKeysSpent,
          totalScore: chimeraTotalScore,
          href: "/dashboard/chimera"
        },
        {
          activity: "clan_wars",
          title: "KT",
          targetAt: clanWarsAnchor.targetAt,
          targetKind: clanWarsAnchor.targetKind,
          statusLabel: clanWarsAnchor.hasPersonalRewards
            ? "с личными наградами"
            : "без",
          primaryValue:
            clanWarsAnchor.targetKind === "reset"
              ? "Идет клановый турнир"
              : "Подготовка к следующему окну",
          href: "/dashboard/clan-wars"
        },
        {
          activity: "siege",
          title: "Siege",
          targetAt: computeNextBiweeklyStart(siegeReadiness?.starts_at ?? null, nowIso),
          targetKind: "start",
          statusLabel: "Следующее окно",
          primaryValue: "Подготовка к старту",
          href: "/dashboard/siege"
        }
      ];

      return {
        readiness,
        rankings: {
          hydra: toTopBottom(hydraTop, hydraBottom),
          chimera: toTopBottom(chimeraTop, chimeraBottom),
          clan_wars: toTopBottom(clanWarsTop, clanWarsBottom)
        },
        trends: {
          hydra: toTrend(hydraTrendRows),
          chimera: toTrend(chimeraTrendRows)
        }
      };
    },
    async getClanWarsArchive({ nowIso, windowLimit }): Promise<ClanWarsArchiveData> {
      const [historyRows, playerWindowRows] = await Promise.all([
        queryRows<ClanWarsArchiveHistoryDbRow>(selectClanWarsArchiveHistorySql, nowIso, windowLimit),
        queryRows<ClanWarsArchivePlayerWindowDbRow>(
          selectClanWarsArchivePlayerWindowSql,
          nowIso,
          windowLimit
        )
      ]);

      const clanWarsAnchor = getClanWarsAnchorStateUtc(nowIso);
      const playerRows: ClanWarsPlayerWindowPointsRow[] = playerWindowRows.map((row) => ({
        windowStart: row.window_start,
        playerId: row.player_id,
        playerName: row.player_name,
        points: asNumber(row.points)
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
          clanTotalPoints: asNumber(row.clan_total_points),
          activeContributors: asNumber(row.active_contributors),
          topPlayerName: row.top_player_name ?? "-",
          topPlayerPoints: asNumber(row.top_player_points)
        })),
        stability: buildClanWarsStabilityRows(playerRows, windowLimit),
        decline: buildClanWarsDeclineRows(playerRows)
      };
    }
  };
};
