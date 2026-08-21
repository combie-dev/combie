import { createHash, randomUUID } from "node:crypto";
import type { InvestigationRecord } from "../domain/investigation.ts";
import { investigationId } from "../domain/investigation.ts";
import { Store } from "../storage/store.ts";
import { CombieError, notInitialized } from "./errors.ts";
import {
  formatInvestigationContext,
  getInvestigationContext,
  type InvestigationContext,
} from "./investigate.ts";
import { BINARY_NAME } from "../cli/constants.ts";

export interface SavedInvestigation extends InvestigationRecord {
  snapshot: InvestigationContext;
}

/** Read-time artifact handle over one retained `investigations.snapshot_json` row (Sprint 081). */
export interface InvestigationArtifact {
  handle: string;
  schema: string;
  hash: string;
  location: string;
  counts: {
    related: number;
    subjectChanges: number;
    byteLength: number;
  };
  retrieve: string;
}

export const INVESTIGATION_SNAPSHOT_SCHEMA =
  "combie.investigation.snapshot.v048";

export interface SaveInvestigationOptions {
  baseDir: string;
  resourceRef: string;
  composedAt?: string;
}

export interface SaveInvestigationResult {
  record: SavedInvestigation;
  liveOutput: string;
}

const SNAPSHOT_BANNER_TITLE = "INVESTIGATION SNAPSHOT";

export function serializeInvestigationSnapshot(
  context: InvestigationContext,
): string {
  const { providerSyncClocks: _clocks, providerLastAttemptAt: _attempts, ...snapshot } = context;
  return JSON.stringify(snapshot);
}

export function parseInvestigationSnapshot(
  json: string,
): InvestigationContext {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw untrustedSnapshot();
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw untrustedSnapshot();
  }
  const obj = parsed as Partial<InvestigationContext>;
  if (!obj.subject || typeof obj.subject !== "object") {
    throw untrustedSnapshot();
  }
  return parsed as InvestigationContext;
}

function untrustedSnapshot(): CombieError {
  return new CombieError(
    "INVESTIGATION_SNAPSHOT_UNTRUSTED",
    "Investigation snapshot is unreadable or untrusted.\nThe saved row cannot be treated as Known Facts. Delete it or save a new investigation.",
  );
}

export function saveInvestigation(
  options: SaveInvestigationOptions,
): SaveInvestigationResult {
  const context = getInvestigationContext({
    baseDir: options.baseDir,
    resourceRef: options.resourceRef,
  });
  const composedAt = options.composedAt ?? new Date().toISOString();
  const record: SavedInvestigation = {
    id: investigationId(randomUUID()),
    subjectResourceId: context.subject.id,
    composedAt,
    snapshot: context,
  };

  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    store.init();
    store.insertInvestigation({
      id: record.id,
      subjectResourceId: record.subjectResourceId,
      composedAt: record.composedAt,
      snapshotJson: serializeInvestigationSnapshot(context),
    });
  } finally {
    store.close();
  }

  return {
    record,
    liveOutput: formatInvestigationContext(context),
  };
}

export interface ListInvestigationsOptions {
  subjectResourceId?: string;
}

export function listInvestigations(
  baseDir: string,
  options?: ListInvestigationsOptions,
): InvestigationRecord[] {
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    return store.listInvestigationSummaries(
      options?.subjectResourceId !== undefined
        ? { subjectResourceId: options.subjectResourceId }
        : undefined,
    );
  } finally {
    store.close();
  }
}

interface InvestigationRow {
  id: string;
  subjectResourceId: string;
  composedAt: string;
  snapshotJson: string;
}

function loadInvestigationRow(baseDir: string, id: string): InvestigationRow {
  const ref = id.trim();
  if (!ref) {
    throw new CombieError(
      "INVESTIGATION_ID_REQUIRED",
      `Investigation id is required.\nUsage: ${BINARY_NAME} investigation <investigation-id>\nList ids: ${BINARY_NAME} investigations`,
    );
  }
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    const row = store.getInvestigationRow(ref);
    if (!row) {
      throw new CombieError(
        "INVESTIGATION_NOT_FOUND",
        `Investigation not found: ${ref}\nList saved investigations: ${BINARY_NAME} investigations`,
      );
    }
    return row;
  } finally {
    store.close();
  }
}

export function getSavedInvestigation(
  baseDir: string,
  id: string,
): SavedInvestigation {
  const row = loadInvestigationRow(baseDir, id);
  return {
    id: row.id,
    subjectResourceId: row.subjectResourceId,
    composedAt: row.composedAt,
    snapshot: parseInvestigationSnapshot(row.snapshotJson),
  };
}

