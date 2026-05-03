"use client";

import React, { useEffect, useState } from "react";
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
  const [text, setText] = useState("—");

  useEffect(() => {
    const resolvedTimeZone =
      timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

    setText(formatIsoForZone(iso, resolvedTimeZone, locale));
  }, [iso, locale, timeZone]);

  return <span>{text}</span>;
}
