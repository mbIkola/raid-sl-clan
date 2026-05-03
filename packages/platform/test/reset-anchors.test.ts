import { describe, expect, it } from "vitest";
import {
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
});
