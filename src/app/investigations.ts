import { randomUUID } from "node:crypto";
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
  return JSON.stringify(context);
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

export function listInvestigations(baseDir: string): InvestigationRecord[] {
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    return store.listInvestigationSummaries();
  } finally {
    store.close();
  }
}

export function getSavedInvestigation(
  baseDir: string,
  id: string,
): SavedInvestigation {
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
    return {
      id: row.id,
      subjectResourceId: row.subjectResourceId,
      composedAt: row.composedAt,
      snapshot: parseInvestigationSnapshot(row.snapshotJson),
    };
  } finally {
    store.close();
  }
}

export function formatInvestigationList(
  records: InvestigationRecord[],
): string {
  if (records.length === 0) {
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

export function formatSavedInvestigation(
  record: SavedInvestigation,
): string {
  const banner =
    `${SNAPSHOT_BANNER_TITLE}\n` +
    `ID: ${record.id}\n` +
    `SUBJECT: ${record.subjectResourceId}\n` +
    `Composed by Combie at ${record.composedAt}\n` +
    `This is retained composition from that time. It is not current provider truth.`;
  return `${banner}\n\n${formatInvestigationContext(record.snapshot)}`;
}

export function formatSaveConfirmation(record: SavedInvestigation): string {
  return (
    `Saved investigation snapshot ${record.id}\n` +
    `subject ${record.subjectResourceId}\n` +
    `composed at ${record.composedAt} from local store state.\n` +
    `Reopen: ${BINARY_NAME} investigation ${record.id}`
  );
}
