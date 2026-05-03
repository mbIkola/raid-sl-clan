"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { AtmosphericLink } from "../components/site/atmospheric-link";
import { BrandMark } from "../components/site/brand-mark";
import { PageBackdrop } from "../components/site/page-backdrop";
import { landingPageCopy, landingPanelLinks, siteArtwork } from "../lib/site/content";

export default function HomePage() {
  const { t, ready } = useTranslation(["landing", "menu", "common"], {
    useSuspense: false
  });
  const resolveText = (key: string, fallback: string): string =>
    ready ? t(key, { defaultValue: fallback }) : fallback;

  return (
    <PageBackdrop imagePath={siteArtwork.landing.default}>
      <section className="landing-layout">
        <div className="landing-copy">
          <div className="landing-copy__body">
            <BrandMark label={landingPageCopy.brandLabel} />
            <h1 className="display-face">
              {resolveText(landingPageCopy.titleKey, landingPageCopy.title)}
            </h1>
            <p>
              {resolveText(landingPageCopy.bodyKey, landingPageCopy.body)}
            </p>
          </div>
        </div>

        <aside className="panel-card landing-panel">
          <BrandMark label={landingPageCopy.brandLabel} />
          <div className="landing-panel__stack">
            <h2 className="display-face">
              {resolveText(landingPageCopy.panelTitleKey, landingPageCopy.panelTitle)}
            </h2>
            <p>
              {resolveText(landingPageCopy.panelBodyKey, landingPageCopy.panelBody)}
            </p>
          </div>
          <nav
            className="landing-panel__stack"
            aria-label={resolveText(
              landingPageCopy.navigationAriaLabelKey,
              landingPageCopy.navigationAriaLabel
            )}
          >
            {landingPanelLinks.map((link) => (
              <AtmosphericLink key={link.href} href={link.href}>
                {resolveText(link.labelKey, link.label)}
              </AtmosphericLink>
            ))}
            <span className="atmos-link atmos-link--muted">
              {resolveText(
                landingPageCopy.memberLoginLaterKey,
                landingPageCopy.memberLoginLater
              )}
            </span>
          </nav>
        </aside>
      </section>
    </PageBackdrop>
  );
}
