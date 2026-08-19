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

export interface AppendIncidentResolutionsOptions {
  baseDir: string;
  incidentId: string;
  resolutionIds: string[];
}

export interface AppendIncidentResult {
  record: IncidentRecord;
  appendedIds: string[];
}

export interface RemoveIncidentResolutionsOptions {
  baseDir: string;
  incidentId: string;
  resolutionIds: string[];
}

export interface RemoveIncidentResult {
  record: IncidentRecord;
  removedIds: string[];
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

export function appendIncidentResolutions(
  options: AppendIncidentResolutionsOptions,
): AppendIncidentResult {
  const incidentId = options.incidentId.trim();
  if (!incidentId) {
    throw new CombieError(
      "INCIDENT_ID_REQUIRED",
      `Incident id is required.\nUsage: ${BINARY_NAME} incident <incident-id> --resolution <resolution-id>\nList ids: ${BINARY_NAME} incidents`,
    );
  }
  const namedIds = uniqueFirstSeen(options.resolutionIds);
  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    store.init();
    const incident = store.getIncidentRow(incidentId);
    if (!incident) {
      throw new CombieError(
        "INCIDENT_NOT_FOUND",
        `Incident not found: ${incidentId}\nList recorded incidents: ${BINARY_NAME} incidents`,
      );
    }
    for (const id of namedIds) {
      if (!store.getResolutionRow(id)) {
        throw new CombieError(
          "RESOLUTION_NOT_FOUND",
          `Resolution not found: ${id}\nList recorded resolutions: ${BINARY_NAME} resolutions`,
        );
      }
    }
    const existing = store.listIncidentSummaries();
    for (const id of namedIds) {
      const owner = existing.find((row) => row.resolutionIds.includes(id));
      if (owner && owner.id !== incident.id) {
        throw new CombieError(
          "INCIDENT_MEMBERSHIP_CONFLICT",
          `Resolution ${id} already belongs to another Incident (${owner.id}).\nA resolution can be a member of at most one incident.\nShow: ${BINARY_NAME} incident ${owner.id}`,
        );
      }
    }
    const appendedIds = namedIds.filter(
      (id) => !incident.resolutionIds.includes(id),
    );
    if (appendedIds.length === 0) {
      throw new CombieError(
        "INCIDENT_MEMBERS_UNCHANGED",
        `Incident ${incident.id} already includes those resolution ids.\nNothing was appended.\nShow: ${BINARY_NAME} incident ${incident.id}`,
      );
    }
    store.appendIncidentMembers(incident.id, appendedIds);
    const record = store.getIncidentRow(incident.id);
    if (!record) {
      throw new CombieError(
        "INCIDENT_NOT_FOUND",
        `Incident not found: ${incident.id}\nList recorded incidents: ${BINARY_NAME} incidents`,
      );
    }
    return { record, appendedIds };
  } finally {
    store.close();
  }
}

export function removeIncidentResolutions(
  options: RemoveIncidentResolutionsOptions,
): RemoveIncidentResult {
  const incidentId = options.incidentId.trim();
  if (!incidentId) {
    throw new CombieError(
      "INCIDENT_ID_REQUIRED",
      `Incident id is required.\nUsage: ${BINARY_NAME} incident <incident-id> --remove-resolution <resolution-id>\nList ids: ${BINARY_NAME} incidents`,
    );
  }
  const namedIds = uniqueFirstSeen(options.resolutionIds);
  if (namedIds.length === 0) {
    throw new CombieError(
      "INCIDENT_MEMBERS_UNCHANGED",
      `Nothing was removed.\nUsage: ${BINARY_NAME} incident <incident-id> --remove-resolution <resolution-id>`,
    );
  }
  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    store.init();
    const incident = store.getIncidentRow(incidentId);
    if (!incident) {
      throw new CombieError(
        "INCIDENT_NOT_FOUND",
        `Incident not found: ${incidentId}\nList recorded incidents: ${BINARY_NAME} incidents`,
      );
    }
    for (const id of namedIds) {
      if (!store.getResolutionRow(id)) {
        throw new CombieError(
          "RESOLUTION_NOT_FOUND",
          `Resolution not found: ${id}\nList recorded resolutions: ${BINARY_NAME} resolutions`,
        );
      }
    }
    for (const id of namedIds) {
      if (!incident.resolutionIds.includes(id)) {
        throw new CombieError(
          "INCIDENT_MEMBER_NOT_ON_INCIDENT",
          `Resolution ${id} is not a member of incident ${incident.id}.\nNothing was removed.\nShow: ${BINARY_NAME} incident ${incident.id}`,
        );
      }
    }
    const drop = new Set(namedIds);
    const remaining = incident.resolutionIds.filter((id) => !drop.has(id));
    if (remaining.length < 2) {
      throw new CombieError(
        "INCIDENT_MEMBERS_REQUIRED",
        `An incident requires at least two distinct resolution ids.\nRemoving those members would leave fewer than two.\nNothing was removed.\nUsage: ${BINARY_NAME} incident <incident-id> --remove-resolution <resolution-id>`,
      );
    }
    store.removeIncidentMembers(incident.id, namedIds);
    const record = store.getIncidentRow(incident.id);
    if (!record) {
      throw new CombieError(
        "INCIDENT_NOT_FOUND",
        `Incident not found: ${incident.id}\nList recorded incidents: ${BINARY_NAME} incidents`,
      );
    }
    return { record, removedIds: namedIds };
  } finally {
    store.close();
  }
}

