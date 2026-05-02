# Raid SL Clan First Public Pages Implementation Plan

Status: Completed and documented as implemented (validated on 2026-05-03)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current one-page MVP shell in `apps/web` with four first-pass public pages backed by restored artwork, current App Router metadata assets, and a mobile-first public dashboard shell.

**Architecture:** Restore the useful historical art from `b0067a8` into current Next-friendly locations, centralize first-pass route/content choices in a tiny `src/lib/site` module, and then build two visual families: atmospheric pages (`Landing`, `About`, `404`) and a practical public product page (`Dashboard`). Keep implementation server-rendered and CSS-driven where possible, including a native `<details>` hamburger shell for the first dashboard pass instead of inventing client-side state too early.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Tailwind CSS v4 import in `globals.css`, Next Metadata API, `next/font/local`

---

### Task 1: Restore Artwork Inputs And First-Pass Site Content

**Files:**
- Create: `apps/web/src/lib/site/content.ts`
- Test: `apps/web/src/lib/site/content.test.ts`
- Create/restore: `apps/web/public/images/landing/poster0.jpeg`
- Create/restore: `apps/web/public/images/landing/poster1.jpeg`
- Create/restore: `apps/web/public/images/landing/poster2.jpeg`
- Create/restore: `apps/web/public/images/landing/poster3.jpeg`
- Create/restore: `apps/web/public/images/landing/poster4.jpeg`
- Create/restore: `apps/web/public/images/not-found/bg0.jpeg`
- Create/restore: `apps/web/public/images/not-found/bg1.jpeg`
- Create/restore: `apps/web/public/images/not-found/bg2.jpeg`
- Create/restore: `apps/web/public/images/not-found/bg3.jpeg`
- Create/restore: `apps/web/public/images/not-found/bg4.jpeg`
- Create/restore: `apps/web/src/app/fonts/RuslanDisplay-Regular.ttf`
- Create/restore: `apps/web/src/app/icon.png`
- Create/restore: `apps/web/src/app/apple-icon.png`
- Create/restore: `apps/web/src/app/opengraph-image.png`
- Create/restore: `apps/web/src/app/twitter-image.png`
- Create/restore: `apps/web/src/app/favicon.ico`
- Create/restore: `apps/web/src/app/android-chrome-192x192.png`
- Create/restore: `apps/web/src/app/android-chrome-512x512.png`

- [x] **Step 1: Write the failing test for the site content module**

```ts
import { describe, expect, it } from "vitest";
import {
  dashboardSections,
  landingPanelLinks,
  siteArtwork,
  siteMetadataCopy
} from "./content";

describe("site content", () => {
  it("exposes the public landing links in the agreed order", () => {
    expect(landingPanelLinks).toEqual([
      { href: "/dashboard", label: "Dashboard" },
      { href: "/about", label: "About" }
    ]);
  });

  it("pins one intentional default background per atmospheric page", () => {
    expect(siteArtwork.landing.default).toBe("/images/landing/poster0.jpeg");
    expect(siteArtwork.notFound.default).toBe("/images/not-found/bg0.jpeg");
  });

  it("provides four first-pass public dashboard sections", () => {
    expect(dashboardSections.map((section) => section.title)).toEqual([
      "Clan Overview",
      "Key Stats",
      "Recent Activity",
      "Announcements / Updates"
    ]);
  });

  it("keeps the root metadata copy aligned with the approved public framing", () => {
    expect(siteMetadataCopy.title).toBe("Raid SL Clan");
    expect(siteMetadataCopy.description).toContain("public home");
  });
});
```

- [x] **Step 2: Run the test to verify it fails because the module does not exist yet**

Run: `pnpm test -- apps/web/src/lib/site/content.test.ts`

Expected: FAIL with a module resolution error for `./content`.

- [x] **Step 3: Write the minimal `content.ts` implementation**

