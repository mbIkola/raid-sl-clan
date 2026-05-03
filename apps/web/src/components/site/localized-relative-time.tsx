"use client";

import React from "react";
import { useLocale } from "./locale-provider";

type LocalizedRelativeTimeProps = {
  targetIso: string;
  nowIso?: string;
};

export function LocalizedRelativeTime({
  targetIso,
  nowIso
}: LocalizedRelativeTimeProps) {
  const { locale } = useLocale();
  const target = new Date(targetIso);
  const now = nowIso ? new Date(nowIso) : new Date();

  if (Number.isNaN(target.valueOf()) || Number.isNaN(now.valueOf())) {
    return <span>—</span>;
  }

  const minutes = Math.round((target.valueOf() - now.valueOf()) / 60_000);

  try {
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    return <span>{formatter.format(minutes, "minute")}</span>;
  } catch {
    return <span>—</span>;
  }
}
