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
  const { t, ready } = useTranslation("dashboard", { useSuspense: false });
  const resolveText = (key: string, fallback: string): string =>
    ready ? t(key, { defaultValue: fallback }) : fallback;

  return (
    <header className="panel-card panel-card--padded dashboard-header">
      <div className="dashboard-stack">
        <BrandMark />
        <h1 className="display-face">{resolveText(titleKey, title)}</h1>
        <p>{resolveText(subtitleKey, subtitle)}</p>
        <p className="dashboard-meta">
          {resolveText("snapshotGenerated", "Snapshot generated")}: {generatedAt}
        </p>
      </div>
      <DashboardNav />
    </header>
  );
}
