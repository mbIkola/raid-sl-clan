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
  const { t } = useTranslation(["dashboard", "units"], { useSuspense: false });
  const endedLabel = t("dashboard:readinessEnded");

  const getPrimaryValue = (card: DashboardReadinessCard): React.ReactNode => {
    if (card.metricKind === "clan_wars_state") {
      return card.clanWarsState === "active"
        ? t("dashboard:readinessClanWarsActive")
        : t("dashboard:readinessClanWarsUpcoming");
    }

    if (card.metricKind === "siege_preparation") {
      return t("dashboard:readinessSiegePreparation");
    }

    return (
      <>
        {t("units:keys")}: <LocalizedNumber value={card.keysSpent} /> • {t("units:damage")}:{" "}
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
        ? t("dashboard:readinessStatusWithRewards")
        : t("dashboard:readinessStatusWithoutRewards");
    }

    if (card.metricKind === "siege_preparation") {
      return t("dashboard:readinessStatusNextWindow");
    }

    return t("dashboard:readinessStatusWindowReset");
  };

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">{t("dashboard:readinessTitle")}</h2>
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
