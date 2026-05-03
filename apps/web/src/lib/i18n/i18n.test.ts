import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const importI18nModule = async () => {
  vi.resetModules();
  return import("./i18n");
};

type RuntimeStubInput = {
  browserLanguages: readonly string[];
  browserLanguage?: string;
  persistedLanguage?: string | null;
  throwOnStorageRead?: boolean;
};

const stubBrowserRuntime = (input: RuntimeStubInput): void => {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: vi.fn(() => {
        if (input.throwOnStorageRead) {
          throw new Error("storage blocked");
        }

        return input.persistedLanguage ?? null;
      })
    }
  });

  vi.stubGlobal("navigator", {
    languages: input.browserLanguages,
    language: input.browserLanguage ?? ""
  });
};

describe("i18n bootstrap", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not initialize on import", async () => {
    const { i18n } = await importI18nModule();

    expect(Boolean(i18n.isInitialized)).toBe(false);
  });

  it("falls back to navigator language when localStorage read fails", async () => {
    stubBrowserRuntime({
      browserLanguages: ["uk-UA", "en-US"],
      throwOnStorageRead: true
    });

    const { resolveBootstrapLanguage } = await importI18nModule();

    expect(resolveBootstrapLanguage()).toBe("uk");
  });

  it("falls back to navigator.language when navigator.languages is empty", async () => {
    stubBrowserRuntime({
      browserLanguages: [],
      browserLanguage: "en-US",
      persistedLanguage: null
    });

    const { resolveBootstrapLanguage } = await importI18nModule();

    expect(resolveBootstrapLanguage()).toBe("en");
  });

  it("initializes only once when called concurrently", async () => {
    const { i18n, initI18n } = await importI18nModule();
    const initSpy = vi.spyOn(i18n, "init");

    await Promise.all([initI18n("ru"), initI18n("ru"), initI18n("ru")]);

    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.resolvedLanguage).toBe("ru");
  });
});
