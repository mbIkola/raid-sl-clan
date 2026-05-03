import React from "react";
import { DashboardKtDeclineZone } from "../../../components/site/dashboard-kt-decline-zone";
import { DashboardKtHeaderZone } from "../../../components/site/dashboard-kt-header-zone";
import { DashboardKtHistoryZone } from "../../../components/site/dashboard-kt-history-zone";
import { DashboardKtStabilityZone } from "../../../components/site/dashboard-kt-stability-zone";
import { DashboardShellHeader } from "../../../components/site/dashboard-shell-header";
import { clanWarsArchivePageCopy } from "../../../lib/site/content";
import { getClanWarsArchiveSnapshot } from "../../../server/dashboard/get-clan-wars-archive-snapshot";

export const dynamic = "force-dynamic";

export default async function ClanWarsArchivePage() {
  const snapshot = await getClanWarsArchiveSnapshot();

  return (
    <main className="dashboard-shell dashboard-shell--clan">
      <DashboardShellHeader
        title={clanWarsArchivePageCopy.title}
        titleKey={clanWarsArchivePageCopy.titleKey}
        subtitle={clanWarsArchivePageCopy.subtitle}
        subtitleKey={clanWarsArchivePageCopy.subtitleKey}
        generatedAt={snapshot.generatedAt}
      />

      <DashboardKtHeaderZone header={snapshot.header} />
      <DashboardKtHistoryZone history={snapshot.history} />

      <section className="dashboard-kt-grid">
        <DashboardKtStabilityZone rows={snapshot.stability} />
        <DashboardKtDeclineZone rows={snapshot.decline} />
      </section>
    </main>
  );
}
