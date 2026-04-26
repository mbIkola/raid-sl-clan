import React from "react";
import Link from "next/link";
import type { ReactNode } from "react";

type AtmosphericLinkProps = {
  href: string;
  children: ReactNode;
  muted?: boolean;
};

export function AtmosphericLink({
  href,
  children,
  muted = false
}: AtmosphericLinkProps) {
  return (
    <Link
      href={href}
      className={muted ? "atmos-link atmos-link--muted" : "atmos-link"}
    >
      {children}
    </Link>
  );
}
