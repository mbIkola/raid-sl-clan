import { describe, expect, it } from "vitest";
import { coreVersion } from "@raid/core";

describe("core skeleton", () => {
  it("exposes the skeleton version marker", () => {
    expect(coreVersion).toBe("skeleton");
  });
});
