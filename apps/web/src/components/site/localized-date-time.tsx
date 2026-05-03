"use client";

import React from "react";
import { formatIsoForZone } from "../../lib/dashboard/date-time";
import { useLocale as readLocaleContext } from "./locale-provider";

type LocalizedDateTimeProps = {
  iso: string | null;
};

const useLocaleContextOrFallback = (): { locale: string; timeZone: string } => {
  try {
    const { locale, timeZone } = readLocaleContext();
    return { locale, timeZone };
  } catch {
    return { locale: "ru-RU", timeZone: "UTC" };
  }
};

export function LocalizedDateTime({ iso }: LocalizedDateTimeProps) {
  const { locale, timeZone } = useLocaleContextOrFallback();

  return <span>{formatIsoForZone(iso, timeZone, locale)}</span>;
}