```ts
export const siteMetadataCopy = {
  title: "Raid SL Clan",
  description:
    "Raid SL Clan public home for clan overview, updates, and future join guidance."
} as const;

export const landingPanelLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/about", label: "About" }
] as const;

export const siteArtwork = {
  landing: {
    default: "/images/landing/poster0.jpeg"
  },
  notFound: {
    default: "/images/not-found/bg0.jpeg"
  }
} as const;

export const dashboardSections = [
  {
    title: "Clan Overview",
    body:
      "Public-facing snapshot for the clan while live roster and schedule integrations are still being wired."
  },
  {
    title: "Key Stats",
    body:
      "Reserved for the first public clan metrics block once the data pipeline is connected."
  },
  {
    title: "Recent Activity",
    body:
      "This panel will surface recent public activity summaries instead of private member detail."
  },
  {
    title: "Announcements / Updates",
    body:
      "Editorial updates land here first so the dashboard already reads like a real public surface."
  }
] as const;

export const aboutPageSections = [
  {
    heading: "What This Place Is",
    body:
      "A public front for the clan: part archive, part signal fire, and eventually the place where new recruits figure out how not to get lost."
  },
  {
    heading: "What Comes Later",
    body:
      "Authentication, member tools, and personal statistics arrive in later passes. This page stays public and editorial."
  }
] as const;
```

- [x] **Step 4: Run the content test again and confirm green**

Run: `pnpm test -- apps/web/src/lib/site/content.test.ts`

Expected: PASS with 4 passing assertions.

- [x] **Step 5: Restore the historical artwork, font, and metadata source files from `b0067a8`**

Run:

```bash
mkdir -p \
  apps/web/public/images/landing \
  apps/web/public/images/not-found \
  apps/web/src/app/fonts

for file in poster0.jpeg poster1.jpeg poster2.jpeg poster3.jpeg poster4.jpeg; do
  git show "b0067a8:apps/web/src/assets/landing/${file}" > "apps/web/public/images/landing/${file}"
done

for file in bg0.jpeg bg1.jpeg bg2.jpeg bg3.jpeg bg4.jpeg; do
  git show "b0067a8:apps/web/src/assets/404/${file}" > "apps/web/public/images/not-found/${file}"
done

git show b0067a8:apps/web/src/assets/fonts/RuslanDisplay-Regular.ttf > apps/web/src/app/fonts/RuslanDisplay-Regular.ttf
git show b0067a8:apps/web/src/assets/meta/favicon.ico > apps/web/src/app/favicon.ico
git show b0067a8:apps/web/src/assets/meta/favicon.png > apps/web/src/app/icon.png
git show b0067a8:apps/web/src/assets/meta/apple-touch-icon.png > apps/web/src/app/apple-icon.png
git show b0067a8:apps/web/src/assets/meta/twitter-card.png > apps/web/src/app/twitter-image.png
git show b0067a8:apps/web/src/assets/meta/twitter-card.png > apps/web/src/app/opengraph-image.png
git show b0067a8:apps/web/src/assets/meta/android-chrome-192x192.png > apps/web/src/app/android-chrome-192x192.png
git show b0067a8:apps/web/src/assets/meta/android-chrome-512x512.png > apps/web/src/app/android-chrome-512x512.png
```

Expected: restored binary assets exist at the new paths and `git status --short` shows them as new files on this branch.

- [x] **Step 6: Commit Task 1**

```bash
git add \
  apps/web/src/lib/site/content.ts \
  apps/web/src/lib/site/content.test.ts \
  apps/web/public/images/landing \
  apps/web/public/images/not-found \
  apps/web/src/app/fonts/RuslanDisplay-Regular.ttf \
  apps/web/src/app/favicon.ico \
  apps/web/src/app/icon.png \
  apps/web/src/app/apple-icon.png \
  apps/web/src/app/opengraph-image.png \
  apps/web/src/app/twitter-image.png \
  apps/web/src/app/android-chrome-192x192.png \
  apps/web/src/app/android-chrome-512x512.png
git commit -m "feat: restore site artwork inputs"
```

