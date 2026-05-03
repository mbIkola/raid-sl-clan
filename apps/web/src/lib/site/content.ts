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
    default: "/images/landing/poster0-opt.jpg"
  },
  notFound: {
    default: "/images/not-found/bg0-opt.jpg"
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
