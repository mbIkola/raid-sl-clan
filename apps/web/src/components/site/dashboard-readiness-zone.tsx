"use client";

import React from "react";
import Link from "next/link";
import type { DashboardReadinessCard } from "@raid/ports";
import { useTranslation } from "react-i18next";
import { CountdownTimer } from "./countdown-timer";
import { LocalizedNumber } from "./localized-number";

type DashboardReadinessZoneProps = {
  cards: DashboardReadinessCard[];
};

export function DashboardReadinessZone({ cards }: DashboardReadinessZoneProps) {
  const { t, ready } = useTranslation(["dashboard", "units"], {
    useSuspense: false
  });
  const resolveText = (key: string, fallback: string): string =>
    ready ? t(key, { defaultValue: fallback }) : fallback;

  const endedLabel = resolveText(
    "dashboard:readinessEnded",
    "Окно завершено, идет подсчет результатов"
  );

  const getPrimaryValue = (card: DashboardReadinessCard): React.ReactNode => {
    if (card.metricKind === "clan_wars_state") {
      return card.clanWarsState === "active"
        ? resolveText("dashboard:readinessClanWarsActive", "Идет клановый турнир")
        : resolveText(
            "dashboard:readinessClanWarsUpcoming",
            "Подготовка к следующему окну"
          );
    }

    if (card.metricKind === "siege_preparation") {
      return resolveText("dashboard:readinessSiegePreparation", "Подготовка к старту");
    }

    return (
      <>
        {resolveText("units:keys", "Ключи")}: <LocalizedNumber value={card.keysSpent} /> •{" "}
        {resolveText("units:damage", "Урон")}:{" "}
        <LocalizedNumber
          value={card.totalScore}
          notation="compact"
          compactDisplay="short"
          maximumFractionDigits={1}
        />
      </>
    );
  };

  const getStatusLabel = (card: DashboardReadinessCard): string => {
    if (card.metricKind === "clan_wars_state") {
      return card.hasPersonalRewards
        ? resolveText("dashboard:readinessStatusWithRewards", "с личными наградами")
        : resolveText("dashboard:readinessStatusWithoutRewards", "без личных наград");
    }

    if (card.metricKind === "siege_preparation") {
      return resolveText("dashboard:readinessStatusNextWindow", "Следующее окно");
    }

    return resolveText("dashboard:readinessStatusWindowReset", "Сброс окна");
  };

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">
        {resolveText("dashboard:readinessTitle", "Зона боеготовности")}
      </h2>
      <div className="dashboard-readiness-grid">
        {cards.map((card) => (
          <Link key={card.activity} href={card.href} className="dashboard-readiness-card">
            <h3 className="display-face">{card.title}</h3>
            <p>{getPrimaryValue(card)}</p>
            <p>{getStatusLabel(card)}</p>
            <p>
              <CountdownTimer targetIso={card.targetAt} endedLabel={endedLabel} />
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