export function buildInvestigationArtifact(
  id: string,
  snapshotJson: string,
  snapshot: InvestigationContext,
): InvestigationArtifact {
  const hash = createHash("sha256").update(snapshotJson).digest("hex");
  return {
    handle: id,
    schema: INVESTIGATION_SNAPSHOT_SCHEMA,
    hash: `sha256:${hash}`,
    location: `investigations.snapshot_json id=${id}`,
    counts: {
      related: snapshot.related.length,
      subjectChanges: snapshot.subjectChanges.length,
      byteLength: Buffer.byteLength(snapshotJson, "utf8"),
    },
    retrieve: `${BINARY_NAME} investigation ${id}`,
  };
}

export function getInvestigationArtifact(
  baseDir: string,
  id: string,
): InvestigationArtifact {
  const row = loadInvestigationRow(baseDir, id);
  return buildInvestigationArtifact(
    row.id,
    row.snapshotJson,
    parseInvestigationSnapshot(row.snapshotJson),
  );
}

export function formatInvestigationList(
  records: InvestigationRecord[],
  subjectResourceId?: string,
): string {
  if (records.length === 0) {
    if (subjectResourceId !== undefined) {
      return (
        `No investigation snapshots saved for subject ${subjectResourceId}.\n` +
        `Save one: ${BINARY_NAME} investigate ${subjectResourceId} --save`
      );
    }
    return (
      "No investigation snapshots saved yet.\n" +
      `Save one: ${BINARY_NAME} investigate <resource-id> --save`
    );
  }
  const col1 = Math.max("ID".length, ...records.map((r) => r.id.length));
  const col2 = Math.max(
    "SUBJECT".length,
    ...records.map((r) => r.subjectResourceId.length),
  );
  const header =
    "ID".padEnd(col1) +
    "  " +
    "SUBJECT".padEnd(col2) +
    "  " +
    "COMPOSED AT";
  const body = records
    .map(
      (r) =>
        r.id.padEnd(col1) +
        "  " +
        r.subjectResourceId.padEnd(col2) +
        "  " +
        r.composedAt,
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function formatInvestigationArtifact(
  artifact: InvestigationArtifact,
): string {
  const pad = 12;
  const line = (label: string, value: string) =>
    `  ${label.padEnd(pad)}${value}`;
  return [
    "ARTIFACT",
    line("handle:", artifact.handle),
    line("schema:", artifact.schema),
    line("hash:", artifact.hash),
    line("location:", artifact.location),
    line(
      "counts:",
      `related=${artifact.counts.related}, subjectChanges=${artifact.counts.subjectChanges}, byteLength=${artifact.counts.byteLength}`,
    ),
    line("retrieve:", artifact.retrieve),
  ].join("\n");
}

export function formatSavedInvestigation(
  record: SavedInvestigation,
  artifact?: InvestigationArtifact,
): string {
  const banner =
    `${SNAPSHOT_BANNER_TITLE}\n` +
    `ID: ${record.id}\n` +
    `SUBJECT: ${record.subjectResourceId}\n` +
    `Composed by Combie at ${record.composedAt}\n` +
    `This is retained composition from that time. It is not current provider truth.`;
  const artifactBlock =
    artifact === undefined ? "" : `\n\n${formatInvestigationArtifact(artifact)}`;
  return `${banner}${artifactBlock}\n\n${formatInvestigationContext(record.snapshot)}`;
}

export function formatSaveConfirmation(record: SavedInvestigation): string {
  return (
    `Saved investigation snapshot ${record.id}\n` +
    `subject ${record.subjectResourceId}\n` +
    `composed at ${record.composedAt} from local store state.\n` +
    `Reopen: ${BINARY_NAME} investigation ${record.id}`
  );
}

/** Read-time retained-composition pointers. Empty when there is nothing to show. */
export function formatInvestigationHistorySection(
  records: InvestigationRecord[],
): string {
  if (records.length === 0) return "";
  const intro =
    `INVESTIGATION HISTORY\n` +
    `Retained compositions of this subject.\n` +
    `They are not current provider truth. They are not an incident.`;
  const rows = records.map((record) => `${record.id}  ${record.composedAt}`);
  return (
    `${intro}\n\n${rows.join("\n")}\n\n` +
    `Show: ${BINARY_NAME} investigation ${records[0]!.id}`
  );
}

export function formatWithInvestigationHistory(
  body: string,
  records: InvestigationRecord[],
): string {
  const section = formatInvestigationHistorySection(records);
  return section === "" ? body : `${body}\n\n${section}`;
}
