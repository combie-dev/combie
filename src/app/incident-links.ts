import { randomUUID } from "node:crypto";
import { BINARY_NAME } from "../cli/constants.ts";
import type { IncidentLinkRecord } from "../domain/incident-link.ts";
import { incidentLinkId } from "../domain/incident-link.ts";
import { Store } from "../storage/store.ts";
import { CombieError, notInitialized } from "./errors.ts";

const LINK_USAGE = `Usage: ${BINARY_NAME} incident-link --incident <incident-id> --incident <incident-id> --reason <text>`;

function uniqueFirstSeen(ids: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }
  return unique;
}

function canonicalizePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function isIncidentLinkExistsError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.startsWith("INCIDENT_LINK_EXISTS") ||
      ("code" in error &&
        (error as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE"))
  );
}

export function recordIncidentLink(options: {
  baseDir: string;
  incidentIds: string[];
  reason: string;
  recordedAt?: string;
}): IncidentLinkRecord {
  const incidentIds = uniqueFirstSeen(options.incidentIds);
  if (incidentIds.length !== 2) {
    throw new CombieError(
      "INCIDENT_LINK_PAIR_REQUIRED",
      `An incident link requires exactly two distinct incident ids.\n${LINK_USAGE}`,
    );
  }
  const reason = options.reason.trim();
  if (!reason) {
    throw new CombieError(
      "INCIDENT_LINK_REASON_REQUIRED",
      `--reason requires non-blank text.\n${LINK_USAGE}`,
    );
  }

  const [left, right] = incidentIds as [string, string];
  const pair = canonicalizePair(left, right);

  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    store.init();
    for (const id of pair) {
      if (!store.getIncidentRow(id)) {
        throw new CombieError(
          "INCIDENT_NOT_FOUND",
          `Incident not found: ${id}\nList recorded incidents: ${BINARY_NAME} incidents`,
        );
      }
    }
    const record: IncidentLinkRecord = {
      id: incidentLinkId(randomUUID()),
      incidentIds: pair,
      recordedAt: options.recordedAt ?? new Date().toISOString(),
      reason,
    };
    try {
      store.insertIncidentLink(record);
    } catch (error) {
      if (isIncidentLinkExistsError(error)) {
        throw new CombieError(
          "INCIDENT_LINK_EXISTS",
          `An incident link already exists for ${pair[0]} and ${pair[1]}.\nShow existing links: ${BINARY_NAME} incident-links --incident ${pair[0]}`,
        );
      }
      throw error;
    }
    return record;
  } finally {
    store.close();
  }
}

export function getIncidentLink(
  baseDir: string,
  id: string,
): IncidentLinkRecord {
  const ref = id.trim();
  if (!ref) {
    throw new CombieError(
      "INCIDENT_LINK_ID_REQUIRED",
      `Incident link id is required.\nUsage: ${BINARY_NAME} incident-link <incident-link-id>\nList ids: ${BINARY_NAME} incident-links`,
    );
  }
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    const row = store.getIncidentLinkRow(ref);
    if (!row) {
      throw new CombieError(
        "INCIDENT_LINK_NOT_FOUND",
        `Incident link not found: ${ref}\nList recorded incident links: ${BINARY_NAME} incident-links`,
      );
    }
    return row;
  } finally {
    store.close();
  }
}

export function listIncidentLinks(
  baseDir: string,
  filter?: { incidentId?: string },
): IncidentLinkRecord[] {
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    return store.listIncidentLinkRows(filter);
  } finally {
    store.close();
  }
}

export function formatIncidentLink(record: IncidentLinkRecord): string {
  return [
    "INCIDENT LINK",
    `ID: ${record.id}`,
    `Recorded by Combie at ${record.recordedAt}`,
    "This is retained organizational memory. It is not current provider truth.",
    "",
    "INCIDENTS",
    record.incidentIds[0],
    record.incidentIds[1],
    "",
    "REASON",
    record.reason,
  ].join("\n");
}

export function formatIncidentLinks(
  records: IncidentLinkRecord[],
  filter?: { incidentId?: string },
): string {
  if (records.length === 0) {
    if (filter?.incidentId !== undefined) {
      return (
        `No incident links recorded for incident ${filter.incidentId}.\n` +
        `This is known-empty for that exact incident id.`
      );
    }
    return (
      "No incident links recorded yet.\n" +
      `Record one: ${BINARY_NAME} incident-link --incident <incident-id> --incident <incident-id> --reason <text>`
    );
  }
  const col1 = Math.max("ID".length, ...records.map((r) => r.id.length));
  const col2 = Math.max(
    "INCIDENT A".length,
    ...records.map((r) => r.incidentIds[0].length),
  );
  const col3 = Math.max(
    "INCIDENT B".length,
    ...records.map((r) => r.incidentIds[1].length),
  );
  const header =
    "ID".padEnd(col1) +
    "  " +
    "INCIDENT A".padEnd(col2) +
    "  " +
    "INCIDENT B".padEnd(col3) +
    "  " +
    "RECORDED AT";
  const body = records
    .map(
      (r) =>
        r.id.padEnd(col1) +
        "  " +
        r.incidentIds[0].padEnd(col2) +
        "  " +
        r.incidentIds[1].padEnd(col3) +
        "  " +
        r.recordedAt,
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function formatIncidentLinkConfirmation(
  record: IncidentLinkRecord,
): string {
  return (
    `Recorded incident link ${record.id}\n` +
    `${record.incidentIds[0]}\n` +
    `${record.incidentIds[1]}\n` +
    `${record.reason}\n` +
    `recorded at ${record.recordedAt} as organizational memory.\n` +
    `Show: ${BINARY_NAME} incident-link ${record.id}`
  );
}
