"use client";

import React from "react";
import { useTranslation } from "react-i18next";

type BrandMarkProps = {
  label?: string;
};

export function BrandMark({ label }: BrandMarkProps) {
  const { t, ready } = useTranslation("common", { useSuspense: false });
  const resolvedLabel =
    label ?? (ready ? t("appName", { defaultValue: "Raid SL Clan" }) : "Raid SL Clan");

  return (
    <div className="brand-mark">
      <span className="brand-mark__dot" aria-hidden="true" />
      <span>{resolvedLabel}</span>
    </div>
  );
}
