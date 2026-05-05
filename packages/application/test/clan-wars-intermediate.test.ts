import { describe, expect, it, vi } from "vitest";
import {
  createApplyClanWarsIntermediateResults,
  createCreateClanWarsPlayers,
  createGetClanWarsIntermediateRoster,
} from "@raid/application";
import type { ClanWarsIntermediateRepository, ClanWarsRosterRow } from "@raid/ports";
import type { ClanWarsApplyRequest } from "@raid/core";

describe("clan wars intermediate use-cases", () => {
  it("returns active roster by default and calls getRoster({includeInactive:false})", async () => {
    const roster: ClanWarsRosterRow[] = [
      {
        playerId: 1,
        mainNickname: "Morrigan",
        aliases: ["Morrigan"],
        status: "active",
      },
    ];

    const repository: ClanWarsIntermediateRepository = {
      getRoster: vi.fn<ClanWarsIntermediateRepository["getRoster"]>(async ({ includeInactive }) =>
        includeInactive ? roster : roster.filter((row) => row.status === "active"),
      ),
      createPlayers: vi.fn(async () => []),
      applyResults: vi.fn(async () => ({
        competitionWindowId: 0,
        clanWarsReportId: 0,
        replacedRows: 0,
      })),
    };

    const getRoster = createGetClanWarsIntermediateRoster({ repository });
    const result = await getRoster();

    expect(repository.getRoster).toHaveBeenCalledWith({ includeInactive: false });
    expect(result).toEqual(roster);
  });

  it("returns roster with inactive members when includeInactive=true", async () => {
    const roster: ClanWarsRosterRow[] = [
      {
        playerId: 1,
        mainNickname: "Morrigan",
        aliases: ["Morrigan"],
        status: "active",
      },
      {
        playerId: 2,
        mainNickname: "Alistair",
        aliases: ["Alistair"],
        status: "inactive",
      },
    ];

    const repository: ClanWarsIntermediateRepository = {
      getRoster: vi.fn<ClanWarsIntermediateRepository["getRoster"]>(async ({ includeInactive }) =>
        includeInactive ? roster : roster.filter((row) => row.status === "active"),
      ),
      createPlayers: vi.fn(async () => []),
      applyResults: vi.fn(async () => ({
        competitionWindowId: 0,
        clanWarsReportId: 0,
        replacedRows: 0,
      })),
    };

    const getRoster = createGetClanWarsIntermediateRoster({ repository });
    const result = await getRoster({ includeInactive: true });

    expect(repository.getRoster).toHaveBeenCalledWith({ includeInactive: true });
    expect(result).toEqual(roster);
  });

  it("creates players through repository and returns created", async () => {
    const players = [{ mainNickname: "Flemeth", aliases: ["Flemeth"] }];
    const created = [{ playerId: 42, mainNickname: "Flemeth", aliases: ["Flemeth"] }];

    const repository: ClanWarsIntermediateRepository = {
      getRoster: vi.fn<ClanWarsIntermediateRepository["getRoster"]>(async () => []),
      createPlayers: vi.fn(async () => created),
      applyResults: vi.fn(async () => ({
        competitionWindowId: 0,
        clanWarsReportId: 0,
        replacedRows: 0,
      })),
    };

    const createPlayers = createCreateClanWarsPlayers({ repository });
    const result = await createPlayers({ players });

    expect(repository.createPlayers).toHaveBeenCalledWith({ players });
    expect(result).toEqual({ created });
  });

  it("applies valid results through repository and returns repository result", async () => {
    const request: ClanWarsApplyRequest = {
      windowRef: {
        activityType: "clan_wars",
        eventStartAt: "2026-05-05T09:00:00.000Z",
        eventEndsAt: "2026-05-07T09:00:00.000Z",
      },
      meta: {
        hasPersonalRewards: true,
        opponentClanName: "Darkspawn",
        sourceKind: "manual",
        capturedAt: "2026-05-05T09:05:00.000Z",
      },
      rosterExpectation: {
        expectedCount: 1,
      },
      players: [
        {
          playerId: 1,
          displayNameAtImport: "Morrigan",
          points: 1234,
        },
      ],
    };

    const applied = {
      competitionWindowId: 10,
      clanWarsReportId: 20,
      replacedRows: 30,
    };

    const repository: ClanWarsIntermediateRepository = {
      getRoster: vi.fn<ClanWarsIntermediateRepository["getRoster"]>(async () => []),
      createPlayers: vi.fn(async () => []),
      applyResults: vi.fn(async () => applied),
    };

    const applyResults = createApplyClanWarsIntermediateResults({ repository });
    const result = await applyResults(request);

    expect(repository.applyResults).toHaveBeenCalledWith({ request });
    expect(result).toEqual(applied);
  });

  it("rejects invalid apply payload (roster expectedCount mismatch) and does not call repository.applyResults", async () => {
    const repository: ClanWarsIntermediateRepository = {
      getRoster: vi.fn<ClanWarsIntermediateRepository["getRoster"]>(async () => []),
      createPlayers: vi.fn(async () => []),
      applyResults: vi.fn(async () => ({
        competitionWindowId: 0,
        clanWarsReportId: 0,
        replacedRows: 0,
      })),
    };

    const applyResults = createApplyClanWarsIntermediateResults({ repository });

    await expect(
      applyResults({
        windowRef: {
          activityType: "clan_wars",
          eventStartAt: "2026-05-05T09:00:00.000Z",
          eventEndsAt: "2026-05-07T09:00:00.000Z",
        },
        meta: {
          hasPersonalRewards: true,
          opponentClanName: "Darkspawn",
          sourceKind: "manual",
          capturedAt: "2026-05-05T09:05:00.000Z",
        },
        rosterExpectation: {
          expectedCount: 2,
        },
        players: [
          {
            playerId: 1,
            displayNameAtImport: "Morrigan",
            points: 1234,
          },
        ],
      })
    ).rejects.toThrow("roster-size-mismatch");

    expect(repository.applyResults).not.toHaveBeenCalled();
  });
});
