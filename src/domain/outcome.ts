/**
 * Smallest durable Outcome primitive (Sprint 111 / Operational Learning
 * MVP Wave 1).
 *
 * An explicit assessment of what happened after one exact Action parent. It is
 * retained organizational memory — not current provider truth, not a computed
 * success score, and not proof that the Action caused the observation.
 *
 * A measurement is optional but atomic: metric, finite numeric before, finite
 * numeric after, and non-blank unit are supplied together or not at all.
 * Combie preserves and may later display the numeric delta; it never decides
 * whether higher or lower is better.
 */

export type OutcomeAssessment =
  | "positive"
  | "negative"
  | "mixed"
  | "neutral"
  | "inconclusive";

export const OUTCOME_ASSESSMENTS: readonly OutcomeAssessment[] = [
  "positive",
  "negative",
  "mixed",
  "neutral",
  "inconclusive",
];

export function isOutcomeAssessment(
  value: unknown,
): value is OutcomeAssessment {
  return (
    typeof value === "string" &&
    (OUTCOME_ASSESSMENTS as readonly string[]).includes(value)
  );
}

export interface OutcomeMeasurement {
  metric: string;
  before: number;
  after: number;
  unit: string;
}

export interface OutcomeRecord {
  id: string;
  /** Exact act: parent named by the writer. */
  actionId: string;
  /** Combie observation time of the record (ISO). */
  recordedAt: string;
  /** Human/agent named observation time (ISO). Omission remains unknown. */
  observedAt?: string;
  assessment: OutcomeAssessment;
  /** Explicit assessment statement (required non-blank text). */
  summary: string;
  /** Optional atomic numeric measurement. */
  measurement?: OutcomeMeasurement;
  /** Exact locally retained provider-native evidence ids, first-seen order. */
  evidenceIds?: string[];
}

export function outcomeId(unique: string): string {
  return `out:${unique}`;
}
