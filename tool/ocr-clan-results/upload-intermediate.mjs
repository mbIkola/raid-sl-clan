#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const DEFAULT_API_BASE_URL = "http://localhost:8787/api/admin/clan-wars/intermediate";
const USAGE = `Usage:
  node tool/ocr-clan-results/upload-intermediate.mjs --image /absolute/path/to/screenshot.jpg [--api-base-url URL] [--token TOKEN]

Environment:
  KT_ADMIN_TOKEN       Admin token for X-Admin-Token auth
  KT_ADMIN_API_BASE_URL  Base URL for admin API (default: ${DEFAULT_API_BASE_URL})`;

const normalizeAlias = (alias) =>
  alias
    .trim()
    .toLowerCase()
    .replaceAll("ё", "е")
    .replaceAll("і", "i")
    .replace(/[^\p{L}\p{N}]+/gu, "");

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    help: false,
    image: "",
    apiBaseUrl: process.env.KT_ADMIN_API_BASE_URL ?? DEFAULT_API_BASE_URL,
    token: process.env.KT_ADMIN_TOKEN ?? "",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--image") {
      options.image = args[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--api-base-url") {
      options.apiBaseUrl = args[index + 1] ?? options.apiBaseUrl;
      index += 1;
      continue;
    }
    if (arg === "--token") {
      options.token = args[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.help) {
    return options;
  }

  if (!options.image) {
    throw new Error("--image is required");
  }

  if (!options.token) {
    throw new Error("KT_ADMIN_TOKEN (or --token) is required");
  }

  options.apiBaseUrl = options.apiBaseUrl.replace(/\/+$/, "");
  return options;
};

const requestJson = async (url, token, init = {}) => {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-admin-token": token,
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let payload = {};
  try {
    payload = text.length > 0 ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Non-JSON response from ${url}: ${response.status}`);
  }

  if (!response.ok) {
    const errorMessage =
      typeof payload.error === "string" ? payload.error : `request-failed:${response.status}`;
    throw new Error(`${response.status} ${errorMessage}`);
  }

  return payload;
};

const confirm = async (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
};

const ensureArray = (value, fieldName) => {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid response shape: expected array at ${fieldName}`);
  }
  return value;
};

const countUniquePlayerIds = (roster) =>
  new Set(
    roster
      .map((player) => Number(player?.playerId))
      .filter((playerId) => Number.isInteger(playerId) && playerId > 0)
  ).size;

const buildParticipantsListFromRoster = (roster) => {
  const seen = new Set();
  const participants = [];

  for (const player of roster) {
    const mainNickname = String(player?.mainNickname ?? "").trim();
    if (mainNickname.length > 0 && !seen.has(mainNickname)) {
      seen.add(mainNickname);
      participants.push(mainNickname);
    }

    const aliases = Array.isArray(player?.aliases) ? player.aliases : [];
    for (const alias of aliases) {
      const aliasValue = String(alias).trim();
      if (aliasValue.length > 0 && !seen.has(aliasValue)) {
        seen.add(aliasValue);
        participants.push(aliasValue);
      }
    }
  }

  return participants;
};

const buildRosterAliasMap = (roster) => {
  const rosterByAlias = new Map();

  for (const player of roster) {
    const aliases = Array.isArray(player.aliases) ? player.aliases : [];
    for (const alias of aliases) {
      const normalized = normalizeAlias(String(alias));
      if (normalized) {
        rosterByAlias.set(normalized, player);
      }
    }

    const normalizedMain = normalizeAlias(String(player.mainNickname ?? ""));
    if (normalizedMain) {
      rosterByAlias.set(normalizedMain, player);
    }
  }

  return rosterByAlias;
};

const resolveRowsToRoster = (ocrRows, rosterByAlias) => {
  const resolvedRows = [];
  const missing = [];
  const seenMissing = new Set();

  for (const row of ocrRows) {
    const nick = String(row.playerNick ?? "").trim();
    const normalized = normalizeAlias(nick);
    if (!normalized) {
      continue;
    }

    const player = rosterByAlias.get(normalized);
    if (!player) {
      if (!seenMissing.has(normalized)) {
        missing.push(nick);
        seenMissing.add(normalized);
      }
      continue;
    }

    resolvedRows.push({
      playerId: player.playerId,
      displayNameAtImport: nick,
      points: Number(row.points),
    });
  }

  return { resolvedRows, missing };
};

