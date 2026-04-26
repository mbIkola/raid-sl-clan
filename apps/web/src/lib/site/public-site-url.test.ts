import { afterEach, describe, expect, it, vi } from "vitest";

const env = process.env as Omit<NodeJS.ProcessEnv, "PUBLIC_SITE_URL"> & {
  PUBLIC_SITE_URL?: string;
};
const originalPublicSiteUrl = env.PUBLIC_SITE_URL;

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("node:fs");

  if (originalPublicSiteUrl === undefined) {
    Reflect.deleteProperty(env, "PUBLIC_SITE_URL");
  } else {
    env.PUBLIC_SITE_URL = originalPublicSiteUrl;
  }
});

describe("resolvePublicSiteUrl", () => {
  it("prefers PUBLIC_SITE_URL from the environment", async () => {
    env.PUBLIC_SITE_URL = "https://example.com/";

    const { resolvePublicSiteUrl } = await import("./public-site-url");

    expect(resolvePublicSiteUrl()).toBe("https://example.com");
  });

  it("falls back to the wrangler configuration when env is unset", async () => {
    Reflect.deleteProperty(env, "PUBLIC_SITE_URL");

    vi.doMock("node:fs", () => ({
      existsSync: vi.fn((value: string) => value.endsWith("apps/web/wrangler.jsonc")),
      readFileSync: vi.fn(() =>
        JSON.stringify({
          vars: {
            PUBLIC_SITE_URL: "https://vibr-clan.org/"
          }
        })
      )
    }));

    const { resolvePublicSiteUrl } = await import("./public-site-url");

    expect(resolvePublicSiteUrl()).toBe("https://vibr-clan.org");
  });

  it("throws when env is unset and no config file can be found", async () => {
    Reflect.deleteProperty(env, "PUBLIC_SITE_URL");

    vi.doMock("node:fs", () => ({
      existsSync: vi.fn(() => false),
      readFileSync: vi.fn()
    }));

    const { resolvePublicSiteUrl } = await import("./public-site-url");

    expect(() => resolvePublicSiteUrl()).toThrow(
      "PUBLIC_SITE_URL config file was not found."
    );
  });
});
