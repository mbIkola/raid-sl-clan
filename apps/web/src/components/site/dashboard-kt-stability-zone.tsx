import React from "react";
import type { ClanWarsArchiveStabilityRow } from "@raid/ports";

type DashboardKtStabilityZoneProps = {
  rows: ClanWarsArchiveStabilityRow[];
};

const formatNumber = (value: number) => value.toLocaleString("en-US");

export function DashboardKtStabilityZone({ rows }: DashboardKtStabilityZoneProps) {
  const topRows = rows.slice(0, 10);

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">Стабильность состава</h2>
      {topRows.length === 0 ? (
        <p>Недостаточно данных</p>
      ) : (
        <ol className="dashboard-ranking-list">
          {topRows.map((row) => (
            <li key={row.playerName}>
              <span>{row.playerName}</span>
              <strong>
                {formatNumber(row.avgPoints)} avg / {formatNumber(row.lastWindowPoints)} last
              </strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
