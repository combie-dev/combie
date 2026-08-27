/**
 * Smallest durable Recommendation primitive (Sprint 111 / Operational
 * Learning MVP Wave 1).
 *
 * The chain root owns the exact subject identity: one explicit Investigation,
 * Resource, or Incident member subject. A Recommendation is a proposed
 * response — not permission, not a Decision, not an Action.
 *
 * actionKey is an explicit caller-supplied lower-kebab token (e.g.
 * `rollback-deployment`, `inspect-database`). It is not provider capability,
 * executable syntax, or a global action ontology. Equality is exact — Combie
 * performs no synonym, similarity, or fuzzy normalization.
 *
 * evidenceIds (reusing the Resolution evidence contract) are exact locally
 * retained provider-native evidence ids the writer named as what they say
 * supported this proposal. Optional, append-only, never inferred, never proof
 * of causality.
 */
export interface RecommendationRecord {
  id: string;
  subjectResourceId: string;
  /** Exact inv: anchor when the writer named a saved Investigation. */
  investigationId?: string;
  /** Exact inc: context when the writer named an Incident (with --resource). */
  incidentId?: string;
  /** Combie observation time of the record (ISO). */
  recordedAt: string;
  /** Explicit normalized response category (lower-kebab token). */
  actionKey: string;
  /** Explicit proposed response (required non-blank text). */
  proposal: string;
  /** Optional rationale (non-blank text when present). */
  rationale?: string;
  /** Exact locally retained provider-native evidence ids, first-seen order. */
  evidenceIds?: string[];
}

export function recommendationId(unique: string): string {
  return `rec:${unique}`;
}
