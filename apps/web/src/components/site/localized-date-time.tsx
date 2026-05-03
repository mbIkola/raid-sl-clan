"use client";

import React, { useMemo } from "react";
import { formatIsoForZone } from "../../lib/dashboard/date-time";

type LocalizedDateTimeProps = {
  iso: string | null;
  locale?: string;
  timeZone?: string;
};

export function LocalizedDateTime({
  iso,
  locale,
  timeZone
}: LocalizedDateTimeProps) {
  const text = useMemo(() => {
    const resolvedTimeZone =
      timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

    return formatIsoForZone(iso, resolvedTimeZone, locale);
  }, [iso, locale, timeZone]);

  return <span>{text}</span>;
}
