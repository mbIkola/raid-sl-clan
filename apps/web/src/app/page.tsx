import React from "react";
import { AtmosphericLink } from "../components/site/atmospheric-link";
import { BrandMark } from "../components/site/brand-mark";
import { PageBackdrop } from "../components/site/page-backdrop";
import { landingPanelLinks, siteArtwork } from "../lib/site/content";

export default function HomePage() {
  return (
    <PageBackdrop imagePath={siteArtwork.landing.default}>
      <section className="landing-layout">
        <div className="landing-copy">
          <div className="landing-copy__body">
            <BrandMark />
            <h1 className="display-face">A darker front door for the clan.</h1>
            <p>
              Public dashboard, editorial context, and room for future join
              flow, without pretending the auth system already exists.
            </p>
          </div>
        </div>

        <aside className="panel-card landing-panel">
          <BrandMark />
          <div className="landing-panel__stack">
            <h2 className="display-face">Public routes first.</h2>
            <p>
              The landing panel stays practical: dashboard, about, and a clear
              note that member login arrives later.
            </p>
          </div>
          <nav className="landing-panel__stack" aria-label="Primary">
            {landingPanelLinks.map((link) => (
              <AtmosphericLink key={link.href} href={link.href}>
                {link.label}
              </AtmosphericLink>
            ))}
            <span className="atmos-link atmos-link--muted">
              Member login opens later
            </span>
          </nav>
        </aside>
      </section>
    </PageBackdrop>
  );
}
