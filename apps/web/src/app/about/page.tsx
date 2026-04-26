import React from "react";
import { AtmosphericLink } from "../../components/site/atmospheric-link";
import { BrandMark } from "../../components/site/brand-mark";
import { PageBackdrop } from "../../components/site/page-backdrop";
import { aboutPageSections, siteArtwork } from "../../lib/site/content";

export default function AboutPage() {
  return (
    <PageBackdrop imagePath={siteArtwork.landing.default}>
      <section className="editorial-shell">
        <div className="editorial-shell__content">
          <BrandMark />
          <div className="editorial-stack">
            <h1 className="display-face">What This Place Is</h1>
            <p>
              The public face of the clan should read like intent, not like a
              half-connected control panel.
            </p>
            {aboutPageSections.map((section) => (
              <section
                key={section.heading}
                className="panel-card panel-card--editorial editorial-stack"
              >
                <h2 className="display-face">{section.heading}</h2>
                <p>{section.body}</p>
              </section>
            ))}
            <div className="editorial-stack">
              <AtmosphericLink href="/">Back to Landing</AtmosphericLink>
              <AtmosphericLink href="/dashboard">Open Dashboard</AtmosphericLink>
            </div>
          </div>
        </div>
      </section>
    </PageBackdrop>
  );
}