export interface RetitleIncidentOptions {
  baseDir: string;
  incidentId: string;
  title: string;
}

export function retitleIncident(
  options: RetitleIncidentOptions,
): IncidentRecord {
  const incidentId = options.incidentId.trim();
  if (!incidentId) {
    throw new CombieError(
      "INCIDENT_ID_REQUIRED",
      `Incident id is required.\nUsage: ${BINARY_NAME} incident <incident-id> --title <text>\nList ids: ${BINARY_NAME} incidents`,
    );
  }
  const title = trimField(options.title);
  if (!title) {
    throw new CombieError(
      "INCIDENT_TITLE_UNCHANGED",
      `--title requires text.\nUsage: ${BINARY_NAME} incident <incident-id> --title <text>`,
    );
  }
  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    store.init();
    const incident = store.getIncidentRow(incidentId);
    if (!incident) {
      throw new CombieError(
        "INCIDENT_NOT_FOUND",
        `Incident not found: ${incidentId}\nList recorded incidents: ${BINARY_NAME} incidents`,
      );
    }
    if (incident.title === title) {
      throw new CombieError(
        "INCIDENT_TITLE_UNCHANGED",
        `Incident ${incident.id} already has that title.\nNothing was renamed.\nShow: ${BINARY_NAME} incident ${incident.id}`,
      );
    }
    store.updateIncidentTitle(incident.id, title);
    const record = store.getIncidentRow(incident.id);
    if (!record) {
      throw new CombieError(
        "INCIDENT_NOT_FOUND",
        `Incident not found: ${incident.id}\nList recorded incidents: ${BINARY_NAME} incidents`,
      );
    }
    return record;
  } finally {
    store.close();
  }
}

export interface ClearIncidentTitleOptions {
  baseDir: string;
  incidentId: string;
}

export function clearIncidentTitle(
  options: ClearIncidentTitleOptions,
): IncidentRecord {
  const incidentId = options.incidentId.trim();
  if (!incidentId) {
    throw new CombieError(
      "INCIDENT_ID_REQUIRED",
      `Incident id is required.\nUsage: ${BINARY_NAME} incident <incident-id> --clear-title\nList ids: ${BINARY_NAME} incidents`,
    );
  }
  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    store.init();
    const incident = store.getIncidentRow(incidentId);
    if (!incident) {
      throw new CombieError(
        "INCIDENT_NOT_FOUND",
        `Incident not found: ${incidentId}\nList recorded incidents: ${BINARY_NAME} incidents`,
      );
    }
    if (incident.title === undefined) {
      throw new CombieError(
        "INCIDENT_TITLE_UNCHANGED",
        `Incident ${incident.id} already has no title.\nNothing was cleared.\nShow: ${BINARY_NAME} incident ${incident.id}`,
      );
    }
    store.clearIncidentTitle(incident.id);
    const record = store.getIncidentRow(incident.id);
    if (!record) {
      throw new CombieError(
        "INCIDENT_NOT_FOUND",
        `Incident not found: ${incident.id}\nList recorded incidents: ${BINARY_NAME} incidents`,
      );
    }
    return record;
  } finally {
    store.close();
  }
}