### Task 2: Rebuild Global Metadata, Fonts, And Shared Styling

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/globals.css`
- Create: `apps/web/src/app/manifest.ts`
- Test: `apps/web/src/app/layout.test.tsx`

- [x] **Step 1: Write the failing layout test**

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RootLayout, { metadata } from "./layout";

describe("RootLayout", () => {
  it("publishes the public-site metadata contract", () => {
    expect(metadata.title).toEqual({
      default: "Raid SL Clan",
      template: "%s | Raid SL Clan"
    });
    expect(metadata.description).toContain("public home");
    expect(metadata.manifest).toBe("/manifest.webmanifest");
  });

  it("renders the body wrapper for the page shell", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <div>child-content</div>
      </RootLayout>
    );

    expect(html).toContain("child-content");
    expect(html).toContain("site-root");
  });
});
```

- [x] **Step 2: Run the layout test to verify it fails on the current MVP layout**

Run: `pnpm test -- apps/web/src/app/layout.test.tsx`

Expected: FAIL because the current `metadata.title` is a string and the rendered body does not include the `site-root` class.

- [x] **Step 3: Implement `layout.tsx` with local font wiring and richer metadata**

```tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { siteMetadataCopy } from "../lib/site/content";
import "./globals.css";

const displayFont = localFont({
  src: "./fonts/RuslanDisplay-Regular.ttf",
  variable: "--font-display",
  display: "swap"
});

export const metadata: Metadata = {
  title: {
    default: siteMetadataCopy.title,
    template: "%s | Raid SL Clan"
  },
  description: siteMetadataCopy.description,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png" }]
  },
  openGraph: {
    title: siteMetadataCopy.title,
    description: siteMetadataCopy.description,
    images: [{ url: "/opengraph-image.png", alt: "Raid SL Clan" }]
  },
  twitter: {
    card: "summary_large_image",
    title: siteMetadataCopy.title,
    description: siteMetadataCopy.description,
    images: ["/twitter-image.png"]
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
```

- [x] **Step 4: Add the App Router manifest route using the restored icon assets**

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Raid SL Clan",
    short_name: "Raid SL Clan",
    display: "standalone",
    background_color: "#07090d",
    theme_color: "#07090d",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
```

- [x] **Step 5: Replace `globals.css` with the shared tokens and layout primitives the new pages need**

```css
@import "tailwindcss";

:root {
  color-scheme: dark;
  --site-bg: #07090d;
  --site-panel: rgba(9, 12, 16, 0.78);
  --site-panel-strong: rgba(6, 8, 11, 0.88);
  --site-border: rgba(196, 210, 223, 0.14);
  --site-text: #f3f4f6;
  --site-muted: #b8c0ca;
  --site-soft: #8f97a3;
  --site-accent: #ced8e6;
  --site-shadow: rgba(0, 0, 0, 0.4);
}

* {
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
}

body {
  margin: 0;
  background:
    radial-gradient(circle at top, rgba(154, 170, 189, 0.15), transparent 32%),
    linear-gradient(180deg, #10141b 0%, var(--site-bg) 55%, #050608 100%);
  color: var(--site-text);
  font-family: "Segoe UI", sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

img {
  display: block;
  max-width: 100%;
}

.site-root {
  min-height: 100vh;
}

.display-face {
  font-family: var(--font-display), "Times New Roman", serif;
  letter-spacing: 0.02em;
}

.page-backdrop {
  position: relative;
  min-height: 100vh;
  background:
    linear-gradient(180deg, rgba(5, 7, 10, 0.28), rgba(5, 7, 10, 0.74)),
    var(--page-image),
    linear-gradient(180deg, #11151a, #07090d);
  background-position: center;
  background-size: cover;
}

.page-backdrop::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), transparent 22%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.48));
  pointer-events: none;
}

.page-backdrop__inner {
  position: relative;
  z-index: 1;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--site-accent);
}

.brand-mark__dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 1.2rem rgba(206, 216, 230, 0.4);
}

.atmos-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: fit-content;
  padding: 0.85rem 1rem;
  border: 1px solid var(--site-border);
  border-radius: 999px;
  background: rgba(5, 7, 10, 0.48);
  color: var(--site-text);
  backdrop-filter: blur(10px);
}

.atmos-link--muted {
  color: var(--site-muted);
}

.panel-card {
  border: 1px solid var(--site-border);
  border-radius: 1.25rem;
  background: var(--site-panel);
  box-shadow: 0 1.5rem 3rem -2rem var(--site-shadow);
  backdrop-filter: blur(14px);
}

