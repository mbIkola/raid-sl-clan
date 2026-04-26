import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders the public landing panel with the agreed navigation", () => {
    const html = renderToStaticMarkup(<HomePage />);
    const linkMatches = Array.from(
      html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g),
      ([, href, label]) => ({ href, label })
    );

    expect(html).toContain("[VIБР] - Raid SL Clan");
    expect(html).toContain("Member login opens later");
    expect(linkMatches).toContainEqual({
      href: "/dashboard",
      label: "Dashboard"
    });
    expect(linkMatches).toContainEqual({
      href: "/about",
      label: "About"
    });
  });
});
