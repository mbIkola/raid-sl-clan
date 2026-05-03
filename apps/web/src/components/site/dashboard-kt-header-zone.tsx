import React from "react";
import type { ClanWarsHeader } from "@raid/ports";
import { CountdownTimer } from "./countdown-timer";
import { LocalizedDateTime } from "./localized-date-time";

type DashboardKtHeaderZoneProps = {
  header: ClanWarsHeader;
};

const getCountdownLabel = (targetKind: ClanWarsHeader["targetKind"]) =>
  targetKind === "start" ? "До старта следующего окна" : "До сброса текущего окна";

export function DashboardKtHeaderZone({ header }: DashboardKtHeaderZoneProps) {
  const rewardsLabel = header.hasPersonalRewards
    ? "С личными наградами"
    : "Без личных наград";

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">Клановый турнир: архив</h2>
      <p>
        {getCountdownLabel(header.targetKind)}:{" "}
        <CountdownTimer
          targetIso={header.targetAt}
          endedLabel="Окно завершено, ожидаем обновление"
        />
      </p>
      <p>Награды: {rewardsLabel}</p>
      <p>
        Период окна: <LocalizedDateTime iso={header.eventStartAt} /> -{" "}
        <LocalizedDateTime iso={header.eventEndsAt} />
      </p>
    </section>
  );
}
