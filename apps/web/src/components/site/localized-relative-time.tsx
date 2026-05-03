"use client";

import React, { useMemo, useSyncExternalStore } from "react";
import { useOptionalLocale } from "./locale-provider";

type LocalizedRelativeTimeProps = {
  targetIso: string;
  nowIso?: string;
};

const subscribe = () => () => undefined;

const useHydrated = (): boolean =>
  useSyncExternalStore(subscribe, () => true, () => false);

export function LocalizedRelativeTime({
  targetIso,
  nowIso
}: LocalizedRelativeTimeProps) {
  const localeContext = useOptionalLocale();
  const locale = localeContext?.locale ?? "ru-RU";
  const hydrated = useHydrated();

  const text = useMemo(() => {
    if (!hydrated) {
      return "—";
    }

    const target = new Date(targetIso);
    const now = nowIso ? new Date(nowIso) : new Date();

    if (Number.isNaN(target.valueOf()) || Number.isNaN(now.valueOf())) {
      return "—";
    }

    const minutes = Math.round((target.valueOf() - now.valueOf()) / 60_000);

    try {
      const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
      return formatter.format(minutes, "minute");
    } catch {
      return "—";
    }
  }, [hydrated, locale, nowIso, targetIso]);

  return <span suppressHydrationWarning>{text}</span>;
}
