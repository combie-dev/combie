/**
 * Smallest durable Resolution primitive (Sprint 051).
 *
 * Explicit organizational response hung on a saved Investigation.
 * Decision, action, and outcome are distinguishable fields — not
 * separate types, not an Incident, not Investigation lifecycle.
 */
export interface ResolutionRecord {
  id: string;
  investigationId: string;
  subjectResourceId: string;
  /** Combie observation time of the record (ISO). */
  recordedAt: string;
  decision?: string;
  action?: string;
  outcome?: string;
}

export function resolutionId(unique: string): string {
  return `res:${unique}`;
}
