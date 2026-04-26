import { describe, expect, it } from "vitest";
import { createHandleTelegramUpdate } from "@raid/application";

describe("createHandleTelegramUpdate", () => {
  const handleTelegramUpdate = createHandleTelegramUpdate({
    siteUrl: "https://raid.example"
  });

  it("returns ignored when chat id is missing", () => {
    expect(handleTelegramUpdate(null)).toEqual({ kind: "ignored" });
  });

  it("returns a reply for /start", () => {
    expect(
      handleTelegramUpdate({
        chatId: "42",
        text: "/start"
      })
    ).toEqual({
      kind: "reply",
      chatId: "42",
      text: "Raid SL Clan is online.\nSite: https://raid.example"
    });
  });
});
