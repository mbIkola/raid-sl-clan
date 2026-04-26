import React from "react";

type BrandMarkProps = {
  label?: string;
};

export function BrandMark({
  label = "Raid SL Clan"
}: BrandMarkProps) {
  return (
    <div className="brand-mark">
      <span className="brand-mark__dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
