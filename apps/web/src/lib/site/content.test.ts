import { describe, expect, it } from "vitest";
import {
  aboutPageCopy,
  aboutPageSections,
  dashboardSections,
  landingPageCopy,
  landingPanelLinks,
  notFoundPageCopy,
  siteArtwork,
  siteMetadataCopy
} from "./content";

describe("site content", () => {
  it("exposes the public landing links in the agreed order", () => {
    expect(landingPanelLinks).toEqual([
      { href: "/dashboard", label: "Dashboard", labelKey: "menu:dashboard" },
      { href: "/about", label: "About", labelKey: "menu:about" }
    ]);
  });

  it("pins one intentional default background per atmospheric page", () => {
    expect(siteArtwork.landing.default).toBe("/images/landing/poster0-opt.jpg");
    expect(siteArtwork.notFound.default).toBe("/images/not-found/bg0-opt.jpg");
  });

  it("provides four first-pass public dashboard sections", () => {
    expect(dashboardSections.map((section) => section.title)).toEqual([
      "Clan Overview",
      "Key Stats",
      "Recent Activity",
      "Announcements / Updates"
    ]);
  });

  it("defines the expected public about page sections", () => {
    expect(aboutPageSections.map((section) => section.heading)).toEqual([
      "What This Place Is",
      "What Comes Later",
      "Project Status"
    ]);
  });

  it("uses namespace-qualified i18n keys for content-driven strings", () => {
    const keys = [
      ...landingPanelLinks.map((link) => link.labelKey),
      landingPageCopy.titleKey,
      landingPageCopy.bodyKey,
      landingPageCopy.panelTitleKey,
      landingPageCopy.panelBodyKey,
      landingPageCopy.memberLoginLaterKey,
      landingPageCopy.navigationAriaLabelKey,
      ...aboutPageSections.flatMap((section) => [section.headingKey, section.bodyKey]),
      aboutPageCopy.titleKey,
      aboutPageCopy.introKey,
      aboutPageCopy.backToLandingKey,
      aboutPageCopy.openDashboardKey,
      aboutPageCopy.openGitHubKey,
      notFoundPageCopy.messageKey,
      notFoundPageCopy.backHomeKey
    ];

    for (const key of keys) {
      expect(key).toContain(":");
      expect(key).not.toMatch(/^[a-z]+\./);
    }
  });

  it("keeps the root metadata copy aligned with the approved public framing", () => {
    expect(siteMetadataCopy.title).toBe("Raid SL Clan");
    expect(siteMetadataCopy.description).toContain("public home");
  });
});
