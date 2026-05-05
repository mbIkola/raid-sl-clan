# KT Intermediate Results Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a production-safe KT intermediate upload pipeline (`roster -> OCR preview -> optional player creation -> full-replace apply`) with strict validation and reusable boundaries for future Telegram reuse.

**Architecture:** Keep pure request validation and roster normalization in `packages/core`, orchestration in `packages/application`, and all D1 writes/transactions in `packages/platform`. Expose admin HTTP handlers in `apps/web` through thin route wrappers, then add a local operator CLI orchestrator under `tool/ocr-clan-results` that reuses OCR output and calls the new admin endpoints. Use TDD per layer: core/application unit tests, platform D1 integration tests, and web server handler tests.

**Tech Stack:** TypeScript, Vitest, Next.js App Router, Cloudflare D1, Swift OCR script, Node.js CLI

---

## Scope Check

The approved spec is one cohesive subsystem (KT intermediate ingestion) with two adapters (HTTP admin API and local operator CLI). It does not need decomposition into separate plans.

## File Structure Map

- Create: `packages/core/src/clan-wars-intermediate.ts`
- Create: `packages/core/test/clan-wars-intermediate.test.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/ports/src/repositories/clan-wars-intermediate-repository.ts`
- Modify: `packages/ports/src/index.ts`
- Create: `packages/application/src/clan-wars-intermediate/get-clan-wars-intermediate-roster.ts`
- Create: `packages/application/src/clan-wars-intermediate/create-clan-wars-players.ts`
- Create: `packages/application/src/clan-wars-intermediate/apply-clan-wars-intermediate-results.ts`
- Create: `packages/application/test/clan-wars-intermediate.test.ts`
- Modify: `packages/application/src/index.ts`
- Create: `packages/platform/src/auth/admin-token.ts`
- Create: `packages/platform/src/telegram/telegram-user-whitelist.ts`
- Create: `packages/platform/src/clan-wars-intermediate/create-d1-clan-wars-intermediate-repository.ts`
- Create: `packages/platform/test/admin-token.test.ts`
- Create: `packages/platform/test/telegram-user-whitelist.test.ts`
- Create: `packages/platform/test/clan-wars-intermediate-repository.test.ts`
- Modify: `packages/platform/src/index.ts`
- Create: `apps/web/src/server/admin-clan-wars-intermediate.ts`
- Create: `apps/web/src/server/admin-clan-wars-intermediate.test.ts`
- Create: `apps/web/src/app/api/admin/clan-wars/intermediate/roster/route.ts`
- Create: `apps/web/src/app/api/admin/clan-wars/intermediate/players/route.ts`
- Create: `apps/web/src/app/api/admin/clan-wars/intermediate/apply/route.ts`
- Create: `tool/ocr-clan-results/upload-intermediate.mjs`
- Modify: `tool/ocr-clan-results/ocr-clan-results.swift`
- Modify: `tool/ocr-clan-results/README.md`
- Create: `docs/operator/kt-intermediate-upload.md`

### Task 1: Add Core KT Intermediate Types And Validation

**Files:**
- Create: `packages/core/src/clan-wars-intermediate.ts`
- Create: `packages/core/test/clan-wars-intermediate.test.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/clan-wars-intermediate.test.ts`

- [ ] **Step 1: Write the failing core validation test**

```ts
import { describe, expect, it } from "vitest";
import {
  normalizeRosterAlias,
  validateClanWarsApplyRequest,
  type ClanWarsApplyRequest
} from "@raid/core";

const validRequest: ClanWarsApplyRequest = {
  windowRef: {
    activityType: "clan_wars",
    eventStartAt: "2026-05-05T09:00:00.000Z",
    eventEndsAt: "2026-05-07T09:00:00.000Z"
  },
  meta: {
    hasPersonalRewards: true,
    opponentClanName: "Best in Raid",
    sourceKind: "ocr_cli_intermediate",
    capturedAt: "2026-05-05T12:00:00+03:00",
    clanTotalPointsMine: 325731
  },
  rosterExpectation: {
    expectedCount: 2
  },
  players: [
    { playerId: 1, displayNameAtImport: "AZAZEL", points: 167681 },
    { playerId: 2, displayNameAtImport: "Ksondr", points: 158050 }
  ]
};

describe("validateClanWarsApplyRequest", () => {
  it("accepts a valid payload", () => {
    expect(validateClanWarsApplyRequest(validRequest)).toEqual([]);
  });

  it("rejects roster-size mismatch", () => {
    const issues = validateClanWarsApplyRequest({
      ...validRequest,
      rosterExpectation: { expectedCount: 3 }
    });

    expect(issues.map((issue) => issue.code)).toContain("roster-size-mismatch");
  });

  it("rejects duplicate player ids", () => {
    const issues = validateClanWarsApplyRequest({
      ...validRequest,
      players: [
        { playerId: 1, displayNameAtImport: "AZAZEL", points: 10 },
        { playerId: 1, displayNameAtImport: "AZAZEL", points: 20 }
      ]
    });

    expect(issues.map((issue) => issue.code)).toContain("duplicate-player-id");
  });

  it("rejects non-48h windows", () => {
    const issues = validateClanWarsApplyRequest({
      ...validRequest,
      windowRef: {
        ...validRequest.windowRef,
        eventEndsAt: "2026-05-07T08:59:00.000Z"
      }
    });

    expect(issues.map((issue) => issue.code)).toContain("invalid-window-duration");
  });

  it("normalizes OCR aliases for matching", () => {
    expect(normalizeRosterAlias("  [ВІБР] mykola  ")).toBe("вiбрmykola");
    expect(normalizeRosterAlias("NikR0man")).toBe("nikr0man");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- packages/core/test/clan-wars-intermediate.test.ts`

Expected: FAIL with export/module not found for `validateClanWarsApplyRequest`.

- [ ] **Step 3: Implement core types and validation logic**

