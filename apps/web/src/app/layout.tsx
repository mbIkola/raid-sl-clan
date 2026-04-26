import type { Metadata } from "next";
import localFont from "next/font/local";
import React, { type ReactNode } from "react";
import { siteMetadataCopy } from "../lib/site/content";
import { resolvePublicSiteUrl } from "../lib/site/public-site-url";
import "./globals.css";

const displayFont = localFont({
  src: "./fonts/RuslanDisplay-Regular.ttf",
  variable: "--font-display",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(resolvePublicSiteUrl()),
  title: {
    default: siteMetadataCopy.title,
    template: "%s | Raid SL Clan"
  },
  description: siteMetadataCopy.description,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/meta/favicon.ico" }, { url: "/meta/icon.png", type: "image/png" }],
    apple: [{ url: "/meta/apple-icon.png", type: "image/png" }]
  },
  openGraph: {
    title: siteMetadataCopy.title,
    description: siteMetadataCopy.description,
    images: [{ url: "/meta/opengraph-image.png", alt: "Raid SL Clan" }]
  },
  twitter: {
    card: "summary_large_image",
    title: siteMetadataCopy.title,
    description: siteMetadataCopy.description,
    images: ["/meta/twitter-image.png"]
  }
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} site-root`}>{children}</body>
    </html>
  );
}
