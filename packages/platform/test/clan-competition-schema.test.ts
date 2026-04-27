import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const helperPath = resolve(process.cwd(), "packages/platform/test/helpers/clan-competition-schema-check.py");

const runSchemaCheck = <T>(command: string) => {
  const output = execFileSync("python3", [helperPath, command], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  return JSON.parse(output) as T;
};

describe("clan competition schema migration", () => {
  it("creates the shared calendar and mode-specific report tables", () => {
    const result = runSchemaCheck<{ ok: boolean; tables: string[] }>("tables");

    expect(result.ok).toBe(true);
    expect(result.tables).toEqual(
      expect.arrayContaining([
        "competition_window",
        "player_profile",
        "player_alias",
        "report_import",
        "hydra_report",
        "hydra_player_result",
        "hydra_team_run",
        "hydra_team_champion_performance",
        "chimera_report",
        "chimera_player_result",
        "chimera_team_run",
        "chimera_team_champion_performance",
        "clan_wars_report",
        "clan_wars_player_score",
        "siege_report",
        "champion_roster_observation"
      ])
    );
  });

  it("enforces unique competition windows by semantic activity key", () => {
    const result = runSchemaCheck<{ ok: boolean; duplicateRejected: boolean }>("duplicate-window");

    expect(result.ok).toBe(true);
    expect(result.duplicateRejected).toBe(true);
  });

  it("uses mode-specific difficulty constraints for hydra and chimera team runs", () => {
    const result = runSchemaCheck<{ ok: boolean; hydraRejected: boolean; chimeraRejected: boolean }>(
      "difficulty-constraints"
    );

    expect(result.ok).toBe(true);
    expect(result.hydraRejected).toBe(true);
    expect(result.chimeraRejected).toBe(true);
  });

  it("constrains data completeness to the agreed enum values", () => {
    const result = runSchemaCheck<{ ok: boolean; invalidRejected: boolean }>("data-completeness");

    expect(result.ok).toBe(true);
    expect(result.invalidRejected).toBe(true);
  });

  it("stores roster observations as a unique player/champion summary row", () => {
    const result = runSchemaCheck<{ ok: boolean; duplicateRejected: boolean }>("roster-summary-unique");

    expect(result.ok).toBe(true);
    expect(result.duplicateRejected).toBe(true);
  });
});
