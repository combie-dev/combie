import type { Resource } from "../domain/resource.ts";
import {
  createSentryClient,
  type SentryClientOptions,
} from "../providers/sentry/client.ts";
import { SentryApiError } from "../providers/sentry/errors.ts";
import {
  CODE_MAPPINGS_MAX_PAGES,
  CODE_MAPPINGS_PER_PAGE,
  normalizeSentryCodeMapping,
  organizationSlugFromResource,
  parseCodeMappingRefresh,
  type SentryCodeMappingFact,
  type SentryCodeMappingRefresh,
} from "../providers/sentry/code-mapping.ts";
import type { Store } from "../storage/store.ts";

export interface SyncSentryCodeMappingsOptions {
  store: Store;
  token: string;
  projects: Resource[];
  observedAt: string;
  fetch?: SentryClientOptions["fetch"];
  baseUrl?: string;
}

export interface SyncSentryCodeMappingsResult {
  refreshed: number;
  failed: number;
  upserted: number;
  lines: string[];
}

function priorRefresh(resource: Resource): SentryCodeMappingRefresh | null {
  return parseCodeMappingRefresh(resource.metadata.codeMappingRefresh);
}

function persistProjectMappings(
  store: Store,
  project: Resource,
  mappings: SentryCodeMappingFact[] | undefined,
  refresh: SentryCodeMappingRefresh,
): void {
  const current = store.getResource(project.id) ?? project;
  const metadata: Record<string, unknown> = { ...current.metadata };
  if (mappings !== undefined) {
    metadata.codeMappings = mappings;
  }
  metadata.codeMappingRefresh = refresh;
  store.replaceResourceMetadata(project.id, metadata);
}

/**
 * Fetch and persist compact Sentry code-mapping facts on each project
 * Resource. Does not create Resource Changes.
 *
 * Failure isolation: project Resources are already applied. A mapping
 * retrieval failure marks refresh as failure and retains prior facts —
 * never converts unknown into known-empty.
 *
 * Bound: at most CODE_MAPPINGS_MAX_PAGES × CODE_MAPPINGS_PER_PAGE
 * mappings per project.
 */
export async function syncSentryCodeMappings(
  options: SyncSentryCodeMappingsOptions,
): Promise<SyncSentryCodeMappingsResult> {
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

  for (const project of projects) {
    const stored = options.store.getResource(project.id) ?? project;
    const orgSlug = organizationSlugFromResource(stored);
    if (!orgSlug) {
      failed += 1;
      const prior = priorRefresh(stored);
      persistProjectMappings(options.store, stored, undefined, {
        status: "failure",
        observedAt: options.observedAt,
        message:
          "Code-mapping retrieval skipped: Sentry project lacks organization_slug for the organization code-mappings API.",
        resultCount: prior?.resultCount ?? null,
        lastSuccessfulObservedAt: prior?.lastSuccessfulObservedAt ?? null,
      });
      continue;
    }

    try {
      const raw = await client.listOrganizationCodeMappings(
        orgSlug,
        project.providerResourceId,
        {
          perPage: CODE_MAPPINGS_PER_PAGE,
          maxPages: CODE_MAPPINGS_MAX_PAGES,
        },
      );
      const normalized: SentryCodeMappingFact[] = [];
      const seenRepos = new Set<string>();
      for (const item of raw) {
        const fact = normalizeSentryCodeMapping(
          item,
          project.providerResourceId,
        );
        if (!fact) continue;
        if (seenRepos.has(fact.repository)) continue;
        seenRepos.add(fact.repository);
        normalized.push(fact);
      }

      persistProjectMappings(options.store, stored, normalized, {
        status: "success",
        observedAt: options.observedAt,
        message: null,
        resultCount: normalized.length,
        lastSuccessfulObservedAt: options.observedAt,
      });
      refreshed += 1;
      upserted += normalized.length;
    } catch (err) {
      failed += 1;
      const message =
        err instanceof SentryApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "code-mapping retrieval failed";
      const prior = priorRefresh(stored);
      persistProjectMappings(options.store, stored, undefined, {
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
      `Code-mapping evidence: ${refreshed} project${refreshed === 1 ? "" : "s"} refreshed` +
        (failed > 0
          ? `, ${failed} project${failed === 1 ? "" : "s"} failed (prior evidence retained)`
          : "") +
        ` (bound: ≤${CODE_MAPPINGS_MAX_PAGES * CODE_MAPPINGS_PER_PAGE} mappings each)`,
    );
    if (upserted > 0) {
      lines.push(
        `${upserted} GitHub code mapping${upserted === 1 ? "" : "s"} recorded`,
      );
    }
  }

  return { refreshed, failed, upserted, lines };
}