.landing-layout {
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(0, 1.25fr) minmax(20rem, 25rem);
}

.landing-copy {
  display: flex;
  align-items: flex-end;
  padding: 2rem;
}

.landing-copy__body {
  max-width: 32rem;
}

.landing-panel {
  margin: 1.25rem;
  padding: 1.5rem;
  align-self: stretch;
  display: grid;
  gap: 1.25rem;
}

.landing-panel__stack,
.editorial-stack,
.dashboard-stack {
  display: grid;
  gap: 1rem;
}

.dashboard-shell {
  min-height: 100vh;
  padding: 1rem;
  display: grid;
  gap: 1rem;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.dashboard-nav summary {
  cursor: pointer;
  list-style: none;
  padding: 0.75rem 1rem;
  border: 1px solid var(--site-border);
  border-radius: 999px;
  background: var(--site-panel-strong);
}

.dashboard-nav[open] .dashboard-nav__links {
  margin-top: 0.85rem;
  display: grid;
  gap: 0.75rem;
}

.editorial-shell {
  min-height: 100vh;
  padding: 1.25rem;
}

.editorial-shell__content {
  width: min(100%, 44rem);
  margin: 0 auto;
  padding: 4rem 0 3rem;
}

.not-found-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
}

@media (max-width: 900px) {
  .landing-layout {
    grid-template-columns: 1fr;
  }

  .landing-copy {
    min-height: 52vh;
  }

  .landing-panel {
    margin-top: 0;
  }
}
```

- [x] **Step 6: Run the layout test again**

Run: `pnpm test -- apps/web/src/app/layout.test.tsx`

Expected: PASS with metadata and `site-root` assertions satisfied.

- [x] **Step 7: Commit Task 2**

```bash
git add \
  apps/web/src/app/layout.tsx \
  apps/web/src/app/layout.test.tsx \
  apps/web/src/app/globals.css \
  apps/web/src/app/manifest.ts
git commit -m "feat: rebuild public site shell metadata"
```

### Task 3: Build The Landing Route And Shared Atmospheric Primitives

**Files:**
- Create: `apps/web/src/components/site/brand-mark.tsx`
- Create: `apps/web/src/components/site/atmospheric-link.tsx`
- Create: `apps/web/src/components/site/page-backdrop.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/page.test.tsx`

- [x] **Step 1: Replace the old landing test with one that describes the new root route**

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders the public landing panel with the agreed navigation", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain("Raid SL Clan");
    expect(html).toContain("Dashboard");
    expect(html).toContain("About");
    expect(html).toContain("Member login opens later");
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/about"');
  });
});
```

- [x] **Step 2: Run the landing test and verify it fails on the old MVP shell**

Run: `pnpm test -- apps/web/src/app/page.test.tsx`

Expected: FAIL because the current landing page still renders the Cloudflare MVP copy and has no `About` link or login placeholder.

- [x] **Step 3: Create the shared atmospheric primitives**

`apps/web/src/components/site/brand-mark.tsx`

```tsx
export function BrandMark() {
  return (
    <div className="brand-mark">
      <span className="brand-mark__dot" aria-hidden="true" />
      <span>Raid SL Clan</span>
    </div>
  );
}
```

`apps/web/src/components/site/atmospheric-link.tsx`

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

type AtmosphericLinkProps = {
  href: string;
  children: ReactNode;
  muted?: boolean;
};

export function AtmosphericLink({
  href,
  children,
  muted = false
}: AtmosphericLinkProps) {
  return (
    <Link
      href={href}
      className={muted ? "atmos-link atmos-link--muted" : "atmos-link"}
    >
      {children}
    </Link>
  );
}
```

`apps/web/src/components/site/page-backdrop.tsx`

```tsx
import type { CSSProperties, ReactNode } from "react";

type PageBackdropProps = {
  imagePath: string;
  children: ReactNode;
};

