import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type SupportedLanguage } from "./languages";

const supported = new Set<string>(SUPPORTED_LANGUAGES);

export const normalizeLanguage = (input: string | null | undefined): SupportedLanguage | null => {
  if (!input) {
    return null;
  }

  const primary = input.trim().toLowerCase().split("-")[0];
  return supported.has(primary) ? (primary as SupportedLanguage) : null;
};

export const resolveInitialLanguage = (input: {
  persistedLanguage: string | null;
  browserLanguages: readonly string[];
}): SupportedLanguage => {
  const persisted = normalizeLanguage(input.persistedLanguage);
  if (persisted) {
    return persisted;
  }

  for (const language of input.browserLanguages) {
    const normalized = normalizeLanguage(language);
    if (normalized) {
      return normalized;
    }
  }

  return DEFAULT_LANGUAGE;
};

export { DEFAULT_LANGUAGE, type SupportedLanguage };
