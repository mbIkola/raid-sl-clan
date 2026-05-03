"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { AtmosphericLink } from "../components/site/atmospheric-link";
import { BrandMark } from "../components/site/brand-mark";
import { PageBackdrop } from "../components/site/page-backdrop";
import { landingPageCopy, landingPanelLinks, siteArtwork } from "../lib/site/content";

export default function HomePage() {
  const { t } = useTranslation(["landing", "menu", "common"], { useSuspense: false });

  return (
    <PageBackdrop imagePath={siteArtwork.landing.default}>
      <section className="landing-layout">
        <div className="landing-copy">
          <div className="landing-copy__body">
            <BrandMark label={landingPageCopy.brandLabel} />
            <h1 className="display-face">
              {t(landingPageCopy.titleKey)}
            </h1>
            <p>
              {t(landingPageCopy.bodyKey)}
            </p>
          </div>
        </div>

        <aside className="panel-card landing-panel">
          <BrandMark label={landingPageCopy.brandLabel} />
          <div className="landing-panel__stack">
            <h2 className="display-face">
              {t(landingPageCopy.panelTitleKey)}
            </h2>
            <p>
              {t(landingPageCopy.panelBodyKey)}
            </p>
          </div>
          <nav
            className="landing-panel__stack"
            aria-label={t(landingPageCopy.navigationAriaLabelKey)}
          >
            {landingPanelLinks.map((link) => (
              <AtmosphericLink key={link.href} href={link.href}>
                {t(link.labelKey)}
              </AtmosphericLink>
            ))}
            <span className="atmos-link atmos-link--muted">
              {t(landingPageCopy.memberLoginLaterKey)}
            </span>
          </nav>
        </aside>
      </section>
    </PageBackdrop>
  );
}
