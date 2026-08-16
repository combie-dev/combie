import type { Resource } from "../domain/resource.ts";
import {
  createSentryClient,
  type SentryClientOptions,
} from "../providers/sentry/client.ts";
import { SentryApiError } from "../providers/sentry/errors.ts";
import { organizationSlugFromResource } from "../providers/sentry/release.ts";
import {
  ISSUES_MAX_PAGES,
  ISSUES_PER_PAGE,
  normalizeSentryIssue,
  type SentryIssueEvidence,
} from "../providers/sentry/issue.ts";
import type { Store } from "../storage/store.ts";

export interface SyncSentryIssuesOptions {
  store: Store;
  token: string;
  projects: Resource[];
  observedAt: string;
  fetch?: SentryClientOptions["fetch"];
  baseUrl?: string;
}

export interface SyncSentryIssuesResult {
  refreshed: number;
  failed: number;
  upserted: number;
  lines: string[];
}

/**
 * Fetch and persist Sentry issue-aggregate evidence.
 *
 * Failure isolation: project Resources are already applied. An issue
 * retrieval failure marks refresh as failure and retains prior rows — never
 * converts unknown into known-empty and never creates Resource Changes.
 * Independent of release refresh.
 *
 * Bound: at most ISSUES_MAX_PAGES × ISSUES_PER_PAGE issues per project
 * (not lifetime-complete history). List absence is not deletion authority.
 */
export async function syncSentryIssues(
  options: SyncSentryIssuesOptions,
): Promise<SyncSentryIssuesResult> {
  const projects = options.projects.filter(
    (r) => r.provider === "sentry" && r.kind === "project",
  );
  if (projects.length === 0) {
    return { refreshed: 0, failed: 0, upserted: 0, lines: [] };
  }

  const client = createSentryClient(options.token, {
    fetch: options.fetch,
    baseUrl: options.baseUrl,
  });

  let refreshed = 0;
  let failed = 0;
  let upserted = 0;
  const seenKeys = new Set<string>();

  for (const project of projects) {
    const orgSlug = organizationSlugFromResource(project);
    if (!orgSlug) {
      failed += 1;
      const prior = options.store.getSentryIssueRefresh(project.id);
      options.store.setSentryIssueRefresh({
        resourceId: project.id,
        status: "failure",
        observedAt: options.observedAt,
        message:
          "Issue retrieval skipped: Sentry project lacks organization_slug for the organization issues API.",
        resultCount: prior?.resultCount ?? null,
        lastSuccessfulObservedAt: prior?.lastSuccessfulObservedAt ?? null,
      });
      continue;
    }

    try {
      const raw = await client.listOrganizationIssues(
        orgSlug,
        project.providerResourceId,
        {
          perPage: ISSUES_PER_PAGE,
          maxPages: ISSUES_MAX_PAGES,
        },
      );
      const normalized: SentryIssueEvidence[] = [];
      for (const item of raw) {
        if (item == null || typeof item !== "object") continue;
        const evidence = normalizeSentryIssue(
          item as { id?: unknown },
          project.providerResourceId,
          options.observedAt,
        );
        if (!evidence) continue;
        if (evidence.resourceId !== project.id) continue;
        normalized.push(evidence);
      }

      for (const evidence of normalized) {
        options.store.upsertSentryIssue(evidence);
        const key = `${evidence.issueId}\0${evidence.resourceId}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          upserted += 1;
        }
      }

      options.store.setSentryIssueRefresh({
        resourceId: project.id,
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
        err instanceof SentryApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "issue retrieval failed";
      const prior = options.store.getSentryIssueRefresh(project.id);
      options.store.setSentryIssueRefresh({
        resourceId: project.id,
        status: "failure",
        observedAt: options.observedAt,
        message,
        resultCount: prior?.resultCount ?? null,
        lastSuccessfulObservedAt: prior?.lastSuccessfulObservedAt ?? null,
      });
    }
  }

  const lines: string[] = [];
  if (refreshed > 0 || failed > 0) {
    lines.push(
      `Issue evidence: ${refreshed} project${refreshed === 1 ? "" : "s"} refreshed` +
        (failed > 0
          ? `, ${failed} project${failed === 1 ? "" : "s"} failed (prior evidence retained)`
          : "") +
        ` (bound: ≤${ISSUES_MAX_PAGES * ISSUES_PER_PAGE} most-recently-seen issues each)`,
    );
    if (upserted > 0) {
      lines.push(`${upserted} issue${upserted === 1 ? "" : "s"} recorded`);
    }
  }

  return { refreshed, failed, upserted, lines };
}
