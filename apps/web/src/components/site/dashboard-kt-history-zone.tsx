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
  const { t } = useTranslation(["dashboard", "common"], { useSuspense: false });

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">{t("dashboard:ktHistoryTitle")}</h2>
      <table className="dashboard-kt-table">
        <thead>
          <tr>
            <th scope="col">{t("dashboard:ktHistoryWindowColumn")}</th>
            <th scope="col">{t("dashboard:ktHistoryRewardsColumn")}</th>
            <th scope="col">{t("dashboard:ktHistoryClanPointsColumn")}</th>
            <th scope="col">{t("dashboard:ktHistoryActiveColumn")}</th>
            <th scope="col">{t("dashboard:ktHistoryTopColumn")}</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td colSpan={5}>{t("common:noData")}</td>
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
                    ? t("dashboard:ktRewardsWithPersonal")
                    : t("dashboard:ktRewardsWithoutPersonal")}
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
