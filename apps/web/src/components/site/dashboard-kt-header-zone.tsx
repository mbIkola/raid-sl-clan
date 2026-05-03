"use client";

import React from "react";
import type { ClanWarsHeader } from "@raid/ports";
import { useTranslation } from "react-i18next";
import { CountdownTimer } from "./countdown-timer";
import { LocalizedDateTime } from "./localized-date-time";

type DashboardKtHeaderZoneProps = {
  header: ClanWarsHeader;
};

export function DashboardKtHeaderZone({ header }: DashboardKtHeaderZoneProps) {
  const { t } = useTranslation("dashboard", { useSuspense: false });
  const getCountdownLabel = (targetKind: ClanWarsHeader["targetKind"]) =>
    targetKind === "start"
      ? t("ktCountdownToStart")
      : t("ktCountdownToReset");
  const rewardsLabel = header.hasPersonalRewards
    ? t("ktRewardsWithPersonal")
    : t("ktRewardsWithoutPersonal");

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">{t("ktArchiveTitle")}</h2>
      <p>
        {getCountdownLabel(header.targetKind)}:{" "}
        <CountdownTimer
          targetIso={header.targetAt}
          endedLabel={t("ktWindowEnded")}
        />
      </p>
      <p>
        {t("ktRewardsLabel")}: {rewardsLabel}
      </p>
      <p>
        {t("ktWindowPeriodLabel")}:{" "}
        <LocalizedDateTime iso={header.eventStartAt} /> -{" "}
        <LocalizedDateTime iso={header.eventEndsAt} />
      </p>
    </section>
  );
}
