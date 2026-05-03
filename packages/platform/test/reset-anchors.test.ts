import { describe, expect, it } from "vitest";
import {
  getClanWarsAnchorStateUtc,
  getNextChimeraResetAnchorUtc,
  getNextHydraResetAnchorUtc,
  getNextWeeklyUtcAnchor
} from "@raid/platform";

describe("dashboard reset anchors", () => {
  it("matches hydra/chimera anchors from sunday reference point", () => {
    const nowIso = "2026-05-03T11:22:00.000Z";

    expect(getNextHydraResetAnchorUtc(nowIso)).toBe("2026-05-06T08:00:00.000Z");
    expect(getNextChimeraResetAnchorUtc(nowIso)).toBe("2026-05-07T11:30:00.000Z");
  });

  it("moves to next week when now is exactly at anchor", () => {
    expect(getNextHydraResetAnchorUtc("2026-05-06T08:00:00.000Z")).toBe(
      "2026-05-13T08:00:00.000Z"
    );

    expect(getNextChimeraResetAnchorUtc("2026-05-07T11:30:00.000Z")).toBe(
      "2026-05-14T11:30:00.000Z"
    );
  });

  it("supports custom weekly UTC anchors", () => {
    expect(
      getNextWeeklyUtcAnchor("2026-05-03T11:22:00.000Z", {
        dayOfWeek: 5,
        hour: 20,
        minute: 45
      })
    ).toBe("2026-05-08T20:45:00.000Z");
  });

  it("uses Tuesday 10:00 UTC as clan wars start anchor and marks 2026-05-05 as personal rewards", () => {
    const state = getClanWarsAnchorStateUtc("2026-05-03T11:22:00.000Z");

    expect(state.targetKind).toBe("start");
    expect(state.targetAt).toBe("2026-05-05T10:00:00.000Z");
    expect(state.eventStartAt).toBe("2026-05-05T10:00:00.000Z");
    expect(state.eventEndsAt).toBe("2026-05-07T10:00:00.000Z");
    expect(state.hasPersonalRewards).toBe(true);
  });

  it("switches clan wars timer to reset while active and back to next start after 48h", () => {
    const activeState = getClanWarsAnchorStateUtc("2026-05-06T12:00:00.000Z");

    expect(activeState.targetKind).toBe("reset");
    expect(activeState.targetAt).toBe("2026-05-07T10:00:00.000Z");

    const postEventState = getClanWarsAnchorStateUtc("2026-05-07T10:00:00.000Z");
    expect(postEventState.targetKind).toBe("start");
    expect(postEventState.targetAt).toBe("2026-05-19T10:00:00.000Z");
  });
});
