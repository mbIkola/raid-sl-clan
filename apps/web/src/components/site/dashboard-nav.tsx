"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./language-switcher";
import { useOptionalLocale } from "./locale-provider";

export function DashboardNav() {
  const { t } = useTranslation(["common", "menu"], { useSuspense: false });
  const localeContext = useOptionalLocale();

  return (
    <details className="dashboard-nav">
      <summary>{t("common:menu")}</summary>
      <div className="dashboard-nav__links">
        <nav className="dashboard-stack" aria-label={t("menu:navigationLabel")}>
          <Link href="/">{t("menu:landing")}</Link>
          <Link href="/about">{t("menu:about")}</Link>
          <Link href="/dashboard">{t("menu:dashboard")}</Link>
          <Link href="/dashboard/clan-wars">{t("menu:clanWars")}</Link>
        </nav>
        {localeContext ? <LanguageSwitcher /> : null}
      </div>
    </details>
  );
}
