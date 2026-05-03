"use client";

import React from "react";
import type { FusionEvent } from "@raid/ports";
import { useTranslation } from "react-i18next";
import { CountdownTimer } from "./countdown-timer";
import { LocalizedDateTime } from "./localized-date-time";

type DashboardFusionZoneProps = {
  fusion: FusionEvent;
};

export function DashboardFusionZone({ fusion }: DashboardFusionZoneProps) {
  const { t, ready } = useTranslation(["dashboard"], { useSuspense: false });
  const resolveText = (key: string, fallback: string): string =>
    ready ? t(key, { defaultValue: fallback }) : fallback;

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">
        {resolveText("dashboard:fusionTitle", "Зона слияния")}
      </h2>

      {fusion.status === "active" ? (
        <div className="dashboard-fusion-active">
          <h3 className="display-face">
            {fusion.title ??
              resolveText("dashboard:fusionDefaultTitle", "Слияние")}
          </h3>
          <p>
            {resolveText("dashboard:fusionPeriodLabel", "Период")}:{" "}
            <LocalizedDateTime iso={fusion.startsAt} /> -{" "}
            <LocalizedDateTime iso={fusion.endsAt} />
          </p>
          <p>
            <CountdownTimer
              targetIso={fusion.endsAt}
              endedLabel={resolveText("dashboard:fusionEnded", "Слияние закончено")}
            />
          </p>

          {fusion.heroPortraitImageUrl ? (
            <img
              src={fusion.heroPortraitImageUrl}
              alt={
                fusion.title ??
                resolveText("dashboard:fusionHeroAlt", "Fusion hero")
              }
              className="dashboard-fusion-portrait"
            />
          ) : null}

          {fusion.calendarImageUrl ? (
            <a href={fusion.calendarImageUrl} target="_blank" rel="noreferrer" className="atmos-link">
              {resolveText("dashboard:fusionOpenCalendar", "Open calendar")}
            </a>
          ) : null}

          {fusion.note ? <p>{fusion.note}</p> : null}
        </div>
      ) : (
        <p>{fusion.note ?? resolveText("dashboard:emptyFusion", "Слияния сейчас нет")}</p>
      )}
    </section>
  );
}
