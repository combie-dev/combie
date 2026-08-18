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

export type IncidentMemoryScope = "investigation" | "subject";

function incidentMatches(
  incident: IncidentRecord,
  resolutions: Map<string, { subjectResourceId: string; investigationId?: string }>,
  memberMatches: (member: {
    subjectResourceId: string;
    investigationId?: string;
  }) => boolean,
): boolean {
  return incident.resolutionIds.some((id) => {
    const member = resolutions.get(id);
    return member !== undefined && memberMatches(member);
  });
}

function listIncidentsMatching(
  baseDir: string,
  memberMatches: (member: {
    subjectResourceId: string;
    investigationId?: string;
  }) => boolean,
): IncidentRecord[] {
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    const incidents = store.listIncidentSummaries();
    if (incidents.length === 0) return [];
    const resolutions = new Map(
      store.listResolutionSummaries().map((row) => [
        row.id,
        {
          subjectResourceId: row.subjectResourceId,
          ...(row.investigationId !== undefined
            ? { investigationId: row.investigationId }
            : {}),
        },
      ]),
    );
    return incidents.filter((incident) =>
      incidentMatches(incident, resolutions, memberMatches),
    );
  } finally {
    store.close();
  }
}

/** Read-time: Incidents whose named members include this exact subject. */
export function listIncidentsForSubject(
  baseDir: string,
  subjectResourceId: string,
): IncidentRecord[] {
  return listIncidentsMatching(
    baseDir,
    (member) => member.subjectResourceId === subjectResourceId,
  );
}

/** Read-time: Incidents whose named members include this exact investigation. */
export function listIncidentsForInvestigation(
  baseDir: string,
  investigationId: string,
): IncidentRecord[] {
  return listIncidentsMatching(
    baseDir,
    (member) => member.investigationId === investigationId,
  );
}

function incidentMemoryIdentityLine(record: IncidentRecord): string {
  return `${record.id}  ${record.recordedAt}`;
}

function incidentMemoryFieldBlocks(record: IncidentRecord): string[] {
  const blocks: string[] = [];
  if (record.title) {
    blocks.push("TITLE", record.title);
  }
  if (blocks.length > 0) blocks.push("");
  blocks.push("RESOLUTIONS", ...record.resolutionIds);
  return blocks;
}

/** Read-time organizational-grouping section. Empty when there is nothing to show. */
export function formatIncidentMemorySection(
  records: IncidentRecord[],
  scope: IncidentMemoryScope,
): string {
  if (records.length === 0) return "";
  const where =
    scope === "investigation" ? "for this investigation" : "for this subject";
  const intro =
    `INCIDENT MEMORY\n` +
    `Retained organizational grouping ${where}.\n` +
    `It is not current provider truth. It is not a recommendation.`;
  const rows = records.map((record) =>
    [incidentMemoryIdentityLine(record), ...incidentMemoryFieldBlocks(record)].join(
      "\n",
    ),
  );
  return (
    `${intro}\n\n${rows.join("\n\n")}\n\n` +
    `Show: ${BINARY_NAME} incident ${records[0]!.id}`
  );
}

export function formatWithIncidentMemory(
  body: string,
  records: IncidentRecord[],
  scope: IncidentMemoryScope,
): string {
  const section = formatIncidentMemorySection(records, scope);
  return section === "" ? body : `${body}\n\n${section}`;
}
