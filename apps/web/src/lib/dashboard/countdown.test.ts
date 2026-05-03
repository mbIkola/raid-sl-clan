import { describe, expect, it } from "vitest";
import { formatCountdown, getNextTickMs } from "./countdown";

describe("countdown", () => {
  it("formats in days and hours when remaining time is at least one hour", () => {
    expect(formatCountdown(1000 * 60 * 60 * 50)).toBe("2d 2h");
  });

  it("formats in minutes and seconds under one hour", () => {
    expect(formatCountdown(1000 * 60 * 12 + 5000)).toBe("12m 5s");
  });

  it("returns adaptive tick cadence", () => {
    expect(getNextTickMs(1000 * 60 * 61)).toBe(60_000);
    expect(getNextTickMs(1000 * 59)).toBe(1_000);
  });
});
