import React from "react";
import type { ClanWarsArchiveDeclineRow } from "@raid/ports";

type DashboardKtDeclineZoneProps = {
  rows: ClanWarsArchiveDeclineRow[];
};

const formatNumber = (value: number) => value.toLocaleString("en-US");

export function DashboardKtDeclineZone({ rows }: DashboardKtDeclineZoneProps) {
  const topRows = rows.slice(0, 10);

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">Кто проседает</h2>
      {topRows.length === 0 ? (
        <p>Просадок не найдено</p>
      ) : (
        <ol className="dashboard-ranking-list">
          {topRows.map((row) => (
            <li key={row.playerName}>
              <span>{row.playerName}</span>
              <strong>
                {formatNumber(row.delta)} ({formatNumber(row.recentAvg)} vs{" "}
                {formatNumber(row.baselineAvg)})
              </strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
