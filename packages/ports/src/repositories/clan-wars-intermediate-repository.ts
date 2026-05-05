import type { ClanWarsApplyRequest } from "@raid/core";

export type ClanWarsRosterRow = {
  playerId: number;
  mainNickname: string;
  aliases: string[];
  status: "active" | "inactive" | "removed";
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
