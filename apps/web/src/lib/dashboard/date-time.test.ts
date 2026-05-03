import { describe, expect, it } from "vitest";
import { formatIsoForZone } from "./date-time";

describe("formatIsoForZone", () => {
  it("formats ISO in provided timezone", () => {
    const value = formatIsoForZone("2026-05-03T10:00:00Z", "UTC", "en-GB");

    expect(value).toContain("03");
    expect(value).toContain("May");
  });

  it("returns em dash for invalid ISO input", () => {
    expect(formatIsoForZone("bad-date", "UTC", "en-GB")).toBe("—");
  });
});
