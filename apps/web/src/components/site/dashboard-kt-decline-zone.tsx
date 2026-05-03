"use client";

import React from "react";
import type { ClanWarsArchiveDeclineRow } from "@raid/ports";
import { useTranslation } from "react-i18next";
import { LocalizedNumber } from "./localized-number";

type DashboardKtDeclineZoneProps = {
  rows: ClanWarsArchiveDeclineRow[];
};

export function DashboardKtDeclineZone({ rows }: DashboardKtDeclineZoneProps) {
  const { t } = useTranslation(["dashboard", "units"], { useSuspense: false });
  const topRows = rows.slice(0, 10);

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">{t("dashboard:ktDeclineTitle")}</h2>
      {topRows.length === 0 ? (
        <p>{t("dashboard:ktNoDeclines")}</p>
      ) : (
        <ol className="dashboard-ranking-list">
          {topRows.map((row, index) => (
            <li key={`${row.playerName}-${index}`}>
              <span>{row.playerName}</span>
              <strong>
                <LocalizedNumber value={row.delta} /> (
                <LocalizedNumber value={row.recentAvg} />{" "}
                {t("units:vs")}{" "}
                <LocalizedNumber value={row.baselineAvg} />)
              </strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
