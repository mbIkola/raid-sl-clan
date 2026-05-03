"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatCountdown, getNextTickMs } from "../../lib/dashboard/countdown";

type CountdownTimerProps = {
  targetIso: string | null;
  endedLabel: string;
  onTimerEnd?: () => void;
};

export function CountdownTimer({
  targetIso,
  endedLabel,
  onTimerEnd
}: CountdownTimerProps) {
  const { t, i18n, ready } = useTranslation("units", { useSuspense: false });
  const [value, setValue] = useState("—");
  const endTriggeredRef = useRef(false);

  useEffect(() => {
    if (!targetIso) {
      setValue("—");
      return;
    }

    const target = new Date(targetIso);
    if (Number.isNaN(target.valueOf())) {
      console.warn("[dashboard/countdown] invalid-target", { targetIso });
      setValue("—");
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const units = ready
      ? {
          dayShort: t("dayShort", { defaultValue: "d" }),
          hourShort: t("hourShort", { defaultValue: "h" }),
          minuteShort: t("minuteShort", { defaultValue: "m" }),
          secondShort: t("secondShort", { defaultValue: "s" })
        }
      : {
          dayShort: "d",
          hourShort: "h",
          minuteShort: "m",
          secondShort: "s"
        };

    const tick = () => {
      const msRemaining = target.valueOf() - Date.now();

      if (msRemaining <= 0) {
        setValue(endedLabel);

        if (!endTriggeredRef.current) {
          endTriggeredRef.current = true;
          onTimerEnd?.();
        }

        return;
      }

      setValue(formatCountdown(msRemaining, units));
      timer = setTimeout(tick, getNextTickMs(msRemaining));
    };

    endTriggeredRef.current = false;
    tick();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [endedLabel, i18n.resolvedLanguage, onTimerEnd, ready, t, targetIso]);

  return <span>{value}</span>;
}
