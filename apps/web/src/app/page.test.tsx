import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders the public site shell content", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain("Raid SL Clan");
    expect(html).toContain("Telegram");
  });
});
