import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nextProvider } from "react-i18next";
import { i18n, initI18n } from "../lib/i18n/i18n";
import NotFoundPage from "./not-found";

describe("NotFoundPage", () => {
  it("renders the translated atmospheric 404 route", async () => {
    await initI18n("uk");
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <NotFoundPage />
      </I18nextProvider>
    );

    expect(html).toContain("404");
    expect(html).toContain("Стежка закінчується тут.");
    expect(html).toContain("Назад на головну");
    expect(html).not.toContain("Back Home");
    expect(html).toContain('href="/"');
    expect(html).toContain('class="panel-card panel-card--padded editorial-stack"');
  });
});
