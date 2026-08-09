import type { Resource } from "../domain/resource.ts";
import {
  createNeonClient,
  type NeonClientOptions,
} from "../providers/neon/client.ts";
import { NeonApiError } from "../providers/neon/errors.ts";
import {
  normalizeNeonOperation,
  type NeonOperationEvidence,
} from "../providers/neon/operation.ts";
import type { Store } from "../storage/store.ts";

export interface SyncNeonOperationsOptions {
  store: Store;
  token: string;
  projects: Resource[];
  observedAt: string;
  fetch?: NeonClientOptions["fetch"];
  baseUrl?: string;
}

export interface SyncNeonOperationsResult {
  refreshed: number;
  failed: number;
  upserted: number;
  lines: string[];
}

/**
 * Refresh compact Neon operation evidence after project Resources are applied.
 * Failures preserve project discovery and all previously observed operations.
 */
export async function syncNeonOperations(
  options: SyncNeonOperationsOptions,
): Promise<SyncNeonOperationsResult> {
  const projects = options.projects.filter(
    (resource) => resource.provider === "neon" && resource.kind === "project",
  );
  if (projects.length === 0) {
    return { refreshed: 0, failed: 0, upserted: 0, lines: [] };
  }

  const client = createNeonClient(options.token, {
    fetch: options.fetch,
    baseUrl: options.baseUrl,
  });
  let refreshed = 0;
  let failed = 0;
  let upserted = 0;
  const seenOperationIds = new Set<string>();

  for (const project of projects) {
    try {
      const raw = await client.listProjectOperations(
        project.providerResourceId,
      );
      const normalized: NeonOperationEvidence[] = [];
      for (const item of raw) {
        const operation = normalizeNeonOperation(
          item,
          project.providerResourceId,
          options.observedAt,
        );
        // A mismatched echoed project id makes this refresh non-authoritative.
        if (!operation || operation.resourceId !== project.id) {
          throw new NeonApiError({
            message:
              `List operations for Neon project ${project.providerResourceId}: ` +
              "response could not be bound to the exact project Resource. Try again.",
            status: 200,
            endpoint: `/projects/${project.providerResourceId}/operations`,
          });
        }
        normalized.push(operation);
      }

      for (const operation of normalized) {
        options.store.upsertNeonOperation(operation);
        if (!seenOperationIds.has(operation.operationId)) {
          seenOperationIds.add(operation.operationId);
          upserted += 1;
        }
      }
      options.store.setNeonOperationRefresh({
        resourceId: project.id,
        status: "success",
        observedAt: options.observedAt,
        message: null,
        resultCount: normalized.length,
      });
      refreshed += 1;
    } catch (error) {
      failed += 1;
      options.store.setNeonOperationRefresh({
        resourceId: project.id,
        status: "failure",
        observedAt: options.observedAt,
        message: safeOperationRefreshMessage(error),
        resultCount: null,
      });
      // List absence and failed refreshes are never deletion authority.
    }
  }

  const lines: string[] = [];
  if (refreshed > 0 || failed > 0) {
    lines.push(
      `Operation evidence: ${refreshed} project${refreshed === 1 ? "" : "s"} refreshed` +
        (failed > 0
          ? `, ${failed} project${failed === 1 ? "" : "s"} failed (prior evidence retained)`
          : ""),
    );
    if (upserted > 0) {
      lines.push(
        `${upserted} Neon operation${upserted === 1 ? "" : "s"} recorded`,
      );
    }
  }

  return { refreshed, failed, upserted, lines };
}

/** Never persist raw provider error text; it may contain database details. */
function safeOperationRefreshMessage(error: unknown): string {
  if (!(error instanceof NeonApiError)) {
    return "Neon operation refresh failed unexpectedly. Try again.";
  }
  if (error.status === 401) {
    return "Neon operation refresh failed: authentication failed. Check that the API key is valid.";
  }
  if (error.status === 403) {
    return (
      "Neon operation refresh failed: request forbidden. " +
      "Check project read access for the API key."
    );
  }
  if (error.status === 404) {
    return "Neon operation refresh failed: project operations were not available for this project.";
  }
  if (error.status === 423) {
    return "Neon operation refresh failed: the project was temporarily locked. Try again.";
  }
  if (error.status === 429) {
    return "Neon operation refresh failed: rate limit exceeded. Wait and try again.";
  }
  if (error.status >= 500 || error.status === 0) {
    return "Neon operation refresh failed: Neon was unavailable. Try again.";
  }
  return "Neon operation refresh failed: the response was not authoritative. Try again.";
}
