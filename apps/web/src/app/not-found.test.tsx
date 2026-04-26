import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NotFoundPage from "./not-found";

describe("NotFoundPage", () => {
  it("renders the custom atmospheric 404 route", () => {
    const html = renderToStaticMarkup(<NotFoundPage />);

    expect(html).toContain("404");
    expect(html).toContain("Back Home");
    expect(html).toContain('href="/"');
    expect(html).toContain('class="panel-card panel-card--padded editorial-stack"');
  });
});
