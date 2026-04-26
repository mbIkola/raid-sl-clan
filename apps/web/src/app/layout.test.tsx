import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/local", () => ({
  default: () => ({
    variable: "font-display"
  })
}));

import RootLayout, { metadata } from "./layout";

describe("RootLayout", () => {
  it("publishes the public-site metadata contract", () => {
    expect(metadata.title).toEqual({
      default: "Raid SL Clan",
      template: "%s | Raid SL Clan"
    });
    expect(metadata.description).toContain("public home");
    expect(metadata.manifest).toBe("/manifest.webmanifest");
  });

  it("renders the body wrapper for the page shell", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <div>child-content</div>
      </RootLayout>
    );

    expect(html).toContain("child-content");
    expect(html).toContain("site-root");
  });
});
