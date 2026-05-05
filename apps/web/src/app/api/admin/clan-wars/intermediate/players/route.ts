import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handleClanWarsIntermediateRequest } from "../../../../../../server/admin-clan-wars-intermediate";

export const POST = async (request: Request) => {
  const { env } = await getCloudflareContext<Record<string, unknown> & CloudflareEnv>({
    async: true
  });

  return handleClanWarsIntermediateRequest({
    request,
    env,
    action: "players"
  });
};
