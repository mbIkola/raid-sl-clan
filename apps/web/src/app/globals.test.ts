import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("globals.css contract", () => {
  it("keeps the landing and editorial surface styles in sync with the markup", () => {
    const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

    expect(css).toMatch(
      /\.panel-card\.landing-panel\s*\{[\s\S]*?background:\s*rgba\(9, 12, 16, 0\.8\);[\s\S]*?opacity:\s*0\.8;[\s\S]*?\}/
    );
    expect(css).toMatch(
      /@media\s*\(min-width:\s*901px\)\s*\{[\s\S]*?\.landing-panel\s*\{[\s\S]*?align-content:\s*start;[\s\S]*?\}[\s\S]*?\}/
    );
    expect(css).toMatch(
      /\.atmos-link\s*\{[\s\S]*?border-radius:\s*1rem;[\s\S]*?\}/
    );
    expect(css).toMatch(
      /\.panel-card--editorial\s*\{[\s\S]*?padding:\s*1rem;[\s\S]*?\}/
    );
  });
});
