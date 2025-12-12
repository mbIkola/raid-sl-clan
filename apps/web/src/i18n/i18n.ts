import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import resourcesToBackend from 'i18next-resources-to-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// todo: side effect.
i18n
  .use(LanguageDetector)
  .use(resourcesToBackend(
    (language: any, namespace: any) => import(`./locales/${language}/${namespace}.json`))
  )
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: true,
    interpolation: {
      escapeValue: false // react already safes from xss
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag", "querystring"],
      caches: ["localStorage"],
      convertDetectedLanguage: (lng: string) => lng.replace(/-.*/, '')
    },
    supportedLngs: ["en", "ru", "uk"],
    nonExplicitSupportedLngs: true
  });

export const i18nInstance = i18n;
