import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AboutPage from "./page";

describe("AboutPage", () => {
  it("renders the always-public editorial route", () => {
    const html = renderToStaticMarkup(<AboutPage />);

    expect(html).toContain("What This Place Is");
    expect(html).toContain("Raid SL Clan");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/dashboard"');
  });
});
