import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../components/site/locale-provider";
import { initI18n } from "../../lib/i18n/i18n";

vi.mock("../../server/dashboard/get-clan-dashboard-snapshot", () => ({
  getClanDashboardSnapshot: vi.fn(async () => ({
    generatedAt: "2026-05-03T10:00:00.000Z",
    readiness: [
      {
        activity: "hydra",
        title: "Hydra",
        targetAt: "2026-05-03T12:00:00.000Z",
        targetKind: "reset",
        metricKind: "keys_and_damage",
        keysSpent: 90,
        totalScore: 1000000,
        hasPersonalRewards: null,
        href: "/dashboard/hydra"
      },
      {
        activity: "chimera",
        title: "Chimera",
        targetAt: "2026-05-03T12:00:00.000Z",
        targetKind: "reset",
        metricKind: "keys_and_damage",
        keysSpent: 60,
        totalScore: 700000,
        hasPersonalRewards: null,
        href: "/dashboard/chimera"
      },
      {
        activity: "clan_wars",
        title: "KT",
        targetAt: "2026-05-04T12:00:00.000Z",
        targetKind: "start",
        metricKind: "clan_wars_state",
        clanWarsState: "upcoming",
        hasPersonalRewards: true,
        href: "/dashboard/clan-wars"
      },
      {
        activity: "siege",
        title: "Siege",
        targetAt: "2026-05-04T12:00:00.000Z",
        targetKind: "start",
        metricKind: "siege_preparation",
        hasPersonalRewards: null,
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
  it("renders translated dashboard zones and language-switcher labels", async () => {
    await initI18n("uk");
    const html = renderToStaticMarkup(
      <LocaleProvider>{await DashboardPage()}</LocaleProvider>
    );
    const linkMatches = Array.from(
      html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g),
      ([, href, label]) => ({ href, label })
    );

    expect(html).toContain("Зона бойової готовності");
    expect(html).toContain("Зона злиття");
    expect(html).toContain("Зона топ виконавців");
    expect(html).toContain("Зона трендів");
    expect(html).toContain("Hydra");
    expect(html).toContain('aria-pressed="true">Hydra</button>');
    expect(linkMatches).toContainEqual({ href: "/", label: "Головна" });
    expect(linkMatches).toContainEqual({ href: "/about", label: "Про проєкт" });
    expect(linkMatches).toContainEqual({ href: "/dashboard", label: "Дашборд" });
    expect(linkMatches).toContainEqual({ href: "/dashboard/clan-wars", label: "KT" });
    expect(html).toContain('aria-label="Мова інтерфейсу"');
    expect(html).toContain('<option value="uk">Українська</option>');
  });
});
