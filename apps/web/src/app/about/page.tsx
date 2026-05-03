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
              <a
                href={aboutPageCopy.githubRepoUrl}
                className="atmos-link about-github-link"
                target="_blank"
                rel="noreferrer"
              >
                <svg
                  className="about-github-icon"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    fill="currentColor"
                    d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49C4 14.09 3.48 13.22 3.32 12.77c-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.01.08-2.11 0 0 .67-.21 2.2.82A7.55 7.55 0 0 1 8 4.87c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.91.08 2.11.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
                  />
                </svg>
                {t(aboutPageCopy.openGitHubKey)}
              </a>
            </div>
          </div>
        </div>
      </section>
    </PageBackdrop>
  );
}
