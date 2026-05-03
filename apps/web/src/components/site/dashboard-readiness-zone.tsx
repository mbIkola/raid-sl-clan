import React from "react";
import Link from "next/link";
import type { DashboardReadinessCard } from "@raid/ports";
import { CountdownTimer } from "./countdown-timer";
import { LocalizedNumber } from "./localized-number";

type DashboardReadinessZoneProps = {
  cards: DashboardReadinessCard[];
};

const endedLabel = "Закончено, идет подсчет результатов";

const hasNumericReadinessValue = (
  card: DashboardReadinessCard
): card is DashboardReadinessCard & { keysSpent: number; totalScore: number } =>
  typeof card.keysSpent === "number" && typeof card.totalScore === "number";

export function DashboardReadinessZone({ cards }: DashboardReadinessZoneProps) {
  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">Зона боеготовности</h2>
      <div className="dashboard-readiness-grid">
        {cards.map((card) => (
          <Link key={card.activity} href={card.href} className="dashboard-readiness-card">
            <h3 className="display-face">{card.title}</h3>
            {hasNumericReadinessValue(card) ? (
              <p>
                Ключи: <LocalizedNumber value={card.keysSpent} /> • Урон:{" "}
                <LocalizedNumber
                  value={card.totalScore}
                  notation="compact"
                  compactDisplay="short"
                  maximumFractionDigits={1}
                />
              </p>
            ) : (
              <p>{card.primaryValue}</p>
            )}
            <p>{card.statusLabel}</p>
            <p>
              <CountdownTimer targetIso={card.targetAt} endedLabel={endedLabel} />
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
