export type DashboardActivity = "hydra" | "chimera" | "clan_wars" | "siege_def";

export type DashboardReadinessActivity = "hydra" | "chimera" | "clan_wars" | "siege";

export type DashboardReadinessCard = {
  activity: DashboardReadinessActivity;
  title: string;
  targetAt: string | null;
  targetKind: "reset" | "start";
  statusLabel: string;
  primaryValue: string;
  keysSpent?: number;
  totalScore?: number;
  href: string;
};

export type DashboardRankingRow = {
  playerName: string;
  score: number;
};

export type DashboardTopBottom = {
  top5: DashboardRankingRow[];
  bottom5: DashboardRankingRow[];
};

export type DashboardTrendPoint = {
  endsAt: string;
  totalScore: number;
};

export type FusionEvent = {
  status: "active" | "idle";
  title: string | null;
  startsAt: string | null;
  endsAt: string | null;
  heroPortraitImageUrl: string | null;
  calendarImageUrl: string | null;
  note: string | null;
};

export type ClanDashboardData = {
  readiness: DashboardReadinessCard[];
  rankings: {
    hydra: DashboardTopBottom;
    chimera: DashboardTopBottom;
    clan_wars: DashboardTopBottom;
  };
  trends: {
    hydra: DashboardTrendPoint[];
    chimera: DashboardTrendPoint[];
  };
};

export type SiegeDefenseSource = {
  getCurrentRanking(): DashboardTopBottom;
};

export type FusionEventSource = {
  getCurrentFusionEvent(): FusionEvent;
};

export type ClanDashboardSnapshot = {
  generatedAt: string;
  readiness: DashboardReadinessCard[];
  fusion: FusionEvent;
  rankings: {
    hydra: DashboardTopBottom;
    chimera: DashboardTopBottom;
    clan_wars: DashboardTopBottom;
    siege_def: DashboardTopBottom;
  };
  trends: {
    hydra: DashboardTrendPoint[];
    chimera: DashboardTrendPoint[];
  };
};

export type ClanDashboardRepository = {
  getSnapshot(input: { nowIso: string; trendWeeks: number }): Promise<ClanDashboardData>;
};
