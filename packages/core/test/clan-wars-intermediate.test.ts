import { describe, expect, it } from "vitest";
import {
  normalizeRosterAlias,
  parseLocalDateFromScreenshotFileName,
  validateClanWarsApplyRequest,
  type ClanWarsApplyRequest,
} from "@raid/core";

function buildValidRequest(): ClanWarsApplyRequest {
  return {
    windowRef: {
      activityType: "clan_wars",
      eventStartAt: "2026-05-05T09:00:00.000Z",
      eventEndsAt: "2026-05-07T09:00:00.000Z",
    },
    rosterExpectation: {
      expectedCount: 2,
    },
    meta: {
      hasPersonalRewards: true,
      opponentClanName: "Opponents",
      sourceKind: "manual_upload",
      capturedAt: "2026-05-05T09:01:00.000Z",
      clanTotalPointsMine: 30,
    },
    players: [
      {
        playerId: 101,
        displayNameAtImport: "  [ВІБР] mykola  ",
        points: 10,
      },
      {
        playerId: 202,
        displayNameAtImport: "NikR0man",
        points: 20,
      },
    ],
  };
}

function issueCodes(request: ClanWarsApplyRequest): string[] {
  return validateClanWarsApplyRequest(request).map((issue) => issue.code);
}

describe("validateClanWarsApplyRequest", () => {
  it("returns no issues for a valid payload", () => {
    expect(validateClanWarsApplyRequest(buildValidRequest())).toEqual([]);
  });

  it("returns roster-size-mismatch when expected count differs", () => {
    const request = buildValidRequest();
    request.rosterExpectation.expectedCount = 3;

    expect(issueCodes(request)).toEqual(["roster-size-mismatch"]);
  });

  it("returns duplicate-player-id when player ids repeat", () => {
    const request = buildValidRequest();
    request.players[1] = { ...request.players[1], playerId: request.players[0].playerId };

    expect(issueCodes(request)).toEqual(["duplicate-player-id"]);
  });

  it("returns invalid-window-duration for non-48h windows", () => {
    const request = buildValidRequest();
    request.windowRef.eventEndsAt = "2026-05-07T08:00:00.000Z";

    expect(issueCodes(request)).toEqual(["invalid-window-duration"]);
  });

  it("returns invalid-activity-type when activity is not clan_wars", () => {
    const request = buildValidRequest();
    (request.windowRef as { activityType: string }).activityType = "arena";

    expect(issueCodes(request)).toEqual(["invalid-activity-type"]);
  });

  it("returns invalid-window-timestamps for invalid timestamps", () => {
    const request = buildValidRequest();
    request.windowRef.eventEndsAt = "not-a-timestamp";

    expect(issueCodes(request)).toEqual(["invalid-window-timestamps"]);
  });

  it("returns invalid-player-id for non-positive or non-integer ids", () => {
    const request = buildValidRequest();
    request.players[0] = { ...request.players[0], playerId: 0 };

    expect(issueCodes(request)).toEqual(["invalid-player-id"]);
  });

  it("returns invalid-player-points and does not emit derivative invalid-total-points", () => {
    const request = buildValidRequest();
    request.players[0] = { ...request.players[0], points: -1 };

    expect(issueCodes(request)).toEqual(["invalid-player-points"]);
  });

  it("returns invalid-total-points when valid row sums do not match declared total", () => {
    const request = buildValidRequest();
    request.meta.clanTotalPointsMine = 999;

    expect(issueCodes(request)).toEqual(["invalid-total-points"]);
  });
});

describe("normalizeRosterAlias", () => {
  it("normalizes aliases with trim/lower/replacements", () => {
    expect(normalizeRosterAlias("  [ВІБР] mykola  ")).toBe("вiбрmykola");
    expect(normalizeRosterAlias("NikR0man")).toBe("nikr0man");
  });
});

describe("parseLocalDateFromScreenshotFileName", () => {
  it("parses dd.mm.yy screenshot names to local calendar date", () => {
    expect(parseLocalDateFromScreenshotFileName("08.05.26.jpg")).toEqual({
      year: 2026,
      month: 5,
      day: 8,
    });
  });

  it("returns null for unsupported file name formats", () => {
    expect(parseLocalDateFromScreenshotFileName("may-8-clanwars-report.jpg")).toBeNull();
  });

  it("returns null for impossible calendar dates", () => {
    expect(parseLocalDateFromScreenshotFileName("31.02.26.jpg")).toBeNull();
  });
});
