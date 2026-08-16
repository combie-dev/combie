import { resourceId } from "../../domain/resource.ts";
import { SENTRY_PROVIDER } from "./normalize.ts";

/**
 * Compact Sentry issue-aggregate evidence.
 *
 * Intentionally Sentry-specific — not a generic Event primitive and not
 * occurrence-level telemetry. firstSeen / lastSeen / count are mutable
 * snapshot fields, distinct from Combie observation time.
 */
export interface SentryIssueEvidence {
  provider: "sentry";
  /** Stable Sentry issue identity. */
  issueId: string;
  /** Exact Combie Resource id: `sentry:project:<numeric-id>`. */
  resourceId: string;
  /** Sentry numeric project id as text (exact join key). */
  projectId: string;
  /** Display short id when present (not identity). */
  shortId: string | null;
  /** Provider-native status (unresolved, resolved, ignored, …). */
  status: string | null;
  /** Provider-native level (error, warning, …). */
  level: string | null;
  /** Aggregate event count in the current snapshot. */
  count: number | null;
  /** Aggregate affected-user count in the current snapshot. */
  userCount: number | null;
  /** Compact issue category when present (error, performance, …). */
  issueCategory: string | null;
  /** Provider firstSeen (ISO). */
  firstSeen: string;
  /** Provider lastSeen (ISO). Primary ordering time. */
  lastSeen: string;
  /** When Combie last observed/upserted this evidence (ISO). */
  observedAt: string;
}

/** Per-project issue refresh authority (not deletion authority). */
export interface SentryIssueRefresh {
  resourceId: string;
  status: "success" | "failure";
  observedAt: string;
  message: string | null;
  resultCount: number | null;
  lastSuccessfulObservedAt: string | null;
}

export type IssueEvidenceAuthority =
  | { kind: "not_applicable" }
  | {
      kind: "unknown";
      issues: SentryIssueEvidence[];
      latestAttemptObservedAt: string | null;
      lastSuccessAt: string | null;
      resultCount: number | null;
      message: string | null;
    }
  | {
      kind: "empty";
      observedAt: string;
      resultCount: number | null;
      issues: SentryIssueEvidence[];
    }
  | {
      kind: "populated";
      observedAt: string;
      resultCount: number | null;
      issues: SentryIssueEvidence[];
    };

/**
 * Explicit retrieval bound: one page of up to 100 most-recently-seen
 * issue aggregates per project. Not complete lifetime history.
 */
export const ISSUES_PER_PAGE = 100;
export const ISSUES_MAX_PAGES = 1;

export function sentryProjectResourceId(projectId: string): string {
  return resourceId(SENTRY_PROVIDER, "project", projectId);
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asIsoTimestamp(value: unknown): string | null {
  const s = asNonEmptyString(value);
  if (!s) return null;
  const ms = Date.parse(s);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function asNonNegativeInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return Math.trunc(n);
  }
  return null;
}

function projectIdFromIssue(raw: { project?: unknown }): string | null {
  if (raw.project == null || typeof raw.project !== "object") return null;
  return asNonEmptyString((raw.project as { id?: unknown }).id);
}

/**
 * Normalize one organization-issue list item into compact evidence.
 * Requires exact project.id match to expectedProjectId.
 * Excludes title, culprit, assignee, metadata, tags, stats, events, URLs.
 */
export function normalizeSentryIssue(
  raw: {
    id?: unknown;
    shortId?: unknown;
    status?: unknown;
    level?: unknown;
    count?: unknown;
    userCount?: unknown;
    issueCategory?: unknown;
    firstSeen?: unknown;
    lastSeen?: unknown;
    project?: unknown;
    title?: unknown;
    culprit?: unknown;
    assignedTo?: unknown;
    metadata?: unknown;
    tags?: unknown;
    stats?: unknown;
    activity?: unknown;
    permalink?: unknown;
    shareId?: unknown;
    firstRelease?: unknown;
    lastRelease?: unknown;
    matchingEventId?: unknown;
    annotations?: unknown;
    owners?: unknown;
    derivedData?: unknown;
  },
  expectedProjectId: string,
  observedAt: string,
): SentryIssueEvidence | null {
  const issueId = asNonEmptyString(raw.id);
  if (!issueId) return null;

  const projectId = projectIdFromIssue(raw);
  if (projectId !== expectedProjectId) return null;

  const firstSeen = asIsoTimestamp(raw.firstSeen);
  const lastSeen = asIsoTimestamp(raw.lastSeen);
  if (!firstSeen || !lastSeen) return null;

  return {
    provider: "sentry",
    issueId,
    resourceId: sentryProjectResourceId(expectedProjectId),
    projectId: expectedProjectId,
    shortId: asNonEmptyString(raw.shortId),
    status: asNonEmptyString(raw.status),
    level: asNonEmptyString(raw.level),
    count: asNonNegativeInt(raw.count),
    userCount: asNonNegativeInt(raw.userCount),
    issueCategory: asNonEmptyString(raw.issueCategory),
    firstSeen,
    lastSeen,
    observedAt,
  };
}

export function composeIssueAuthority(
  provider: string,
  kind: string,
  refresh: SentryIssueRefresh | null,
  issues: SentryIssueEvidence[],
): IssueEvidenceAuthority {
  if (provider !== "sentry" || kind !== "project") {
    return { kind: "not_applicable" };
  }

  if (refresh?.status === "success") {
    const successAt = refresh.lastSuccessfulObservedAt ?? refresh.observedAt;
    if (refresh.resultCount === 0) {
      return {
        kind: "empty",
        observedAt: successAt,
        resultCount: 0,
        issues,
      };
    }
    if (refresh.resultCount != null && refresh.resultCount > 0) {
      return {
        kind: "populated",
        observedAt: successAt,
        resultCount: refresh.resultCount,
        issues,
      };
    }
    if (issues.length === 0) {
      return {
        kind: "empty",
        observedAt: successAt,
        resultCount: null,
        issues: [],
      };
    }
    return {
      kind: "populated",
      observedAt: successAt,
      resultCount: null,
      issues,
    };
  }

  return {
    kind: "unknown",
    issues,
    latestAttemptObservedAt: refresh?.observedAt ?? null,
    lastSuccessAt: refresh?.lastSuccessfulObservedAt ?? null,
    resultCount: refresh?.resultCount ?? null,
    message: refresh?.status === "failure" ? refresh.message : null,
  };
}
