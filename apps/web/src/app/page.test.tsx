import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders the public landing panel with the agreed navigation", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain("Raid SL Clan");
    expect(html).toContain("Dashboard");
    expect(html).toContain("About");
    expect(html).toContain("Member login opens later");
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/about"');
  });
});
