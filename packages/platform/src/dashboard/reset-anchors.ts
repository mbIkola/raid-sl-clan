type WeeklyUtcAnchorConfig = {
  dayOfWeek: number;
  hour: number;
  minute: number;
};

type ClanWarsTargetKind = "start" | "reset";
type ClanWarsAnchorState = {
  targetAt: string;
  targetKind: ClanWarsTargetKind;
  eventStartAt: string;
  eventEndsAt: string;
  hasPersonalRewards: boolean;
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

const clanWarsInitialStartUtc = "2026-05-05T09:00:00.000Z";
const clanWarsIntervalMs = 14 * 24 * 60 * 60 * 1000;
const clanWarsDurationMs = 48 * 60 * 60 * 1000;

const clanWarsPersonalRewardsStarts = new Set<string>([
  "2026-05-05T09:00:00.000Z"
]);

export const getNextHydraResetAnchorUtc = (nowIso: string) =>
  toNextWeeklyUtcAnchor(nowIso, hydraResetAnchor);

export const getNextChimeraResetAnchorUtc = (nowIso: string) =>
  toNextWeeklyUtcAnchor(nowIso, chimeraResetAnchor);

export const getNextWeeklyUtcAnchor = (
  nowIso: string,
  config: WeeklyUtcAnchorConfig
) => toNextWeeklyUtcAnchor(nowIso, config);

export const getClanWarsAnchorStateUtc = (nowIso: string): ClanWarsAnchorState => {
  const now = new Date(nowIso);
  const initialStart = new Date(clanWarsInitialStartUtc);

  if (Number.isNaN(now.valueOf())) {
    throw new Error(`Invalid nowIso for clan wars anchor: ${nowIso}`);
  }

  if (Number.isNaN(initialStart.valueOf())) {
    throw new Error(`Invalid clan wars initial anchor: ${clanWarsInitialStartUtc}`);
  }

  if (now.valueOf() < initialStart.valueOf()) {
    const eventStartAt = initialStart.toISOString();
    const eventEndsAt = new Date(initialStart.valueOf() + clanWarsDurationMs).toISOString();

    return {
      targetAt: eventStartAt,
      targetKind: "start",
      eventStartAt,
      eventEndsAt,
      hasPersonalRewards: clanWarsPersonalRewardsStarts.has(eventStartAt)
    };
  }

  const elapsedMs = now.valueOf() - initialStart.valueOf();
  const cyclesElapsed = Math.floor(elapsedMs / clanWarsIntervalMs);
  const eventStart = new Date(initialStart.valueOf() + cyclesElapsed * clanWarsIntervalMs);
  const eventEnd = new Date(eventStart.valueOf() + clanWarsDurationMs);

  if (now.valueOf() < eventEnd.valueOf()) {
    const eventStartAt = eventStart.toISOString();
    const eventEndsAt = eventEnd.toISOString();

    return {
      targetAt: eventEndsAt,
      targetKind: "reset",
      eventStartAt,
      eventEndsAt,
      hasPersonalRewards: clanWarsPersonalRewardsStarts.has(eventStartAt)
    };
  }

  const nextStart = new Date(eventStart.valueOf() + clanWarsIntervalMs);
  const nextEnd = new Date(nextStart.valueOf() + clanWarsDurationMs);
  const eventStartAt = nextStart.toISOString();
  const eventEndsAt = nextEnd.toISOString();

  return {
    targetAt: eventStartAt,
    targetKind: "start",
    eventStartAt,
    eventEndsAt,
    hasPersonalRewards: clanWarsPersonalRewardsStarts.has(eventStartAt)
  };
};