export function PageBackdrop({ imagePath, children }: PageBackdropProps) {
  return (
    <main
      className="page-backdrop"
      style={{ "--page-image": `url(${imagePath})` } as CSSProperties}
    >
      <div className="page-backdrop__inner">{children}</div>
    </main>
  );
}
```

- [x] **Step 4: Implement the new landing page**

```tsx
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
```

- [x] **Step 5: Run the landing test again**

Run: `pnpm test -- apps/web/src/app/page.test.tsx`

Expected: PASS with the new landing copy and links present.

- [x] **Step 6: Commit Task 3**

```bash
git add \
  apps/web/src/components/site/brand-mark.tsx \
  apps/web/src/components/site/atmospheric-link.tsx \
  apps/web/src/components/site/page-backdrop.tsx \
  apps/web/src/app/page.tsx \
  apps/web/src/app/page.test.tsx
git commit -m "feat: add atmospheric landing route"
```

### Task 4: Build The Editorial About Route And The Custom 404

**Files:**
- Create: `apps/web/src/app/about/page.tsx`
- Create: `apps/web/src/app/about/page.test.tsx`
- Create: `apps/web/src/app/not-found.tsx`
- Create: `apps/web/src/app/not-found.test.tsx`

- [x] **Step 1: Write the failing tests for `About` and `404`**

`apps/web/src/app/about/page.test.tsx`

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AboutPage from "./page";

describe("AboutPage", () => {
  it("renders the always-public editorial route", () => {
    const html = renderToStaticMarkup(<AboutPage />);

    expect(html).toContain("What This Place Is");
    expect(html).toContain("Raid SL Clan");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/dashboard"');
  });
});
```

`apps/web/src/app/not-found.test.tsx`

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NotFoundPage from "./not-found";

describe("NotFoundPage", () => {
  it("renders the custom atmospheric 404 route", () => {
    const html = renderToStaticMarkup(<NotFoundPage />);

    expect(html).toContain("404");
    expect(html).toContain("Back Home");
    expect(html).toContain('href="/"');
  });
});
```

- [x] **Step 2: Run the tests and confirm they fail because the routes do not exist yet**

Run: `pnpm test -- apps/web/src/app/about/page.test.tsx apps/web/src/app/not-found.test.tsx`

Expected: FAIL with module resolution errors for both route files.

- [x] **Step 3: Implement the editorial `About` page**

```tsx
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
              <section key={section.heading} className="panel-card editorial-stack">
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
```

- [x] **Step 4: Implement the custom `not-found.tsx` route**

```tsx
import { AtmosphericLink } from "../components/site/atmospheric-link";
import { BrandMark } from "../components/site/brand-mark";
import { PageBackdrop } from "../components/site/page-backdrop";
import { siteArtwork } from "../lib/site/content";

export default function NotFoundPage() {
  return (
    <PageBackdrop imagePath={siteArtwork.notFound.default}>
      <section className="not-found-shell">
        <div className="panel-card editorial-stack">
          <BrandMark />
          <h1 className="display-face">404</h1>
          <p>The trail ends here. Return to the public front before it gets embarrassing.</p>
          <AtmosphericLink href="/">Back Home</AtmosphericLink>
        </div>
      </section>
    </PageBackdrop>
  );
}
```

- [x] **Step 5: Run the route tests again**

Run: `pnpm test -- apps/web/src/app/about/page.test.tsx apps/web/src/app/not-found.test.tsx`

Expected: PASS with both new atmospheric pages rendering.

- [x] **Step 6: Commit Task 4**

```bash
git add \
  apps/web/src/app/about/page.tsx \
  apps/web/src/app/about/page.test.tsx \
  apps/web/src/app/not-found.tsx \
  apps/web/src/app/not-found.test.tsx
git commit -m "feat: add editorial public routes"
```

### Task 5: Build The Public Dashboard Shell

**Files:**
- Create: `apps/web/src/components/site/dashboard-nav.tsx`
- Create: `apps/web/src/components/site/panel-card.tsx`
- Create: `apps/web/src/app/dashboard/page.tsx`
- Create: `apps/web/src/app/dashboard/page.test.tsx`

- [x] **Step 1: Write the failing dashboard test**

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renders the public dashboard shell with nav and four public cards", () => {
    const html = renderToStaticMarkup(<DashboardPage />);

    expect(html).toContain("Dashboard");
    expect(html).toContain("Menu");
    expect(html).toContain("Clan Overview");
    expect(html).toContain("Key Stats");
    expect(html).toContain("Recent Activity");
    expect(html).toContain("Announcements / Updates");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/about"');
  });
});
```

