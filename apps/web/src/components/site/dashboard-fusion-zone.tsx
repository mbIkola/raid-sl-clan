import React from "react";
import type { FusionEvent } from "@raid/ports";
import { CountdownTimer } from "./countdown-timer";
import { LocalizedDateTime } from "./localized-date-time";

type DashboardFusionZoneProps = {
  fusion: FusionEvent;
};

export function DashboardFusionZone({ fusion }: DashboardFusionZoneProps) {
  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">Зона слияния</h2>

      {fusion.status === "active" ? (
        <div className="dashboard-fusion-active">
          <h3 className="display-face">{fusion.title ?? "Слияние"}</h3>
          <p>
            Период: <LocalizedDateTime iso={fusion.startsAt} /> - <LocalizedDateTime iso={fusion.endsAt} />
          </p>
          <p>
            <CountdownTimer targetIso={fusion.endsAt} endedLabel="Слияние закончено" />
          </p>

          {fusion.heroPortraitImageUrl ? (
            <img
              src={fusion.heroPortraitImageUrl}
              alt={fusion.title ?? "Fusion hero"}
              className="dashboard-fusion-portrait"
            />
          ) : null}

          {fusion.calendarImageUrl ? (
            <a href={fusion.calendarImageUrl} target="_blank" rel="noreferrer" className="atmos-link">
              Открыть календарь
            </a>
          ) : null}

          {fusion.note ? <p>{fusion.note}</p> : null}
        </div>
      ) : (
        <p>{fusion.note ?? "Слияния сейчас нет"}</p>
      )}
    </section>
  );
}
