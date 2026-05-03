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
  const { t, ready } = useTranslation(["about", "common"], {
    useSuspense: false
  });
  const resolveText = (key: string, fallback: string): string =>
    ready ? t(key, { defaultValue: fallback }) : fallback;

  return (
    <PageBackdrop imagePath={siteArtwork.landing.default}>
      <section className="editorial-shell">
        <div className="editorial-shell__content">
          <BrandMark />
          <div className="editorial-stack">
            <h1 className="display-face">
              {resolveText(aboutPageCopy.titleKey, aboutPageCopy.title)}
            </h1>
            <p>
              {resolveText(aboutPageCopy.introKey, aboutPageCopy.intro)}
            </p>
            {aboutPageSections.map((section) => (
              <section
                key={section.headingKey}
                className="panel-card panel-card--editorial editorial-stack"
              >
                <h2 className="display-face">
                  {resolveText(section.headingKey, section.heading)}
                </h2>
                <p>{resolveText(section.bodyKey, section.body)}</p>
              </section>
            ))}
            <div className="editorial-stack">
              <AtmosphericLink href="/">
                {resolveText(
                  aboutPageCopy.backToLandingKey,
                  aboutPageCopy.backToLanding
                )}
              </AtmosphericLink>
              <AtmosphericLink href="/dashboard">
                {resolveText(
                  aboutPageCopy.openDashboardKey,
                  aboutPageCopy.openDashboard
                )}
              </AtmosphericLink>
            </div>
          </div>
        </div>
      </section>
    </PageBackdrop>
  );
}