- [x] **Step 2: Run the dashboard test and verify it fails because the route does not exist**

Run: `pnpm test -- apps/web/src/app/dashboard/page.test.tsx`

Expected: FAIL with a module resolution error for `./page`.

- [x] **Step 3: Create the dashboard shell primitives**

`apps/web/src/components/site/panel-card.tsx`

```tsx
import type { ReactNode } from "react";

type PanelCardProps = {
  title: string;
  children: ReactNode;
};

export function PanelCard({ title, children }: PanelCardProps) {
  return (
    <section className="panel-card dashboard-stack">
      <h2 className="display-face">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
```

`apps/web/src/components/site/dashboard-nav.tsx`

```tsx
import Link from "next/link";

export function DashboardNav() {
  return (
    <details className="dashboard-nav">
      <summary>Menu</summary>
      <nav className="dashboard-nav__links" aria-label="Dashboard">
        <Link href="/">Landing</Link>
        <Link href="/about">About</Link>
      </nav>
    </details>
  );
}
```

- [x] **Step 4: Implement the public dashboard route**

```tsx
import { BrandMark } from "../../components/site/brand-mark";
import { DashboardNav } from "../../components/site/dashboard-nav";
import { PanelCard } from "../../components/site/panel-card";
import { dashboardSections } from "../../lib/site/content";

export default function DashboardPage() {
  return (
    <main className="dashboard-shell">
      <header className="panel-card dashboard-header">
        <div className="dashboard-stack">
          <BrandMark />
          <h1 className="display-face">Dashboard</h1>
          <p>Public clan snapshot first. Private member views come later.</p>
        </div>
        <DashboardNav />
      </header>

      <section className="dashboard-stack">
        {dashboardSections.map((section) => (
          <PanelCard key={section.title} title={section.title}>
            <p>{section.body}</p>
          </PanelCard>
        ))}
      </section>
    </main>
  );
}
```

- [x] **Step 5: Run the dashboard test again**

Run: `pnpm test -- apps/web/src/app/dashboard/page.test.tsx`

Expected: PASS with the shell title, menu summary, and four section titles present.

- [x] **Step 6: Commit Task 5**

```bash
git add \
  apps/web/src/components/site/dashboard-nav.tsx \
  apps/web/src/components/site/panel-card.tsx \
  apps/web/src/app/dashboard/page.tsx \
  apps/web/src/app/dashboard/page.test.tsx
git commit -m "feat: add public dashboard route"
```

### Task 6: Run Full Verification And Browser Review

**Files:**
- Modify only if verification uncovers defects

- [x] **Step 1: Run the targeted web app tests together**

Run: `pnpm test -- apps/web/src/app/layout.test.tsx apps/web/src/app/page.test.tsx apps/web/src/app/about/page.test.tsx apps/web/src/app/not-found.test.tsx apps/web/src/app/dashboard/page.test.tsx apps/web/src/lib/site/content.test.ts`

Expected: PASS for all new route and content tests.

- [x] **Step 2: Run the full repository test suite**

Run: `pnpm test`

Expected: PASS across the repo.

- [x] **Step 3: Run the workspace typecheck**

Run: `pnpm typecheck`

Expected: PASS across `apps/*` and `packages/*`.

- [x] **Step 4: Start the local web app and review the routes in the browser**

Run:

```bash
pnpm dev:web
```

Review in browser:

- `/`
- `/dashboard`
- `/about`
- `/missing-route` to confirm custom `404`

Check each route in:

- a narrow mobile viewport
- a standard desktop viewport

Expected:

- `Landing` keeps the art dominant with the right-side or stacked panel
- `Dashboard` presents the header and `<details>` menu cleanly on mobile
- `About` reads like an editorial page instead of a dashboard clone
- `404` stays readable on top of the restored dark artwork

- [x] **Step 5: Commit the final polish or verification-driven fixes**

```bash
git add apps/web
git commit -m "feat: finalize first public website pages"
```
