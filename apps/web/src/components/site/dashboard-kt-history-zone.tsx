import React from "react";
import type { ClanWarsArchiveHistoryRow } from "@raid/ports";
import { LocalizedDateTime } from "./localized-date-time";

type DashboardKtHistoryZoneProps = {
  history: ClanWarsArchiveHistoryRow[];
};

const formatNumber = (value: number) => value.toLocaleString("en-US");

export function DashboardKtHistoryZone({ history }: DashboardKtHistoryZoneProps) {
  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">История окон КТ</h2>
      <table className="dashboard-kt-table">
        <thead>
          <tr>
            <th scope="col">Окно</th>
            <th scope="col">Награды</th>
            <th scope="col">Очки клана</th>
            <th scope="col">Активные</th>
            <th scope="col">Top-1</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td colSpan={5}>Недостаточно данных</td>
            </tr>
          ) : (
            history.map((row) => (
              <tr key={row.windowStart}>
                <td>
                  <LocalizedDateTime iso={row.windowStart} /> -{" "}
                  <LocalizedDateTime iso={row.windowEnd} />
                </td>
                <td>{row.hasPersonalRewards ? "Личные" : "Без личных"}</td>
                <td>{formatNumber(row.clanTotalPoints)}</td>
                <td>{formatNumber(row.activeContributors)}</td>
                <td>
                  {row.topPlayerName} ({formatNumber(row.topPlayerPoints)})
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
