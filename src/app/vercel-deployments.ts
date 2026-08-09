import type { Resource } from "../domain/resource.ts";
import {
  createVercelClient,
  type VercelClientOptions,
} from "../providers/vercel/client.ts";
import {
  normalizeDeployment,
  type VercelDeploymentEvidence,
} from "../providers/vercel/deployment.ts";
import { VercelApiError } from "../providers/vercel/errors.ts";
import type { Store } from "../storage/store.ts";

export interface SyncVercelDeploymentsOptions {
  store: Store;
  token: string;
  projects: Resource[];
  /** Shared Combie observation time for this sync pass. */
  observedAt: string;
  fetch?: VercelClientOptions["fetch"];
  baseUrl?: string;
}

export interface SyncVercelDeploymentsResult {
  /** Projects whose deployment list was fetched successfully. */
  refreshed: number;
  /** Projects whose deployment list failed (projects remain valid). */
  failed: number;
  /** Distinct deployment uids upserted this run. */
  upserted: number;
  /** Compact non-secret summary lines for sync output. */
  lines: string[];
}

/**
 * Fetch and persist Vercel deployment evidence for discovered projects.
 *
 * Failure isolation: project Resources are already applied. A deployment
 * retrieval failure marks refresh as unknown/failure and retains any prior
 * deployment rows — it never converts unknown into known-empty and never
 * creates Resource Changes.
 *
 * Retention: list responses are not treated as deletion authority. Rows that
 * fall out of a bounded API window are kept until re-observed or replaced by
 * the same uid upsert.
 */
export async function syncVercelDeployments(
  options: SyncVercelDeploymentsOptions,
): Promise<SyncVercelDeploymentsResult> {
  const projects = options.projects.filter(
    (r) => r.provider === "vercel" && r.kind === "project",
  );
  if (projects.length === 0) {
    return { refreshed: 0, failed: 0, upserted: 0, lines: [] };
  }

  const client = createVercelClient(options.token, {
    fetch: options.fetch,
    baseUrl: options.baseUrl,
  });

  let refreshed = 0;
  let failed = 0;
  let upserted = 0;
  const seenUids = new Set<string>();

  for (const project of projects) {
    try {
      const raw = await client.listDeploymentsForProject(
        project.providerResourceId,
      );
      const normalized: VercelDeploymentEvidence[] = [];
      for (const item of raw) {
        const evidence = normalizeDeployment(
          item,
          project.providerResourceId,
          options.observedAt,
        );
        if (!evidence) continue;
        // Exact Resource association — never trust name/url matching.
        if (evidence.resourceId !== project.id) continue;
        normalized.push(evidence);
      }

      for (const evidence of normalized) {
        options.store.upsertVercelDeployment(evidence);
        if (!seenUids.has(evidence.uid)) {
          seenUids.add(evidence.uid);
          upserted += 1;
        }
      }

      options.store.setVercelDeploymentRefresh({
        resourceId: project.id,
        status: "success",
        observedAt: options.observedAt,
        message: null,
      });
      refreshed += 1;
    } catch (err) {
      failed += 1;
      const message =
        err instanceof VercelApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "deployment retrieval failed";
      options.store.setVercelDeploymentRefresh({
        resourceId: project.id,
        status: "failure",
        observedAt: options.observedAt,
        message,
      });
      // Intentionally do not delete prior deployment rows.
    }
  }

  const lines: string[] = [];
  if (refreshed > 0 || failed > 0) {
    lines.push(
      `Deployment evidence: ${refreshed} project${refreshed === 1 ? "" : "s"} refreshed` +
        (failed > 0
          ? `, ${failed} project${failed === 1 ? "" : "s"} failed (prior evidence retained)`
          : ""),
    );
    if (upserted > 0) {
      lines.push(
        `${upserted} deployment${upserted === 1 ? "" : "s"} recorded`,
      );
    }
  }

  return { refreshed, failed, upserted, lines };
}
