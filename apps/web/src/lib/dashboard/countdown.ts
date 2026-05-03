export type CountdownUnits = {
  dayShort: string;
  hourShort: string;
  minuteShort: string;
  secondShort: string;
};

export const formatCountdown = (msRemaining: number, units: CountdownUnits) => {
  const safe = Math.max(0, msRemaining);

  if (safe >= 3_600_000) {
    const days = Math.floor(safe / 86_400_000);
    const hours = Math.floor((safe % 86_400_000) / 3_600_000);
    return `${days}${units.dayShort} ${hours}${units.hourShort}`;
  }

  const minutes = Math.floor(safe / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1_000);
  return `${minutes}${units.minuteShort} ${seconds}${units.secondShort}`;
};

export const getNextTickMs = (msRemaining: number) =>
  msRemaining < 3_600_000 ? 1_000 : 60_000;
