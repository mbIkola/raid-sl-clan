import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../server/dashboard/get-clan-dashboard-snapshot", () => ({
  getClanDashboardSnapshot: vi.fn(async () => ({
    generatedAt: "2026-05-03T10:00:00.000Z",
    readiness: [
      {
        activity: "hydra",
        title: "Hydra",
        targetAt: "2026-05-03T12:00:00.000Z",
        targetKind: "reset",
        statusLabel: "Сброс окна",
        primaryValue: "Ключи: 90 • Урон: 1,000,000",
        href: "/dashboard/hydra"
      },
      {
        activity: "chimera",
        title: "Chimera",
        targetAt: "2026-05-03T12:00:00.000Z",
        targetKind: "reset",
        statusLabel: "Сброс окна",
        primaryValue: "Ключи: 60 • Урон: 700,000",
        href: "/dashboard/chimera"
      },
      {
        activity: "clan_wars",
        title: "KT",
        targetAt: "2026-05-04T12:00:00.000Z",
        targetKind: "start",
        statusLabel: "с личными наградами",
        primaryValue: "Подготовка к следующему окну",
        href: "/dashboard/clan-wars"
      },
      {
        activity: "siege",
        title: "Siege",
        targetAt: "2026-05-04T12:00:00.000Z",
        targetKind: "start",
        statusLabel: "Следующее окно",
        primaryValue: "Подготовка к старту",
        href: "/dashboard/siege"
      }
    ],
    fusion: {
      status: "idle",
      title: null,
      startsAt: null,
      endsAt: null,
      heroPortraitImageUrl: null,
      calendarImageUrl: null,
      note: "Слияния сейчас нет"
    },
    rankings: {
      hydra: {
        top5: [{ playerName: "Alpha", score: 100 }],
        bottom5: [{ playerName: "Omega", score: 0 }]
      },
      chimera: {
        top5: [{ playerName: "Alpha", score: 100 }],
        bottom5: [{ playerName: "Omega", score: 0 }]
      },
      clan_wars: {
        top5: [{ playerName: "Alpha", score: 100 }],
        bottom5: [{ playerName: "Omega", score: 0 }]
      },
      siege_def: {
        top5: [{ playerName: "Alpha", score: 10 }],
        bottom5: [{ playerName: "Omega", score: 0 }]
      }
    },
    trends: {
      hydra: [{ endsAt: "2026-05-01T00:00:00.000Z", totalScore: 1000 }],
      chimera: [{ endsAt: "2026-05-01T00:00:00.000Z", totalScore: 600 }]
    }
  }))
}));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renders four dashboard zones and hydra as default activity", async () => {
    const html = renderToStaticMarkup(await DashboardPage());

    expect(html).toContain("Зона боеготовности");
    expect(html).toContain("Зона слияния");
    expect(html).toContain("Зона топ перформеров");
    expect(html).toContain("Зона тренды");
    expect(html).toContain("Hydra");
    expect(html).toContain('aria-pressed="true">Hydra</button>');
    expect(html).toContain("Слияния сейчас нет");
  });
});