```ts
// packages/core/src/clan-wars-intermediate.ts
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
  rosterExpectation: { expectedCount: number };
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

const fortyEightHoursMs = 48 * 60 * 60 * 1000;

export const normalizeRosterAlias = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/і/g, "i")
    .replace(/[^\p{L}\p{N}]/gu, "");

export const validateClanWarsApplyRequest = (
  input: ClanWarsApplyRequest
): ClanWarsApplyValidationIssue[] => {
  const issues: ClanWarsApplyValidationIssue[] = [];

  if (input.windowRef.activityType !== "clan_wars") {
    issues.push({
      code: "invalid-activity-type",
      message: "windowRef.activityType must be clan_wars"
    });
  }

  const start = new Date(input.windowRef.eventStartAt);
  const end = new Date(input.windowRef.eventEndsAt);

  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) {
    issues.push({
      code: "invalid-window-timestamps",
      message: "eventStartAt/eventEndsAt must be valid ISO timestamps with end > start"
    });
  } else if (end.valueOf() - start.valueOf() !== fortyEightHoursMs) {
    issues.push({
      code: "invalid-window-duration",
      message: "KT window duration must be exactly 48h"
    });
  }

  if (input.players.length !== input.rosterExpectation.expectedCount) {
    issues.push({
      code: "roster-size-mismatch",
      message: "players count must equal rosterExpectation.expectedCount"
    });
  }

  const seenIds = new Set<number>();
  for (const row of input.players) {
    if (!Number.isInteger(row.playerId) || row.playerId <= 0) {
      issues.push({
        code: "invalid-player-id",
        message: `playerId must be a positive integer: ${row.playerId}`
      });
    }

    if (seenIds.has(row.playerId)) {
      issues.push({
        code: "duplicate-player-id",
        message: `duplicate playerId: ${row.playerId}`
      });
    }
    seenIds.add(row.playerId);

    if (!Number.isInteger(row.points) || row.points < 0) {
      issues.push({
        code: "invalid-player-points",
        message: `points must be integer >= 0 for playerId ${row.playerId}`
      });
    }
  }

  if (typeof input.meta.clanTotalPointsMine === "number") {
    const sum = input.players.reduce((acc, row) => acc + row.points, 0);
    if (sum !== input.meta.clanTotalPointsMine) {
      issues.push({
        code: "invalid-total-points",
        message: `sum(players.points)=${sum} does not match clanTotalPointsMine=${input.meta.clanTotalPointsMine}`
      });
    }
  }

  return issues;
};
```

```ts
// packages/core/src/index.ts
export * from "./telegram";
export * from "./clan-wars-intermediate";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- packages/core/test/clan-wars-intermediate.test.ts`

Expected: PASS with 5 passing tests.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/clan-wars-intermediate.ts packages/core/src/index.ts packages/core/test/clan-wars-intermediate.test.ts
git commit -m "feat(core): add KT intermediate payload validation primitives"
```

### Task 2: Add Ports And Application Use-Cases

**Files:**
- Create: `packages/ports/src/repositories/clan-wars-intermediate-repository.ts`
- Modify: `packages/ports/src/index.ts`
- Create: `packages/application/src/clan-wars-intermediate/get-clan-wars-intermediate-roster.ts`
- Create: `packages/application/src/clan-wars-intermediate/create-clan-wars-players.ts`
- Create: `packages/application/src/clan-wars-intermediate/apply-clan-wars-intermediate-results.ts`
- Create: `packages/application/test/clan-wars-intermediate.test.ts`
- Modify: `packages/application/src/index.ts`
- Test: `packages/application/test/clan-wars-intermediate.test.ts`

- [ ] **Step 1: Write failing application tests for roster/create/apply orchestration**

```ts
import { describe, expect, it, vi } from "vitest";
import {
  createApplyClanWarsIntermediateResults,
  createCreateClanWarsPlayers,
  createGetClanWarsIntermediateRoster
} from "@raid/application";
import type { ClanWarsIntermediateRepository } from "@raid/ports";

const makeRepository = (): ClanWarsIntermediateRepository => ({
  getRoster: vi.fn(async () => [
    {
      playerId: 1,
      mainNickname: "AZAZEL",
      status: "active",
      aliases: ["AZAZEL"]
    }
  ]),
  createPlayers: vi.fn(async ({ players }) =>
    players.map((player, index) => ({
      playerId: index + 100,
      mainNickname: player.mainNickname,
      aliases: player.aliases
    }))
  ),
  applyResults: vi.fn(async () => ({
    competitionWindowId: 200,
    clanWarsReportId: 300,
    replacedRows: 1
  }))
});

