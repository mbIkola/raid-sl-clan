"use client";

import React, { useRef, useState } from "react";
import type { DashboardActivity, DashboardTopBottom } from "@raid/ports";

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
  const [topActivity, setTopActivity] = useState<DashboardActivity>("hydra");
  const [bottomActivity, setBottomActivity] = useState<DashboardActivity>("hydra");
  const topTouchStartX = useRef<number | null>(null);
  const bottomTouchStartX = useRef<number | null>(null);

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
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">Зона топ перформеров</h2>

      <article className="dashboard-performers-block">
        <h3>Top 5 Performers</h3>
        <div className="dashboard-activity-chips" role="tablist" aria-label="Top performers activity selector">
          {activities.map((activity) => (
            <button
              key={`top-${activity}`}
              type="button"
              className="dashboard-chip"
              aria-pressed={topActivity === activity}
              onClick={() => setTopActivity(activity)}
            >
              {activityLabels[activity]}
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
                <strong>{row.score.toLocaleString("en-US")}</strong>
              </li>
            ))}
          </ol>
        </div>
      </article>

      <article className="dashboard-performers-block">
        <h3>Bottom 5</h3>
        <div className="dashboard-activity-chips" role="tablist" aria-label="Bottom performers activity selector">
          {activities.map((activity) => (
            <button
              key={`bottom-${activity}`}
              type="button"
              className="dashboard-chip"
              aria-pressed={bottomActivity === activity}
              onClick={() => setBottomActivity(activity)}
            >
              {activityLabels[activity]}
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
                <strong>{row.score.toLocaleString("en-US")}</strong>
              </li>
            ))}
          </ol>
        </div>
      </article>

      {showKtNote ? (
        <p className="dashboard-note">
          * KT ranking is calculated as SUM(points) over the latest 4 KT reports with personal rewards.
        </p>
      ) : null}
    </section>
  );
}
