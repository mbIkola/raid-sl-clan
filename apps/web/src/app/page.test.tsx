import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders the public site shell content", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain("Raid SL Clan");
    expect(html).toContain("Telegram");
  });

  it("keeps compatibility styles for the current homepage shell", () => {
    const css = readFileSync(
      resolve(process.cwd(), "apps/web/src/app/globals.css"),
      "utf8"
    );

    expect(css).toContain(".site-shell");
    expect(css).toContain(".hero-panel");
    expect(css).toContain(".info-panel");
    expect(css).toContain(".status-grid");
    expect(css).toContain(".webhook-hint");
  });
});
