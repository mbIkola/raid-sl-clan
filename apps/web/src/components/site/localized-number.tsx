"use client";

import React, { useMemo } from "react";
import { useLocale as readLocaleContext } from "./locale-provider";

type LocalizedNumberProps = {
  value: number;
  notation?: Intl.NumberFormatOptions["notation"];
  compactDisplay?: Intl.NumberFormatOptions["compactDisplay"];
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
};

const useLocaleOrFallback = (): string => {
  try {
    return readLocaleContext().locale;
  } catch {
    return "ru-RU";
  }
};

export function LocalizedNumber({
  value,
  notation,
  compactDisplay,
  maximumFractionDigits,
  minimumFractionDigits
}: LocalizedNumberProps) {
  const locale = useLocaleOrFallback();

  const text = useMemo(() => {
    try {
      return new Intl.NumberFormat(locale, {
        notation,
        compactDisplay,
        maximumFractionDigits,
        minimumFractionDigits
      }).format(value);
    } catch {
      return String(value);
    }
  }, [compactDisplay, locale, maximumFractionDigits, minimumFractionDigits, notation, value]);

  return <span>{text}</span>;
}
