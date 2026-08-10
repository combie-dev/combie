import { resourceId } from "../../domain/resource.ts";
import { GITHUB_PROVIDER } from "./normalize.ts";

/**
 * Compact GitHub Actions workflow-run evidence.
 *
 * Intentionally GitHub-specific — not a generic Event primitive.
 * Provider lifecycle times stay separate from Combie observation time.
 */
export interface GitHubWorkflowRunEvidence {
  provider: "github";
  /** Stable GitHub workflow-run id. */
  runId: number;
  /** Exact Combie Resource id: `github:repository:<numeric-id>`. */
  resourceId: string;
  /** GitHub numeric repository id as text (exact join key). */
  repositoryId: string;
  /** Workflow id when present. */
  workflowId: number | null;
  /** Workflow / run display name when present. */
  name: string | null;
  /** Provider run number within the workflow. */
  runNumber: number | null;
  /** Latest attempt number for this run id (reruns update the same run). */
  runAttempt: number | null;
  /** Triggering event (push, pull_request, …). */
  event: string | null;
  /** Provider-native status (queued, in_progress, completed, …). */
  status: string | null;
  /** Provider-native conclusion (success, failure, cancelled, …). */
  conclusion: string | null;
  /** Head branch when present. */
  headBranch: string | null;
  /** Head commit SHA when present (fact only — not used for correlation). */
  headSha: string | null;
  /** Provider created_at (ISO). Primary ordering time. */
  createdAt: string;
  /** Provider run_started_at when present (ISO). */
  runStartedAt: string | null;
  /** Provider updated_at when present (ISO). */
  updatedAt: string | null;
  /** When Combie last observed/upserted this evidence (ISO). */
  observedAt: string;
}

/** Per-repository workflow-run refresh authority (not deletion authority). */
export interface GitHubWorkflowRunRefresh {
  resourceId: string;
  status: "success" | "failure";
  observedAt: string;
  message: string | null;
  /**
   * Number of normalized workflow-run rows accepted by the latest successful
   * bounded refresh for this exact repository Resource. Null when never
   * successfully refreshed with provenance (including pre-Sprint-027 rows).
   * Not the count of rows currently retained locally. A value of 100 means
   * the bounded refresh returned 100 runs — not that the repository has
   * exactly 100 workflow runs total. Survives a later failed refresh.
   */
  resultCount: number | null;
}

export type WorkflowRunEvidenceAuthority =
  | { kind: "not_applicable" }
  | {
      kind: "unknown";
      runs: GitHubWorkflowRunEvidence[];
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
      runs: GitHubWorkflowRunEvidence[];
    }
  | {
      kind: "populated";
      observedAt: string;
      /**
       * Latest successful bounded response cardinality when known; null for
       * pre-027 success rows without provenance.
       */
      resultCount: number | null;
      runs: GitHubWorkflowRunEvidence[];
    };

/**
 * Explicit retrieval bound: one page of up to 100 most-recent runs per
 * repository. Not complete lifetime history. Chosen for rate-limit safety
 * at ~310 repositories (~310 requests/sync) while preserving exact binding.
 */
export const WORKFLOW_RUNS_PER_PAGE = 100;
export const WORKFLOW_RUNS_MAX_PAGES = 1;

export function githubRepositoryResourceId(repositoryId: string): string {
  return resourceId(GITHUB_PROVIDER, "repository", repositoryId);
}

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

/**
 * Normalize one workflow-run list item into compact evidence.
 * Requires exact repository.id match to expectedRepositoryId.
 * Excludes actor/triggering_actor, logs URLs, and arbitrary payload fields.
 */
export function normalizeWorkflowRun(
  raw: {
    id?: unknown;
    name?: unknown;
    workflow_id?: unknown;
    run_number?: unknown;
    run_attempt?: unknown;
    event?: unknown;
    status?: unknown;
    conclusion?: unknown;
    head_branch?: unknown;
    head_sha?: unknown;
    created_at?: unknown;
    run_started_at?: unknown;
    updated_at?: unknown;
    repository?: { id?: unknown } | null;
    actor?: unknown;
    triggering_actor?: unknown;
    head_commit?: unknown;
    logs_url?: unknown;
    jobs_url?: unknown;
  },
  expectedRepositoryId: string,
  observedAt: string,
): GitHubWorkflowRunEvidence | null {
  const runId = asFiniteNumber(raw.id);
  if (runId == null) return null;

  const repoIdRaw = raw.repository?.id;
  const repositoryId =
    repoIdRaw != null && repoIdRaw !== ""
      ? String(repoIdRaw)
      : null;
  if (!repositoryId || repositoryId !== expectedRepositoryId) return null;

  const createdAt = asIsoTimestamp(raw.created_at);
  if (!createdAt) return null;

  return {
    provider: "github",
    runId,
    resourceId: githubRepositoryResourceId(repositoryId),
    repositoryId,
    workflowId: asFiniteNumber(raw.workflow_id),
    name: asNonEmptyString(raw.name),
    runNumber: asFiniteNumber(raw.run_number),
    runAttempt: asFiniteNumber(raw.run_attempt),
    event: asNonEmptyString(raw.event),
    status: asNonEmptyString(raw.status),
    conclusion: asNonEmptyString(raw.conclusion),
    headBranch: asNonEmptyString(raw.head_branch),
    headSha: asNonEmptyString(raw.head_sha),
    createdAt,
    runStartedAt: asIsoTimestamp(raw.run_started_at),
    updatedAt: asIsoTimestamp(raw.updated_at),
    observedAt,
  };
}

export function composeWorkflowRunAuthority(
  provider: string,
  kind: string,
  refresh: GitHubWorkflowRunRefresh | null,
  runs: GitHubWorkflowRunEvidence[],
): WorkflowRunEvidenceAuthority {
  if (provider !== "github" || kind !== "repository") {
    return { kind: "not_applicable" };
  }

  if (refresh?.status === "success") {
    // Prefer persisted result-count provenance. Never infer empty/populated
    // solely from retained local rows when provenance exists.
    if (refresh.resultCount === 0) {
      return {
        kind: "empty",
        observedAt: refresh.observedAt,
        resultCount: 0,
        runs,
      };
    }
    if (refresh.resultCount != null && refresh.resultCount > 0) {
      return {
        kind: "populated",
        observedAt: refresh.observedAt,
        resultCount: refresh.resultCount,
        runs,
      };
    }
    // Pre-027 success: result count unknown.
    if (runs.length === 0) {
      return {
        kind: "empty",
        observedAt: refresh.observedAt,
        resultCount: null,
        runs: [],
      };
    }
    return {
      kind: "populated",
      observedAt: refresh.observedAt,
      resultCount: null,
      runs,
    };
  }

  return {
    kind: "unknown",
    runs,
    lastSuccessAt: null,
    resultCount: refresh?.resultCount ?? null,
    message: refresh?.status === "failure" ? refresh.message : null,
  };
}

/** Resolve owner/repo for the Actions API path from a normalized Resource. */
export function repositoryApiPathParts(
  resource: { name: string; metadata: Record<string, unknown> },
): { owner: string; repo: string } | null {
  const fullName =
    typeof resource.metadata.fullName === "string"
      ? resource.metadata.fullName.trim()
      : "";
  if (fullName.includes("/")) {
    const [owner, ...rest] = fullName.split("/");
    const repo = rest.join("/");
    if (owner && repo) return { owner, repo };
  }
  const owner =
    typeof resource.metadata.owner === "string"
      ? resource.metadata.owner.trim()
      : "";
  const repo = resource.name.trim();
  if (owner && repo) return { owner, repo };
  return null;
}
