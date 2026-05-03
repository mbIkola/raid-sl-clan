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
  it("computes stability rows from player-window matrix", () => {
    const stability = buildClanWarsStabilityRows(rows, 6);

    expect(stability[0]).toEqual({
      playerName: "Alpha",
      windowsPlayed: 6,
      avgPoints: 268.33,
      bestPoints: 320,
      lastWindowPoints: 210,
      consistencyScore: 1
    });
  });

  it("computes decline rows using recent-3 vs baseline", () => {
    const decline = buildClanWarsDeclineRows(rows);

    expect(decline[0]).toEqual({
      playerName: "Beta",
      recentAvg: 63.33,
      baselineAvg: 140,
      delta: -76.67
    });
  });
});
