/**
 * Smallest durable Incident-link primitive (Sprint 112 / Operational
 * Learning MVP Wave 2).
 *
 * Explicit organizational claim that two exact Incidents belong together
 * for a stated reason. Unordered pair, lexically canonicalized before
 * storage. Append-only. Not a Relationship, not similarity, not a
 * computed precedent candidate.
 */
export interface IncidentLinkRecord {
  id: string;
  /** Canonical lexical order a < b. */
  incidentIds: [string, string];
  /** Combie observation time of the link (ISO). */
  recordedAt: string;
  /** Explicit non-blank organizational claim. */
  reason: string;
}

export function incidentLinkId(unique: string): string {
  return `ilink:${unique}`;
}
