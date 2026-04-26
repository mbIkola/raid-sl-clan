import React from "react";
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
