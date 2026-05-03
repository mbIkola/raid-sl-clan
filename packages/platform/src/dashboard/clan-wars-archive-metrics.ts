import type { ClanWarsArchiveDeclineRow, ClanWarsArchiveStabilityRow } from "@raid/ports";

export type ClanWarsPlayerWindowPointsRow = {
  windowStart: string;
  playerName: string;
  points: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const getSortedWindowsDesc = (rows: ClanWarsPlayerWindowPointsRow[]) =>
  Array.from(new Set(rows.map((row) => row.windowStart))).sort((a, b) =>
    a < b ? 1 : a > b ? -1 : 0
  );

const groupPlayerPoints = (rows: ClanWarsPlayerWindowPointsRow[]) => {
  const grouped = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const perPlayer = grouped.get(row.playerName) ?? new Map<string, number>();
    perPlayer.set(row.windowStart, row.points);
    grouped.set(row.playerName, perPlayer);
  }

  return grouped;
};

export const buildClanWarsStabilityRows = (
  rows: ClanWarsPlayerWindowPointsRow[],
  selectedWindows: number
): ClanWarsArchiveStabilityRow[] => {
  const windows = getSortedWindowsDesc(rows).slice(0, selectedWindows);
  const grouped = groupPlayerPoints(rows);

  return Array.from(grouped.entries())
    .map(([playerName, pointsByWindow]) => {
      const values = windows.map((windowStart) => pointsByWindow.get(windowStart) ?? 0);
      const windowsPlayed = values.filter((points) => points > 0).length;
      const avgPoints =
        values.length === 0 ? 0 : round2(values.reduce((sum, value) => sum + value, 0) / values.length);
      const bestPoints =
        values.length === 0
          ? 0
          : values.reduce(
              (maxValue, currentValue) => (currentValue > maxValue ? currentValue : maxValue),
              values[0]
            );
      const lastWindowPoints = values.length === 0 ? 0 : values[0];
      const consistencyScore = values.length === 0 ? 0 : round2(windowsPlayed / values.length);

      return {
        playerName,
        windowsPlayed,
        avgPoints,
        bestPoints,
        lastWindowPoints,
        consistencyScore
      };
    })
    .sort(
      (a, b) =>
        b.consistencyScore - a.consistencyScore ||
        b.avgPoints - a.avgPoints ||
        a.playerName.localeCompare(b.playerName)
    );
};

export const buildClanWarsDeclineRows = (
  rows: ClanWarsPlayerWindowPointsRow[]
): ClanWarsArchiveDeclineRow[] => {
  const windows = getSortedWindowsDesc(rows);
  const recentWindows = windows.slice(0, 3);
  const precedingWindows = windows.slice(3);
  const baselineWindows = precedingWindows.length > 6 ? precedingWindows.slice(0, 6) : precedingWindows;
  const grouped = groupPlayerPoints(rows);

  if (recentWindows.length < 3 || baselineWindows.length === 0) {
    return [];
  }

  return Array.from(grouped.entries())
    .map(([playerName, pointsByWindow]) => {
      const recentValues = recentWindows.map((windowStart) => pointsByWindow.get(windowStart) ?? 0);
      const baselineValues = baselineWindows.map((windowStart) => pointsByWindow.get(windowStart) ?? 0);
      const windowsPlayed = windows.filter((windowStart) => (pointsByWindow.get(windowStart) ?? 0) > 0).length;

      if (windowsPlayed < 3) {
        return null;
      }

      const recentAvg = round2(recentValues.reduce((sum, value) => sum + value, 0) / recentValues.length);
      const baselineAvg = round2(
        baselineValues.reduce((sum, value) => sum + value, 0) / baselineValues.length
      );
      const delta = round2(recentAvg - baselineAvg);

      return { playerName, recentAvg, baselineAvg, delta };
    })
    .filter((row): row is ClanWarsArchiveDeclineRow => row !== null && row.delta < 0)
    .sort((a, b) => a.delta - b.delta || a.playerName.localeCompare(b.playerName));
};
