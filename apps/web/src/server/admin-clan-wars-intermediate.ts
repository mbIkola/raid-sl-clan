import {
  createApplyClanWarsIntermediateResults,
  createCreateClanWarsPlayers,
  createGetClanWarsIntermediateRoster
} from "@raid/application";
import { createD1ClanWarsIntermediateRepository, verifyAdminToken } from "@raid/platform";
import type { ClanWarsApplyRequest } from "@raid/core";
import type { ClanWarsCreatePlayerInput } from "@raid/ports";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    ADMIN_INGEST_TOKEN: string;
  }
}

export type AdminClanWarsIntermediateEnv = {
  DB: D1Database;
  ADMIN_INGEST_TOKEN: string;
};

export type ClanWarsIntermediateAction = "roster" | "players" | "apply";

export type HandleClanWarsIntermediateRequestInput = {
  request: Request;
  env: AdminClanWarsIntermediateEnv;
  action: ClanWarsIntermediateAction;
};

type D1RepositoryDatabase = Parameters<typeof createD1ClanWarsIntermediateRepository>[0];

const badRequest = (error: string, extra?: Record<string, unknown>) =>
  Response.json(
    {
      ok: false,
      error,
      ...extra
    },
    { status: 400 }
  );

const internalError = (error: string) =>
  Response.json(
    {
      ok: false,
      error
    },
    { status: 500 }
  );

const parseJsonBody = async (request: Request): Promise<{ ok: true; body: unknown } | Response> => {
  try {
    return {
      ok: true,
      body: await request.json()
    };
  } catch {
    return badRequest("invalid-json");
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isPlayersPayload = (body: unknown): body is { players: ClanWarsCreatePlayerInput[] } => {
  if (!isRecord(body)) {
    return false;
  }

  const players = body.players;
  if (!Array.isArray(players)) {
    return false;
  }

  return players.every(player => {
    if (!isRecord(player)) {
      return false;
    }

    const mainNickname = player.mainNickname;
    const aliases = player.aliases;

    if (typeof mainNickname !== "string" || mainNickname.trim().length === 0) {
      return false;
    }

    if (!Array.isArray(aliases) || !aliases.every(alias => typeof alias === "string")) {
      return false;
    }

    return true;
  });
};

const isApplyPayload = (body: unknown): body is ClanWarsApplyRequest => {
  if (!isRecord(body)) {
    return false;
  }

  const windowRef = body.windowRef;
  if (!isRecord(windowRef)) {
    return false;
  }
  if (typeof windowRef.activityType !== "string") {
    return false;
  }
  if (typeof windowRef.eventStartAt !== "string" || typeof windowRef.eventEndsAt !== "string") {
    return false;
  }

  const meta = body.meta;
  if (!isRecord(meta)) {
    return false;
  }
  if (typeof meta.hasPersonalRewards !== "boolean") {
    return false;
  }
  if (meta.opponentClanName !== null && typeof meta.opponentClanName !== "string") {
    return false;
  }
  if (typeof meta.sourceKind !== "string" || typeof meta.capturedAt !== "string") {
    return false;
  }
  if (
    meta.clanTotalPointsMine !== undefined &&
    (typeof meta.clanTotalPointsMine !== "number" || !Number.isFinite(meta.clanTotalPointsMine))
  ) {
    return false;
  }

  const rosterExpectation = body.rosterExpectation;
  if (!isRecord(rosterExpectation) || typeof rosterExpectation.expectedCount !== "number") {
    return false;
  }

  const players = body.players;
  if (!Array.isArray(players)) {
    return false;
  }

  return players.every(player => {
    if (!isRecord(player)) {
      return false;
    }

    return (
      typeof player.playerId === "number" &&
      typeof player.displayNameAtImport === "string" &&
      typeof player.points === "number"
    );
  });
};

const getApplyValidationErrorCodes = (error: unknown): string[] | undefined => {
  if (!isRecord(error)) {
    return undefined;
  }

  if (error.name !== "ClanWarsApplyValidationError") {
    return undefined;
  }

  const codes = error.codes;
  if (!Array.isArray(codes) || !codes.every(code => typeof code === "string")) {
    return undefined;
  }

  return codes;
};

export const handleClanWarsIntermediateRequest = async ({
  request,
  env,
  action
}: HandleClanWarsIntermediateRequestInput) => {
  const token = request.headers.get("x-admin-token");
  const isAuthorized = verifyAdminToken({
    expectedToken: env.ADMIN_INGEST_TOKEN,
    receivedToken: token
  });

  if (!isAuthorized) {
    return Response.json(
      {
        ok: false,
        error: "invalid-admin-token"
      },
      { status: 401 }
    );
  }

  const repository = createD1ClanWarsIntermediateRepository(env.DB as D1RepositoryDatabase);

  if (action === "roster") {
    try {
      const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "1";
      const players = await createGetClanWarsIntermediateRoster({ repository })({
        includeInactive
      });
      return Response.json({
        ok: true,
        players
      });
    } catch {
      return internalError("roster-fetch-failed");
    }
  }

  if (action === "players") {
    const parsed = await parseJsonBody(request);
    if (parsed instanceof Response) {
      return parsed;
    }

    if (!isPlayersPayload(parsed.body)) {
      return badRequest("invalid-players-payload");
    }

    try {
      const result = await createCreateClanWarsPlayers({ repository })({
        players: parsed.body.players
      });
      return Response.json({
        ok: true,
        created: result.created
      });
    } catch {
      return internalError("players-create-failed");
    }
  }

  const parsed = await parseJsonBody(request);
  if (parsed instanceof Response) {
    return parsed;
  }
  if (!isApplyPayload(parsed.body)) {
    return badRequest("invalid-apply-payload");
  }

  try {
    const result = await createApplyClanWarsIntermediateResults({ repository })(parsed.body);
    return Response.json({
      ok: true,
      ...result
    });
  } catch (error) {
    const codes = getApplyValidationErrorCodes(error);
    if (codes) {
      return badRequest("invalid-apply-request", { codes });
    }

    return internalError("apply-failed");
  }
};
