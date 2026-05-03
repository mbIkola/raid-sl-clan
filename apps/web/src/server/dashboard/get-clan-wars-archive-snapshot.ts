import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createGetClanWarsArchiveSnapshot } from "@raid/application";
import { createD1ClanDashboardRepository } from "@raid/platform";

export const getClanWarsArchiveSnapshot = async () => {
  const { env } = await getCloudflareContext<Record<string, unknown> & CloudflareEnv>({
    async: true
  });

  return createGetClanWarsArchiveSnapshot({
    repository: createD1ClanDashboardRepository(env.DB),
    windowLimit: 12
  })();
};
