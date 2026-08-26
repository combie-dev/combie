import type { Resource } from "../domain/resource.ts";
import {
  createGitHubClient,
  type GitHubClientOptions,
} from "../providers/github/client.ts";
import { GitHubApiError } from "../providers/github/errors.ts";
import {
  ISSUES_MAX_PAGES,
  ISSUES_PER_PAGE,
  normalizeGitHubIssue,
  type GitHubIssueEvidence,
} from "../providers/github/issue.ts";
import { repositoryApiPathParts } from "../providers/github/workflow-run.ts";
import type { Store } from "../storage/store.ts";

export interface SyncGitHubIssuesOptions {
  store: Store;
  token: string;
  repositories: Resource[];
  observedAt: string;
  fetch?: GitHubClientOptions["fetch"];
  baseUrl?: string;
}

export interface SyncGitHubIssuesResult {
  refreshed: number;
  failed: number;
  upserted: number;
  lines: string[];
}

/**
 * Fetch and persist GitHub issue evidence (current-state snapshots).
 *
 * Failure isolation: repository Resources are already applied. A retrieval
 * failure marks refresh as failure and retains prior rows — never converts
 * unknown into known-empty and never creates Resource Changes.
 *
 * Bound: at most ISSUES_MAX_PAGES × ISSUES_PER_PAGE most-recently-updated
 * issues-list items per repository (GitHub includes pull requests; those
 * drop at normalize). List absence is not deletion authority.
 */
export async function syncGitHubIssues(
  options: SyncGitHubIssuesOptions,
): Promise<SyncGitHubIssuesResult> {
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
      const prior = options.store.getGitHubIssueRefresh(repository.id);
      options.store.setGitHubIssueRefresh({
        resourceId: repository.id,
        status: "failure",
        observedAt: options.observedAt,
        message:
          "GitHub issue retrieval skipped: repository lacks owner/fullName for API path.",
        resultCount: prior?.resultCount ?? null,
        lastSuccessfulObservedAt: prior?.lastSuccessfulObservedAt ?? null,
      });
      continue;
    }

    try {
      const raw = await client.listIssues(parts.owner, parts.repo, {
        perPage: ISSUES_PER_PAGE,
        maxPages: ISSUES_MAX_PAGES,
      });
      const normalized: GitHubIssueEvidence[] = [];
      for (const item of raw) {
        const evidence = normalizeGitHubIssue(
          item,
          repository.providerResourceId,
          options.observedAt,
        );
        if (!evidence) continue;
        if (evidence.resourceId !== repository.id) continue;
        normalized.push(evidence);
      }

      for (const evidence of normalized) {
        options.store.upsertGitHubIssue(evidence);
        if (!seenIds.has(evidence.issueId)) {
          seenIds.add(evidence.issueId);
          upserted += 1;
        }
      }

      options.store.setGitHubIssueRefresh({
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
            : "GitHub issue retrieval failed";
      // Preserve prior successful provenance; failure is not empty.
      const prior = options.store.getGitHubIssueRefresh(repository.id);
      options.store.setGitHubIssueRefresh({
        resourceId: repository.id,
        status: "failure",
        observedAt: options.observedAt,
        message,
        resultCount: prior?.resultCount ?? null,
        lastSuccessfulObservedAt: prior?.lastSuccessfulObservedAt ?? null,
      });
      // Intentionally do not delete prior issue rows.
    }
  }

  const lines: string[] = [];
  if (refreshed > 0 || failed > 0) {
    lines.push(
      `GitHub issue evidence: ${refreshed} repositor${refreshed === 1 ? "y" : "ies"} refreshed` +
        (failed > 0
          ? `, ${failed} repositor${failed === 1 ? "y" : "ies"} failed (prior evidence retained)`
          : "") +
        ` (bound: ≤${ISSUES_MAX_PAGES * ISSUES_PER_PAGE} most-recently-updated issues each)`,
    );
    if (upserted > 0) {
      lines.push(
        `${upserted} GitHub issue${upserted === 1 ? "" : "s"} recorded`,
      );
    }
  }

  return { refreshed, failed, upserted, lines };
}
