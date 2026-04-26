import { createHandleTelegramUpdate } from "@raid/application";
import {
  normalizeTelegramUpdate,
  sendTelegramMessage,
  type TelegramUpdate
} from "@raid/platform";

declare global {
  interface CloudflareEnv {
    PUBLIC_SITE_URL: string;
    TELEGRAM_BOT_TOKEN: string;
  }
}

export type TelegramWebhookEnv = {
  PUBLIC_SITE_URL: string;
  TELEGRAM_BOT_TOKEN: string;
};

export type HandleTelegramWebhookRequestInput = {
  request: Request;
  env: TelegramWebhookEnv;
  fetchFn?: typeof fetch;
};

export const handleTelegramWebhookRequest = async ({
  request,
  env,
  fetchFn
}: HandleTelegramWebhookRequestInput) => {
  let update: TelegramUpdate;

  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return Response.json(
      {
        ok: false,
        error: "invalid-json"
      },
      { status: 400 }
    );
  }

  const normalized = normalizeTelegramUpdate(update);

  if (!normalized) {
    return Response.json(
      {
        ok: false,
        error: "unsupported-update"
      },
      { status: 400 }
    );
  }

  const result = createHandleTelegramUpdate({
    siteUrl: env.PUBLIC_SITE_URL
  })(normalized);

  if (result.kind === "reply") {
    try {
      await sendTelegramMessage({
        token: env.TELEGRAM_BOT_TOKEN,
        chatId: result.chatId,
        text: result.text,
        fetchFn
      });
    } catch {
      return Response.json(
        {
          ok: false,
          error: "telegram-send-failed"
        },
        { status: 502 }
      );
    }
  }

  return Response.json({ ok: true });
};
