import { describe, expect, it, vi } from "vitest";
import { createGetClanDashboardSnapshot } from "@raid/application";
import type {
  ClanDashboardRepository,
  FusionEventSource,
  SiegeDefenseSource
} from "@raid/ports";

describe("createGetClanDashboardSnapshot", () => {
  it("returns merged snapshot from D1 + fusion + siege sources", async () => {
    const repository: ClanDashboardRepository = {
      getSnapshot: vi.fn(async () => ({
        readiness: [],
        rankings: {
          hydra: { top5: [], bottom5: [] },
          chimera: { top5: [], bottom5: [] },
          clan_wars: { top5: [], bottom5: [] }
        },
        trends: {
          hydra: [],
          chimera: []
        }
      }))
    };

    const fusionSource: FusionEventSource = {
      getCurrentFusionEvent: () => ({
        status: "idle",
        title: null,
        startsAt: null,
        endsAt: null,
        heroPortraitImageUrl: null,
        calendarImageUrl: null,
        note: "Слияния сейчас нет"
      })
    };

    const siegeSource: SiegeDefenseSource = {
      getCurrentRanking: vi.fn(() => ({ top5: [], bottom5: [] }))
    };

    const getSnapshot = createGetClanDashboardSnapshot({
      repository,
      fusionSource,
      siegeSource,
      now: () => new Date("2026-05-03T12:00:00.000Z")
    });

    const snapshot = await getSnapshot();

    expect(repository.getSnapshot).toHaveBeenCalledWith({
      nowIso: "2026-05-03T12:00:00.000Z",
      trendWeeks: 8
    });
    expect(snapshot.fusion.status).toBe("idle");
    expect(snapshot.rankings.siege_def.top5).toEqual([]);
    expect(snapshot.generatedAt).toBe("2026-05-03T12:00:00.000Z");
  });
});
