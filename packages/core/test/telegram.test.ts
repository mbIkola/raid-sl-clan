import { describe, expect, it } from "vitest";
import { buildTelegramReplyText, parseTelegramCommand } from "@raid/core";

describe("parseTelegramCommand", () => {
  it("detects /start", () => {
    expect(parseTelegramCommand("/start")).toBe("start");
  });

  it("detects /help", () => {
    expect(parseTelegramCommand("/help anything")).toBe("help");
  });

  it("falls back to unknown", () => {
    expect(parseTelegramCommand("hello")).toBe("unknown");
  });
});

describe("buildTelegramReplyText", () => {
  it("renders a welcome message with the site url", () => {
    expect(buildTelegramReplyText("start", "https://raid.example")).toContain(
      "https://raid.example"
    );
  });
});
