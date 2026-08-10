import type { Resource } from "../domain/resource.ts";
import {
  createGitHubClient,
  type GitHubClientOptions,
} from "../providers/github/client.ts";
import { GitHubApiError } from "../providers/github/errors.ts";
import {
  normalizeWorkflowRun,
  repositoryApiPathParts,
  WORKFLOW_RUNS_MAX_PAGES,
  WORKFLOW_RUNS_PER_PAGE,
  type GitHubWorkflowRunEvidence,
} from "../providers/github/workflow-run.ts";
import type { Store } from "../storage/store.ts";

export interface SyncGitHubWorkflowRunsOptions {
  store: Store;
  token: string;
  repositories: Resource[];
  observedAt: string;
  fetch?: GitHubClientOptions["fetch"];
  baseUrl?: string;
}

export interface SyncGitHubWorkflowRunsResult {
  refreshed: number;
  failed: number;
  upserted: number;
  lines: string[];
}

/**
 * Fetch and persist GitHub Actions workflow-run evidence.
 *
 * Failure isolation: repository Resources are already applied. A workflow
 * retrieval failure marks refresh as failure and retains prior rows — never
 * converts unknown into known-empty and never creates Resource Changes.
 *
 * Bound: at most WORKFLOW_RUNS_MAX_PAGES × WORKFLOW_RUNS_PER_PAGE runs per
 * repository (not lifetime-complete history). List absence is not deletion
 * authority.
 */
export async function syncGitHubWorkflowRuns(
  options: SyncGitHubWorkflowRunsOptions,
): Promise<SyncGitHubWorkflowRunsResult> {
  const repositories = options.repositories.filter(
    (r) => r.provider === "github" && r.kind === "repository",
  );
  if (repositories.length === 0) {
    return { refreshed: 0, failed: 0, upserted: 0, lines: [] };
  }

  const client = createGitHubClient(options.token, {
    fetch: options.fetch,
    baseUrl: options.baseUrl,
  });

  let refreshed = 0;
  let failed = 0;
  let upserted = 0;
  const seenIds = new Set<number>();

  for (const repository of repositories) {
    const parts = repositoryApiPathParts(repository);
    if (!parts) {
      failed += 1;
      const prior = options.store.getGitHubWorkflowRunRefresh(repository.id);
      options.store.setGitHubWorkflowRunRefresh({
        resourceId: repository.id,
        status: "failure",
        observedAt: options.observedAt,
        message:
          "Workflow run retrieval skipped: repository lacks owner/fullName for API path.",
        resultCount: prior?.resultCount ?? null,
        lastSuccessfulObservedAt: prior?.lastSuccessfulObservedAt ?? null,
      });
      continue;
    }

    try {
      const raw = await client.listWorkflowRuns(parts.owner, parts.repo, {
        perPage: WORKFLOW_RUNS_PER_PAGE,
        maxPages: WORKFLOW_RUNS_MAX_PAGES,
      });
      const normalized: GitHubWorkflowRunEvidence[] = [];
      for (const item of raw) {
        const evidence = normalizeWorkflowRun(
          item,
          repository.providerResourceId,
          options.observedAt,
        );
        if (!evidence) continue;
        if (evidence.resourceId !== repository.id) continue;
        normalized.push(evidence);
      }

      for (const evidence of normalized) {
        options.store.upsertGitHubWorkflowRun(evidence);
        if (!seenIds.has(evidence.runId)) {
          seenIds.add(evidence.runId);
          upserted += 1;
        }
      }

      options.store.setGitHubWorkflowRunRefresh({
        resourceId: repository.id,
        status: "success",
        observedAt: options.observedAt,
        message: null,
        resultCount: normalized.length,
        lastSuccessfulObservedAt: options.observedAt,
      });
      refreshed += 1;
    } catch (err) {
      failed += 1;
      const message =
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "workflow run retrieval failed";
      // Preserve prior successful provenance; failure is not empty.
      const prior = options.store.getGitHubWorkflowRunRefresh(repository.id);
      options.store.setGitHubWorkflowRunRefresh({
        resourceId: repository.id,
        status: "failure",
        observedAt: options.observedAt,
        message,
        resultCount: prior?.resultCount ?? null,
        lastSuccessfulObservedAt: prior?.lastSuccessfulObservedAt ?? null,
      });
      // Intentionally do not delete prior workflow-run rows.
    }
  }

  const lines: string[] = [];
  if (refreshed > 0 || failed > 0) {
    lines.push(
      `Workflow run evidence: ${refreshed} repositor${refreshed === 1 ? "y" : "ies"} refreshed` +
        (failed > 0
          ? `, ${failed} repositor${failed === 1 ? "y" : "ies"} failed (prior evidence retained)`
          : "") +
        ` (bound: ≤${WORKFLOW_RUNS_MAX_PAGES * WORKFLOW_RUNS_PER_PAGE} most-recent runs each)`,
    );
    if (upserted > 0) {
      lines.push(
        `${upserted} workflow run${upserted === 1 ? "" : "s"} recorded`,
      );
    }
  }

  return { refreshed, failed, upserted, lines };
}
