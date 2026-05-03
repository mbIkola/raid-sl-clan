"use client";

import React from "react";
import type { DashboardTrendPoint } from "@raid/ports";
import { useTranslation } from "react-i18next";
import { LocalizedDateTime } from "./localized-date-time";
import { LocalizedNumber } from "./localized-number";

type DashboardTrendsZoneProps = {
  trends: {
    hydra: DashboardTrendPoint[];
    chimera: DashboardTrendPoint[];
  };
};

export function DashboardTrendsZone({ trends }: DashboardTrendsZoneProps) {
  const { t, ready } = useTranslation(["dashboard", "common"], {
    useSuspense: false
  });
  const resolveText = (key: string, fallback: string): string =>
    ready ? t(key, { defaultValue: fallback }) : fallback;

  const renderTrendRows = (rows: DashboardTrendPoint[]) => {
    const max = rows.reduce((acc, row) => Math.max(acc, row.totalScore), 0);

    if (rows.length === 0) {
      return <p>{resolveText("common:noData", "Недостаточно данных")}</p>;
    }

    return (
      <ul className="dashboard-trend-list">
        {rows.map((row) => {
          const widthPercent = max > 0 ? Math.max(2, (row.totalScore / max) * 100) : 2;

          return (
            <li key={row.endsAt}>
              <span>
                <LocalizedDateTime iso={row.endsAt} />
              </span>
              <div className="dashboard-trend-bar-track">
                <span
                  className="dashboard-trend-bar-fill"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              <strong>
                <LocalizedNumber
                  value={row.totalScore}
                  notation="compact"
                  compactDisplay="short"
                  maximumFractionDigits={1}
                />
              </strong>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section className="panel-card panel-card--padded dashboard-stack dashboard-trends-zone">
      <h2 className="display-face">
        {resolveText("dashboard:trendsTitle", "Зона трендов")}
      </h2>
      <p>{resolveText("dashboard:trendsSubtitle", "8-week clan trend snapshot.")}</p>

      <div className="dashboard-trends-columns">
        <article className="dashboard-stack">
          <h3>{resolveText("dashboard:trendsHydra", "Hydra")}</h3>
          {renderTrendRows(trends.hydra)}
        </article>

        <article className="dashboard-stack">
          <h3>{resolveText("dashboard:trendsChimera", "Chimera")}</h3>
          {renderTrendRows(trends.chimera)}
        </article>
      </div>
    </section>
  );
}