export interface RestampIncidentOptions {
  baseDir: string;
  incidentId: string;
  recordedAt: string;
}

function canonicalizeIncidentIso(value: string): string | undefined {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString();
}

function requireCanonicalIncidentIso(
  value: string,
  code: string,
  message: string,
): string {
  const canonical = canonicalizeIncidentIso(value.trim());
  if (!canonical) {
    throw new CombieError(code, message);
  }
  return canonical;
}

export function restampIncident(
  options: RestampIncidentOptions,
): IncidentRecord {
  const incidentId = options.incidentId.trim();
  if (!incidentId) {
    throw new CombieError(
      "INCIDENT_ID_REQUIRED",
      `Incident id is required.\nUsage: ${BINARY_NAME} incident <incident-id> --recorded-at <iso>\nList ids: ${BINARY_NAME} incidents`,
    );
  }
  const recordedAt = requireCanonicalIncidentIso(
    options.recordedAt,
    "INCIDENT_RECORDED_AT_INVALID",
    `--recorded-at requires a valid ISO timestamp.\nUsage: ${BINARY_NAME} incident <incident-id> --recorded-at <iso>`,
  );
  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    store.init();
    const incident = store.getIncidentRow(incidentId);
    if (!incident) {
      throw new CombieError(
        "INCIDENT_NOT_FOUND",
        `Incident not found: ${incidentId}\nList recorded incidents: ${BINARY_NAME} incidents`,
      );
    }
    if (incident.recordedAt === recordedAt) {
      throw new CombieError(
        "INCIDENT_RECORDED_AT_UNCHANGED",
        `Incident ${incident.id} already has that recorded time.\nNothing was restamped.\nShow: ${BINARY_NAME} incident ${incident.id}`,
      );
    }
    store.updateIncidentRecordedAt(incident.id, recordedAt);
    const record = store.getIncidentRow(incident.id);
    if (!record) {
      throw new CombieError(
        "INCIDENT_NOT_FOUND",
        `Incident not found: ${incident.id}\nList recorded incidents: ${BINARY_NAME} incidents`,
      );
    }
    return record;
  } finally {
    store.close();
  }
}

export interface SetIncidentOccurredAtOptions {
  baseDir: string;
  incidentId: string;
  occurredAt: string;
}

export function setIncidentOccurredAt(
  options: SetIncidentOccurredAtOptions,
): IncidentRecord {
  const incidentId = options.incidentId.trim();
  if (!incidentId) {
    throw new CombieError(
      "INCIDENT_ID_REQUIRED",
      `Incident id is required.\nUsage: ${BINARY_NAME} incident <incident-id> --occurred-at <iso>\nList ids: ${BINARY_NAME} incidents`,
    );
  }
  const occurredAt = requireCanonicalIncidentIso(
    options.occurredAt,
    "INCIDENT_OCCURRED_AT_INVALID",
    `--occurred-at requires a valid ISO timestamp.\nUsage: ${BINARY_NAME} incident <incident-id> --occurred-at <iso>`,
  );
  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    store.init();
    const incident = store.getIncidentRow(incidentId);
    if (!incident) {
      throw new CombieError(
        "INCIDENT_NOT_FOUND",
        `Incident not found: ${incidentId}\nList recorded incidents: ${BINARY_NAME} incidents`,
      );
    }
    if (incident.occurredAt === occurredAt) {
      throw new CombieError(
        "INCIDENT_OCCURRED_AT_UNCHANGED",
        `Incident ${incident.id} already has that occurred time.\nNothing was changed.\nShow: ${BINARY_NAME} incident ${incident.id}`,
      );
    }
    store.updateIncidentOccurredAt(incident.id, occurredAt);
    const record = store.getIncidentRow(incident.id);
    if (!record) {
      throw new CombieError(
        "INCIDENT_NOT_FOUND",
        `Incident not found: ${incident.id}\nList recorded incidents: ${BINARY_NAME} incidents`,
      );
    }
    return record;
  } finally {
    store.close();
  }
}

export interface ClearIncidentOccurredAtOptions {
  baseDir: string;
  incidentId: string;
}

