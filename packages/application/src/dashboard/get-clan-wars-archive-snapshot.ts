import type { ClanWarsArchiveData, ClanWarsArchiveRepository } from "@raid/ports";

export type ClanWarsArchiveSnapshot = ClanWarsArchiveData & { generatedAt: string };

export type GetClanWarsArchiveSnapshotDeps = {
  repository: ClanWarsArchiveRepository;
  now?: () => Date;
  windowLimit?: number;
};

export const createGetClanWarsArchiveSnapshot = ({
  repository,
  now = () => new Date(),
  windowLimit = 12
}: GetClanWarsArchiveSnapshotDeps) => {
  return async (): Promise<ClanWarsArchiveSnapshot> => {
    const nowIso = now().toISOString();
    const archive = await repository.getClanWarsArchive({
      nowIso,
      windowLimit
    });

    return {
      generatedAt: nowIso,
      header: archive.header,
      history: archive.history,
      stability: archive.stability,
      decline: archive.decline
    };
  };
};
