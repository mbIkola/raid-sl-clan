import type {
  ClanWarsCreatePlayerInput,
  ClanWarsCreatedPlayer,
  ClanWarsIntermediateRepository
} from "@raid/ports";

export type CreateClanWarsPlayersDeps = {
  repository: ClanWarsIntermediateRepository;
};

export type CreateClanWarsPlayersInput = {
  players: ClanWarsCreatePlayerInput[];
};

export type CreateClanWarsPlayersOutput = {
  created: ClanWarsCreatedPlayer[];
};

export const createCreateClanWarsPlayers = ({ repository }: CreateClanWarsPlayersDeps) => {
  return async ({ players }: CreateClanWarsPlayersInput): Promise<CreateClanWarsPlayersOutput> => ({
    created: await repository.createPlayers({ players })
  });
};