export function clearIncidentOccurredAt(
  options: ClearIncidentOccurredAtOptions,
): IncidentRecord {
  const incidentId = options.incidentId.trim();
  if (!incidentId) {
    throw new CombieError(
      "INCIDENT_ID_REQUIRED",
      `Incident id is required.\nUsage: ${BINARY_NAME} incident <incident-id> --clear-occurred-at\nList ids: ${BINARY_NAME} incidents`,
    );
  }
  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    store.init();
    const incident = store.getIncidentRow(incidentId);
    if (!incident) {
      throw new CombieError(
        "INCIDENT_NOT_FOUND",
        `Incident not found: ${incidentId}\nList recorded incidents: ${BINARY_NAME} incidents`,
      );
    }
    if (incident.occurredAt === undefined) {
      throw new CombieError(
        "INCIDENT_OCCURRED_AT_UNCHANGED",
        `Incident ${incident.id} already has no occurred time.\nNothing was cleared.\nShow: ${BINARY_NAME} incident ${incident.id}`,
      );
    }
    store.clearIncidentOccurredAt(incident.id);
    const record = store.getIncidentRow(incident.id);
    if (!record) {
      throw new CombieError(
        "INCIDENT_NOT_FOUND",
        `Incident not found: ${incident.id}\nList recorded incidents: ${BINARY_NAME} incidents`,
      );
    }
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

export function formatIncidentList(
  records: IncidentRecord[],
  filter?: ListIncidentsOptions,
): string {
  if (records.length === 0) {
    if (filter?.investigationId !== undefined) {
      if (
        filter.resolutionId !== undefined &&
        filter.subjectResourceId !== undefined
      ) {
        return (
          `No incidents recorded for investigation ${filter.investigationId}, resolution ${filter.resolutionId}, and subject ${filter.subjectResourceId}.\n` +
          `This is known-empty for those exact ids — no retained grouping matches all.`
        );
      }
      if (filter.resolutionId !== undefined) {
        return (
          `No incidents recorded for investigation ${filter.investigationId} and resolution ${filter.resolutionId}.\n` +
          `This is known-empty for those exact ids — no retained grouping matches both.`
        );
      }
      if (filter.subjectResourceId !== undefined) {
        return (
          `No incidents recorded for investigation ${filter.investigationId} and subject ${filter.subjectResourceId}.\n` +
          `This is known-empty for those exact ids — no retained grouping matches both.`
        );
      }
      return (
        `No incidents recorded for investigation ${filter.investigationId}.\n` +
        `This is known-empty for that exact investigation id — no retained grouping has a member recorded against it.`
      );
    }
    if (filter?.resolutionId !== undefined) {
      if (filter?.subjectResourceId !== undefined) {
        return (
          `No incidents recorded for resolution ${filter.resolutionId} and subject ${filter.subjectResourceId}.\n` +
          `This is known-empty for those exact ids — no retained grouping matches both.`
        );
      }
      return (
        `No incidents recorded for resolution ${filter.resolutionId}.\n` +
        `This is known-empty for that exact resolution id — no retained grouping named it.`
      );
    }
    if (filter?.subjectResourceId !== undefined) {
      return (
        `No incidents recorded for subject ${filter.subjectResourceId}.\n` +
        `This is known-empty for that exact subject — no retained grouping has a member on it.`
      );
    }
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
  ];
  if (record.occurredAt) {
    lines.push(`Occurred at ${record.occurredAt}`);
  }
  lines.push(
    "This is retained organizational grouping. It is not current provider truth.",
  );
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

export function formatIncidentAppendConfirmation(
  record: IncidentRecord,
  appendedIds: string[],
): string {
  return (
    `Updated incident ${record.id}\n` +
    `${appendedIds.join("\n")}\n` +
    `Show: ${BINARY_NAME} incident ${record.id}`
  );
}

export function formatIncidentRemoveConfirmation(
  record: IncidentRecord,
  removedIds: string[],
): string {
  return (
    `Removed from incident ${record.id}\n` +
    `${removedIds.join("\n")}\n` +
    `Show: ${BINARY_NAME} incident ${record.id}`
  );
}

export function formatIncidentRetitleConfirmation(
  record: IncidentRecord,
): string {
  return (
    `Renamed incident ${record.id}\n` +
    `${record.title}\n` +
    `Show: ${BINARY_NAME} incident ${record.id}`
  );
}

export function formatIncidentClearTitleConfirmation(
  record: IncidentRecord,
): string {
  return (
    `Cleared incident title ${record.id}\n` +
    `Show: ${BINARY_NAME} incident ${record.id}`
  );
}

export function formatIncidentRestampConfirmation(
  record: IncidentRecord,
): string {
  return (
    `Set incident time ${record.id}\n` +
    `${record.recordedAt}\n` +
    `Show: ${BINARY_NAME} incident ${record.id}`
  );
}

export function formatIncidentOccurredAtConfirmation(
  record: IncidentRecord,
): string {
  return (
    `Set incident occurrence ${record.id}\n` +
    `${record.occurredAt}\n` +
    `Show: ${BINARY_NAME} incident ${record.id}`
  );
}

export function formatIncidentClearOccurredAtConfirmation(
  record: IncidentRecord,
): string {
  return (
    `Cleared incident occurrence ${record.id}\n` +
    `Show: ${BINARY_NAME} incident ${record.id}`
  );
}

export type IncidentMemoryScope = "investigation" | "subject";

interface IncidentMember {
  subjectResourceId: string;
  investigationId?: string;
}

function incidentMatches(
  incident: IncidentRecord,
  resolutions: Map<string, IncidentMember>,
  memberMatches: (member: IncidentMember) => boolean,
): boolean {
  return incident.resolutionIds.some((id) => {
    const member = resolutions.get(id);
    return member !== undefined && memberMatches(member);
  });
}

function listIncidentsWhere(
  baseDir: string,
  predicate: (
    incident: IncidentRecord,
    resolutions: Map<string, IncidentMember>,
  ) => boolean,
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
    return incidents.filter((incident) => predicate(incident, resolutions));
  } finally {
    store.close();
  }
}

function listIncidentsMatching(
  baseDir: string,
  memberMatches: (member: IncidentMember) => boolean,
): IncidentRecord[] {
  return listIncidentsWhere(baseDir, (incident, resolutions) =>
    incidentMatches(incident, resolutions, memberMatches),
  );
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
  return listIncidentsFiltered(baseDir, { investigationId });
}

export interface ListIncidentsOptions {
  /** Exact stored member id the human named when grouping. */
  resolutionId?: string;
  /** Exact subject Resource id of any member Resolution. */
  subjectResourceId?: string;
  /** Exact Investigation id of any member Resolution (Sprint 063). */
  investigationId?: string;
}

/** Read-time: Incidents whose stored member ids include this exact resolution id. */
export function listIncidentsForResolution(
  baseDir: string,
  resolutionId: string,
): IncidentRecord[] {
  return listIncidentsFiltered(baseDir, { resolutionId });
}

/**
 * Read-time exact-id list filters; AND when more than one is present.
 * The named resolution id matches the stored member id array whether or
 * not its Resolution row still exists; the subject and investigation
 * match any member Resolution (059 skip for missing rows).
 */
export function listIncidentsFiltered(
  baseDir: string,
  options: ListIncidentsOptions,
): IncidentRecord[] {
  const resolutionId = options.resolutionId;
  const subjectResourceId = options.subjectResourceId;
  const investigationId = options.investigationId;
  return listIncidentsWhere(baseDir, (incident, resolutions) => {
    if (
      resolutionId !== undefined &&
      !incident.resolutionIds.includes(resolutionId)
    ) {
      return false;
    }
    if (
      subjectResourceId !== undefined &&
      !incidentMatches(incident, resolutions, (member) => {
        return member.subjectResourceId === subjectResourceId;
      })
    ) {
      return false;
    }
    if (
      investigationId !== undefined &&
      !incidentMatches(incident, resolutions, (member) => {
        return member.investigationId === investigationId;
      })
    ) {
      return false;
    }
    return true;
  });
}

function incidentMemoryIdentityLine(record: IncidentRecord): string {
  return `${record.id}  ${record.recordedAt}`;
}

function incidentMemoryFieldBlocks(record: IncidentRecord): string[] {
  const blocks: string[] = [];
  if (record.title) {
    blocks.push("TITLE", record.title);
  }
  if (record.occurredAt) {
    blocks.push("OCCURRED AT", record.occurredAt);
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
