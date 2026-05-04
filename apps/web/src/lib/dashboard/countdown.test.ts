import { describe, expect, it } from "vitest";
import { formatCountdown, getNextTickMs } from "./countdown";

describe("formatCountdown", () => {
  it("formats long countdown with localized day/hour units", () => {
    const text = formatCountdown(2 * 86_400_000 + 3 * 3_600_000, {
      dayShort: "д",
      hourShort: "ч",
      minuteShort: "м",
      secondShort: "с"
    });

    expect(text).toBe("2д 3ч");
  });

  it("formats sub-day countdown with localized hour/minute units", () => {
    const text = formatCountdown(10 * 3_600_000 + 55 * 60_000 + 15_000, {
      dayShort: "d",
      hourShort: "h",
      minuteShort: "m",
      secondShort: "s"
    });

    expect(text).toBe("10h 55m");
  });

  it("keeps minute precision for under-one-hour countdowns", () => {
    const text = formatCountdown(2 * 60_000 + 15_000, {
      dayShort: "d",
      hourShort: "h",
      minuteShort: "m",
      secondShort: "s"
    });

    expect(text).toBe("0h 2m");
  });
});

describe("getNextTickMs", () => {
  it("returns adaptive tick cadence", () => {
    expect(getNextTickMs(1000 * 60 * 61)).toBe(60_000);
    expect(getNextTickMs(1000 * 60 * 30)).toBe(60_000);
    expect(getNextTickMs(1000 * 59)).toBe(1_000);
  });
});
