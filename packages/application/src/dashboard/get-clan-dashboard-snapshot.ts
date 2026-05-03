import type {
  ClanDashboardRepository,
  ClanDashboardSnapshot,
  FusionEventSource,
  SiegeDefenseSource
} from "@raid/ports";

export type GetClanDashboardSnapshotDeps = {
  repository: ClanDashboardRepository;
  fusionSource: FusionEventSource;
  siegeSource: SiegeDefenseSource;
  now?: () => Date;
};

export const createGetClanDashboardSnapshot = ({
  repository,
  fusionSource,
  siegeSource,
  now = () => new Date()
}: GetClanDashboardSnapshotDeps) => {
  return async (): Promise<ClanDashboardSnapshot> => {
    const nowIso = now().toISOString();
    const data = await repository.getSnapshot({
      nowIso,
      trendWeeks: 8
    });

    return {
      generatedAt: nowIso,
      readiness: data.readiness,
      fusion: fusionSource.getCurrentFusionEvent(),
      rankings: {
        ...data.rankings,
        siege_def: siegeSource.getCurrentRanking()
      },
      trends: data.trends
    };
  };
};
