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
  selectClanWarsReadinessSql,
  selectHydraRankingSql,
  selectHydraReadinessSql,
  selectHydraTrendSql,
  selectSiegeReadinessSql
} from "./clan-dashboard-sql";

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
  has_personal_rewards?: number;
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
      const [hydraReadiness] = await queryRows<ReadinessRow>(selectHydraReadinessSql);
      const [chimeraReadiness] = await queryRows<ReadinessRow>(selectChimeraReadinessSql);
      const [clanWarsReadiness] = await queryRows<ReadinessRow>(selectClanWarsReadinessSql);
      const [siegeReadiness] = await queryRows<ReadinessRow>(selectSiegeReadinessSql);

      const hydraTop = await queryRows<RankingRow>(selectHydraRankingSql("DESC"), trendWeeks, 5);
      const hydraBottom = await queryRows<RankingRow>(selectHydraRankingSql("ASC"), trendWeeks, 5);

      const chimeraTop = await queryRows<RankingRow>(selectChimeraRankingSql("DESC"), trendWeeks, 5);
      const chimeraBottom = await queryRows<RankingRow>(selectChimeraRankingSql("ASC"), trendWeeks, 5);

      const clanWarsTop = await queryRows<RankingRow>(selectClanWarsRankingSql("DESC"), 5);
      const clanWarsBottom = await queryRows<RankingRow>(selectClanWarsRankingSql("ASC"), 5);

      const hydraTrendRows = await queryRows<TrendRow>(selectHydraTrendSql, trendWeeks);
      const chimeraTrendRows = await queryRows<TrendRow>(selectChimeraTrendSql, trendWeeks);

      const readiness: DashboardReadinessCard[] = [
        {
          activity: "hydra",
          title: "Hydra",
          targetAt: hydraReadiness?.ends_at ?? null,
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
          targetAt: chimeraReadiness?.ends_at ?? null,
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
          targetAt: computeNextBiweeklyStart(clanWarsReadiness?.starts_at ?? null, nowIso),
          targetKind: "start",
          statusLabel:
            clanWarsReadiness?.has_personal_rewards === 1
              ? "с личными наградами"
              : "без",
          primaryValue: "Подготовка к следующему окну",
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
