import React from "react";
import { DashboardFusionZone } from "../../components/site/dashboard-fusion-zone";
import { DashboardPerformersZone } from "../../components/site/dashboard-performers-zone";
import { DashboardReadinessZone } from "../../components/site/dashboard-readiness-zone";
import { DashboardShellHeader } from "../../components/site/dashboard-shell-header";
import { DashboardTrendsZone } from "../../components/site/dashboard-trends-zone";
import { dashboardPageCopy } from "../../lib/site/content";
import { getClanDashboardSnapshot } from "../../server/dashboard/get-clan-dashboard-snapshot";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await getClanDashboardSnapshot();

  return (
    <main className="dashboard-shell dashboard-shell--clan">
      <DashboardShellHeader
        title={dashboardPageCopy.title}
        titleKey={dashboardPageCopy.titleKey}
        subtitle={dashboardPageCopy.subtitle}
        subtitleKey={dashboardPageCopy.subtitleKey}
        generatedAt={snapshot.generatedAt}
      />

      <DashboardReadinessZone cards={snapshot.readiness} />
      <DashboardFusionZone fusion={snapshot.fusion} />
      <DashboardPerformersZone rankings={snapshot.rankings} />
      <DashboardTrendsZone trends={snapshot.trends} />
    </main>
  );
}
