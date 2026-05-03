import { describe, expect, it } from "vitest";
import {
  buildClanWarsDeclineRows,
  buildClanWarsStabilityRows,
  type ClanWarsPlayerWindowPointsRow
} from "@raid/platform";

const rows: ClanWarsPlayerWindowPointsRow[] = [
  { windowStart: "2031-04-07T10:00:00.000Z", playerName: "Alpha", points: 210 },
  { windowStart: "2031-04-07T10:00:00.000Z", playerName: "Beta", points: 40 },
  { windowStart: "2031-04-07T10:00:00.000Z", playerName: "Gamma", points: 100 },
  { windowStart: "2031-03-24T10:00:00.000Z", playerName: "Alpha", points: 240 },
  { windowStart: "2031-03-24T10:00:00.000Z", playerName: "Beta", points: 60 },
  { windowStart: "2031-03-24T10:00:00.000Z", playerName: "Gamma", points: 90 },
  { windowStart: "2031-03-10T10:00:00.000Z", playerName: "Alpha", points: 260 },
  { windowStart: "2031-03-10T10:00:00.000Z", playerName: "Beta", points: 90 },
  { windowStart: "2031-03-10T10:00:00.000Z", playerName: "Gamma", points: 80 },
  { windowStart: "2031-02-24T10:00:00.000Z", playerName: "Alpha", points: 280 },
  { windowStart: "2031-02-24T10:00:00.000Z", playerName: "Beta", points: 120 },
  { windowStart: "2031-02-24T10:00:00.000Z", playerName: "Gamma", points: 70 },
  { windowStart: "2031-02-10T10:00:00.000Z", playerName: "Alpha", points: 300 },
  { windowStart: "2031-02-10T10:00:00.000Z", playerName: "Beta", points: 140 },
  { windowStart: "2031-02-10T10:00:00.000Z", playerName: "Gamma", points: 60 },
  { windowStart: "2031-01-27T10:00:00.000Z", playerName: "Alpha", points: 320 },
  { windowStart: "2031-01-27T10:00:00.000Z", playerName: "Beta", points: 160 },
  { windowStart: "2031-01-27T10:00:00.000Z", playerName: "Gamma", points: 50 }
];

describe("KT archive metrics", () => {
  it("computes stability rows from player-window matrix with deterministic ordering", () => {
    const stability = buildClanWarsStabilityRows(rows, 6);

    expect(stability).toHaveLength(3);
    expect(stability.map((row) => row.playerName)).toEqual(["Alpha", "Beta", "Gamma"]);

    expect(stability[0]).toEqual({
      playerName: "Alpha",
      windowsPlayed: 6,
      avgPoints: 268.33,
      bestPoints: 320,
      lastWindowPoints: 210,
      consistencyScore: 1
    });
  });

  it("returns empty stability rows when selected windows is zero or negative", () => {
    expect(buildClanWarsStabilityRows(rows, 0)).toEqual([]);
    expect(buildClanWarsStabilityRows(rows, -2)).toEqual([]);
  });

  it("computes decline rows using recent-3 vs baseline with only negative deltas", () => {
    const decline = buildClanWarsDeclineRows(rows);

    expect(decline).toHaveLength(2);
    expect(decline.map((row) => row.playerName)).toEqual(["Beta", "Alpha"]);
    expect(decline.every((row) => row.delta < 0)).toBe(true);

    expect(decline[0]).toEqual({
      playerName: "Beta",
      recentAvg: 63.33,
      baselineAvg: 140,
      delta: -76.67
    });
  });

  it("excludes players with fewer than three played windows from decline", () => {
    const withLowParticipation: ClanWarsPlayerWindowPointsRow[] = [
      ...rows,
      { windowStart: "2031-04-07T10:00:00.000Z", playerName: "Delta", points: 40 },
      { windowStart: "2031-03-24T10:00:00.000Z", playerName: "Delta", points: 50 }
    ];

    const decline = buildClanWarsDeclineRows(withLowParticipation);

    expect(decline.some((row) => row.playerName === "Delta")).toBe(false);
  });

  it("returns empty decline rows for empty or insufficient window history", () => {
    expect(buildClanWarsDeclineRows([])).toEqual([]);

    const twoWindowRows = rows.filter((row) =>
      ["2031-04-07T10:00:00.000Z", "2031-03-24T10:00:00.000Z"].includes(row.windowStart)
    );
    expect(buildClanWarsDeclineRows(twoWindowRows)).toEqual([]);

    const threeWindowRows = rows.filter((row) =>
      [
        "2031-04-07T10:00:00.000Z",
        "2031-03-24T10:00:00.000Z",
        "2031-03-10T10:00:00.000Z"
      ].includes(row.windowStart)
    );
    expect(buildClanWarsDeclineRows(threeWindowRows)).toEqual([]);
  });
});
