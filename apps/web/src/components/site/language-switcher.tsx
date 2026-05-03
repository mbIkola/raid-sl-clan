"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage
} from "../../lib/i18n/languages";
import { useLocale } from "./locale-provider";

export function LanguageSwitcher() {
  const { t, ready } = useTranslation("menu", { useSuspense: false });
  const { language, setLanguage } = useLocale();
  const ariaLabel = ready ? t("languageSwitcherLabel") : LANGUAGE_LABELS[language];

  return (
    <label className="dashboard-language-switcher">
      <span className="sr-only">{ariaLabel}</span>
      <select
        aria-label={ariaLabel}
        value={language}
        onChange={(event) => setLanguage(event.target.value as SupportedLanguage)}
      >
        {SUPPORTED_LANGUAGES.map((nextLanguage) => (
          <option key={nextLanguage} value={nextLanguage}>
            {LANGUAGE_LABELS[nextLanguage]}
          </option>
        ))}
      </select>
    </label>
  );
}
