import { describe, expect, it } from "vitest";
import { createTelegramUserWhitelist } from "@raid/platform";

describe("telegram user whitelist policy", () => {
  it("allows configured ids and rejects ids not present", () => {
    const whitelist = createTelegramUserWhitelist(["101", "202"]);

    expect(whitelist.isAllowed("101")).toBe(true);
    expect(whitelist.isAllowed("303")).toBe(false);
  });

  it("normalizes whitespace-padded lookup ids", () => {
    const whitelist = createTelegramUserWhitelist(["101", "202"]);

    expect(whitelist.isAllowed(" 101 ")).toBe(true);
  });
});
