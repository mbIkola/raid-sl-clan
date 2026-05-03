import React from "react";
import { BrandMark } from "../../../components/site/brand-mark";
import { DashboardKtDeclineZone } from "../../../components/site/dashboard-kt-decline-zone";
import { DashboardKtHeaderZone } from "../../../components/site/dashboard-kt-header-zone";
import { DashboardKtHistoryZone } from "../../../components/site/dashboard-kt-history-zone";
import { DashboardKtStabilityZone } from "../../../components/site/dashboard-kt-stability-zone";
import { DashboardNav } from "../../../components/site/dashboard-nav";
import { getClanWarsArchiveSnapshot } from "../../../server/dashboard/get-clan-wars-archive-snapshot";

export const dynamic = "force-dynamic";

export default async function ClanWarsArchivePage() {
  const snapshot = await getClanWarsArchiveSnapshot();

  return (
    <main className="dashboard-shell dashboard-shell--clan">
      <header className="panel-card panel-card--padded dashboard-header">
        <div className="dashboard-stack">
          <BrandMark />
          <h1 className="display-face">KT</h1>
          <p>Archive-first clan wars telemetry.</p>
          <p className="dashboard-meta">Snapshot generated: {snapshot.generatedAt}</p>
        </div>
        <DashboardNav />
      </header>

      <DashboardKtHeaderZone header={snapshot.header} />
      <DashboardKtHistoryZone history={snapshot.history} />

      <section className="dashboard-kt-grid">
        <DashboardKtStabilityZone rows={snapshot.stability} />
        <DashboardKtDeclineZone rows={snapshot.decline} />
      </section>
    </main>
  );
}
