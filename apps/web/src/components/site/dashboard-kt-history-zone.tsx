"use client";

import React from "react";
import type { ClanWarsArchiveHistoryRow } from "@raid/ports";
import { useTranslation } from "react-i18next";
import { LocalizedDateTime } from "./localized-date-time";
import { LocalizedNumber } from "./localized-number";

type DashboardKtHistoryZoneProps = {
  history: ClanWarsArchiveHistoryRow[];
};

export function DashboardKtHistoryZone({ history }: DashboardKtHistoryZoneProps) {
  const { t, ready } = useTranslation(["dashboard", "common"], {
    useSuspense: false
  });
  const resolveText = (key: string, fallback: string): string =>
    ready ? t(key, { defaultValue: fallback }) : fallback;

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">
        {resolveText("dashboard:ktHistoryTitle", "История окон КТ")}
      </h2>
      <table className="dashboard-kt-table">
        <thead>
          <tr>
            <th scope="col">
              {resolveText("dashboard:ktHistoryWindowColumn", "Окно")}
            </th>
            <th scope="col">
              {resolveText("dashboard:ktHistoryRewardsColumn", "Награды")}
            </th>
            <th scope="col">
              {resolveText("dashboard:ktHistoryClanPointsColumn", "Очки клана")}
            </th>
            <th scope="col">
              {resolveText("dashboard:ktHistoryActiveColumn", "Активные")}
            </th>
            <th scope="col">
              {resolveText("dashboard:ktHistoryTopColumn", "Top-1")}
            </th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td colSpan={5}>{resolveText("common:noData", "Недостаточно данных")}</td>
            </tr>
          ) : (
            history.map((row) => (
              <tr key={row.windowStart}>
                <td>
                  <LocalizedDateTime iso={row.windowStart} /> -{" "}
                  <LocalizedDateTime iso={row.windowEnd} />
                </td>
                <td>
                  {row.hasPersonalRewards
                    ? resolveText("dashboard:ktRewardsWithPersonal", "С личными наградами")
                    : resolveText("dashboard:ktRewardsWithoutPersonal", "Без личных наград")}
                </td>
                <td>
                  <LocalizedNumber value={row.clanTotalPoints} />
                </td>
                <td>
                  <LocalizedNumber value={row.activeContributors} />
                </td>
                <td>
                  {row.topPlayerName} (<LocalizedNumber value={row.topPlayerPoints} />)
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
