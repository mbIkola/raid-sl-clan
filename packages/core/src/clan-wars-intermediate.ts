export type ClanWarsWindowRef = {
  activityType: "clan_wars";
  eventStartAt: string;
  eventEndsAt: string;
};

export type ClanWarsApplyMeta = {
  hasPersonalRewards: boolean;
  opponentClanName: string | null;
  sourceKind: string;
  capturedAt: string;
  clanTotalPointsMine?: number;
};

export type ClanWarsApplyPlayerRow = {
  playerId: number;
  displayNameAtImport: string;
  points: number;
};

export type ClanWarsApplyRequest = {
  windowRef: ClanWarsWindowRef;
  meta: ClanWarsApplyMeta;
  rosterExpectation: {
    expectedCount: number;
  };
  players: ClanWarsApplyPlayerRow[];
};

export type ClanWarsApplyValidationCode =
  | "invalid-activity-type"
  | "invalid-window-timestamps"
  | "invalid-window-duration"
  | "roster-size-mismatch"
  | "duplicate-player-id"
  | "invalid-player-points"
  | "invalid-player-id"
  | "invalid-total-points";

export type ClanWarsApplyValidationIssue = {
  code: ClanWarsApplyValidationCode;
  message: string;
};

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export function normalizeRosterAlias(alias: string): string {
  return alias
    .trim()
    .toLowerCase()
    .replaceAll("ё", "е")
    .replaceAll("і", "i")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function validateClanWarsApplyRequest(
  request: ClanWarsApplyRequest
): ClanWarsApplyValidationIssue[] {
  const issues: ClanWarsApplyValidationIssue[] = [];

  if (request.windowRef.activityType !== "clan_wars") {
    issues.push({
      code: "invalid-activity-type",
      message: "windowRef.activityType must be clan_wars",
    });
  }

  const startMs = Date.parse(request.windowRef.eventStartAt);
  const endMs = Date.parse(request.windowRef.eventEndsAt);
  const hasValidTimestamps =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;

  if (!hasValidTimestamps) {
    issues.push({
      code: "invalid-window-timestamps",
      message: "window timestamps must be valid and end must be after start",
    });
  } else if (endMs - startMs !== FORTY_EIGHT_HOURS_MS) {
    issues.push({
      code: "invalid-window-duration",
      message: "window duration must be exactly 48 hours",
    });
  }

  if (request.players.length !== request.rosterExpectation.expectedCount) {
    issues.push({
      code: "roster-size-mismatch",
      message: "players length must match rosterExpectation.expectedCount",
    });
  }

  const seenPlayerIds = new Set<number>();
  let totalPoints = 0;
  let hasInvalidPlayerPoints = false;

  for (const player of request.players) {
    if (!Number.isInteger(player.playerId) || player.playerId <= 0) {
      issues.push({
        code: "invalid-player-id",
        message: "playerId must be a positive integer",
      });
    } else {
      if (seenPlayerIds.has(player.playerId)) {
        issues.push({
          code: "duplicate-player-id",
          message: "playerId values must be unique",
        });
      }
      seenPlayerIds.add(player.playerId);
    }

    if (!Number.isInteger(player.points) || player.points < 0) {
      hasInvalidPlayerPoints = true;
      issues.push({
        code: "invalid-player-points",
        message: "points must be an integer greater than or equal to 0",
      });
    } else {
      totalPoints += player.points;
    }
  }

  if (
    !hasInvalidPlayerPoints &&
    typeof request.meta.clanTotalPointsMine === "number" &&
    totalPoints !== request.meta.clanTotalPointsMine
  ) {
    issues.push({
      code: "invalid-total-points",
      message: "sum(players.points) must match meta.clanTotalPointsMine",
    });
  }

  return issues;
}

export type LocalCalendarDate = {
  year: number;
  month: number;
  day: number;
};

export function parseLocalDateFromScreenshotFileName(
  fileName: string
): LocalCalendarDate | null {
  const match = fileName.match(/^(\d{2})\.(\d{2})\.(\d{2})/);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = 2000 + Number(match[3]);

  if (!Number.isInteger(day) || !Number.isInteger(month)) {
    return null;
  }

  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  const parsedUtcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    parsedUtcDate.getUTCFullYear() !== year ||
    parsedUtcDate.getUTCMonth() + 1 !== month ||
    parsedUtcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
  };
}
