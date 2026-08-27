import { CombieError } from "./errors.ts";
import { getInvestigationContext } from "./investigate.ts";
import {
  composeProviderActivityChronology,
  nativeEvidenceId,
} from "./provider-activity.ts";
import { BINARY_NAME } from "../cli/constants.ts";

/**
 * Shared attachable-evidence contract (Sprint 054 / reused by Sprint 111).
 *
 * The exact provider-native evidence ids `investigate` already displays for
 * one subject (subject evidence and one-hop neighbor evidence in that
 * compose). Local store reads only — never a provider refresh.
 */
export function attachableEvidenceIds(
  baseDir: string,
  subjectResourceId: string,
): Set<string> {
  const context = getInvestigationContext({
    baseDir,
    resourceRef: subjectResourceId,
  });
  const chronology = composeProviderActivityChronology(context);
  return new Set(chronology.entries.map((entry) => nativeEvidenceId(entry)));
}

/**
 * Validate exact locally retained provider-native evidence ids against what
 * live `investigate` shows for the subject. Unknown ids reject the whole
 * record atomically. Never inferred from provider activity.
 */
export function validateEvidenceIds(
  baseDir: string,
  subjectResourceId: string,
  evidenceIds: string[],
): void {
  let attachable: Set<string>;
  try {
    attachable = attachableEvidenceIds(baseDir, subjectResourceId);
  } catch (error) {
    if (error instanceof CombieError && error.code === "RESOURCE_NOT_FOUND") {
      throw new CombieError(
        "EVIDENCE_ID_NOT_FOUND",
        `Evidence id not found: ${evidenceIds[0]}\nThe subject Resource ${subjectResourceId} can no longer be composed, so no evidence ids are reachable.\nRecord without --evidence, or investigate the subject first.`,
      );
    }
    throw error;
  }
  const unknown = evidenceIds.find((id) => !attachable.has(id));
  if (unknown !== undefined) {
    throw new CombieError(
      "EVIDENCE_ID_NOT_FOUND",
      `Evidence id not found: ${unknown}\nAttach an exact provider-native evidence id investigate already shows for this subject (Vercel deployment uid, GitHub workflow run id, Neon operation id, Sentry release version, Sentry issue id).\nShow: ${BINARY_NAME} investigate ${subjectResourceId}`,
    );
  }
}
