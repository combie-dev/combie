import { randomUUID } from "node:crypto";
import type { ResolutionRecord } from "../domain/resolution.ts";
import { resolutionId } from "../domain/resolution.ts";
import { Store } from "../storage/store.ts";
import { CombieError, notInitialized } from "./errors.ts";
import { getInvestigationContext } from "./investigate.ts";
import {
  composeProviderActivityChronology,
  nativeEvidenceId,
} from "./provider-activity.ts";
import { BINARY_NAME } from "../cli/constants.ts";

export interface RecordResolutionOptions {
  baseDir: string;
  investigationId: string;
  decision?: string;
  action?: string;
  outcome?: string;
  /** Exact locally retained provider-native evidence ids (Sprint 054). */
  evidenceIds?: string[];
  recordedAt?: string;
}

export interface ListResolutionsOptions {
  investigationId?: string;
  subjectResourceId?: string;
  evidenceId?: string;
}

function trimField(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Attachable evidence allowlist for one subject: the exact provider-native
 * evidence ids `investigate` already displays for that subject (subject
 * evidence and one-hop neighbor evidence in that compose). Local store reads
 * only — never a provider refresh.
 */
function attachableEvidenceIds(
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

function validateEvidenceIds(
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
        `Evidence id not found: ${evidenceIds[0]}\nThe subject Resource ${subjectResourceId} can no longer be composed, so no evidence ids are reachable.\nRecord the Resolution without --evidence, or investigate the subject first.`,
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

export function recordResolution(
  options: RecordResolutionOptions,
): ResolutionRecord {
  const investigationId = options.investigationId.trim();
  if (!investigationId) {
    throw new CombieError(
      "INVESTIGATION_ID_REQUIRED",
      `Investigation id is required.\nUsage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>]`,
    );
  }
  const decision = trimField(options.decision);
  const action = trimField(options.action);
  const outcome = trimField(options.outcome);
  if (!decision && !action && !outcome) {
    throw new CombieError(
      "RESOLUTION_FIELDS_REQUIRED",
      `At least one of --decision, --action, or --outcome is required.\nA content-free resolved flag is not a resolution.\nUsage: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text> [--action <text>] [--outcome <text>]`,
    );
  }

  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    store.init();
    const investigation = store.getInvestigationRow(investigationId);
    if (!investigation) {
      throw new CombieError(
        "INVESTIGATION_NOT_FOUND",
        `Investigation not found: ${investigationId}\nList saved investigations: ${BINARY_NAME} investigations`,
      );
    }
    const evidenceIds =
      options.evidenceIds !== undefined
        ? [
            ...new Set(
              options.evidenceIds
                .map((id) => id.trim())
                .filter((id) => id.length > 0),
            ),
          ]
        : undefined;
    if (evidenceIds !== undefined && evidenceIds.length > 0) {
      validateEvidenceIds(
        options.baseDir,
        investigation.subjectResourceId,
        evidenceIds,
      );
    }
    const record: ResolutionRecord = {
      id: resolutionId(randomUUID()),
      investigationId: investigation.id,
      subjectResourceId: investigation.subjectResourceId,
      recordedAt: options.recordedAt ?? new Date().toISOString(),
      ...(decision ? { decision } : {}),
      ...(action ? { action } : {}),
      ...(outcome ? { outcome } : {}),
      ...(evidenceIds !== undefined && evidenceIds.length > 0
        ? { evidenceIds }
        : {}),
    };
    store.insertResolution(record);
    return record;
  } finally {
    store.close();
  }
}

export function listResolutions(
  baseDir: string,
  options?: ListResolutionsOptions,
): ResolutionRecord[] {
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    return store.listResolutionSummaries(
      options?.investigationId !== undefined ||
        options?.subjectResourceId !== undefined ||
        options?.evidenceId !== undefined
        ? {
            ...(options.investigationId !== undefined
              ? { investigationId: options.investigationId }
              : {}),
            ...(options.subjectResourceId !== undefined
              ? { subjectResourceId: options.subjectResourceId }
              : {}),
            ...(options.evidenceId !== undefined
              ? { evidenceId: options.evidenceId }
              : {}),
          }
        : undefined,
    );
  } finally {
    store.close();
  }
}

export function getResolution(baseDir: string, id: string): ResolutionRecord {
  const ref = id.trim();
  if (!ref) {
    throw new CombieError(
      "RESOLUTION_ID_REQUIRED",
      `Resolution id is required.\nUsage: ${BINARY_NAME} resolution <resolution-id>\nList ids: ${BINARY_NAME} resolutions`,
    );
  }
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    const row = store.getResolutionRow(ref);
    if (!row) {
      throw new CombieError(
        "RESOLUTION_NOT_FOUND",
        `Resolution not found: ${ref}\nList recorded resolutions: ${BINARY_NAME} resolutions`,
      );
    }
    return row;
  } finally {
    store.close();
  }
}

