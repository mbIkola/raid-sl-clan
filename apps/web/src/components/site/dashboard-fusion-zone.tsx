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
  const { t } = useTranslation(["dashboard"], { useSuspense: false });

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">{t("dashboard:fusionTitle")}</h2>

      {fusion.status === "active" ? (
        <div className="dashboard-fusion-active">
          <h3 className="display-face">
            {fusion.title ?? t("dashboard:fusionDefaultTitle")}
          </h3>
          <p>
            {t("dashboard:fusionPeriodLabel")}:{" "}
            <LocalizedDateTime iso={fusion.startsAt} /> -{" "}
            <LocalizedDateTime iso={fusion.endsAt} />
          </p>
          <p>
            <CountdownTimer
              targetIso={fusion.endsAt}
              endedLabel={t("dashboard:fusionEnded")}
            />
          </p>

          {fusion.heroPortraitImageUrl ? (
            <img
              src={fusion.heroPortraitImageUrl}
              alt={
                fusion.title ?? t("dashboard:fusionHeroAlt")
              }
              className="dashboard-fusion-portrait"
            />
          ) : null}

          {fusion.calendarImageUrl ? (
            <a href={fusion.calendarImageUrl} target="_blank" rel="noreferrer" className="atmos-link">
              {t("dashboard:fusionOpenCalendar")}
            </a>
          ) : null}

          {fusion.note ? <p>{fusion.note}</p> : null}
        </div>
      ) : (
        <p>{fusion.note ?? t("dashboard:emptyFusion")}</p>
      )}
    </section>
  );
}