const main = async () => {
  const options = parseArgs();
  if (options.help) {
    console.log(USAGE);
    return;
  }

  const imagePath = resolve(options.image);
  const swiftScriptPath = resolve(SCRIPT_DIR, "ocr-clan-results.swift");

  let tmpDir;
  try {
    const rosterResponse = await requestJson(`${options.apiBaseUrl}/roster`, options.token);
    let activeRoster = ensureArray(rosterResponse.players, "players");

    tmpDir = mkdtempSync(join(tmpdir(), "kt-upload-"));
    const participantsPath = join(tmpDir, "participants.json");
    const ocrOutputPath = join(tmpDir, "ocr-output.json");

    const participants = buildParticipantsListFromRoster(activeRoster);

    writeFileSync(
      participantsPath,
      `${JSON.stringify({ participants }, null, 2)}\n`,
      "utf8"
    );

    const ocrRun = spawnSync(
      "swift",
      [
        swiftScriptPath,
        "--image",
        imagePath,
        "--participants-json",
        participantsPath,
        "--output",
        ocrOutputPath,
      ],
      { stdio: "inherit" }
    );

    if (ocrRun.status !== 0) {
      throw new Error(`OCR script failed with status ${ocrRun.status ?? "unknown"}`);
    }

    const ocrReport = JSON.parse(readFileSync(ocrOutputPath, "utf8"));
    const tournaments = ensureArray(ocrReport.tournaments, "tournaments");
    if (tournaments.length === 0) {
      throw new Error("OCR report contains no tournaments");
    }

    const tournament = tournaments[0];
    const ocrRows = ensureArray(tournament.playersOurs, "tournaments[0].playersOurs");
    let rosterByAlias = buildRosterAliasMap(activeRoster);
    let { resolvedRows, missing } = resolveRowsToRoster(ocrRows, rosterByAlias);

    if (missing.length > 0) {
      console.log(`Missing players in roster: ${missing.join(", ")}`);

      const createApproved = await confirm("Create missing players before apply?");
      if (!createApproved) {
        throw new Error("Aborted by operator before player creation");
      }

      const createResponse = await requestJson(`${options.apiBaseUrl}/players`, options.token, {
        method: "POST",
        body: JSON.stringify({
          players: missing.map((nick) => ({
            mainNickname: nick,
            aliases: [nick],
          })),
        }),
      });

      const created = ensureArray(createResponse.created, "created");
      const seenPlayerIds = new Set(
        activeRoster
          .map((player) => Number(player?.playerId))
          .filter((playerId) => Number.isInteger(playerId) && playerId > 0)
      );
      for (const createdPlayer of created) {
        const playerId = Number(createdPlayer?.playerId);
        if (Number.isInteger(playerId) && playerId > 0 && !seenPlayerIds.has(playerId)) {
          activeRoster.push(createdPlayer);
          seenPlayerIds.add(playerId);
        }
      }

      rosterByAlias = buildRosterAliasMap(activeRoster);

      const remapped = resolveRowsToRoster(ocrRows, rosterByAlias);
      resolvedRows = remapped.resolvedRows;
      missing = remapped.missing;

      if (missing.length > 0) {
        throw new Error(`Unresolved players after creation: ${missing.join(", ")}`);
      }
    }

    console.log("Preview:");
    console.log(`- file: ${basename(imagePath)}`);
    console.log(`- window: ${tournament.startsAt} .. ${tournament.endsAt}`);
    console.log(`- personal rewards: ${tournament.hasPersonalRewards === 1}`);
    console.log(`- opponent clan: ${tournament.opponentClanName ?? "(unknown)"}`);
    console.log(`- rows: ${resolvedRows.length}`);

    const expectedCount = countUniquePlayerIds(activeRoster);
    console.log(`- expected roster size: ${expectedCount}`);

    const applyApproved = await confirm("Apply intermediate results?");
    if (!applyApproved) {
      throw new Error("Aborted by operator before apply");
    }

    const applyPayload = {
      windowRef: {
        activityType: "clan_wars",
        eventStartAt: tournament.startsAt,
        eventEndsAt: tournament.endsAt,
      },
      meta: {
        hasPersonalRewards: tournament.hasPersonalRewards === 1,
        opponentClanName: tournament.opponentClanName ?? null,
        sourceKind: "ocr_cli_intermediate",
        capturedAt: new Date().toISOString(),
        ...(Number.isInteger(tournament?.totals?.mine)
          ? { clanTotalPointsMine: tournament.totals.mine }
          : {}),
      },
      rosterExpectation: {
        expectedCount,
      },
      players: resolvedRows,
    };

    const applyResponse = await requestJson(`${options.apiBaseUrl}/apply`, options.token, {
      method: "POST",
      body: JSON.stringify(applyPayload),
    });

    console.log("Apply result:");
    console.log(JSON.stringify(applyResponse, null, 2));
  } finally {
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR: ${message}`);
  process.exit(1);
});
