import { describe, expect, it, vi } from "vitest";
import { handleTelegramWebhookRequest } from "./telegram-webhook";

describe("handleTelegramWebhookRequest", () => {
  it("returns 400 for invalid JSON", async () => {
    const response = await handleTelegramWebhookRequest({
      request: new Request("https://raid.example/api/telegram/webhook", {
        method: "POST",
        body: "{bad json"
      }),
      env: {
        PUBLIC_SITE_URL: "https://raid.example",
        TELEGRAM_BOT_TOKEN: "bot-token"
      },
      fetchFn: vi.fn()
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "invalid-json"
    });
  });

  it("returns 200 and sends one Telegram reply for a valid /start update", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      })
    );

    const response = await handleTelegramWebhookRequest({
      request: new Request("https://raid.example/api/telegram/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          update_id: 1,
          message: {
            message_id: 2,
            date: 1_714_000_000,
            chat: {
              id: 42,
              type: "private"
            },
            text: "/start"
          }
        })
      }),
      env: {
        PUBLIC_SITE_URL: "https://raid.example",
        TELEGRAM_BOT_TOKEN: "bot-token"
      },
      fetchFn
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.telegram.org/botbot-token/sendMessage",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          chat_id: "42",
          text: "Raid SL Clan is online.\nSite: https://raid.example"
        })
      }
    );
  });

  it("returns 400 when the payload has an invalid structured chat id", async () => {
    const fetchFn = vi.fn();

    const response = await handleTelegramWebhookRequest({
      request: new Request("https://raid.example/api/telegram/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          update_id: 1,
          message: {
            message_id: 2,
            date: 1_714_000_000,
            chat: {
              id: {
                nested: "nope"
              },
              type: "private"
            },
            text: "/start"
          }
        })
      }),
      env: {
        PUBLIC_SITE_URL: "https://raid.example",
        TELEGRAM_BOT_TOKEN: "bot-token"
      },
      fetchFn
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "unsupported-update"
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("returns 400 when the JSON body is null", async () => {
    const fetchFn = vi.fn();

    const response = await handleTelegramWebhookRequest({
      request: new Request("https://raid.example/api/telegram/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: "null"
      }),
      env: {
        PUBLIC_SITE_URL: "https://raid.example",
        TELEGRAM_BOT_TOKEN: "bot-token"
      },
      fetchFn
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "unsupported-update"
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("returns a controlled 5xx response when Telegram delivery fails", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false }), {
        status: 500,
        headers: {
          "content-type": "application/json"
        }
      })
    );

    const response = await handleTelegramWebhookRequest({
      request: new Request("https://raid.example/api/telegram/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          update_id: 1,
          message: {
            message_id: 2,
            date: 1_714_000_000,
            chat: {
              id: 42,
              type: "private"
            },
            text: "/start"
          }
        })
      }),
      env: {
        PUBLIC_SITE_URL: "https://raid.example",
        TELEGRAM_BOT_TOKEN: "bot-token"
      },
      fetchFn
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "telegram-send-failed"
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
