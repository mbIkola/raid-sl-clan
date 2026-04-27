import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflowPath = resolve(process.cwd(), ".github/workflows/ci.yml");
const workflowText = readFileSync(workflowPath, "utf8");

describe("CI workflow", () => {
  it("pins GitHub Actions setup-node to Node 24", () => {
    expect(workflowText).toContain("node-version: 24");
  });

  it("applies remote D1 migrations on main before production deploy", () => {
    const migratePattern = /run: pnpm --filter @raid\/web exec wrangler d1 migrations apply raid-sl-clan --remote/;
    const deployPattern = /run: pnpm deploy:web/;

    const migrateMatch = workflowText.match(migratePattern);
    const deployMatch = workflowText.match(deployPattern);

    expect(migrateMatch).not.toBeNull();
    expect(deployMatch).not.toBeNull();
    expect(workflowText.indexOf(migrateMatch![0])).toBeLessThan(workflowText.indexOf(deployMatch![0]));
  });
});
