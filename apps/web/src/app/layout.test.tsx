import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { initI18n } from "../lib/i18n/i18n";

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
    expect(metadata.icons).toMatchObject({
      icon: [
        { url: "/meta/favicon.ico" },
        { url: "/meta/icon.png", type: "image/png" }
      ],
      apple: [{ url: "/meta/apple-icon.png", type: "image/png" }]
    });
    expect(metadata.openGraph).toMatchObject({
      title: "Raid SL Clan",
      images: [{ url: "/meta/opengraph-image.jpg", alt: "Raid SL Clan" }]
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: ["/meta/twitter-image.jpg"]
    });
  });

  it("renders the body wrapper for the page shell", async () => {
    await initI18n("ru");
    const html = renderToStaticMarkup(
      <RootLayout>
        <div>child-content</div>
      </RootLayout>
    );

    expect(html).toContain("child-content");
    expect(html).toContain('class="font-display site-root"');
  });
});
