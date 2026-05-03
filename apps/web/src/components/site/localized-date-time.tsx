"use client";

import React, { useMemo, useSyncExternalStore } from "react";
import { formatIsoForZone } from "../../lib/dashboard/date-time";
import { useOptionalLocale } from "./locale-provider";

type LocalizedDateTimeProps = {
  iso: string | null;
};

const subscribe = () => () => undefined;

const useHydrated = (): boolean =>
  useSyncExternalStore(subscribe, () => true, () => false);

export function LocalizedDateTime({ iso }: LocalizedDateTimeProps) {
  const localeContext = useOptionalLocale();
  const locale = localeContext?.locale ?? "ru-RU";
  const timeZone = localeContext?.timeZone ?? "UTC";
  const hydrated = useHydrated();

  const text = useMemo(
    () => (hydrated ? formatIsoForZone(iso, timeZone, locale) : "—"),
    [hydrated, iso, locale, timeZone]
  );

  return <span suppressHydrationWarning>{text}</span>;
}
