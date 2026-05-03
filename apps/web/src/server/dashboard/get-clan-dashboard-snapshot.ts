import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createGetClanDashboardSnapshot } from "@raid/application";
import { createD1ClanDashboardRepository } from "@raid/platform";
import { fusionEventSource, siegeDefenseSource } from "../../lib/dashboard/manual-sources";

export const getClanDashboardSnapshot = async () => {
  const { env } = await getCloudflareContext<Record<string, unknown> & CloudflareEnv>({
    async: true
  });

  return createGetClanDashboardSnapshot({
    repository: createD1ClanDashboardRepository(env.DB),
    fusionSource: fusionEventSource,
    siegeSource: siegeDefenseSource
  })();
};
