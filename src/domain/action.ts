/**
 * Smallest durable Action primitive (Sprint 111 / Operational Learning
 * MVP Wave 1).
 *
 * An explicitly recorded attempted response hung on one exact Decision parent.
 * The parent Decision must have disposition `approved` or `modified`.
 *
 * An Action records what the writer says was attempted. Combie does not
 * perform it, verify it against a provider, or infer it from provider
 * activity. `performedAt` is a writer-named time; omission remains unknown.
 */

export interface ActionRecord {
  id: string;
  /** Exact dec: parent named by the writer. */
  decisionId: string;
  /** Combie observation time of the record (ISO). */
  recordedAt: string;
  /** Exact caller category actually attempted (lower-kebab token). */
  actionKey: string;
  /** What was actually attempted (required non-blank text). */
  summary: string;
  /** Human/agent named ISO time. Omitted means unknown; never copy recordedAt. */
  performedAt?: string;
}

export function actionId(unique: string): string {
  return `act:${unique}`;
}
