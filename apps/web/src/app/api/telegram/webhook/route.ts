import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handleTelegramWebhookRequest } from "../../../../server/telegram-webhook";

export const POST = async (request: Request) => {
  const { env } = await getCloudflareContext<Record<string, unknown> & CloudflareEnv>({
    async: true
  });

  return handleTelegramWebhookRequest({
    request,
    env
  });
};