export function formatResolutionList(
  records: ResolutionRecord[],
  filter?: ListResolutionsOptions,
): string {
  if (records.length === 0) {
    if (filter?.evidenceId !== undefined) {
      return (
        `No resolutions recorded for evidence ${filter.evidenceId}.\n` +
        `This is known-empty for that exact local evidence id — no retained resolution attached it.`
      );
    }
    if (filter?.investigationId !== undefined) {
      return (
        `No resolutions recorded for investigation ${filter.investigationId}.\n` +
        `Record one: ${BINARY_NAME} resolution --investigation ${filter.investigationId} --decision <text>`
      );
    }
    if (filter?.subjectResourceId !== undefined) {
      return (
        `No resolutions recorded for subject ${filter.subjectResourceId}.\n` +
        `Record one against a saved investigation of that subject.`
      );
    }
    return (
      "No resolutions recorded yet.\n" +
      `Record one: ${BINARY_NAME} resolution --investigation <investigation-id> --decision <text>`
    );
  }
  const col1 = Math.max("ID".length, ...records.map((r) => r.id.length));
  const col2 = Math.max(
    "INVESTIGATION".length,
    ...records.map((r) => r.investigationId.length),
  );
  const col3 = Math.max(
    "SUBJECT".length,
    ...records.map((r) => r.subjectResourceId.length),
  );
  const header =
    "ID".padEnd(col1) +
    "  " +
    "INVESTIGATION".padEnd(col2) +
    "  " +
    "SUBJECT".padEnd(col3) +
    "  " +
    "RECORDED AT";
  const body = records
    .map(
      (r) =>
        r.id.padEnd(col1) +
        "  " +
        r.investigationId.padEnd(col2) +
        "  " +
        r.subjectResourceId.padEnd(col3) +
        "  " +
        r.recordedAt,
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function formatResolution(record: ResolutionRecord): string {
  const lines = [
    "RESOLUTION",
    `ID: ${record.id}`,
    `INVESTIGATION: ${record.investigationId}`,
    `SUBJECT: ${record.subjectResourceId}`,
    `Recorded by Combie at ${record.recordedAt}`,
    "This is retained organizational response. It is not current provider truth.",
  ];
  if (record.decision) {
    lines.push("", "DECISION", record.decision);
  }
  if (record.action) {
    lines.push("", "ACTION", record.action);
  }
  if (record.outcome) {
    lines.push("", "OUTCOME", record.outcome);
  }
  if (record.evidenceIds && record.evidenceIds.length > 0) {
    lines.push("", "EVIDENCE", ...record.evidenceIds);
  }
  return lines.join("\n");
}

export type ResolutionMemoryScope = "investigation" | "subject";

function memoryIdentityLine(
  record: ResolutionRecord,
  scope: ResolutionMemoryScope,
): string {
  if (scope === "investigation") {
    return `${record.id}  ${record.recordedAt}`;
  }
  return `${record.id}  ${record.investigationId}  ${record.recordedAt}`;
}

function memoryFieldBlocks(record: ResolutionRecord): string[] {
  const blocks: string[] = [];
  if (record.decision) {
    blocks.push("DECISION", record.decision);
  }
  if (record.action) {
    if (blocks.length > 0) blocks.push("");
    blocks.push("ACTION", record.action);
  }
  if (record.outcome) {
    if (blocks.length > 0) blocks.push("");
    blocks.push("OUTCOME", record.outcome);
  }
  if (record.evidenceIds && record.evidenceIds.length > 0) {
    if (blocks.length > 0) blocks.push("");
    blocks.push("EVIDENCE", ...record.evidenceIds);
  }
  return blocks;
}

/** Read-time organizational-response section. Empty when there is nothing to show. */
export function formatResolutionMemorySection(
  records: ResolutionRecord[],
  scope: ResolutionMemoryScope,
): string {
  if (records.length === 0) return "";
  const where =
    scope === "investigation" ? "for this investigation" : "for this subject";
  const intro =
    `RESOLUTION MEMORY\n` +
    `Retained organizational response ${where}.\n` +
    `It is not current provider truth. It is not a recommendation.`;
  const rows = records.map((record) =>
    [memoryIdentityLine(record, scope), ...memoryFieldBlocks(record)].join(
      "\n",
    ),
  );
  return (
    `${intro}\n\n${rows.join("\n\n")}\n\n` +
    `Show: ${BINARY_NAME} resolution ${records[0]!.id}`
  );
}

export function formatWithResolutionMemory(
  body: string,
  records: ResolutionRecord[],
  scope: ResolutionMemoryScope,
): string {
  const section = formatResolutionMemorySection(records, scope);
  return section === "" ? body : `${body}\n\n${section}`;
}

export function formatRecordConfirmation(record: ResolutionRecord): string {
  return (
    `Recorded resolution ${record.id}\n` +
    `investigation ${record.investigationId}\n` +
    `subject ${record.subjectResourceId}\n` +
    `recorded at ${record.recordedAt} as organizational response.\n` +
    `Show: ${BINARY_NAME} resolution ${record.id}`
  );
}
