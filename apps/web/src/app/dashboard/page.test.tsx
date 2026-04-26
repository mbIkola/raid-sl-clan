import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renders the public dashboard shell with nav and four public cards", () => {
    const html = renderToStaticMarkup(<DashboardPage />);

    expect(html).toContain("Dashboard");
    expect(html).toContain("Menu");
    expect(html).toContain("Clan Overview");
    expect(html).toContain("Key Stats");
    expect(html).toContain("Recent Activity");
    expect(html).toContain("Announcements / Updates");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/about"');
  });
});
