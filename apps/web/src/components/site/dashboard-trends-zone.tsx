import React from "react";
import type { DashboardTrendPoint } from "@raid/ports";
import { LocalizedDateTime } from "./localized-date-time";
import { LocalizedNumber } from "./localized-number";

type DashboardTrendsZoneProps = {
  trends: {
    hydra: DashboardTrendPoint[];
    chimera: DashboardTrendPoint[];
  };
};

const renderTrendRows = (rows: DashboardTrendPoint[]) => {
  const max = rows.reduce((acc, row) => Math.max(acc, row.totalScore), 0);

  if (rows.length === 0) {
    return <p>Недостаточно данных</p>;
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

export function DashboardTrendsZone({ trends }: DashboardTrendsZoneProps) {
  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">Зона тренды</h2>
      <p>8-week clan trend snapshot.</p>

      <article className="dashboard-stack">
        <h3>Hydra</h3>
        {renderTrendRows(trends.hydra)}
      </article>

      <article className="dashboard-stack">
        <h3>Chimera</h3>
        {renderTrendRows(trends.chimera)}
      </article>
    </section>
  );
}
