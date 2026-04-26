import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { dashboardSections } from "../../lib/site/content";
import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renders the dashboard nav structure and public card contract", () => {
    const html = renderToStaticMarkup(<DashboardPage />);
    const cardMatches = Array.from(
      html.matchAll(
        /<section class="panel-card panel-card--padded dashboard-stack"><h2 class="display-face">([^<]+)<\/h2><div><p>([^<]+)<\/p><\/div><\/section>/g
      ),
      ([, title, body]) => ({ title, body })
    );
    const dashboardNavMatch = html.match(
      /<details class="dashboard-nav"><summary>Menu<\/summary><nav class="dashboard-nav__links" aria-label="Dashboard"><a href="([^"]+)">([^<]+)<\/a><a href="([^"]+)">([^<]+)<\/a><\/nav><\/details>/
    );

    expect(html).toContain("Dashboard");
    expect(html).toContain(
      '<header class="panel-card panel-card--padded dashboard-header">'
    );
    expect(dashboardNavMatch).not.toBeNull();
    expect(dashboardNavMatch?.slice(1)).toEqual([
      "/",
      "Landing",
      "/about",
      "About"
    ]);
    expect(cardMatches).toHaveLength(4);
    expect(cardMatches).toEqual(dashboardSections);
  });
});
