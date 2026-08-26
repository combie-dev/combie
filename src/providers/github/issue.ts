import { githubRepositoryResourceId } from "./workflow-run.ts";

/**
 * Compact GitHub issue evidence (current-state snapshots).
 *
 * Intentionally GitHub-specific — not a generic Event primitive, not an
 * occurrence log, and not pull requests. Provider lifecycle times stay
 * separate from Combie observation time.
 */
export interface GitHubIssueEvidence {
  provider: "github";
  /** Stable GitHub issue id (not the repository-scoped number). */
  issueId: number;
  /** Exact Combie Resource id: `github:repository:<numeric-id>`. */
  resourceId: string;
  /** GitHub numeric repository id as text (exact join key). */
  repositoryId: string;
  /** Repository-scoped issue number. */
  number: number;
  /** Provider-native state (open, closed). */
  state: string | null;
  /** Provider created_at (ISO). Required. */
  createdAt: string;
  /** Provider updated_at when present (ISO). Primary listing time. */
  updatedAt: string | null;
  /** Provider closed_at when present (ISO). */
  closedAt: string | null;
  /** When Combie last observed/upserted this evidence (ISO). */
  observedAt: string;
}

/** Per-repository GitHub-issue refresh authority (not deletion authority). */
export interface GitHubIssueRefresh {
  resourceId: string;
  status: "success" | "failure";
  /**
   * Combie observation time of the latest refresh attempt (success or failure).
   * Distinct from lastSuccessfulObservedAt.
   */
  observedAt: string;
  message: string | null;
  /**
   * Number of normalized issue rows accepted by the latest successful
   * bounded refresh for this exact repository Resource. Null when never
   * successfully refreshed with provenance. Not the count of rows currently
   * retained locally. A value of 100 means the bounded refresh accepted 100
   * issues — not that the repository has exactly 100 issues total. Survives
   * a later failed refresh.
   */
  resultCount: number | null;
  /**
   * Combie observation time of the latest successful bounded refresh for this
   * exact repository Resource. Null when never successfully refreshed with
   * provenance. Survives a later failed refresh. Not a provider event time
   * and not proof of complete issue history.
   */
  lastSuccessfulObservedAt: string | null;
}

export type GitHubIssueEvidenceAuthority =
  | { kind: "not_applicable" }
  | {
      kind: "unknown";
      issues: GitHubIssueEvidence[];
      /** Latest refresh attempt observation time when a refresh row exists. */
      latestAttemptObservedAt: string | null;
      lastSuccessAt: string | null;
      /**
       * Last successful bounded response cardinality when known.
       * Distinct from retained local row count.
       */
      resultCount: number | null;
      message: string | null;
    }
  | {
      kind: "empty";
      observedAt: string;
      /** Always 0 after a successful empty refresh with provenance. */
      resultCount: number | null;
      /** Previously observed history retained beyond the current response. */
      issues: GitHubIssueEvidence[];
    }
  | {
      kind: "populated";
      observedAt: string;
      /**
       * Latest successful bounded response cardinality when known; null for
       * success rows without provenance.
       */
      resultCount: number | null;
      issues: GitHubIssueEvidence[];
    };

/**
 * Explicit retrieval bound: one page of up to 100 most-recently-updated
 * issues (GitHub's issues list also includes pull requests; those are
 * dropped at normalize). Not complete lifetime history.
 */
export const ISSUES_PER_PAGE = 100;
export const ISSUES_MAX_PAGES = 1;

export { githubRepositoryResourceId };

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function asNonEmptyString(value: unknown): string | null {
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

function isPullRequest(raw: { pull_request?: unknown }): boolean {
  const pr = raw.pull_request;
  if (pr == null) return false;
  if (typeof pr === "object") return true;
  return Boolean(pr);
}

/**
 * Normalize one GitHub issues-list item into compact evidence.
 * Drops pull requests (`pull_request` object or truthy). Requires id,
 * number, and created_at. Binds to expectedRepositoryId when the list
 * item omits `repository` (common on GET /repos/{owner}/{repo}/issues).
 * Excludes title, body, comments, user, labels, assignees, and URLs.
 */
export function normalizeGitHubIssue(
  raw: {
    id?: unknown;
    number?: unknown;
    state?: unknown;
    title?: unknown;
    body?: unknown;
    comments?: unknown;
    user?: unknown;
    labels?: unknown;
    assignees?: unknown;
    html_url?: unknown;
    created_at?: unknown;
    updated_at?: unknown;
    closed_at?: unknown;
    pull_request?: unknown;
    repository?: { id?: unknown } | null;
  },
  expectedRepositoryId: string,
  observedAt: string,
): GitHubIssueEvidence | null {
  if (isPullRequest(raw)) return null;

  const issueId = asFiniteNumber(raw.id);
  if (issueId == null) return null;

  const number = asFiniteNumber(raw.number);
  if (number == null) return null;

  const createdAt = asIsoTimestamp(raw.created_at);
  if (!createdAt) return null;

  const repoIdRaw = raw.repository?.id;
  if (repoIdRaw != null && repoIdRaw !== "") {
    const listedRepositoryId = String(repoIdRaw);
    if (listedRepositoryId !== expectedRepositoryId) return null;
  }

  return {
    provider: "github",
    issueId,
    resourceId: githubRepositoryResourceId(expectedRepositoryId),
    repositoryId: expectedRepositoryId,
    number,
    state: asNonEmptyString(raw.state),
    createdAt,
    updatedAt: asIsoTimestamp(raw.updated_at),
    closedAt: asIsoTimestamp(raw.closed_at),
    observedAt,
  };
}

export function composeGitHubIssueAuthority(
  provider: string,
  kind: string,
  refresh: GitHubIssueRefresh | null,
  issues: GitHubIssueEvidence[],
): GitHubIssueEvidenceAuthority {
  if (provider !== "github" || kind !== "repository") {
    return { kind: "not_applicable" };
  }

  if (refresh?.status === "success") {
    // On success, observedAt is both latest attempt and last success.
    const successAt =
      refresh.lastSuccessfulObservedAt ?? refresh.observedAt;
    // Prefer persisted result-count provenance. Never infer empty/populated
    // solely from retained local rows when provenance exists.
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
    // Success without provenance: result count unknown.
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
