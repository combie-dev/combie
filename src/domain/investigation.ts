/**
 * Smallest durable Investigation primitive (Sprint 048).
 *
 * A retained composition of one live `investigate` assembly. Not an
 * Investigation Engine, lifecycle, hypothesis, or current provider truth.
 */
export interface InvestigationRecord {
  id: string;
  subjectResourceId: string;
  /** Combie observation time of the snapshot (ISO). */
  composedAt: string;
}

export function investigationId(unique: string): string {
  return `inv:${unique}`;
}
