import { describe, expect, it } from "vitest";
import { replacePublicSiteUrl } from "./public-site-url.js";

describe("replacePublicSiteUrl", () => {
  it("replaces the configured PUBLIC_SITE_URL value", () => {
    const config = `{
  "vars": {
    "PUBLIC_SITE_URL": "https://raid-sl-clan-web.kharchevyn.workers.dev"
  }
}`;

    const updated = replacePublicSiteUrl(config, "https://vibr-clan.org");

    expect(updated).toContain(`"PUBLIC_SITE_URL": "https://vibr-clan.org"`);
    expect(updated).not.toContain("raid-sl-clan-web.kharchevyn.workers.dev");
  });

  it("throws when PUBLIC_SITE_URL is missing from config", () => {
    expect(() => replacePublicSiteUrl(`{"vars": {}}`, "https://vibr-clan.org")).toThrow(
      /PUBLIC_SITE_URL/
    );
  });

  it("throws when the replacement is not an absolute http url", () => {
    const config = `{
  "vars": {
    "PUBLIC_SITE_URL": "https://raid-sl-clan-web.kharchevyn.workers.dev"
  }
}`;

    expect(() => replacePublicSiteUrl(config, "vibr-clan.org")).toThrow(/absolute http/i);
  });
});
