import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("globals.css contract", () => {
  it("keeps the landing and editorial surface styles in sync with the markup", () => {
    const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

    expect(css).toContain(".landing-panel {\n");
    expect(css).toContain("  background: rgba(9, 12, 16, 0.8);\n");
    expect(css).toContain(".atmos-link {\n");
    expect(css).toContain("  border-radius: 1rem;\n");
    expect(css).toContain(".panel-card--editorial {\n");
    expect(css).toContain("  padding: 1rem;\n");
  });
});
