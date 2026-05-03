"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { AtmosphericLink } from "../components/site/atmospheric-link";
import { BrandMark } from "../components/site/brand-mark";
import { PageBackdrop } from "../components/site/page-backdrop";
import { notFoundPageCopy, siteArtwork } from "../lib/site/content";

export default function NotFoundPage() {
  const { t, ready } = useTranslation("common", { useSuspense: false });
  const resolveText = (key: string, fallback: string): string =>
    ready ? t(key, { defaultValue: fallback }) : fallback;

  return (
    <PageBackdrop imagePath={siteArtwork.notFound.default}>
      <section className="not-found-shell">
        <div className="panel-card panel-card--padded editorial-stack">
          <BrandMark />
          <h1 className="display-face">404</h1>
          <p>
            {resolveText(notFoundPageCopy.messageKey, notFoundPageCopy.message)}
          </p>
          <AtmosphericLink href="/">
            {resolveText(notFoundPageCopy.backHomeKey, notFoundPageCopy.backHome)}
          </AtmosphericLink>
        </div>
      </section>
    </PageBackdrop>
  );
}
