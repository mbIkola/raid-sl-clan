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
  const { t, ready } = useTranslation("dashboard", { useSuspense: false });
  const resolveText = (key: string, fallback: string): string =>
    ready ? t(key, { defaultValue: fallback }) : fallback;
  const getCountdownLabel = (targetKind: ClanWarsHeader["targetKind"]) =>
    targetKind === "start"
      ? resolveText("ktCountdownToStart", "До старта следующего окна")
      : resolveText("ktCountdownToReset", "До сброса текущего окна");
  const rewardsLabel = header.hasPersonalRewards
    ? resolveText("ktRewardsWithPersonal", "С личными наградами")
    : resolveText("ktRewardsWithoutPersonal", "Без личных наград");

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">
        {resolveText("ktArchiveTitle", "Клановый турнир: архив")}
      </h2>
      <p>
        {getCountdownLabel(header.targetKind)}:{" "}
        <CountdownTimer
          targetIso={header.targetAt}
          endedLabel={resolveText("ktWindowEnded", "Окно завершено, ожидаем обновление")}
        />
      </p>
      <p>
        {resolveText("ktRewardsLabel", "Награды")}: {rewardsLabel}
      </p>
      <p>
        {resolveText("ktWindowPeriodLabel", "Период окна")}:{" "}
        <LocalizedDateTime iso={header.eventStartAt} /> -{" "}
        <LocalizedDateTime iso={header.eventEndsAt} />
      </p>
    </section>
  );
}
