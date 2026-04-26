import React from "react";
import { AtmosphericLink } from "../components/site/atmospheric-link";
import { BrandMark } from "../components/site/brand-mark";
import { PageBackdrop } from "../components/site/page-backdrop";
import { siteArtwork } from "../lib/site/content";

export default function NotFoundPage() {
  return (
    <PageBackdrop imagePath={siteArtwork.notFound.default}>
      <section className="not-found-shell">
        <div className="panel-card panel-card--padded editorial-stack">
          <BrandMark />
          <h1 className="display-face">404</h1>
          <p>
            The trail ends here. Return to the public front before it gets
            embarrassing.
          </p>
          <AtmosphericLink href="/">Back Home</AtmosphericLink>
        </div>
      </section>
    </PageBackdrop>
  );
}
