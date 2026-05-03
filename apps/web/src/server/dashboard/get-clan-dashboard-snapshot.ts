import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createGetClanDashboardSnapshot } from "@raid/application";
import type { ClanDashboardSnapshot } from "@raid/ports";
import { createD1ClanDashboardRepository } from "@raid/platform";
import { fusionEventSource, siegeDefenseSource } from "../../lib/dashboard/manual-sources";

const createFallbackSnapshot = (): ClanDashboardSnapshot => {
  const nowIso = new Date().toISOString();

  return {
    generatedAt: nowIso,
    readiness: [
      {
        activity: "hydra",
        title: "Hydra",
        targetAt: null,
        targetKind: "reset",
        statusLabel: "Сброс окна",
        primaryValue: "Данные пока недоступны",
        href: "/dashboard/hydra"
      },
      {
        activity: "chimera",
        title: "Chimera",
        targetAt: null,
        targetKind: "reset",
        statusLabel: "Сброс окна",
        primaryValue: "Данные пока недоступны",
        href: "/dashboard/chimera"
      },
      {
        activity: "clan_wars",
        title: "KT",
        targetAt: null,
        targetKind: "start",
        statusLabel: "без",
        primaryValue: "Данные пока недоступны",
        href: "/dashboard/clan-wars"
      },
      {
        activity: "siege",
        title: "Siege",
        targetAt: null,
        targetKind: "start",
        statusLabel: "Следующее окно",
        primaryValue: "Данные пока недоступны",
        href: "/dashboard/siege"
      }
    ],
    fusion: fusionEventSource.getCurrentFusionEvent(),
    rankings: {
      hydra: { top5: [], bottom5: [] },
      chimera: { top5: [], bottom5: [] },
      clan_wars: { top5: [], bottom5: [] },
      siege_def: siegeDefenseSource.getCurrentRanking()
    },
    trends: {
      hydra: [],
      chimera: []
    }
  };
};

export const getClanDashboardSnapshot = async () => {
  try {
    const { env } = await getCloudflareContext<Record<string, unknown> & CloudflareEnv>({
      async: true
    });

    return await createGetClanDashboardSnapshot({
      repository: createD1ClanDashboardRepository(env.DB),
      fusionSource: fusionEventSource,
      siegeSource: siegeDefenseSource
    })();
  } catch (error) {
    console.warn("[dashboard/snapshot] using fallback snapshot", { error });
    return createFallbackSnapshot();
  }
};
