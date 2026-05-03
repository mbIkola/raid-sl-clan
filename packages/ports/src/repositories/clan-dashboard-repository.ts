export type DashboardActivity = "hydra" | "chimera" | "clan_wars" | "siege_def";

export type DashboardReadinessActivity = "hydra" | "chimera" | "clan_wars" | "siege";

export type DashboardReadinessMetricKind =
  | "keys_and_damage"
  | "clan_wars_state"
  | "siege_preparation";

export type DashboardReadinessCard = {
  activity: DashboardReadinessActivity;
  title: string;
  targetAt: string | null;
  targetKind: "reset" | "start";
  metricKind: DashboardReadinessMetricKind;
  keysSpent?: number;
  totalScore?: number;
  clanWarsState?: "active" | "upcoming";
  hasPersonalRewards?: boolean | null;
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

export type ClanWarsHeader = {
  targetAt: string;
  targetKind: "start" | "reset";
  eventStartAt: string;
  eventEndsAt: string;
  hasPersonalRewards: boolean;
};

export type ClanWarsArchiveHistoryRow = {
  windowStart: string;
  windowEnd: string;
  hasPersonalRewards: boolean;
  clanTotalPoints: number;
  activeContributors: number;
  topPlayerName: string;
  topPlayerPoints: number;
};

export type ClanWarsArchiveStabilityRow = {
  playerName: string;
  windowsPlayed: number;
  avgPoints: number;
  bestPoints: number;
  lastWindowPoints: number;
  consistencyScore: number;
};

export type ClanWarsArchiveDeclineRow = {
  playerName: string;
  recentAvg: number;
  baselineAvg: number;
  delta: number;
};

export type ClanWarsArchiveData = {
  header: ClanWarsHeader;
  history: ClanWarsArchiveHistoryRow[];
  stability: ClanWarsArchiveStabilityRow[];
  decline: ClanWarsArchiveDeclineRow[];
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

export type ClanWarsArchiveRepository = {
  getClanWarsArchive(input: { nowIso: string; windowLimit: number }): Promise<ClanWarsArchiveData>;
};
