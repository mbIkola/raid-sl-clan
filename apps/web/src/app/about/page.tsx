"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { AtmosphericLink } from "../../components/site/atmospheric-link";
import { BrandMark } from "../../components/site/brand-mark";
import { PageBackdrop } from "../../components/site/page-backdrop";
import {
  aboutPageCopy,
  aboutPageSections,
  siteArtwork
} from "../../lib/site/content";

export default function AboutPage() {
  const { t } = useTranslation(["about", "common"], { useSuspense: false });

  return (
    <PageBackdrop imagePath={siteArtwork.landing.default}>
      <section className="editorial-shell">
        <div className="editorial-shell__content">
          <BrandMark />
          <div className="editorial-stack">
            <h1 className="display-face">{t(aboutPageCopy.titleKey)}</h1>
            <p>
              {t(aboutPageCopy.introKey)}
            </p>
            {aboutPageSections.map((section) => (
              <section
                key={section.headingKey}
                className="panel-card panel-card--editorial editorial-stack"
              >
                <h2 className="display-face">{t(section.headingKey)}</h2>
                <p>{t(section.bodyKey)}</p>
              </section>
            ))}
            <div className="editorial-stack">
              <AtmosphericLink href="/">{t(aboutPageCopy.backToLandingKey)}</AtmosphericLink>
              <AtmosphericLink href="/dashboard">
                {t(aboutPageCopy.openDashboardKey)}
              </AtmosphericLink>
            </div>
          </div>
        </div>
      </section>
    </PageBackdrop>
  );
}
