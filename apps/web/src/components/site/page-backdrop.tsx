import React from "react";
import type { CSSProperties, ReactNode } from "react";

type PageBackdropProps = {
  imagePath: string;
  children: ReactNode;
};

export function PageBackdrop({ imagePath, children }: PageBackdropProps) {
  return (
    <main
      className="page-backdrop"
      style={{ "--page-image": `url(${imagePath})` } as CSSProperties}
    >
      <div className="page-backdrop__inner">{children}</div>
    </main>
  );
}
