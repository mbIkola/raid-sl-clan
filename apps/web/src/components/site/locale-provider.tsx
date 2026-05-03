"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { i18n, initI18n } from "../../lib/i18n/i18n";
import {
  I18N_STORAGE_KEY,
  LANGUAGE_TO_LOCALE,
  type SupportedLanguage
} from "../../lib/i18n/languages";
import { resolveInitialLanguage } from "../../lib/i18n/resolve-language";

type LocaleContextValue = {
  language: SupportedLanguage;
  locale: string;
  timeZone: string;
  setLanguage: (language: SupportedLanguage) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const readPersistedLanguage = (): string | null => {
  try {
    return localStorage.getItem(I18N_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writePersistedLanguage = (language: SupportedLanguage): void => {
  try {
    localStorage.setItem(I18N_STORAGE_KEY, language);
  } catch {
    // localStorage can be unavailable in privacy-constrained contexts
  }
};

const resolveBrowserLanguages = (): readonly string[] => {
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

const resolveTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
};

const resolveInitialClientLanguage = (): SupportedLanguage => {
  return resolveInitialLanguage({
    persistedLanguage: readPersistedLanguage(),
    browserLanguages: resolveBrowserLanguages()
  });
};

type LocaleProviderProps = {
  children: React.ReactNode;
};

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [language, setLanguage] = useState<SupportedLanguage>(resolveInitialClientLanguage);
  const [timeZone] = useState(resolveTimeZone);

  useEffect(() => {
    writePersistedLanguage(language);
    document.documentElement.lang = language;
    void initI18n(language);
  }, [language]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      language,
      locale: LANGUAGE_TO_LOCALE[language],
      timeZone,
      setLanguage
    }),
    [language, timeZone]
  );

  return (
    <I18nextProvider i18n={i18n}>
      <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
    </I18nextProvider>
  );
}

export const useLocale = (): LocaleContextValue => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
};