describe("clan wars intermediate use-cases", () => {
  it("returns active roster by default", async () => {
    const repository = makeRepository();
    const execute = createGetClanWarsIntermediateRoster({ repository });

    const roster = await execute();

    expect(roster).toHaveLength(1);
    expect(repository.getRoster).toHaveBeenCalledWith({ includeInactive: false });
  });

  it("creates players through repository", async () => {
    const repository = makeRepository();
    const execute = createCreateClanWarsPlayers({ repository });

    const result = await execute({
      players: [{ mainNickname: "NewNick", aliases: ["NewNick"] }]
    });

    expect(result.created[0]).toMatchObject({ mainNickname: "NewNick" });
  });

  it("rejects invalid apply payload before repository write", async () => {
    const repository = makeRepository();
    const execute = createApplyClanWarsIntermediateResults({ repository });

    await expect(
      execute({
        windowRef: {
          activityType: "clan_wars",
          eventStartAt: "2026-05-05T09:00:00.000Z",
          eventEndsAt: "2026-05-07T09:00:00.000Z"
        },
        meta: {
          hasPersonalRewards: true,
          opponentClanName: "Best in Raid",
          sourceKind: "ocr_cli_intermediate",
          capturedAt: "2026-05-05T12:00:00+03:00"
        },
        rosterExpectation: { expectedCount: 2 },
        players: [{ playerId: 1, displayNameAtImport: "AZAZEL", points: 100 }]
      })
    ).rejects.toThrow("roster-size-mismatch");

    expect(repository.applyResults).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- packages/application/test/clan-wars-intermediate.test.ts`

Expected: FAIL with missing module exports/use-cases/types.

- [ ] **Step 3: Implement ports and use-cases with minimal API**

```ts
// packages/ports/src/repositories/clan-wars-intermediate-repository.ts
import type { ClanWarsApplyRequest } from "@raid/core";

export type ClanWarsRosterRow = {
  playerId: number;
  mainNickname: string;
  status: "active" | "inactive" | "removed";
  aliases: string[];
};

export type ClanWarsCreatePlayerInput = {
  mainNickname: string;
  aliases: string[];
};

export type ClanWarsCreatedPlayer = {
  playerId: number;
  mainNickname: string;
  aliases: string[];
};

export type ClanWarsApplyResult = {
  competitionWindowId: number;
  clanWarsReportId: number;
  replacedRows: number;
};

export type ClanWarsIntermediateRepository = {
  getRoster(input: { includeInactive: boolean }): Promise<ClanWarsRosterRow[]>;
  createPlayers(input: { players: ClanWarsCreatePlayerInput[] }): Promise<ClanWarsCreatedPlayer[]>;
  applyResults(input: { request: ClanWarsApplyRequest }): Promise<ClanWarsApplyResult>;
};
```

```ts
// packages/ports/src/index.ts
export * from "./providers/llm-provider";
export * from "./providers/search-provider";
export * from "./repositories/app-state-repository";
export * from "./repositories/clan-dashboard-repository";
export * from "./repositories/clan-wars-intermediate-repository";
```

```ts
// packages/application/src/clan-wars-intermediate/get-clan-wars-intermediate-roster.ts
import type { ClanWarsIntermediateRepository } from "@raid/ports";

export const createGetClanWarsIntermediateRoster = ({
  repository
}: {
  repository: ClanWarsIntermediateRepository;
}) => {
  return async (input?: { includeInactive?: boolean }) =>
    repository.getRoster({ includeInactive: input?.includeInactive ?? false });
};
```

```ts
// packages/application/src/clan-wars-intermediate/create-clan-wars-players.ts
import type {
  ClanWarsCreatedPlayer,
  ClanWarsCreatePlayerInput,
  ClanWarsIntermediateRepository
} from "@raid/ports";

export const createCreateClanWarsPlayers = ({
  repository
}: {
  repository: ClanWarsIntermediateRepository;
}) => {
  return async (input: {
    players: ClanWarsCreatePlayerInput[];
  }): Promise<{ created: ClanWarsCreatedPlayer[] }> => {
    const created = await repository.createPlayers({ players: input.players });
    return { created };
  };
};
```

```ts
// packages/application/src/clan-wars-intermediate/apply-clan-wars-intermediate-results.ts
import {
  validateClanWarsApplyRequest,
  type ClanWarsApplyRequest
} from "@raid/core";
import type { ClanWarsIntermediateRepository } from "@raid/ports";

export const createApplyClanWarsIntermediateResults = ({
  repository
}: {
  repository: ClanWarsIntermediateRepository;
}) => {
  return async (request: ClanWarsApplyRequest) => {
    const issues = validateClanWarsApplyRequest(request);
    if (issues.length > 0) {
      throw new Error(issues.map((issue) => issue.code).join(","));
    }

    return repository.applyResults({ request });
  };
};
```

```ts
// packages/application/src/index.ts
export * from "./telegram/handle-telegram-update";
export * from "./dashboard/get-clan-dashboard-snapshot";
export * from "./dashboard/get-clan-wars-archive-snapshot";
export * from "./clan-wars-intermediate/get-clan-wars-intermediate-roster";
export * from "./clan-wars-intermediate/create-clan-wars-players";
export * from "./clan-wars-intermediate/apply-clan-wars-intermediate-results";
```

- [ ] **Step 4: Run tests for application and ports compile path**

Run: `pnpm test -- packages/application/test/clan-wars-intermediate.test.ts`

Expected: PASS with 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add packages/ports/src/repositories/clan-wars-intermediate-repository.ts packages/ports/src/index.ts packages/application/src/clan-wars-intermediate packages/application/src/index.ts packages/application/test/clan-wars-intermediate.test.ts
git commit -m "feat(application): add KT intermediate roster/create/apply use-cases"
```

### Task 3: Add Auth Header And Telegram Whitelist Policy Modules

**Files:**
- Create: `packages/platform/src/auth/admin-token.ts`
- Create: `packages/platform/src/telegram/telegram-user-whitelist.ts`
- Create: `packages/platform/test/admin-token.test.ts`
- Create: `packages/platform/test/telegram-user-whitelist.test.ts`
- Modify: `packages/platform/src/index.ts`
- Test: `packages/platform/test/admin-token.test.ts`
- Test: `packages/platform/test/telegram-user-whitelist.test.ts`

- [ ] **Step 1: Write failing tests for auth headers/token verification and whitelist**

```ts
// packages/platform/test/admin-token.test.ts
import { describe, expect, it } from "vitest";
import {
  getAdminAuthHeaders,
  verifyAdminToken
} from "@raid/platform";

describe("admin token helpers", () => {
  it("builds x-admin-token header", () => {
    expect(getAdminAuthHeaders("secret-123")).toEqual({
      "x-admin-token": "secret-123"
    });
  });

  it("verifies token equality", () => {
    expect(
      verifyAdminToken({
        expectedToken: "abc",
        receivedToken: "abc"
      })
    ).toBe(true);

    expect(
      verifyAdminToken({
        expectedToken: "abc",
        receivedToken: "xyz"
      })
    ).toBe(false);
  });
});
```

```ts
// packages/platform/test/telegram-user-whitelist.test.ts
import { describe, expect, it } from "vitest";
import { createTelegramUserWhitelist } from "@raid/platform";

describe("telegram whitelist", () => {
  it("permits only configured user ids", () => {
    const whitelist = createTelegramUserWhitelist(["101", "202"]);
    expect(whitelist.isAllowed("101")).toBe(true);
    expect(whitelist.isAllowed("303")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- packages/platform/test/admin-token.test.ts packages/platform/test/telegram-user-whitelist.test.ts`

Expected: FAIL with missing exports.

- [ ] **Step 3: Implement auth and whitelist modules and export them**

```ts
// packages/platform/src/auth/admin-token.ts
export const getAdminAuthHeaders = (token: string): Record<string, string> => ({
  "x-admin-token": token
});

export const verifyAdminToken = (input: {
  expectedToken: string;
  receivedToken: string | null;
}): boolean => {
  if (!input.expectedToken || !input.receivedToken) {
    return false;
  }

  return input.expectedToken === input.receivedToken;
};
```

```ts
// packages/platform/src/telegram/telegram-user-whitelist.ts
export type TelegramUserWhitelist = {
  isAllowed: (telegramUserId: string) => boolean;
};

export const createTelegramUserWhitelist = (
  allowedUserIds: string[]
): TelegramUserWhitelist => {
  const allowed = new Set(allowedUserIds.map((value) => value.trim()).filter(Boolean));

  return {
    isAllowed: (telegramUserId: string) => allowed.has(telegramUserId)
  };
};
```

```ts
// packages/platform/src/index.ts
export * from "./telegram/normalize-update";
export * from "./telegram/send-telegram-message";
export * from "./telegram/telegram-user-whitelist";
export * from "./auth/admin-token";
export * from "./dashboard/clan-dashboard-sql";
export * from "./dashboard/clan-wars-archive-metrics";
export * from "./dashboard/clan-wars-archive-sql";
export * from "./dashboard/create-d1-clan-dashboard-repository";
export * from "./dashboard/reset-anchors";
```

- [ ] **Step 4: Run platform policy tests**

Run: `pnpm test -- packages/platform/test/admin-token.test.ts packages/platform/test/telegram-user-whitelist.test.ts`

Expected: PASS with 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add packages/platform/src/auth/admin-token.ts packages/platform/src/telegram/telegram-user-whitelist.ts packages/platform/src/index.ts packages/platform/test/admin-token.test.ts packages/platform/test/telegram-user-whitelist.test.ts
git commit -m "feat(platform): add admin token and telegram whitelist policy modules"
```

### Task 4: Implement D1 KT Intermediate Repository (Roster/Create/Apply)

**Files:**
- Create: `packages/platform/src/clan-wars-intermediate/create-d1-clan-wars-intermediate-repository.ts`
- Create: `packages/platform/test/clan-wars-intermediate-repository.test.ts`
- Modify: `packages/platform/src/index.ts`
- Test: `packages/platform/test/clan-wars-intermediate-repository.test.ts`

- [ ] **Step 1: Write failing D1 repository integration test**

```ts
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createD1ClanWarsIntermediateRepository } from "@raid/platform";

type SqliteStatement = {
  run(...values: unknown[]): { lastInsertRowid: number | bigint };
  all(...values: unknown[]): unknown[];
  get(...values: unknown[]): unknown;
};

type SqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
};

const createSqlite = (): SqliteDatabase => {
  const require = createRequire(import.meta.url);
  const { DatabaseSync } = require("node:sqlite") as {
    DatabaseSync: new (path: string) => SqliteDatabase;
  };
  const sqlite = new DatabaseSync(":memory:");

  for (const fileName of [
    "0001_bootstrap.sql",
    "0002_clan_competition_schema.sql",
    "0004_clan_wars_has_personal_rewards.sql"
  ]) {
    sqlite.exec(readFileSync(join(process.cwd(), "platform", "migrations", fileName), "utf8"));
  }

  return sqlite;
};

describe("createD1ClanWarsIntermediateRepository", () => {
  it("creates missing window and fully replaces scores", async () => {
    const sqlite = createSqlite();
    const repository = createD1ClanWarsIntermediateRepository(sqlite as unknown as D1Database);

    sqlite.prepare("INSERT INTO player_profile (main_nickname, status) VALUES (?, ?)").run("AZAZEL", "active");
    sqlite.prepare("INSERT INTO player_profile (main_nickname, status) VALUES (?, ?)").run("Ksondr", "active");

    const result = await repository.applyResults({
      request: {
        windowRef: {
          activityType: "clan_wars",
          eventStartAt: "2026-05-05T09:00:00.000Z",
          eventEndsAt: "2026-05-07T09:00:00.000Z"
        },
        meta: {
          hasPersonalRewards: true,
          opponentClanName: "Best in Raid",
          sourceKind: "ocr_cli_intermediate",
          capturedAt: "2026-05-05T12:00:00+03:00"
        },
        rosterExpectation: { expectedCount: 2 },
        players: [
          { playerId: 1, displayNameAtImport: "AZAZEL", points: 167681 },
          { playerId: 2, displayNameAtImport: "Ksondr", points: 158050 }
        ]
      }
    });

    expect(result.replacedRows).toBe(2);

    const scoreRows = sqlite.prepare("SELECT points FROM clan_wars_player_score ORDER BY player_profile_id").all();
    expect(scoreRows).toEqual([{ points: 167681 }, { points: 158050 }]);
  });
});
```

- [ ] **Step 2: Run repository test to verify it fails**

Run: `pnpm test -- packages/platform/test/clan-wars-intermediate-repository.test.ts`

Expected: FAIL because repository factory/export does not exist.

- [ ] **Step 3: Implement D1 repository with two-phase import lifecycle**

```ts
// packages/platform/src/clan-wars-intermediate/create-d1-clan-wars-intermediate-repository.ts
import type {
  ClanWarsCreatedPlayer,
  ClanWarsIntermediateRepository,
  ClanWarsRosterRow
} from "@raid/ports";
import type { ClanWarsApplyRequest } from "@raid/core";

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  run<T = unknown>(): Promise<{ success: boolean; results?: T[]; meta?: { last_row_id?: number } }>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  first<T = unknown>(): Promise<T | null>;
};

type D1DatabaseLike = {
  prepare(query: string): D1Statement;
};

const scopeKeyFromWindow = (request: ClanWarsApplyRequest) =>
  `clan_wars:${request.windowRef.eventStartAt}_${request.windowRef.eventEndsAt}:intermediate`;

const toNotesJson = (request: ClanWarsApplyRequest) =>
  JSON.stringify({
    opponentClanName: request.meta.opponentClanName,
    capturedAt: request.meta.capturedAt,
    clanTotalPointsMine: request.meta.clanTotalPointsMine ?? null
  });

export const createD1ClanWarsIntermediateRepository = (
  db: D1DatabaseLike
): ClanWarsIntermediateRepository => {
  const run = async (sql: string, ...values: unknown[]) => db.prepare(sql).bind(...values).run();
  const first = async <T>(sql: string, ...values: unknown[]) => db.prepare(sql).bind(...values).first<T>();
  const all = async <T>(sql: string, ...values: unknown[]) => (await db.prepare(sql).bind(...values).all<T>()).results ?? [];

  const findOrCreateWindow = async (request: ClanWarsApplyRequest): Promise<number> => {
    const found = await first<{ id: number }>(
      `SELECT id FROM competition_window WHERE activity_type = 'clan_wars' AND starts_at = ? AND ends_at = ? LIMIT 1`,
      request.windowRef.eventStartAt,
      request.windowRef.eventEndsAt
    );

    if (found) {
      return found.id;
    }

    const calendarRow = await first<{ season_year: number; week_of_year: number }>(
      `SELECT CAST(strftime('%Y', ?) AS INTEGER) AS season_year, CAST(strftime('%W', ?) AS INTEGER) + 1 AS week_of_year`,
      request.windowRef.eventEndsAt,
      request.windowRef.eventEndsAt
    );

    await run(
      [
        "INSERT INTO competition_window",
        "(activity_type, season_year, week_of_year, cadence_slot, rotation_number, starts_at, ends_at, label)",
        "VALUES ('clan_wars', ?, ?, 'biweekly', NULL, ?, ?, ?)"
      ].join(" "),
      calendarRow?.season_year ?? 2026,
      calendarRow?.week_of_year ?? 1,
      request.windowRef.eventStartAt,
      request.windowRef.eventEndsAt,
      `Clan Wars ${request.windowRef.eventStartAt}`
    );

    const inserted = await first<{ id: number }>(
      `SELECT id FROM competition_window WHERE activity_type = 'clan_wars' AND starts_at = ? AND ends_at = ? LIMIT 1`,
      request.windowRef.eventStartAt,
      request.windowRef.eventEndsAt
    );

    if (!inserted) {
      throw new Error("failed-to-create-window");
    }

    return inserted.id;
  };

  return {
    async getRoster({ includeInactive }): Promise<ClanWarsRosterRow[]> {
      const rows = await all<{
        player_id: number;
        main_nickname: string;
        status: "active" | "inactive" | "removed";
        aliases_csv: string | null;
      }>(
        [
          "SELECT pp.id AS player_id, pp.main_nickname, pp.status,",
          "GROUP_CONCAT(pa.alias_value, '||') AS aliases_csv",
          "FROM player_profile pp",
          "LEFT JOIN player_alias pa ON pa.player_profile_id = pp.id AND pa.alias_type = 'game_nickname'",
          "WHERE (? = 1 OR pp.status = 'active')",
          "GROUP BY pp.id, pp.main_nickname, pp.status",
          "ORDER BY pp.main_nickname ASC"
        ].join(" "),
        includeInactive ? 1 : 0
      );

      return rows.map((row) => ({
        playerId: row.player_id,
        mainNickname: row.main_nickname,
        status: row.status,
        aliases: row.aliases_csv ? row.aliases_csv.split("||") : [row.main_nickname]
      }));
    },

    async createPlayers({ players }): Promise<ClanWarsCreatedPlayer[]> {
      const created: ClanWarsCreatedPlayer[] = [];

      for (const player of players) {
        const candidateAliases = Array.from(new Set([player.mainNickname, ...player.aliases]));

        const existing = await first<{ player_id: number; main_nickname: string }>(
          [
            "SELECT pp.id AS player_id, pp.main_nickname",
            "FROM player_profile pp",
            "JOIN player_alias pa ON pa.player_profile_id = pp.id",
            "WHERE pa.alias_type = 'game_nickname' AND pa.alias_value = ?",
            "LIMIT 1"
          ].join(" "),
          candidateAliases[0]
        );

        if (existing) {
          created.push({
            playerId: existing.player_id,
            mainNickname: existing.main_nickname,
            aliases: candidateAliases
          });
          continue;
        }

        const insertProfile = await run(
          "INSERT INTO player_profile (main_nickname, status) VALUES (?, 'active')",
          player.mainNickname
        );

        const playerId = Number(insertProfile.meta?.last_row_id);

        for (const alias of candidateAliases) {
          await run(
            [
              "INSERT OR IGNORE INTO player_alias",
              "(player_profile_id, alias_type, alias_value, is_primary)",
              "VALUES (?, 'game_nickname', ?, ?)"
            ].join(" "),
            playerId,
            alias,
            alias === player.mainNickname ? 1 : 0
          );
        }

        created.push({
          playerId,
          mainNickname: player.mainNickname,
          aliases: candidateAliases
        });
      }

      return created;
    },

    async applyResults({ request }) {
      const scopeKey = scopeKeyFromWindow(request);
      const notes = toNotesJson(request);

      const pendingImport = await run(
        [
          "INSERT INTO report_import",
          "(upload_type, source_kind, scope_type, scope_key, replace_existing, status, notes)",
          "VALUES ('admin_clan_wars_intermediate', ?, 'competition_window', ?, 1, 'pending', ?)"
        ].join(" "),
        request.meta.sourceKind,
        scopeKey,
        notes
      );

      const reportImportId = Number(pendingImport.meta?.last_row_id);

      try {
        await run("BEGIN IMMEDIATE TRANSACTION");

        const competitionWindowId = await findOrCreateWindow(request);

        await run(
          [
            "INSERT INTO clan_wars_report",
            "(competition_window_id, report_import_id, source_system, is_partial, has_personal_rewards)",
            "VALUES (?, ?, ?, 1, ?)",
            "ON CONFLICT(competition_window_id) DO UPDATE SET",
            "report_import_id = excluded.report_import_id,",
            "source_system = excluded.source_system,",
            "is_partial = excluded.is_partial,",
            "has_personal_rewards = excluded.has_personal_rewards"
          ].join(" "),
          competitionWindowId,
          reportImportId,
          request.meta.sourceKind,
          request.meta.hasPersonalRewards ? 1 : 0
        );

        const reportRow = await first<{ id: number }>(
          "SELECT id FROM clan_wars_report WHERE competition_window_id = ? LIMIT 1",
          competitionWindowId
        );

        if (!reportRow) {
          throw new Error("missing-clan-wars-report");
        }

        await run("DELETE FROM clan_wars_player_score WHERE clan_wars_report_id = ?", reportRow.id);

        for (const row of request.players) {
          await run(
            [
              "INSERT INTO clan_wars_player_score",
              "(clan_wars_report_id, competition_window_id, player_profile_id, display_name_at_import, points)",
              "VALUES (?, ?, ?, ?, ?)"
            ].join(" "),
            reportRow.id,
            competitionWindowId,
            row.playerId,
            row.displayNameAtImport,
            row.points
          );
        }

        await run("COMMIT");

        await run(
          "UPDATE report_import SET status = 'applied', finished_at = CURRENT_TIMESTAMP WHERE id = ?",
          reportImportId
        );

        return {
          competitionWindowId,
          clanWarsReportId: reportRow.id,
          replacedRows: request.players.length
        };
      } catch (error) {
        await run("ROLLBACK");
        await run(
          "UPDATE report_import SET status = 'failed', finished_at = CURRENT_TIMESTAMP WHERE id = ?",
          reportImportId
        );
        throw error;
      }
    }
  };
};
```

```ts
// packages/platform/src/index.ts (append export)
export * from "./clan-wars-intermediate/create-d1-clan-wars-intermediate-repository";
```

- [ ] **Step 4: Run repository integration test**

Run: `pnpm test -- packages/platform/test/clan-wars-intermediate-repository.test.ts`

Expected: PASS with repository apply replacing rows and creating window.

- [ ] **Step 5: Commit**

```bash
git add packages/platform/src/clan-wars-intermediate/create-d1-clan-wars-intermediate-repository.ts packages/platform/src/index.ts packages/platform/test/clan-wars-intermediate-repository.test.ts
git commit -m "feat(platform): add D1 KT intermediate roster/create/apply repository"
```

### Task 5: Add Admin HTTP Handlers And API Routes In apps/web

**Files:**
- Create: `apps/web/src/server/admin-clan-wars-intermediate.ts`
- Create: `apps/web/src/server/admin-clan-wars-intermediate.test.ts`
- Create: `apps/web/src/app/api/admin/clan-wars/intermediate/roster/route.ts`
- Create: `apps/web/src/app/api/admin/clan-wars/intermediate/players/route.ts`
- Create: `apps/web/src/app/api/admin/clan-wars/intermediate/apply/route.ts`
- Test: `apps/web/src/server/admin-clan-wars-intermediate.test.ts`

- [ ] **Step 1: Write failing server handler tests for auth + endpoints**

```ts
import { describe, expect, it } from "vitest";
import { handleClanWarsIntermediateRequest } from "./admin-clan-wars-intermediate";

describe("handleClanWarsIntermediateRequest", () => {
  const env = {
    DB: {} as D1Database,
    ADMIN_INGEST_TOKEN: "secret-token"
  };

  it("rejects missing admin token", async () => {
    const response = await handleClanWarsIntermediateRequest({
      request: new Request("https://raid.example/api/admin/clan-wars/intermediate/roster"),
      env,
      action: "roster"
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "invalid-admin-token" });
  });

  it("returns roster for authorized request", async () => {
    const response = await handleClanWarsIntermediateRequest({
      request: new Request("https://raid.example/api/admin/clan-wars/intermediate/roster", {
        headers: { "x-admin-token": "secret-token" }
      }),
      env,
      action: "roster"
    });

    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- apps/web/src/server/admin-clan-wars-intermediate.test.ts`

Expected: FAIL with missing module/export.

- [ ] **Step 3: Implement handler and route wrappers**

```ts
// apps/web/src/server/admin-clan-wars-intermediate.ts
import {
  createApplyClanWarsIntermediateResults,
  createCreateClanWarsPlayers,
  createGetClanWarsIntermediateRoster
} from "@raid/application";
import {
  createD1ClanWarsIntermediateRepository,
  verifyAdminToken
} from "@raid/platform";

type Env = {
  DB: D1Database;
  ADMIN_INGEST_TOKEN: string;
};

export const handleClanWarsIntermediateRequest = async (input: {
  request: Request;
  env: Env;
  action: "roster" | "players" | "apply";
}) => {
  const token = input.request.headers.get("x-admin-token");
  const authorized = verifyAdminToken({
    expectedToken: input.env.ADMIN_INGEST_TOKEN,
    receivedToken: token
  });

  if (!authorized) {
    return Response.json({ ok: false, error: "invalid-admin-token" }, { status: 401 });
  }

  const repository = createD1ClanWarsIntermediateRepository(input.env.DB);

  if (input.action === "roster") {
    const execute = createGetClanWarsIntermediateRoster({ repository });
    const includeInactive = new URL(input.request.url).searchParams.get("includeInactive") === "1";
    const players = await execute({ includeInactive });
    return Response.json({ ok: true, players });
  }

  const body = await input.request.json();

  if (input.action === "players") {
    const execute = createCreateClanWarsPlayers({ repository });
    const result = await execute({ players: body.players });
    return Response.json({ ok: true, created: result.created });
  }

  const execute = createApplyClanWarsIntermediateResults({ repository });
  const result = await execute(body);
  return Response.json({ ok: true, ...result });
};
```

```ts
// apps/web/src/app/api/admin/clan-wars/intermediate/roster/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handleClanWarsIntermediateRequest } from "../../../../../../server/admin-clan-wars-intermediate";

export const GET = async (request: Request) => {
  const { env } = await getCloudflareContext<Record<string, unknown> & CloudflareEnv>({ async: true });
  return handleClanWarsIntermediateRequest({ request, env, action: "roster" });
};
```

```ts
// apps/web/src/app/api/admin/clan-wars/intermediate/players/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handleClanWarsIntermediateRequest } from "../../../../../../server/admin-clan-wars-intermediate";

export const POST = async (request: Request) => {
  const { env } = await getCloudflareContext<Record<string, unknown> & CloudflareEnv>({ async: true });
  return handleClanWarsIntermediateRequest({ request, env, action: "players" });
};
```

```ts
// apps/web/src/app/api/admin/clan-wars/intermediate/apply/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handleClanWarsIntermediateRequest } from "../../../../../../server/admin-clan-wars-intermediate";

export const POST = async (request: Request) => {
  const { env } = await getCloudflareContext<Record<string, unknown> & CloudflareEnv>({ async: true });
  return handleClanWarsIntermediateRequest({ request, env, action: "apply" });
};
```

- [ ] **Step 4: Run server handler tests**

Run: `pnpm test -- apps/web/src/server/admin-clan-wars-intermediate.test.ts`

Expected: PASS with auth rejection and authorized flow covered.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/admin-clan-wars-intermediate.ts apps/web/src/server/admin-clan-wars-intermediate.test.ts apps/web/src/app/api/admin/clan-wars/intermediate/roster/route.ts apps/web/src/app/api/admin/clan-wars/intermediate/players/route.ts apps/web/src/app/api/admin/clan-wars/intermediate/apply/route.ts
git commit -m "feat(web): add admin KT intermediate roster/create/apply API routes"
```

### Task 6: Build Operator Upload CLI Around Existing Swift OCR

**Files:**
- Create: `tool/ocr-clan-results/upload-intermediate.mjs`
- Modify: `tool/ocr-clan-results/ocr-clan-results.swift`
- Modify: `tool/ocr-clan-results/README.md`
- Test: `packages/core/test/clan-wars-intermediate.test.ts`

- [ ] **Step 1: Add failing core test for local-time filename parsing contract**

```ts
import { describe, expect, it } from "vitest";
import { parseLocalDateFromScreenshotFileName } from "@raid/core";

describe("parseLocalDateFromScreenshotFileName", () => {
  it("parses dd.MM.yy and returns local calendar date", () => {
    const parsed = parseLocalDateFromScreenshotFileName("08.05.26.jpg");
    expect(parsed).toEqual({ year: 2026, month: 5, day: 8 });
  });

  it("returns null for unknown formats", () => {
    expect(parseLocalDateFromScreenshotFileName("clanwars-final.png")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- packages/core/test/clan-wars-intermediate.test.ts`

Expected: FAIL with missing `parseLocalDateFromScreenshotFileName` export.

- [ ] **Step 3: Implement local date parser, Node uploader script, and Swift timezone alignment**

```ts
// packages/core/src/clan-wars-intermediate.ts (append)
export type LocalCalendarDate = { year: number; month: number; day: number };

export const parseLocalDateFromScreenshotFileName = (
  fileName: string
): LocalCalendarDate | null => {
  const match = fileName.match(/^(\d{2})\.(\d{2})\.(\d{2})/);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = 2000 + Number(match[3]);

  if (!Number.isInteger(day) || !Number.isInteger(month) || day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  return { year, month, day };
};
```

```js
// tool/ocr-clan-results/upload-intermediate.mjs
#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename, resolve } from "node:path";
import readline from "node:readline/promises";

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    image: "",
    apiBaseUrl: process.env.KT_ADMIN_API_BASE_URL ?? "http://localhost:8787/api/admin/clan-wars/intermediate",
    token: process.env.KT_ADMIN_TOKEN ?? ""
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--image") options.image = args[++i] ?? "";
    if (arg === "--api-base-url") options.apiBaseUrl = args[++i] ?? options.apiBaseUrl;
    if (arg === "--token") options.token = args[++i] ?? "";
  }

  if (!options.image) {
    throw new Error("--image is required");
  }
  if (!options.token) {
    throw new Error("KT_ADMIN_TOKEN (or --token) is required");
  }

  return options;
};

const request = async (url, token, init = {}) => {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-admin-token": token,
      ...(init.headers ?? {})
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status} ${payload.error ?? "request-failed"}`);
  }
  return payload;
};

const confirm = async (question) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
};

const main = async () => {
  const options = parseArgs();

  const rosterResponse = await request(`${options.apiBaseUrl}/roster`, options.token);
  const roster = rosterResponse.players;

  const tmpDir = mkdtempSync(join(tmpdir(), "kt-upload-"));
  const participantsPath = join(tmpDir, "participants.json");
  const ocrOutputPath = join(tmpDir, "ocr.json");

  writeFileSync(
    participantsPath,
    JSON.stringify({ participants: roster.flatMap((player) => player.aliases) }, null, 2)
  );

  const ocrRun = spawnSync(
    "swift",
    [
      "tool/ocr-clan-results/ocr-clan-results.swift",
      "--image",
      resolve(options.image),
      "--participants-json",
      participantsPath,
      "--output",
      ocrOutputPath
    ],
    { stdio: "inherit" }
  );

  if (ocrRun.status !== 0) {
    throw new Error("ocr-script-failed");
  }

  const ocrReport = JSON.parse(readFileSync(ocrOutputPath, "utf8"));
  const tournament = ocrReport.tournaments[0];

  const rosterByAlias = new Map();
  for (const player of roster) {
    for (const alias of player.aliases) {
      rosterByAlias.set(alias, player);
    }
    rosterByAlias.set(player.mainNickname, player);
  }

  const missing = [];
  const resolvedRows = [];

  for (const row of tournament.playersOurs) {
    const player = rosterByAlias.get(row.playerNick);
    if (!player) {
      missing.push(row.playerNick);
      continue;
    }

    resolvedRows.push({
      playerId: player.playerId,
      displayNameAtImport: row.playerNick,
      points: row.points
    });
  }

  if (missing.length > 0) {
    console.log("New players detected:", missing.join(", "));
    const createApproved = await confirm("Create missing players before apply?");
    if (!createApproved) {
      console.log("Aborted by operator before apply.");
      rmSync(tmpDir, { recursive: true, force: true });
      process.exit(1);
    }

    const createResponse = await request(`${options.apiBaseUrl}/players`, options.token, {
      method: "POST",
      body: JSON.stringify({
        players: missing.map((nick) => ({ mainNickname: nick, aliases: [nick] }))
      })
    });

    for (const created of createResponse.created) {
      rosterByAlias.set(created.mainNickname, created);
    }

    resolvedRows.length = 0;
    for (const row of tournament.playersOurs) {
      const player = rosterByAlias.get(row.playerNick);
      if (!player) {
        throw new Error(`unresolved-player-after-create:${row.playerNick}`);
      }
      resolvedRows.push({
        playerId: player.playerId,
        displayNameAtImport: row.playerNick,
        points: row.points
      });
    }
  }

  console.log("Preview:");
  console.log(`- file: ${basename(options.image)}`);
  console.log(`- window: ${tournament.startsAt} .. ${tournament.endsAt}`);
  console.log(`- personalRewards: ${Boolean(tournament.hasPersonalRewards)}`);
  console.log(`- opponent: ${tournament.opponentClanName ?? "(unknown)"}`);
  console.log(`- rows: ${resolvedRows.length}`);

  const applyApproved = await confirm("Apply intermediate results?");
  if (!applyApproved) {
    console.log("Aborted by operator before apply.");
    rmSync(tmpDir, { recursive: true, force: true });
    process.exit(1);
  }

  const applyResponse = await request(`${options.apiBaseUrl}/apply`, options.token, {
    method: "POST",
    body: JSON.stringify({
      windowRef: {
        activityType: "clan_wars",
        eventStartAt: tournament.startsAt,
        eventEndsAt: tournament.endsAt
      },
      meta: {
        hasPersonalRewards: tournament.hasPersonalRewards === 1,
        opponentClanName: tournament.opponentClanName ?? null,
        sourceKind: "ocr_cli_intermediate",
        capturedAt: new Date().toISOString(),
        clanTotalPointsMine: tournament.totals.mine ?? undefined
      },
      rosterExpectation: {
        expectedCount: resolvedRows.length
      },
      players: resolvedRows
    })
  });

  console.log("Applied:", applyResponse);
  rmSync(tmpDir, { recursive: true, force: true });
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
```

```swift
// tool/ocr-clan-results/ocr-clan-results.swift (timezone fix in parseCaptureDate)
func parseCaptureDate(from fileName: String) -> Date? {
  let calendar = Calendar(identifier: .gregorian)

  let numericPattern = #"^(\d{2})\.(\d{2})\.(\d{2})"#
  if
    let regex = try? NSRegularExpression(pattern: numericPattern),
    let match = regex.firstMatch(in: fileName, range: NSRange(location: 0, length: fileName.utf16.count)),
    let dayRange = Range(match.range(at: 1), in: fileName),
    let monthRange = Range(match.range(at: 2), in: fileName),
    let yearRange = Range(match.range(at: 3), in: fileName),
    let day = Int(fileName[dayRange]),
    let month = Int(fileName[monthRange]),
    let yearShort = Int(fileName[yearRange])
  {
    var comps = DateComponents()
    comps.year = 2000 + yearShort
    comps.month = month
    comps.day = day
    comps.hour = 0
    comps.minute = 0
    comps.second = 0
    comps.timeZone = TimeZone.current
    return calendar.date(from: comps)
  }

  return nil
}
```

- [ ] **Step 4: Run tests and CLI smoke checks**

Run: `pnpm test -- packages/core/test/clan-wars-intermediate.test.ts`

Expected: PASS with new parser assertions.

Run: `node tool/ocr-clan-results/upload-intermediate.mjs --help`

Expected: exits non-zero with `--image is required` when no args.

Run: `KT_ADMIN_TOKEN=test node tool/ocr-clan-results/upload-intermediate.mjs --image /tmp/x.jpg --api-base-url http://localhost:8787/api/admin/clan-wars/intermediate`

Expected: exits with network or OCR error in local dry run, but argument parsing and auth header path execute.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/clan-wars-intermediate.ts packages/core/test/clan-wars-intermediate.test.ts tool/ocr-clan-results/upload-intermediate.mjs tool/ocr-clan-results/ocr-clan-results.swift tool/ocr-clan-results/README.md
git commit -m "feat(tool): add interactive KT intermediate uploader CLI"
```

### Task 7: Add Operator Runbook And Run Full Verification Gate

**Files:**
- Create: `docs/operator/kt-intermediate-upload.md`
- Modify: `README.md`
- Test: workspace root quality gates

- [ ] **Step 1: Write operator runbook doc**

````md
# KT Intermediate Upload Runbook

## Prerequisites

- `KT_ADMIN_TOKEN` exported in shell
- API base URL available (`KT_ADMIN_API_BASE_URL` or `--api-base-url`)
- Swift runtime available (for OCR extraction)

## Flow

1. Run uploader:

```bash
KT_ADMIN_TOKEN=... node tool/ocr-clan-results/upload-intermediate.mjs --image /absolute/path/to/screenshot.jpg --api-base-url https://vibr-clan.org/api/admin/clan-wars/intermediate
```

2. Review preview output.
3. Confirm new player creation when prompted.
4. Confirm apply step.

## Common Errors

- `invalid-admin-token`: wrong token or missing header.
- `roster-size-mismatch`: payload player count differs from expected count.
- `unknown-player-id`: player mapping not resolved before apply.
````

- [ ] **Step 2: Add README entry for admin upload API and CLI**

````md
## KT Intermediate Upload (Operator)

- API base: `/api/admin/clan-wars/intermediate`
  - `GET /roster`
  - `POST /players`
  - `POST /apply`
- Auth header: `X-Admin-Token`
- Local uploader:

```bash
KT_ADMIN_TOKEN=... node tool/ocr-clan-results/upload-intermediate.mjs --image /path/to/screenshot.jpg --api-base-url https://vibr-clan.org/api/admin/clan-wars/intermediate
```
````

- [ ] **Step 3: Run focused test suites for all touched layers**

Run:

```bash
pnpm test -- packages/core/test/clan-wars-intermediate.test.ts
pnpm test -- packages/application/test/clan-wars-intermediate.test.ts
pnpm test -- packages/platform/test/admin-token.test.ts packages/platform/test/telegram-user-whitelist.test.ts packages/platform/test/clan-wars-intermediate-repository.test.ts
pnpm test -- apps/web/src/server/admin-clan-wars-intermediate.test.ts
```

Expected: PASS for all focused suites.

- [ ] **Step 4: Run repo baseline quality gate**

Run:

```bash
pnpm test
pnpm typecheck
pnpm -r run build
pnpm --filter @raid/web run cf:build
pnpm --filter @raid/web exec wrangler d1 migrations list raid-sl-clan --local
```

Expected:
- tests green,
- typecheck clean,
- all packages build,
- `cf:build` successful,
- local migrations show `No migrations to apply`.

- [ ] **Step 5: Commit docs + final integration state**

```bash
git add docs/operator/kt-intermediate-upload.md README.md
git commit -m "docs(operator): add KT intermediate upload runbook and commands"
```

## Self-Review Checklist

### Spec coverage

- API endpoints (`/roster`, `/players`, `/apply`): Task 5.
- `X-Admin-Token` helper and verification module: Task 3 + Task 5.
- Telegram whitelist module: Task 3.
- `full replace` transactional semantics and `report_import` pending/applied/failed: Task 4.
- `competition_window` resolve/create with `eventEndsAt` week/year convention: Task 4.
- metadata mapping (`hasPersonalRewards`, `sourceKind`, notes JSON): Task 4.
- CLI preview + new players confirm + apply confirm flow: Task 6.
- roster source for fuzzy matching (`GET /roster`): Task 5 + Task 6.
- docs/runbook and verification commands: Task 7.

No missing spec requirement remains uncovered.

### Placeholder scan

- No deferred placeholder markers remain.
- Every code step includes concrete code blocks.
- Every test/run step includes exact commands and explicit expected outcomes.

### Type consistency

- Shared request type `ClanWarsApplyRequest` is defined in core and reused in ports/application/platform.
- Repository interface name `ClanWarsIntermediateRepository` is used consistently in application and platform.
- Endpoint action names (`roster`, `players`, `apply`) are identical in handler and route wrappers.
