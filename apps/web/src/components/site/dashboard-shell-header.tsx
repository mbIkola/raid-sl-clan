"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { BrandMark } from "./brand-mark";
import { DashboardNav } from "./dashboard-nav";

type DashboardShellHeaderProps = {
  title: string;
  titleKey: string;
  subtitle: string;
  subtitleKey: string;
  generatedAt: string;
};

export function DashboardShellHeader({
  title,
  titleKey,
  subtitle,
  subtitleKey,
  generatedAt
}: DashboardShellHeaderProps) {
  const { t } = useTranslation("dashboard", { useSuspense: false });

  return (
    <header className="panel-card panel-card--padded dashboard-header">
      <div className="dashboard-stack">
        <BrandMark />
        <h1 className="display-face">{t(titleKey, { defaultValue: title })}</h1>
        <p>{t(subtitleKey, { defaultValue: subtitle })}</p>
        <p className="dashboard-meta">
          {t("snapshotGenerated")}: {generatedAt}
        </p>
      </div>
      <DashboardNav />
    </header>
  );
}
