import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const helperPath = resolve(
  process.cwd(),
  "packages/platform/test/helpers/clan-dashboard-query-check.mjs"
);

const runCheck = <T>(command: string) => {
  const output = execFileSync("node", ["--no-warnings", helperPath, command], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  return JSON.parse(output) as T;
};

describe("clan dashboard SQL", () => {
  it("calculates KT ranking by latest 4 personal-rewards reports", () => {
    const result = runCheck<{ ok: boolean; rows: Array<{ player_name: string; score: number }> }>(
      "kt-latest-4-rewards"
    );

    expect(result.ok).toBe(true);
    expect(result.rows).toHaveLength(5);
    expect(result.rows[0]).toEqual({ player_name: "Alpha", score: 220 });
    expect(result.rows[1]).toEqual({ player_name: "Delta", score: 140 });
    expect(result.rows[2]).toEqual({ player_name: "Gamma", score: 130 });
    expect(result.rows[3]).toEqual({ player_name: "Beta", score: 90 });
    expect(result.rows[4]).toEqual({ player_name: "Epsilon", score: 0 });
  });

  it("excludes inactive roster from hydra ranking and keeps active zero rows", () => {
    const result = runCheck<{ ok: boolean; rows: Array<{ player_name: string; score: number }> }>(
      "hydra-active-roster-filter"
    );

    expect(result.ok).toBe(true);
    expect(result.rows[0]).toEqual({ player_name: "ActiveOne", score: 2000 });
    expect(result.rows.some((row) => row.player_name === "InactiveWhale")).toBe(false);
    expect(result.rows.some((row) => row.player_name === "ActiveZero" && row.score === 0)).toBe(true);
  });

  it("uses rewards flag from the selected latest KT window, not global latest report", () => {
    const result = runCheck<{
      ok: boolean;
      row: { starts_at: string; ends_at: string; has_personal_rewards: number };
    }>("kt-readiness-window-scoped-status");

    expect(result.ok).toBe(true);
    expect(result.row.starts_at).toBe("2031-03-15T00:00:00Z");
    expect(result.row.ends_at).toBe("2031-03-17T00:00:00Z");
    expect(result.row.has_personal_rewards).toBe(0);
  });

  it("aggregates KT archive history for the latest windows", () => {
    const result = runCheck<{
      ok: boolean;
      rows: Array<{
        starts_at: string;
        has_personal_rewards: number;
        clan_total_points: number;
        active_contributors: number;
        top_player_name: string;
        top_player_points: number;
      }>;
    }>("kt-archive-history-aggregate");

    expect(result.ok).toBe(true);
    expect(result.rows[0]).toEqual({
      starts_at: "2031-04-12T00:00:00Z",
      has_personal_rewards: 1,
      clan_total_points: 430,
      active_contributors: 3,
      top_player_name: "Alpha",
      top_player_points: 220
    });
  });
});
