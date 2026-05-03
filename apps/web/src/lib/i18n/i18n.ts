import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE, I18N_STORAGE_KEY, type SupportedLanguage } from "./languages";
import { resolveInitialLanguage } from "./resolve-language";
import { i18nResources } from "./resources";

export const i18n = i18next.createInstance();
let initInFlight: Promise<typeof i18n> | null = null;

type BootstrapLanguageInput = {
  persistedLanguage?: string | null;
  browserLanguages?: readonly string[];
};

const getPersistedLanguage = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(I18N_STORAGE_KEY);
  } catch {
    return null;
  }
};

const getBrowserLanguages = (): readonly string[] => {
  if (typeof navigator === "undefined") {
    return [];
  }

  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return navigator.languages;
  }

  if (typeof navigator.language === "string" && navigator.language.length > 0) {
    return [navigator.language];
  }

  return [];
};

export const resolveBootstrapLanguage = (input?: BootstrapLanguageInput): SupportedLanguage => {
  return resolveInitialLanguage({
    persistedLanguage: input?.persistedLanguage ?? getPersistedLanguage(),
    browserLanguages: input?.browserLanguages ?? getBrowserLanguages()
  });
};

export const initI18n = async (language = resolveBootstrapLanguage()): Promise<typeof i18n> => {
  if (!i18n.isInitialized) {
    if (!initInFlight) {
      initInFlight = i18n
        .use(initReactI18next)
        .init({
          lng: language,
          fallbackLng: DEFAULT_LANGUAGE,
          interpolation: { escapeValue: false },
          defaultNS: "common",
          ns: ["common", "menu", "landing", "about", "dashboard", "units"],
          resources: i18nResources,
          returnNull: false
        })
        .then(() => i18n)
        .finally(() => {
          initInFlight = null;
        });
    }

    await initInFlight;
  }

  if (i18n.resolvedLanguage !== language) {
    await i18n.changeLanguage(language);
  }

  return i18n;
};
