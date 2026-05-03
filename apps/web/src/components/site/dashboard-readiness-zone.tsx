import React from "react";
import Link from "next/link";
import type { DashboardReadinessCard } from "@raid/ports";
import { CountdownTimer } from "./countdown-timer";
import { LocalizedNumber } from "./localized-number";

type DashboardReadinessZoneProps = {
  cards: DashboardReadinessCard[];
};

const endedLabel = "Закончено, идет подсчет результатов";

const getPrimaryValue = (card: DashboardReadinessCard) => {
  if (card.metricKind === "clan_wars_state") {
    return card.clanWarsState === "active"
      ? "Идет клановый турнир"
      : "Подготовка к следующему окну";
  }

  if (card.metricKind === "siege_preparation") {
    return "Подготовка к старту";
  }

  return (
    <>
      Ключи: <LocalizedNumber value={card.keysSpent} /> • Урон:{" "}
      <LocalizedNumber
        value={card.totalScore}
        notation="compact"
        compactDisplay="short"
        maximumFractionDigits={1}
      />
    </>
  );
};

const getStatusLabel = (card: DashboardReadinessCard) => {
  if (card.metricKind === "clan_wars_state") {
    return card.hasPersonalRewards ? "с личными наградами" : "без";
  }

  if (card.metricKind === "siege_preparation") {
    return "Следующее окно";
  }

  return "Сброс окна";
};

export function DashboardReadinessZone({ cards }: DashboardReadinessZoneProps) {
  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">Зона боеготовности</h2>
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
