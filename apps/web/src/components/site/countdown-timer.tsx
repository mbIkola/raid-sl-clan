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
  const completedTargetIsoRef = useRef<string | null>(null);
  const targetEpoch = React.useMemo(() => {
    if (!targetIso) {
      return null;
    }

    const parsed = Date.parse(targetIso);
    return Number.isNaN(parsed) ? null : parsed;
  }, [targetIso]);
  const hasInvalidTargetIso = Boolean(targetIso) && targetEpoch === null;

  useEffect(() => {
    if (!targetIso) {
      return;
    }

    if (targetEpoch === null) {
      console.warn("[dashboard/countdown] invalid-target", { targetIso });
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
      const msRemaining = targetEpoch - Date.now();

      if (msRemaining <= 0) {
        setValue(endedLabel);

        if (completedTargetIsoRef.current !== targetIso) {
          completedTargetIsoRef.current = targetIso;
          onTimerEnd?.();
        }

        return;
      }

      setValue(formatCountdown(msRemaining, units));
      timer = setTimeout(tick, getNextTickMs(msRemaining));
    };

    tick();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [endedLabel, i18n.resolvedLanguage, onTimerEnd, ready, t, targetEpoch, targetIso]);

  if (!targetIso || hasInvalidTargetIso) {
    return <span>—</span>;
  }

  return <span>{value}</span>;
}
