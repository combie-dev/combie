/**
 * Smallest durable Incident primitive (Sprint 058).
 *
 * Explicit organizational grouping of existing Resolution ids — one
 * occurrence spanning multiple responses. Not lifecycle, not inferred
 * co-occurrence, not a third Resolution write identity, not a Resource.
 *
 * resolutionIds are exact local Resolution ids the human named at
 * record time. Optional title is free text. Never inferred from
 * Resource, evidence, or time. Never a sentinel or empty string id.
 */
export interface IncidentRecord {
  id: string;
  /** Exact Resolution ids in first-seen order. */
  resolutionIds: string[];
  /** Combie observation time of the grouping (ISO). */
  recordedAt: string;
  title?: string;
}

export function incidentId(unique: string): string {
  return `inc:${unique}`;
}
