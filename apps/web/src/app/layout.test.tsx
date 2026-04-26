import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/local", () => ({
  default: () => ({
    variable: "font-display"
  })
}));

vi.mock("../lib/site/public-site-url", () => ({
  resolvePublicSiteUrl: () => "https://layout.test"
}));

import RootLayout, { metadata } from "./layout";

describe("RootLayout", () => {
  it("publishes the public-site metadata contract", () => {
    expect(metadata.title).toEqual({
      default: "Raid SL Clan",
      template: "%s | Raid SL Clan"
    });
    expect(metadata.description).toContain("public home");
    expect(metadata.metadataBase?.toString()).toBe("https://layout.test/");
    expect(metadata.manifest).toBe("/manifest.webmanifest");
    expect(metadata.openGraph).toMatchObject({
      title: "Raid SL Clan",
      images: [{ url: "/opengraph-image.png", alt: "Raid SL Clan" }]
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: ["/twitter-image.png"]
    });
  });

  it("renders the body wrapper for the page shell", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <div>child-content</div>
      </RootLayout>
    );

    expect(html).toContain("child-content");
    expect(html).toContain('class="font-display site-root"');
  });
});
