/**
 * Smallest durable Decision primitive (Sprint 111 / Operational Learning
 * MVP Wave 1).
 *
 * An explicit organizational response to one exact Recommendation. The writer
 * names one existing Recommendation parent. Multiple append-only Decisions may
 * exist for one Recommendation; Combie does not infer a latest/final decision.
 *
 * A Decision is not policy evaluation and not an execution approval token.
 */

export type DecisionDisposition =
  | "approved"
  | "rejected"
  | "deferred"
  | "modified";

export const DECISION_DISPOSITIONS: readonly DecisionDisposition[] = [
  "approved",
  "rejected",
  "deferred",
  "modified",
];

export function isDecisionDisposition(
  value: unknown,
): value is DecisionDisposition {
  return (
    typeof value === "string" &&
    (DECISION_DISPOSITIONS as readonly string[]).includes(value)
  );
}

export interface DecisionRecord {
  id: string;
  /** Exact rec: parent named by the writer. */
  recommendationId: string;
  /** Combie observation time of the record (ISO). */
  recordedAt: string;
  disposition: DecisionDisposition;
  /** Optional note. Required non-blank when disposition is `modified`. */
  note?: string;
}

export function decisionId(unique: string): string {
  return `dec:${unique}`;
}
