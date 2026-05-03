"use client";

import React, { useRef, useState } from "react";
import type { DashboardActivity, DashboardTopBottom } from "@raid/ports";
import { useTranslation } from "react-i18next";
import { LocalizedNumber } from "./localized-number";

const activities: DashboardActivity[] = [
  "hydra",
  "chimera",
  "clan_wars",
  "siege_def"
];

const activityLabels: Record<DashboardActivity, string> = {
  hydra: "Hydra",
  chimera: "Chimera",
  clan_wars: "KT",
  siege_def: "Siege(def)"
};

type DashboardPerformersZoneProps = {
  rankings: Record<DashboardActivity, DashboardTopBottom>;
};

const shiftActivity = (current: DashboardActivity, delta: -1 | 1): DashboardActivity => {
  const currentIndex = activities.indexOf(current);
  const nextIndex =
    (currentIndex + delta + activities.length) % activities.length;

  return activities[nextIndex];
};

const swipeThresholdPx = 40;

export function DashboardPerformersZone({ rankings }: DashboardPerformersZoneProps) {
  const { t, ready } = useTranslation("dashboard", { useSuspense: false });
  const [topActivity, setTopActivity] = useState<DashboardActivity>("hydra");
  const [bottomActivity, setBottomActivity] = useState<DashboardActivity>("hydra");
  const topTouchStartX = useRef<number | null>(null);
  const bottomTouchStartX = useRef<number | null>(null);
  const resolveText = (key: string, fallback: string): string =>
    ready ? t(key, { defaultValue: fallback }) : fallback;

  const localizedActivityLabels: Record<DashboardActivity, string> = {
    hydra: resolveText("performersActivityHydra", activityLabels.hydra),
    chimera: resolveText("performersActivityChimera", activityLabels.chimera),
    clan_wars: resolveText("performersActivityClanWars", activityLabels.clan_wars),
    siege_def: resolveText("performersActivitySiegeDef", activityLabels.siege_def)
  };

  const handleSwipe = (
    startX: number | null,
    endX: number,
    current: DashboardActivity,
    setCurrent: (next: DashboardActivity) => void
  ) => {
    if (startX === null) {
      return;
    }

    const delta = endX - startX;
    if (Math.abs(delta) < swipeThresholdPx) {
      return;
    }

    setCurrent(shiftActivity(current, delta < 0 ? 1 : -1));
  };

  const showKtNote = topActivity === "clan_wars" || bottomActivity === "clan_wars";

  return (
    <section className="panel-card panel-card--padded dashboard-stack dashboard-performers-zone">
      <h2 className="display-face">
        {resolveText("performersTitle", "Зона топ перформеров")}
      </h2>

      <div className="dashboard-performers-columns">
        <article className="dashboard-performers-block">
          <h3>{resolveText("performersTop5", "Top 5 Performers")}</h3>
          <div
            className="dashboard-activity-chips"
            role="tablist"
            aria-label={resolveText(
              "performersTopActivitySelector",
              "Top performers activity selector"
            )}
          >
            {activities.map((activity) => (
              <button
                key={`top-${activity}`}
                type="button"
                className="dashboard-chip"
                aria-pressed={topActivity === activity}
                onClick={() => setTopActivity(activity)}
              >
                {localizedActivityLabels[activity]}
              </button>
            ))}
          </div>

          <div
            className="dashboard-swipe-surface"
            onTouchStart={(event) => {
              topTouchStartX.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              handleSwipe(
                topTouchStartX.current,
                event.changedTouches[0]?.clientX ?? 0,
                topActivity,
                setTopActivity
              );
              topTouchStartX.current = null;
            }}
          >
            <ol className="dashboard-ranking-list">
              {rankings[topActivity].top5.map((row) => (
                <li key={`top-${topActivity}-${row.playerName}`}>
                  <span>{row.playerName}</span>
                  <strong>
                    <LocalizedNumber
                      value={row.score}
                      notation="compact"
                      compactDisplay="short"
                      maximumFractionDigits={1}
                    />
                  </strong>
                </li>
              ))}
            </ol>
          </div>
        </article>

        <article className="dashboard-performers-block">
          <h3>{resolveText("performersBottom5", "Bottom 5")}</h3>
          <div
            className="dashboard-activity-chips"
            role="tablist"
            aria-label={resolveText(
              "performersBottomActivitySelector",
              "Bottom performers activity selector"
            )}
          >
            {activities.map((activity) => (
              <button
                key={`bottom-${activity}`}
                type="button"
                className="dashboard-chip"
                aria-pressed={bottomActivity === activity}
                onClick={() => setBottomActivity(activity)}
              >
                {localizedActivityLabels[activity]}
              </button>
            ))}
          </div>

          <div
            className="dashboard-swipe-surface"
            onTouchStart={(event) => {
              bottomTouchStartX.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              handleSwipe(
                bottomTouchStartX.current,
                event.changedTouches[0]?.clientX ?? 0,
                bottomActivity,
                setBottomActivity
              );
              bottomTouchStartX.current = null;
            }}
          >
            <ol className="dashboard-ranking-list">
              {rankings[bottomActivity].bottom5.map((row) => (
                <li key={`bottom-${bottomActivity}-${row.playerName}`}>
                  <span>{row.playerName}</span>
                  <strong>
                    <LocalizedNumber
                      value={row.score}
                      notation="compact"
                      compactDisplay="short"
                      maximumFractionDigits={1}
                    />
                  </strong>
                </li>
              ))}
            </ol>
          </div>
        </article>
      </div>

      {showKtNote ? (
        <p className="dashboard-note">
          {resolveText(
            "performersKtNote",
            "* KT ranking is calculated as SUM(points) over the latest 4 KT reports with personal rewards."
          )}
        </p>
      ) : null}
    </section>
  );
}
