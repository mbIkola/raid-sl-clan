import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../../components/site/locale-provider";
import { initI18n } from "../../../lib/i18n/i18n";

vi.mock("../../../server/dashboard/get-clan-wars-archive-snapshot", () => ({
  getClanWarsArchiveSnapshot: vi.fn()
}));

import { getClanWarsArchiveSnapshot } from "../../../server/dashboard/get-clan-wars-archive-snapshot";
import ClanWarsArchivePage from "./page";

const getClanWarsArchiveSnapshotMock = vi.mocked(getClanWarsArchiveSnapshot);

const createBaseSnapshot = () => ({
  generatedAt: "2026-05-03T10:00:00.000Z",
  header: {
    targetAt: "2026-05-04T12:00:00.000Z",
    targetKind: "start" as const,
    eventStartAt: "2026-05-04T12:00:00.000Z",
    eventEndsAt: "2026-05-06T12:00:00.000Z",
    hasPersonalRewards: true
  },
  history: [
    {
      windowStart: "2026-04-20T12:00:00.000Z",
      windowEnd: "2026-04-22T12:00:00.000Z",
      hasPersonalRewards: true,
      clanTotalPoints: 1_200,
      activeContributors: 28,
      topPlayerName: "Alpha",
      topPlayerPoints: 320
    }
  ],
  stability: [
    {
      playerName: "Alpha",
      windowsPlayed: 8,
      avgPoints: 240,
      bestPoints: 340,
      lastWindowPoints: 320,
      consistencyScore: 0.88
    }
  ],
  decline: [
    {
      playerName: "Beta",
      recentAvg: 90,
      baselineAvg: 150,
      delta: -60
    }
  ]
});

describe("ClanWarsArchivePage", () => {
  it("renders KT archive zones and navigation", async () => {
    await initI18n("uk");
    getClanWarsArchiveSnapshotMock.mockResolvedValue(createBaseSnapshot());
    const html = renderToStaticMarkup(
      <LocaleProvider>{await ClanWarsArchivePage()}</LocaleProvider>
    );
    const linkMatches = Array.from(
      html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g),
      ([, href, label]) => ({ href, label })
    );

    expect(html).toContain("Клановий турнір: архів");
    expect(html).toContain("Історія вікон KT");
    expect(html).toContain("Стабільність складу");
    expect(html).toContain("Хто просідає");
    expect(html).toContain("Alpha");
    expect(html).toContain("Beta");
    expect(linkMatches).toContainEqual({ href: "/about", label: "Про проєкт" });
    expect(linkMatches).toContainEqual({ href: "/dashboard/clan-wars", label: "KT" });
    expect(html).toContain('aria-label="Мова інтерфейсу"');
    expect(html).toContain('<option value="uk">Українська</option>');
  });

  it("renders empty-state labels when no archive rows are available", async () => {
    await initI18n("uk");
    getClanWarsArchiveSnapshotMock.mockResolvedValue({
      ...createBaseSnapshot(),
      history: [],
      stability: [],
      decline: []
    });

    const html = renderToStaticMarkup(
      <LocaleProvider>{await ClanWarsArchivePage()}</LocaleProvider>
    );

    expect(html).toContain("Недостатньо даних");
    expect(html).toContain("Просідань не знайдено");
  });

  it("limits stability and decline rendering to top 10 rows", async () => {
    await initI18n("uk");
    getClanWarsArchiveSnapshotMock.mockResolvedValue({
      ...createBaseSnapshot(),
      stability: Array.from({ length: 11 }, (_, index) => ({
        playerName: `Stability-${String(index + 1).padStart(2, "0")}`,
        windowsPlayed: 12 - index,
        avgPoints: 300 - index,
        bestPoints: 450 - index,
        lastWindowPoints: 280 - index,
        consistencyScore: 0.9 - index * 0.01
      })),
      decline: Array.from({ length: 11 }, (_, index) => ({
        playerName: `Decline-${String(index + 1).padStart(2, "0")}`,
        recentAvg: 100 - index,
        baselineAvg: 200 - index,
        delta: -100 - index
      }))
    });

    const html = renderToStaticMarkup(
      <LocaleProvider>{await ClanWarsArchivePage()}</LocaleProvider>
    );

    expect(html).toContain("Stability-10");
    expect(html).not.toContain("Stability-11");
    expect(html).toContain("Decline-10");
    expect(html).not.toContain("Decline-11");
  });
});
