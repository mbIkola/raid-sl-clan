# Raid SL Clan First Public Pages Design

Date: 2026-04-26
Status: Draft for review
Related issue: `raid-sl-clan-8gx`

## 1. Context

The repository already contains the current Cloudflare-first Next.js application in `apps/web`, but the public site surface is still a single MVP shell. Historical artwork existed before the cleanup in commit `b0067a8`:

- `apps/web/src/assets/landing/*`
- `apps/web/src/assets/404/*`
- `apps/web/src/assets/meta/*`

Only the artwork is worth restoring directly. The old page implementations came from a different app structure and should not be restored literally. The goal is a fresh public website surface built on the current App Router structure while reusing the old art assets as raw material.

## 2. Goals

Deliver the first coherent public website pass with four routes:

- `Landing` at `/`
- `Dashboard` at `/dashboard`
- `About` at `/about`
- custom `404` via `not-found.tsx`

The result must:

- preserve the old artwork by restoring it into the current project structure
- give `Landing` and `404` dark atmospheric backgrounds
- make `Dashboard` a practical, public, mobile-first stats/snapshot page
- keep `About` always public and independent from dashboard shell concerns
- prepare room for future login and onboarding on `Landing` without implementing auth now

## 3. Non-Goals

This pass does not include:

- real login or authorization
- private profile or personal stats routes
- real clan data integrations
- random background rotation logic
- a full design system or generalized reusable UI kit

## 4. Route Roles

### `/` Landing

`Landing` is the public front door of the site and always owns the root route.

Desktop layout:

- full-height dark poster composition
- artwork remains dominant
- right-side translucent utility panel overlays the artwork

Mobile layout:

- single-column composition
- artwork/brand remains visually first
- utility panel becomes a primary readable block below or over the lower part of the artwork

The utility panel contains:

- brand/title treatment
- short intro copy
- active links to `Dashboard` and `About`
- a visible but non-interactive login placeholder labeled as future work

The utility panel is part of the page composition, not a reusable site-wide app header.

### `/dashboard` Dashboard

`Dashboard` is a public page, not a private account area.

It uses its own practical shell:

- mobile-first header
- hamburger navigation on small viewports
- expandable or persistently visible navigation on larger viewports

Initial dashboard content is curated placeholder content presented as real cards:

- Clan Overview
- Key Stats
- Recent Activity
- Announcements / Updates

The page should feel more product-like than `Landing` while staying visually related through palette and typography.

### `/about` About

`About` is always public and must never be hidden behind future auth.

It should not share the dashboard shell. Instead it behaves like an editorial page:

- strong title and intro
- single-column reading rhythm on mobile
- more atmospheric presentation than dashboard
- minimal navigation back to `Landing` and `Dashboard`

The page prioritizes readability over UI chrome.

### `not-found.tsx` 404

`404` is a deliberate full-screen page, not a default framework fallback.

It uses restored dark artwork, heavy overlay, minimal copy, and one clear action back to `/`.

## 5. Visual System

The visual language should split into two families inside one site:

- Atmospheric pages: `Landing`, `About`, `404`
- Practical public product page: `Dashboard`

Shared design rules:

- dark foundation
- cold neutral palette with one restrained accent color
- expressive display typography for major headings
- clean sans-serif for interface and long reading
- calm fades/slides only, no excessive cinematic effects

### Atmospheric family

Used by `Landing`, `About`, and `404`.

Characteristics:

- strong artwork or artwork-derived background treatment
- readable overlays
- spacious typography
- low UI density

### Practical family

Used by `Dashboard`.

Characteristics:

- clearer content hierarchy
- card-based layout
- shell navigation
- mobile-first stacking and menu behavior

## 6. Asset Placement

Historical assets from `b0067a8` should be restored into places appropriate for the current Next app.

### Page background artwork

Restore to `public` so they can be referenced directly as runtime assets:

- `apps/web/public/images/landing/*`
- `apps/web/public/images/not-found/*`

These are page-serving assets, not implementation-only imports, so `public` is the right home.

For the first pass, select one intentional default poster for `Landing` and one default image for `404`. Keep the remaining restored files available for later iteration.

### Metadata assets

Restore the historical metadata art into App Router metadata conventions instead of a generic `public/meta` folder:

- `apps/web/src/app/favicon.ico`
- `apps/web/src/app/icon.png`
- `apps/web/src/app/apple-icon.png`
- `apps/web/src/app/opengraph-image.png`
- `apps/web/src/app/twitter-image.png`
- `apps/web/src/app/manifest.webmanifest`

Reasoning:

- these files are part of framework-level metadata behavior, not ordinary content images
- App Router conventions keep site metadata close to the root app entrypoint
- the framework can auto-discover and wire them more cleanly than a fully manual `public/meta` approach

## 7. File Structure

Expected implementation structure:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/app/about/page.tsx`
- `apps/web/src/app/not-found.tsx`
- `apps/web/src/components/site/*`
- `apps/web/src/lib/site/*`

Guidance:

- keep `globals.css` to tokens, resets, typography, shared helpers, and common transitions
- keep page-specific composition inside page files or narrowly scoped site components
- do not over-extract primitives just because two pages both render text on a dark background

Candidate shared components:

- brand mark / brand lockup
- atmospheric link/button treatment
- page backdrop helper
- mobile nav / drawer shell for dashboard
- content card primitive

Candidate site data helpers:

- route labels
- curated dashboard placeholder sections
- selected default background paths

## 8. Page Behavior

### Landing behavior

- route `/` is always `Landing`
- no random poster selection on load
- right utility panel contains active nav and inactive auth placeholder
- future onboarding/login can be added inside the panel without redesigning the whole page

### Dashboard behavior

- mobile-first by default
- compact header and hamburger on narrow widths
- larger screens may expose navigation more directly
- sections stack vertically on mobile and become denser only when space permits

### About behavior

- no dashboard shell reuse
- optimized for reading rhythm and tone
- minimal page-level navigation only

### 404 behavior

- renders for unknown routes
- always offers a clear return path to `/`
- remains readable even if background image changes later

## 9. Fallback and Resilience

Artwork must enhance the pages, not become the sole support holding them together.

Every atmospheric page needs a complete non-image fallback via CSS:

- dark gradient base
- readable overlay
- safe text contrast
- layout that still feels intentional without the image

This prevents background failures from turning the page into an unreadable mess.

## 10. Accessibility and Responsive Expectations

Baseline expectations for this pass:

- all primary navigation reachable by keyboard
- sufficient contrast on overlays and cards
- readable heading hierarchy
- mobile-first layout verified on narrow viewport
- desktop layout verified on wider viewport

The dashboard hamburger interaction should preserve clear labels and focus behavior.

## 11. Verification

Implementation is considered complete only when all of the following are true:

- `pnpm typecheck` passes
- `pnpm test` passes
- manual browser checks pass for:
  - `/`
  - `/dashboard`
  - `/about`
  - unknown route rendering custom `404`
- manual visual checks pass for:
  - narrow mobile viewport
  - standard desktop viewport

## 12. Implementation Direction

Recommended implementation sequence:

1. Restore artwork and metadata files into current locations.
2. Establish global typography, tokens, and metadata wiring.
3. Build `Landing` and `404` atmospheric pages around restored artwork.
4. Build `Dashboard` shell and public cards.
5. Build editorial `About`.
6. Validate across tests, typecheck, and browser review.

This order front-loads the recovered assets and the most visible surfaces while keeping the dashboard shell bounded and pragmatic.
