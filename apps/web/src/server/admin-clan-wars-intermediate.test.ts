import {
  createApplyClanWarsIntermediateResults,
  createCreateClanWarsPlayers,
  createGetClanWarsIntermediateRoster
} from "@raid/application";
import {
  ClanWarsUnknownPlayerIdError,
  createD1ClanWarsIntermediateRepository,
  verifyAdminToken
} from "@raid/platform";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleClanWarsIntermediateRequest } from "./admin-clan-wars-intermediate";

vi.mock("@raid/application", () => ({
  createGetClanWarsIntermediateRoster: vi.fn(),
  createCreateClanWarsPlayers: vi.fn(),
  createApplyClanWarsIntermediateResults: vi.fn()
}));

vi.mock("@raid/platform", () => ({
  ClanWarsUnknownPlayerIdError: class ClanWarsUnknownPlayerIdError extends Error {
    readonly playerIds: number[];

    constructor(playerIds: number[]) {
      super(`unknown-player-id:${playerIds.join(",")}`);
      this.name = "ClanWarsUnknownPlayerIdError";
      this.playerIds = playerIds;
    }
  },
  verifyAdminToken: vi.fn(),
  createD1ClanWarsIntermediateRepository: vi.fn()
}));

describe("handleClanWarsIntermediateRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRepository = () =>
    ({
      getRoster: vi.fn(),
      createPlayers: vi.fn(),
      applyResults: vi.fn()
    }) as unknown as ReturnType<typeof createD1ClanWarsIntermediateRepository>;

  const createValidApplyPayload = () => ({
    windowRef: {
      activityType: "clan_wars" as const,
      eventStartAt: "2026-05-05T09:00:00.000Z",
      eventEndsAt: "2026-05-07T09:00:00.000Z"
    },
    meta: {
      hasPersonalRewards: true,
      opponentClanName: null,
      sourceKind: "manual",
      capturedAt: "2026-05-05T09:10:00.000Z"
    },
    rosterExpectation: {
      expectedCount: 1
    },
    players: [
      {
        playerId: 1,
        displayNameAtImport: "Morrigan",
        points: 100
      }
    ]
  });

  it("returns 401 when admin token is missing", async () => {
    const db = {} as D1Database;

    vi.mocked(verifyAdminToken).mockReturnValue(false);

    const response = await handleClanWarsIntermediateRequest({
      request: new Request("https://raid.example/api/admin/clan-wars/intermediate/roster"),
      env: {
        DB: db,
        ADMIN_INGEST_TOKEN: "expected-token"
      },
      action: "roster"
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "invalid-admin-token"
    });
    expect(verifyAdminToken).toHaveBeenCalledWith({
      expectedToken: "expected-token",
      receivedToken: null
    });
    expect(createD1ClanWarsIntermediateRepository).not.toHaveBeenCalled();
  });

  it("returns 200 for authorized roster request", async () => {
    const db = {} as D1Database;
    const players = [
      {
        playerId: 1,
        mainNickname: "Morrigan",
        aliases: ["Witch"],
        status: "active" as const
      }
    ];
    const repository = createRepository();
    const getRoster = vi.fn().mockResolvedValue(players);

    vi.mocked(verifyAdminToken).mockReturnValue(true);
    vi.mocked(createD1ClanWarsIntermediateRepository).mockReturnValue(repository);
    vi.mocked(createGetClanWarsIntermediateRoster).mockReturnValue(getRoster);
    vi.mocked(createCreateClanWarsPlayers).mockReturnValue(vi.fn());
    vi.mocked(createApplyClanWarsIntermediateResults).mockReturnValue(vi.fn());

    const response = await handleClanWarsIntermediateRequest({
      request: new Request(
        "https://raid.example/api/admin/clan-wars/intermediate/roster?includeInactive=1"
      ),
      env: {
        DB: db,
        ADMIN_INGEST_TOKEN: "expected-token"
      },
      action: "roster"
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      players
    });
    expect(verifyAdminToken).toHaveBeenCalledWith({
      expectedToken: "expected-token",
      receivedToken: null
    });
    expect(createD1ClanWarsIntermediateRepository).toHaveBeenCalledWith(db);
    expect(createGetClanWarsIntermediateRoster).toHaveBeenCalledWith({
      repository
    });
    expect(getRoster).toHaveBeenCalledWith({
      includeInactive: true
    });
  });

  it("returns 500 for roster runtime failure", async () => {
    const db = {} as D1Database;
    const repository = createRepository();
    const getRoster = vi.fn().mockRejectedValue(new Error("d1-down"));

    vi.mocked(verifyAdminToken).mockReturnValue(true);
    vi.mocked(createD1ClanWarsIntermediateRepository).mockReturnValue(repository);
    vi.mocked(createGetClanWarsIntermediateRoster).mockReturnValue(getRoster);
    vi.mocked(createCreateClanWarsPlayers).mockReturnValue(vi.fn());
    vi.mocked(createApplyClanWarsIntermediateResults).mockReturnValue(vi.fn());

    const response = await handleClanWarsIntermediateRequest({
      request: new Request("https://raid.example/api/admin/clan-wars/intermediate/roster"),
      env: {
        DB: db,
        ADMIN_INGEST_TOKEN: "expected-token"
      },
      action: "roster"
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "roster-fetch-failed"
    });
  });

  it("returns 400 for invalid JSON in players action", async () => {
    const db = {} as D1Database;
    const repository = createRepository();

    vi.mocked(verifyAdminToken).mockReturnValue(true);
    vi.mocked(createD1ClanWarsIntermediateRepository).mockReturnValue(repository);
    vi.mocked(createCreateClanWarsPlayers).mockReturnValue(vi.fn());

    const response = await handleClanWarsIntermediateRequest({
      request: new Request("https://raid.example/api/admin/clan-wars/intermediate/players", {
        method: "POST",
        body: "{bad json"
      }),
      env: {
        DB: db,
        ADMIN_INGEST_TOKEN: "expected-token"
      },
      action: "players"
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "invalid-json"
    });
    expect(createCreateClanWarsPlayers).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid players payload", async () => {
    const db = {} as D1Database;
    const repository = createRepository();

    vi.mocked(verifyAdminToken).mockReturnValue(true);
    vi.mocked(createD1ClanWarsIntermediateRepository).mockReturnValue(repository);
    vi.mocked(createCreateClanWarsPlayers).mockReturnValue(vi.fn());

    const response = await handleClanWarsIntermediateRequest({
      request: new Request("https://raid.example/api/admin/clan-wars/intermediate/players", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ notPlayers: [] })
      }),
      env: {
        DB: db,
        ADMIN_INGEST_TOKEN: "expected-token"
      },
      action: "players"
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "invalid-players-payload"
    });
    expect(createCreateClanWarsPlayers).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed players item payload", async () => {
    const db = {} as D1Database;
    const repository = createRepository();

    vi.mocked(verifyAdminToken).mockReturnValue(true);
    vi.mocked(createD1ClanWarsIntermediateRepository).mockReturnValue(repository);
    vi.mocked(createCreateClanWarsPlayers).mockReturnValue(vi.fn());

    const response = await handleClanWarsIntermediateRequest({
      request: new Request("https://raid.example/api/admin/clan-wars/intermediate/players", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          players: [
            {
              mainNickname: "Morrigan",
              aliases: ["Witch", 42]
            }
          ]
        })
      }),
      env: {
        DB: db,
        ADMIN_INGEST_TOKEN: "expected-token"
      },
      action: "players"
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "invalid-players-payload"
    });
    expect(createCreateClanWarsPlayers).not.toHaveBeenCalled();
  });

  it("returns 500 for players runtime failure", async () => {
    const db = {} as D1Database;
    const repository = createRepository();
    const createPlayers = vi.fn().mockRejectedValue(new Error("insert-failed"));

    vi.mocked(verifyAdminToken).mockReturnValue(true);
    vi.mocked(createD1ClanWarsIntermediateRepository).mockReturnValue(repository);
    vi.mocked(createCreateClanWarsPlayers).mockReturnValue(createPlayers);

    const response = await handleClanWarsIntermediateRequest({
      request: new Request("https://raid.example/api/admin/clan-wars/intermediate/players", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          players: [
            {
              mainNickname: "Morrigan",
              aliases: ["Witch"]
            }
          ]
        })
      }),
      env: {
        DB: db,
        ADMIN_INGEST_TOKEN: "expected-token"
      },
      action: "players"
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "players-create-failed"
    });
  });

  it("returns 400 for apply validation rejection", async () => {
    const db = {} as D1Database;
    const repository = createRepository();
    const apply = vi.fn().mockRejectedValue({
      name: "ClanWarsApplyValidationError",
      codes: ["missing-window-start"]
    });

    vi.mocked(verifyAdminToken).mockReturnValue(true);
    vi.mocked(createD1ClanWarsIntermediateRepository).mockReturnValue(repository);
    vi.mocked(createApplyClanWarsIntermediateResults).mockReturnValue(apply);

    const response = await handleClanWarsIntermediateRequest({
      request: new Request("https://raid.example/api/admin/clan-wars/intermediate/apply", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(createValidApplyPayload())
      }),
      env: {
        DB: db,
        ADMIN_INGEST_TOKEN: "expected-token"
      },
      action: "apply"
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "invalid-apply-request",
      codes: ["missing-window-start"]
    });
    expect(createApplyClanWarsIntermediateResults).toHaveBeenCalledWith({
      repository
    });
    expect(apply).toHaveBeenCalledWith(createValidApplyPayload());
  });

  it("returns 400 for malformed apply payload", async () => {
    const db = {} as D1Database;
    const repository = createRepository();

    vi.mocked(verifyAdminToken).mockReturnValue(true);
    vi.mocked(createD1ClanWarsIntermediateRepository).mockReturnValue(repository);
    vi.mocked(createApplyClanWarsIntermediateResults).mockReturnValue(vi.fn());

    const response = await handleClanWarsIntermediateRequest({
      request: new Request("https://raid.example/api/admin/clan-wars/intermediate/apply", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({})
      }),
      env: {
        DB: db,
        ADMIN_INGEST_TOKEN: "expected-token"
      },
      action: "apply"
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "invalid-apply-payload"
    });
    expect(createApplyClanWarsIntermediateResults).not.toHaveBeenCalled();
  });

  it("returns 500 for unexpected apply runtime error", async () => {
    const db = {} as D1Database;
    const repository = createRepository();
    const apply = vi.fn().mockRejectedValue(new Error("db-write-failed"));

    vi.mocked(verifyAdminToken).mockReturnValue(true);
    vi.mocked(createD1ClanWarsIntermediateRepository).mockReturnValue(repository);
    vi.mocked(createApplyClanWarsIntermediateResults).mockReturnValue(apply);

    const response = await handleClanWarsIntermediateRequest({
      request: new Request("https://raid.example/api/admin/clan-wars/intermediate/apply", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(createValidApplyPayload())
      }),
      env: {
        DB: db,
        ADMIN_INGEST_TOKEN: "expected-token"
      },
      action: "apply"
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "apply-failed"
    });
  });

  it("returns 500 for non-validation error object that carries codes", async () => {
    const db = {} as D1Database;
    const repository = createRepository();
    const apply = vi.fn().mockRejectedValue({
      name: "RepositoryWriteError",
      codes: ["some-code"]
    });

    vi.mocked(verifyAdminToken).mockReturnValue(true);
    vi.mocked(createD1ClanWarsIntermediateRepository).mockReturnValue(repository);
    vi.mocked(createApplyClanWarsIntermediateResults).mockReturnValue(apply);

    const response = await handleClanWarsIntermediateRequest({
      request: new Request("https://raid.example/api/admin/clan-wars/intermediate/apply", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(createValidApplyPayload())
      }),
      env: {
        DB: db,
        ADMIN_INGEST_TOKEN: "expected-token"
      },
      action: "apply"
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "apply-failed"
    });
  });

  it("returns 400 with unknown-player-id code for missing player references", async () => {
    const db = {} as D1Database;
    const repository = createRepository();
    const apply = vi
      .fn()
      .mockRejectedValue(new ClanWarsUnknownPlayerIdError([404, 505]));

    vi.mocked(verifyAdminToken).mockReturnValue(true);
    vi.mocked(createD1ClanWarsIntermediateRepository).mockReturnValue(repository);
    vi.mocked(createApplyClanWarsIntermediateResults).mockReturnValue(apply);

    const response = await handleClanWarsIntermediateRequest({
      request: new Request("https://raid.example/api/admin/clan-wars/intermediate/apply", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(createValidApplyPayload())
      }),
      env: {
        DB: db,
        ADMIN_INGEST_TOKEN: "expected-token"
      },
      action: "apply"
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "invalid-apply-request",
      codes: ["unknown-player-id"],
      unknownPlayerIds: [404, 505]
    });
  });
});
