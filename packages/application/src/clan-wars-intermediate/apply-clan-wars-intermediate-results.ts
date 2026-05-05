import {
  type ClanWarsApplyRequest,
  type ClanWarsApplyValidationCode,
  validateClanWarsApplyRequest
} from "@raid/core";
import type { ClanWarsApplyResult, ClanWarsIntermediateRepository } from "@raid/ports";

export type ApplyClanWarsIntermediateResultsDeps = {
  repository: ClanWarsIntermediateRepository;
};

export type ApplyClanWarsIntermediateResultsInput = ClanWarsApplyRequest;

export class ClanWarsApplyValidationError extends Error {
  readonly codes: ClanWarsApplyValidationCode[];

  constructor(codes: ClanWarsApplyValidationCode[]) {
    super(codes.join(","));
    this.name = "ClanWarsApplyValidationError";
    this.codes = codes;
  }
}

export const createApplyClanWarsIntermediateResults = ({
  repository
}: ApplyClanWarsIntermediateResultsDeps) => {
  return async (request: ApplyClanWarsIntermediateResultsInput): Promise<ClanWarsApplyResult> => {
    const issues = validateClanWarsApplyRequest(request);
    if (issues.length > 0) {
      throw new ClanWarsApplyValidationError(issues.map(issue => issue.code));
    }

    return repository.applyResults({ request });
  };
};
