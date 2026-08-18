import { randomUUID } from "node:crypto";
import type { IncidentRecord } from "../domain/incident.ts";
import { incidentId } from "../domain/incident.ts";
import { Store } from "../storage/store.ts";
import { CombieError, notInitialized } from "./errors.ts";
import { BINARY_NAME } from "../cli/constants.ts";

export interface RecordIncidentOptions {
  baseDir: string;
  resolutionIds: string[];
  title?: string;
  recordedAt?: string;
}

function trimField(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

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

export function recordIncident(
  options: RecordIncidentOptions,
): IncidentRecord {
  const resolutionIds = uniqueFirstSeen(options.resolutionIds);
  if (resolutionIds.length < 2) {
    throw new CombieError(
      "INCIDENT_MEMBERS_REQUIRED",
      `An incident requires at least two distinct resolution ids.\nA single response is not a grouping.\nUsage: ${BINARY_NAME} incident --resolution <resolution-id> --resolution <resolution-id> [--title <text>]`,
    );
  }
  const title = trimField(options.title);

  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    store.init();
    for (const id of resolutionIds) {
      if (!store.getResolutionRow(id)) {
        throw new CombieError(
          "RESOLUTION_NOT_FOUND",
          `Resolution not found: ${id}\nList recorded resolutions: ${BINARY_NAME} resolutions`,
        );
      }
    }
    const existing = store.listIncidentSummaries();
    for (const id of resolutionIds) {
      const owner = existing.find((incident) =>
        incident.resolutionIds.includes(id),
      );
      if (owner) {
        throw new CombieError(
          "INCIDENT_MEMBERSHIP_CONFLICT",
          `Resolution ${id} already belongs to another Incident (${owner.id}).\nA resolution can be a member of at most one incident.\nShow: ${BINARY_NAME} incident ${owner.id}`,
        );
      }
    }
    const record: IncidentRecord = {
      id: incidentId(randomUUID()),
      resolutionIds,
      recordedAt: options.recordedAt ?? new Date().toISOString(),
      ...(title ? { title } : {}),
    };
    store.insertIncident(record);
    return record;
  } finally {
    store.close();
  }
}

export function listIncidents(baseDir: string): IncidentRecord[] {
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    return store.listIncidentSummaries();
  } finally {
    store.close();
  }
}

export function getIncident(baseDir: string, id: string): IncidentRecord {
  const ref = id.trim();
  if (!ref) {
    throw new CombieError(
      "INCIDENT_ID_REQUIRED",
      `Incident id is required.\nUsage: ${BINARY_NAME} incident <incident-id>\nList ids: ${BINARY_NAME} incidents`,
    );
  }
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    const row = store.getIncidentRow(ref);
    if (!row) {
      throw new CombieError(
        "INCIDENT_NOT_FOUND",
        `Incident not found: ${ref}\nList recorded incidents: ${BINARY_NAME} incidents`,
      );
    }
    return row;
  } finally {
    store.close();
  }
}

export function formatIncidentList(records: IncidentRecord[]): string {
  if (records.length === 0) {
    return (
      "No incidents recorded yet.\n" +
      `Group existing resolutions: ${BINARY_NAME} incident --resolution <resolution-id> --resolution <resolution-id>`
    );
  }
  const titleLabel = (record: IncidentRecord) => record.title ?? "-";
  const countLabel = (record: IncidentRecord) =>
    String(record.resolutionIds.length);
  const col1 = Math.max(
    "INCIDENT".length,
    ...records.map((r) => r.id.length),
  );
  const col2 = Math.max(
    "TITLE".length,
    ...records.map((r) => titleLabel(r).length),
  );
  const col3 = Math.max(
    "RESOLUTIONS".length,
    ...records.map((r) => countLabel(r).length),
  );
  const header =
    "INCIDENT".padEnd(col1) +
    "  " +
    "TITLE".padEnd(col2) +
    "  " +
    "RESOLUTIONS".padEnd(col3) +
    "  " +
    "RECORDED AT";
  const body = records
    .map(
      (r) =>
        r.id.padEnd(col1) +
        "  " +
        titleLabel(r).padEnd(col2) +
        "  " +
        countLabel(r).padEnd(col3) +
        "  " +
        r.recordedAt,
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function formatIncident(record: IncidentRecord): string {
  const lines = [
    "INCIDENT",
    `ID: ${record.id}`,
    `Recorded by Combie at ${record.recordedAt}`,
    "This is retained organizational grouping. It is not current provider truth.",
  ];
  if (record.title) {
    lines.push("", "TITLE", record.title);
  }
  lines.push("", "RESOLUTIONS", ...record.resolutionIds);
  return lines.join("\n");
}

export function formatIncidentConfirmation(record: IncidentRecord): string {
  return (
    `Recorded incident ${record.id}\n` +
    (record.title ? `${record.title}\n` : "") +
    `${record.resolutionIds.join("\n")}\n` +
    `Show: ${BINARY_NAME} incident ${record.id}`
  );
}
