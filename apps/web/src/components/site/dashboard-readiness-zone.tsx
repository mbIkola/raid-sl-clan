import React from "react";
import Link from "next/link";
import type { DashboardReadinessCard } from "@raid/ports";
import { CountdownTimer } from "./countdown-timer";

type DashboardReadinessZoneProps = {
  cards: DashboardReadinessCard[];
};

const endedLabel = "Закончено, идет подсчет результатов";

export function DashboardReadinessZone({ cards }: DashboardReadinessZoneProps) {
  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">Зона боеготовности</h2>
      <div className="dashboard-readiness-grid">
        {cards.map((card) => (
          <Link key={card.activity} href={card.href} className="dashboard-readiness-card">
            <h3 className="display-face">{card.title}</h3>
            <p>{card.primaryValue}</p>
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
