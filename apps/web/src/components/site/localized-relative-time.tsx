"use client";

import React, { useMemo, useSyncExternalStore } from "react";
import { DEFAULT_LANGUAGE, LANGUAGE_TO_LOCALE } from "../../lib/i18n/languages";
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
  const locale = localeContext?.locale ?? LANGUAGE_TO_LOCALE[DEFAULT_LANGUAGE];
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

    const ms = target.valueOf() - now.valueOf();
    const absMs = Math.abs(ms);

    try {
      const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
      const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
        absMs < 60_000
          ? [Math.round(ms / 1_000), "second"]
          : absMs < 3_600_000
            ? [Math.round(ms / 60_000), "minute"]
            : absMs < 86_400_000
              ? [Math.round(ms / 3_600_000), "hour"]
              : [Math.round(ms / 86_400_000), "day"];
      return formatter.format(value, unit);
    } catch {
      return "—";
    }
  }, [hydrated, locale, nowIso, targetIso]);

  return <span suppressHydrationWarning>{text}</span>;
}
