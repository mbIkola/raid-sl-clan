import type {
  ClanDashboardData,
  ClanDashboardRepository,
  DashboardRankingRow,
  DashboardReadinessCard,
  DashboardTrendPoint,
  DashboardTopBottom
} from "@raid/ports";
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

const mapRankingRows = (rows: RankingRow[]): DashboardRankingRow[] =>
  rows.map((row) => ({
    playerName: row.player_name,
    score: row.score
  }));

const asNumber = (value: number | undefined) => (typeof value === "number" ? value : 0);

const formatCompactNumber = (value: number) => value.toLocaleString("en-US");

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
): ClanDashboardRepository => {
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

      const readiness: DashboardReadinessCard[] = [
        {
          activity: "hydra",
          title: "Hydra",
          targetAt: getNextHydraResetAnchorUtc(nowIso),
          targetKind: "reset",
          statusLabel: "Сброс окна",
          primaryValue: `Ключи: ${asNumber(hydraReadiness?.keys_spent)} • Урон: ${formatCompactNumber(
            asNumber(hydraReadiness?.total_score)
          )}`,
          href: "/dashboard/hydra"
        },
        {
          activity: "chimera",
          title: "Chimera",
          targetAt: getNextChimeraResetAnchorUtc(nowIso),
          targetKind: "reset",
          statusLabel: "Сброс окна",
          primaryValue: `Ключи: ${asNumber(chimeraReadiness?.keys_spent)} • Урон: ${formatCompactNumber(
            asNumber(chimeraReadiness?.total_score)
          )}`,
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
    }
  };
};
