import { describe, expect, it } from "vitest";
import {
  dashboardSections,
  landingPanelLinks,
  siteArtwork,
  siteMetadataCopy
} from "./content";

describe("site content", () => {
  it("exposes the public landing links in the agreed order", () => {
    expect(landingPanelLinks).toEqual([
      { href: "/dashboard", label: "Dashboard" },
      { href: "/about", label: "About" }
    ]);
  });

  it("pins one intentional default background per atmospheric page", () => {
    expect(siteArtwork.landing.default).toBe("/images/landing/poster0.jpeg");
    expect(siteArtwork.notFound.default).toBe("/images/not-found/bg0.jpeg");
  });

  it("provides four first-pass public dashboard sections", () => {
    expect(dashboardSections.map((section) => section.title)).toEqual([
      "Clan Overview",
      "Key Stats",
      "Recent Activity",
      "Announcements / Updates"
    ]);
  });

  it("keeps the root metadata copy aligned with the approved public framing", () => {
    expect(siteMetadataCopy.title).toBe("Raid SL Clan");
    expect(siteMetadataCopy.description).toContain("public home");
  });
});
