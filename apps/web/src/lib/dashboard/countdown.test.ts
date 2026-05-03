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

  it("formats short countdown with localized minute/second units", () => {
    const text = formatCountdown(2 * 60_000 + 15_000, {
      dayShort: "d",
      hourShort: "h",
      minuteShort: "m",
      secondShort: "s"
    });

    expect(text).toBe("2m 15s");
  });
});

describe("getNextTickMs", () => {
  it("returns adaptive tick cadence", () => {
    expect(getNextTickMs(1000 * 60 * 61)).toBe(60_000);
    expect(getNextTickMs(1000 * 59)).toBe(1_000);
  });
});
