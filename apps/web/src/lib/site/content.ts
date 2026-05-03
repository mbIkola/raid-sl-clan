export const siteMetadataCopy = {
  title: "Raid SL Clan",
  description:
    "Raid SL Clan public home for clan overview, updates, and future join guidance."
} as const;

export const landingPanelLinks = [
  { href: "/dashboard", label: "Dashboard", labelKey: "menu:dashboard" },
  { href: "/about", label: "About", labelKey: "menu:about" }
] as const;

export const landingPageCopy = {
  brandLabel: "[VIБР] - Raid SL Clan",
  title: "A darker front door for the clan.",
  titleKey: "landing:title",
  body: "Public dashboard, editorial context, and room for future join flow, without pretending the auth system already exists.",
  bodyKey: "landing:body",
  panelTitle: "Public routes first.",
  panelTitleKey: "landing:panelTitle",
  panelBody:
    "The landing panel stays practical: dashboard, about, and a clear note that member login arrives later.",
  panelBodyKey: "landing:panelBody",
  memberLoginLater: "Member login opens later",
  memberLoginLaterKey: "landing:memberLoginLater",
  navigationAriaLabel: "Primary",
  navigationAriaLabelKey: "common:primaryNavigation"
} as const;

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
    headingKey: "about:sections.whatThisPlaceIs.heading",
    body:
      "A public front for the clan: part archive, part signal fire, and eventually the place where new recruits figure out how not to get lost.",
    bodyKey: "about:sections.whatThisPlaceIs.body"
  },
  {
    heading: "What Comes Later",
    headingKey: "about:sections.whatComesLater.heading",
    body:
      "Authentication, member tools, and personal statistics arrive in later passes. This page stays public and editorial.",
    bodyKey: "about:sections.whatComesLater.body"
  }
] as const;

export const aboutPageCopy = {
  title: "What This Place Is",
  titleKey: "about:title",
  intro:
    "The public face of the clan should read like intent, not like a half-connected control panel.",
  introKey: "about:intro",
  backToLanding: "Back to Landing",
  backToLandingKey: "common:backToLanding",
  openDashboard: "Open Dashboard",
  openDashboardKey: "about:openDashboard"
} as const;

export const notFoundPageCopy = {
  message:
    "The trail ends here. Return to the public front before it gets embarrassing.",
  messageKey: "common:notFoundMessage",
  backHome: "Back Home",
  backHomeKey: "common:backHome"
} as const;

export const dashboardPageCopy = {
  title: "Dashboard",
  titleKey: "title",
  subtitle: "Mobile-first clan dashboard grounded in real data.",
  subtitleKey: "subtitle"
} as const;

export const clanWarsArchivePageCopy = {
  title: "KT",
  titleKey: "clanWarsTitle",
  subtitle: "Archive-first clan wars telemetry.",
  subtitleKey: "archiveSubtitle"
} as const;
