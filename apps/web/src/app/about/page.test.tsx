import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nextProvider } from "react-i18next";
import { i18n, initI18n } from "../../lib/i18n/i18n";
import { aboutPageSections } from "../../lib/site/content";
import AboutPage from "./page";

describe("AboutPage", () => {
  it("renders translated editorial content and links", async () => {
    await initI18n("uk");
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    expect(html).toContain("Що це за місце");
    expect(html).toContain("Що буде далі");
    expect(html).toContain("Стан проєкту");
    expect(html).toContain("Raid SL Clan");
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*>Назад на головну<\/a>/);
    expect(html).toMatch(/<a[^>]*href="\/dashboard"[^>]*>Відкрити дашборд<\/a>/);
    expect(html).toMatch(/<a[^>]*href="https:\/\/github\.com\/mbIkola\/raid-sl-clan"[^>]*>.*GitHub.*<\/a>/);
    expect(html).not.toContain("Back to Landing");
    expect(html.match(/class="panel-card panel-card--editorial editorial-stack"/g)).toHaveLength(
      aboutPageSections.length
    );
  });
});
