"use client";

import React from "react";
import type { ClanWarsArchiveStabilityRow } from "@raid/ports";
import { useTranslation } from "react-i18next";
import { LocalizedNumber } from "./localized-number";

type DashboardKtStabilityZoneProps = {
  rows: ClanWarsArchiveStabilityRow[];
};

export function DashboardKtStabilityZone({ rows }: DashboardKtStabilityZoneProps) {
  const { t, ready } = useTranslation(["dashboard", "common", "units"], {
    useSuspense: false
  });
  const resolveText = (key: string, fallback: string): string =>
    ready ? t(key, { defaultValue: fallback }) : fallback;
  const topRows = rows.slice(0, 10);

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">
        {resolveText("dashboard:ktStabilityTitle", "Стабильность состава")}
      </h2>
      {topRows.length === 0 ? (
        <p>{resolveText("common:noData", "Недостаточно данных")}</p>
      ) : (
        <ol className="dashboard-ranking-list">
          {topRows.map((row, index) => (
            <li key={`${row.playerName}-${index}`}>
              <span>{row.playerName}</span>
              <strong>
                <LocalizedNumber value={row.avgPoints} />{" "}
                {resolveText("units:avg", "avg")} /{" "}
                <LocalizedNumber value={row.lastWindowPoints} />{" "}
                {resolveText("units:last", "last")}
              </strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
