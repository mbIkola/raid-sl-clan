"use client";

import React from "react";
import type { ClanWarsArchiveStabilityRow } from "@raid/ports";
import { useTranslation } from "react-i18next";
import { LocalizedNumber } from "./localized-number";

type DashboardKtStabilityZoneProps = {
  rows: ClanWarsArchiveStabilityRow[];
};

export function DashboardKtStabilityZone({ rows }: DashboardKtStabilityZoneProps) {
  const { t } = useTranslation(["dashboard", "common", "units"], { useSuspense: false });
  const topRows = rows.slice(0, 10);

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">{t("dashboard:ktStabilityTitle")}</h2>
      {topRows.length === 0 ? (
        <p>{t("common:noData")}</p>
      ) : (
        <ol className="dashboard-ranking-list">
          {topRows.map((row, index) => (
            <li key={`${row.playerName}-${index}`}>
              <span>{row.playerName}</span>
              <strong>
                <LocalizedNumber value={row.avgPoints} />{" "}
                {t("units:avg")} /{" "}
                <LocalizedNumber value={row.lastWindowPoints} />{" "}
                {t("units:last")}
              </strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
