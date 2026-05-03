import { describe, expect, it, vi } from "vitest";
import { createGetClanWarsArchiveSnapshot } from "@raid/application";
import type { ClanWarsArchiveRepository } from "@raid/ports";

describe("createGetClanWarsArchiveSnapshot", () => {
  it("calls repository and returns generated archive snapshot", async () => {
    const repository: ClanWarsArchiveRepository = {
      getClanWarsArchive: vi.fn(async () => ({
        header: {
          targetAt: "2026-05-06T07:00:00.000Z",
          targetKind: "start",
          eventStartAt: "2026-05-05T07:00:00.000Z",
          eventEndsAt: "2026-05-06T07:00:00.000Z",
          hasPersonalRewards: true
        },
        history: [
          {
            windowStart: "2026-04-28T07:00:00.000Z",
            windowEnd: "2026-04-29T07:00:00.000Z",
            hasPersonalRewards: false,
            clanTotalPoints: 123_456,
            activeContributors: 27,
            topPlayerName: "Morrigan",
            topPlayerPoints: 12_345
          }
        ],
        stability: [
          {
            playerName: "Flemeth",
            windowsPlayed: 8,
            avgPoints: 9_000,
            bestPoints: 13_500,
            lastWindowPoints: 8_400,
            consistencyScore: 0.81
          }
        ],
        decline: [
          {
            playerName: "Alistair",
            recentAvg: 1_200,
            baselineAvg: 2_100,
            delta: -900
          }
        ]
      }))
    };

    const getSnapshot = createGetClanWarsArchiveSnapshot({
      repository,
      now: () => new Date("2026-05-03T12:00:00.000Z"),
      windowLimit: 9
    });

    const snapshot = await getSnapshot();

    expect(repository.getClanWarsArchive).toHaveBeenCalledWith({
      nowIso: "2026-05-03T12:00:00.000Z",
      windowLimit: 9
    });
    expect(snapshot.generatedAt).toBe("2026-05-03T12:00:00.000Z");
    expect(snapshot.header.targetKind).toBe("start");
    expect(snapshot.history).toHaveLength(1);
    expect(snapshot.stability[0]?.playerName).toBe("Flemeth");
    expect(snapshot.decline[0]?.delta).toBe(-900);
  });
});
