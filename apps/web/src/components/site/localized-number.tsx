"use client";

import React, { useMemo, useSyncExternalStore } from "react";
import { DEFAULT_LANGUAGE, LANGUAGE_TO_LOCALE } from "../../lib/i18n/languages";
import { useOptionalLocale } from "./locale-provider";

type LocalizedNumberProps = {
  value: number;
  notation?: Intl.NumberFormatOptions["notation"];
  compactDisplay?: Intl.NumberFormatOptions["compactDisplay"];
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
};

const subscribe = () => () => undefined;

const useHydrated = (): boolean =>
  useSyncExternalStore(subscribe, () => true, () => false);

export function LocalizedNumber({
  value,
  notation,
  compactDisplay,
  maximumFractionDigits,
  minimumFractionDigits
}: LocalizedNumberProps) {
  const localeContext = useOptionalLocale();
  const locale = localeContext?.locale ?? LANGUAGE_TO_LOCALE[DEFAULT_LANGUAGE];
  const hydrated = useHydrated();

  const options = useMemo<Intl.NumberFormatOptions>(
    () => ({
      notation,
      compactDisplay,
      maximumFractionDigits,
      minimumFractionDigits
    }),
    [compactDisplay, maximumFractionDigits, minimumFractionDigits, notation]
  );

  const text = useMemo(() => {
    if (!hydrated) {
      return "—";
    }

    try {
      return new Intl.NumberFormat(locale, options).format(value);
    } catch {
      return String(value);
    }
  }, [hydrated, locale, options, value]);

  return <span suppressHydrationWarning>{text}</span>;
}
