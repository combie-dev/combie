/**
 * Smallest durable Resolution primitive (Sprint 051).
 *
 * Explicit organizational response hung on a saved Investigation or,
 * from Sprint 057, on an exact Resource with no Investigation snapshot.
 * From Sprint 061 the human may name an existing Incident as the write
 * identity; membership stays that Incident's stored resolution_ids
 * array — this row has no incidentId.
 * Decision, action, and outcome are distinguishable fields — not
 * separate types, not an Incident, not Investigation lifecycle.
 *
 * evidenceIds (Sprint 054) are exact provider-native evidence ids the
 * human named at record time as what they say supported this response.
 * Optional, append-only, never inferred from provider activity, never
 * proof of causality.
 *
 * investigationId is omitted when the human recorded against a Resource
 * without naming a saved Investigation. Never a sentinel or empty string.
 */
export interface ResolutionRecord {
  id: string;
  investigationId?: string;
  subjectResourceId: string;
  /** Combie observation time of the record (ISO). */
  recordedAt: string;
  decision?: string;
  action?: string;
  outcome?: string;
  /** Exact locally retained provider-native evidence ids, first-seen order. */
  evidenceIds?: string[];
}

export function resolutionId(unique: string): string {
  return `res:${unique}`;
}
