"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./language-switcher";
import { useOptionalLocale } from "./locale-provider";

export function DashboardNav() {
  const { t, ready } = useTranslation(["common", "menu"], {
    useSuspense: false
  });
  const localeContext = useOptionalLocale();
  const resolveText = (key: string, fallback: string): string =>
    ready ? t(key, { defaultValue: fallback }) : fallback;

  return (
    <details className="dashboard-nav">
      <summary>{resolveText("common:menu", "Menu")}</summary>
      <div className="dashboard-nav__links">
        <nav
          className="dashboard-stack"
          aria-label={resolveText("menu:navigationLabel", "Dashboard navigation")}
        >
          <Link href="/">{resolveText("menu:landing", "Landing")}</Link>
          <Link href="/about">{resolveText("menu:about", "About")}</Link>
          <Link href="/dashboard">
            {resolveText("menu:dashboard", "Dashboard")}
          </Link>
          <Link href="/dashboard/clan-wars">
            {resolveText("menu:clanWars", "KT")}
          </Link>
        </nav>
        {localeContext ? <LanguageSwitcher /> : null}
      </div>
    </details>
  );
}
