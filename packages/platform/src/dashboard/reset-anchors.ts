type WeeklyUtcAnchorConfig = {
  dayOfWeek: number;
  hour: number;
  minute: number;
};

const toNextWeeklyUtcAnchor = (
  nowIso: string,
  config: WeeklyUtcAnchorConfig
): string => {
  const now = new Date(nowIso);

  if (Number.isNaN(now.valueOf())) {
    throw new Error(`Invalid nowIso for weekly UTC anchor: ${nowIso}`);
  }

  const anchor = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      config.hour,
      config.minute,
      0,
      0
    )
  );

  const dayOffset = (config.dayOfWeek - now.getUTCDay() + 7) % 7;
  anchor.setUTCDate(anchor.getUTCDate() + dayOffset);

  if (anchor.valueOf() <= now.valueOf()) {
    anchor.setUTCDate(anchor.getUTCDate() + 7);
  }

  return anchor.toISOString();
};

const hydraResetAnchor: WeeklyUtcAnchorConfig = {
  dayOfWeek: 3, // Wednesday
  hour: 8,
  minute: 0
};

const chimeraResetAnchor: WeeklyUtcAnchorConfig = {
  dayOfWeek: 4, // Thursday
  hour: 11,
  minute: 30
};

export const getNextHydraResetAnchorUtc = (nowIso: string) =>
  toNextWeeklyUtcAnchor(nowIso, hydraResetAnchor);

export const getNextChimeraResetAnchorUtc = (nowIso: string) =>
  toNextWeeklyUtcAnchor(nowIso, chimeraResetAnchor);

export const getNextWeeklyUtcAnchor = (
  nowIso: string,
  config: WeeklyUtcAnchorConfig
) => toNextWeeklyUtcAnchor(nowIso, config);
