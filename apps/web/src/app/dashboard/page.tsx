import React from "react";
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
