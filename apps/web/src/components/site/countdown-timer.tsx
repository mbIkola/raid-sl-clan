"use client";

import React, { useEffect, useRef, useState } from "react";
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

      setValue(formatCountdown(msRemaining));
      timer = setTimeout(tick, getNextTickMs(msRemaining));
    };

    endTriggeredRef.current = false;
    tick();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [targetIso, endedLabel, onTimerEnd]);

  return <span>{value}</span>;
}
