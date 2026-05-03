"use client";

import React, { useEffect, useMemo, useState } from "react";

type LocalizedNumberProps = {
  value: number;
  locale?: string;
  notation?: Intl.NumberFormatOptions["notation"];
  compactDisplay?: Intl.NumberFormatOptions["compactDisplay"];
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
};

const formatNumber = (
  value: number,
  locale: string | undefined,
  options: Intl.NumberFormatOptions
) => {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return String(value);
  }
};

export function LocalizedNumber({
  value,
  locale,
  notation,
  compactDisplay,
  maximumFractionDigits,
  minimumFractionDigits
}: LocalizedNumberProps) {
  const options = useMemo<Intl.NumberFormatOptions>(
    () => ({
      notation,
      compactDisplay,
      maximumFractionDigits,
      minimumFractionDigits
    }),
    [compactDisplay, maximumFractionDigits, minimumFractionDigits, notation]
  );

  const [text, setText] = useState(() => formatNumber(value, "en-US", options));

  useEffect(() => {
    const resolvedLocale = locale ?? Intl.NumberFormat().resolvedOptions().locale;
    setText(formatNumber(value, resolvedLocale, options));
  }, [locale, options, value]);

  return <span suppressHydrationWarning>{text}</span>;
}
