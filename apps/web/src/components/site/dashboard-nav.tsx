import React from "react";
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
