import type { ClanWarsIntermediateRepository, ClanWarsRosterRow } from "@raid/ports";

export type GetClanWarsIntermediateRosterDeps = {
  repository: ClanWarsIntermediateRepository;
};

export type GetClanWarsIntermediateRosterInput = {
  includeInactive?: boolean;
};

export const createGetClanWarsIntermediateRoster = ({
  repository
}: GetClanWarsIntermediateRosterDeps) => {
  return async (input?: GetClanWarsIntermediateRosterInput): Promise<ClanWarsRosterRow[]> =>
    repository.getRoster({
      includeInactive: input?.includeInactive ?? false
    });
};
