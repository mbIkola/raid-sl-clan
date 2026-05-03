import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../server/dashboard/get-clan-wars-archive-snapshot", () => ({
  getClanWarsArchiveSnapshot: vi.fn(async () => ({
    generatedAt: "2026-05-03T10:00:00.000Z",
    header: {
      targetAt: "2026-05-04T12:00:00.000Z",
      targetKind: "start",
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
  }))
}));

import ClanWarsArchivePage from "./page";

describe("ClanWarsArchivePage", () => {
  it("renders KT archive zones and navigation", async () => {
    const html = renderToStaticMarkup(await ClanWarsArchivePage());

    expect(html).toContain("Клановый турнир: архив");
    expect(html).toContain("История окон КТ");
    expect(html).toContain("Стабильность состава");
    expect(html).toContain("Кто проседает");
    expect(html).toContain("Alpha");
    expect(html).toContain("Beta");
    expect(html).toContain('href="/dashboard/clan-wars"');
  });
});
