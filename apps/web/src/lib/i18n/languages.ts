export const SUPPORTED_LANGUAGES = ["ru", "uk", "en"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = "ru";

export const LANGUAGE_TO_LOCALE: Record<SupportedLanguage, string> = {
  ru: "ru-RU",
  uk: "uk-UA",
  en: "en-US"
};

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ru: "Русский",
  uk: "Українська",
  en: "English"
};

export const I18N_STORAGE_KEY = "raid.web.language";
