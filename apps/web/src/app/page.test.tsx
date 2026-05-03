import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nextProvider } from "react-i18next";
import { i18n, initI18n } from "../lib/i18n/i18n";
import HomePage from "./page";

describe("HomePage", () => {
  it("resolves translated landing copy and navigation labels in a non-default locale", async () => {
    await initI18n("uk");
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <HomePage />
      </I18nextProvider>
    );
    const linkMatches = Array.from(
      html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g),
      ([, href, label]) => ({ href, label })
    );

    expect(html).toContain("Темний вхід для клану.");
    expect(html).toContain("Вхід для учасників відкриється пізніше");
    expect(html).not.toContain("Member login opens later");
    expect(linkMatches).toContainEqual({
      href: "/dashboard",
      label: "Дашборд"
    });
    expect(linkMatches).toContainEqual({
      href: "/about",
      label: "Про проєкт"
    });
  });
});
