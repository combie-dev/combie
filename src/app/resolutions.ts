import { randomUUID } from "node:crypto";
import type { ResolutionRecord } from "../domain/resolution.ts";
import { resolutionId } from "../domain/resolution.ts";
import { Store } from "../storage/store.ts";
import { CombieError, notInitialized } from "./errors.ts";
import { BINARY_NAME } from "../cli/constants.ts";

export interface RecordResolutionOptions {
  baseDir: string;
  investigationId: string;
  decision?: string;
  action?: string;
  outcome?: string;
  recordedAt?: string;
}

export interface ListResolutionsOptions {
  investigationId?: string;
  subjectResourceId?: string;
}

function trimField(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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
    const record: ResolutionRecord = {
      id: resolutionId(randomUUID()),
      investigationId: investigation.id,
      subjectResourceId: investigation.subjectResourceId,
      recordedAt: options.recordedAt ?? new Date().toISOString(),
      ...(decision ? { decision } : {}),
      ...(action ? { action } : {}),
      ...(outcome ? { outcome } : {}),
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
        options?.subjectResourceId !== undefined
        ? {
            ...(options.investigationId !== undefined
              ? { investigationId: options.investigationId }
              : {}),
            ...(options.subjectResourceId !== undefined
              ? { subjectResourceId: options.subjectResourceId }
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
