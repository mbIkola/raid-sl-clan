import React from "react";
import { BrandMark } from "../../components/site/brand-mark";
import { DashboardNav } from "../../components/site/dashboard-nav";
import { DashboardFusionZone } from "../../components/site/dashboard-fusion-zone";
import { DashboardPerformersZone } from "../../components/site/dashboard-performers-zone";
import { DashboardReadinessZone } from "../../components/site/dashboard-readiness-zone";
import { DashboardTrendsZone } from "../../components/site/dashboard-trends-zone";
import { getClanDashboardSnapshot } from "../../server/dashboard/get-clan-dashboard-snapshot";

export default async function DashboardPage() {
  const snapshot = await getClanDashboardSnapshot();

  return (
    <main className="dashboard-shell dashboard-shell--clan">
      <header className="panel-card panel-card--padded dashboard-header">
        <div className="dashboard-stack">
          <BrandMark />
          <h1 className="display-face">Dashboard</h1>
          <p>Mobile-first clan dashboard grounded in real data.</p>
          <p className="dashboard-meta">Snapshot generated: {snapshot.generatedAt}</p>
        </div>
        <DashboardNav />
      </header>

      <DashboardReadinessZone cards={snapshot.readiness} />
      <DashboardFusionZone fusion={snapshot.fusion} />
      <DashboardPerformersZone rankings={snapshot.rankings} />
      <DashboardTrendsZone trends={snapshot.trends} />
    </main>
  );
}
