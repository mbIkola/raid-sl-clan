import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE } from "./languages";
import { i18nResources } from "./resources";

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  defaultNS: "common",
  ns: ["common", "menu", "landing", "about", "dashboard", "units"],
  resources: i18nResources,
  returnNull: false
});
