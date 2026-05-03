import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  resolveInitialLanguage,
  type SupportedLanguage
} from "./resolve-language";

describe("resolve-language", () => {
  it("prefers persisted language over browser language", () => {
    const language = resolveInitialLanguage({
      persistedLanguage: "uk",
      browserLanguages: ["en-US", "ru-RU"]
    });

    expect(language).toBe("uk");
  });

  it("falls back to browser language when persisted value is invalid", () => {
    const language = resolveInitialLanguage({
      persistedLanguage: "de",
      browserLanguages: ["en-GB"]
    });

    expect(language).toBe("en");
  });

  it("falls back to default language when browser languages are unsupported", () => {
    const language = resolveInitialLanguage({
      persistedLanguage: null,
      browserLanguages: ["de-DE", "fr-FR"]
    });

    expect(language).toBe(DEFAULT_LANGUAGE);
  });

  it("normalizes language tags by primary subtag", () => {
    expect(normalizeLanguage("ru-RU")).toBe("ru");
    expect(normalizeLanguage("uk-UA")).toBe("uk");
    expect(normalizeLanguage("en-GB")).toBe("en");
  });

  it("returns null for unsupported tags", () => {
    expect(normalizeLanguage("it-IT")).toBeNull();
  });

  it("keeps supported values strongly typed", () => {
    const value: SupportedLanguage = "ru";
    expect(value).toBe("ru");
  });
});
