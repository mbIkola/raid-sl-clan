"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { i18n, initI18n, resolveBootstrapLanguage } from "../../lib/i18n/i18n";
import {
  I18N_STORAGE_KEY,
  LANGUAGE_TO_LOCALE,
  type SupportedLanguage
} from "../../lib/i18n/languages";

type LocaleContextValue = {
  language: SupportedLanguage;
  locale: string;
  timeZone: string;
  setLanguage: (language: SupportedLanguage) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const writePersistedLanguage = (language: SupportedLanguage): void => {
  try {
    localStorage.setItem(I18N_STORAGE_KEY, language);
  } catch {
    // localStorage can be unavailable in privacy-constrained contexts
  }
};

const resolveTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
};

type LocaleProviderProps = {
  children: React.ReactNode;
};

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [language, setLanguage] = useState<SupportedLanguage>(resolveBootstrapLanguage);
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

export const useOptionalLocale = (): LocaleContextValue | null => useContext(LocaleContext);
