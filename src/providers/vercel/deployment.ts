import { resourceId } from "../../domain/resource.ts";
import { VERCEL_PROVIDER } from "./normalize.ts";

/**
 * Compact Vercel deployment evidence.
 *
 * Intentionally Vercel-specific — not a generic Event primitive.
 * Provider lifecycle times stay separate from Combie observation time.
 */
export interface VercelDeploymentEvidence {
  provider: "vercel";
  /** Stable Vercel deployment identity (`uid`). */
  uid: string;
  /** Exact Combie Resource id: `vercel:project:<projectId>`. */
  resourceId: string;
  /** Vercel project id (exact join key). */
  projectId: string;
  /** Provider-native readyState when present. */
  readyState: string | null;
  /** Provider-native state when present (may mirror readyState). */
  state: string | null;
  /** Deployment target environment when present (production / staging). */
  target: string | null;
  /** Provider deployment creation time (epoch ms). Primary ordering time. */
  createdAtMs: number;
  /** Provider build-start time (epoch ms) when present. */
  buildingAtMs: number | null;
  /** Provider ready time (epoch ms) when present. */
  readyAtMs: number | null;
  /** When Combie last observed/upserted this evidence (ISO). */
  observedAt: string;
  /** Compact deployment source label when present (cli, git, …). */
  source: string | null;
}

/** Per-project deployment refresh authority (not deletion authority). */
export interface VercelDeploymentRefresh {
  resourceId: string;
  /** Last refresh outcome for this project. */
  status: "success" | "failure";
  /** Combie observation time of that outcome. */
  observedAt: string;
  /** User-safe failure detail; never secrets. */
  message: string | null;
}

export type DeploymentEvidenceAuthority =
  | {
      kind: "not_applicable";
    }
  | {
      /** Refresh never succeeded, or last refresh failed. */
      kind: "unknown";
      deployments: VercelDeploymentEvidence[];
      lastSuccessAt: string | null;
      message: string | null;
    }
  | {
      /** Last refresh succeeded and returned zero deployments. */
      kind: "empty";
      observedAt: string;
      deployments: [];
    }
  | {
      /** Last refresh succeeded with one or more deployments. */
      kind: "populated";
      observedAt: string;
      deployments: VercelDeploymentEvidence[];
    };

/** Raw list-item shape from GET /v7/deployments (allowlisted fields only). */
export interface VercelDeploymentRaw {
  uid?: unknown;
  projectId?: unknown;
  name?: unknown;
  url?: unknown;
  created?: unknown;
  createdAt?: unknown;
  buildingAt?: unknown;
  ready?: unknown;
  readyState?: unknown;
  state?: unknown;
  target?: unknown;
  source?: unknown;
  creator?: unknown;
  meta?: unknown;
  inspectorUrl?: unknown;
  errorMessage?: unknown;
  errorCode?: unknown;
  deleted?: unknown;
  [key: string]: unknown;
}

export function vercelProjectResourceId(projectId: string): string {
  return resourceId(VERCEL_PROVIDER, "project", projectId);
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

/**
 * Normalize one Vercel deployment list item into compact evidence.
 * Returns null when required identity/time fields are missing or the
 * project association does not match the expected project id.
 */
export function normalizeDeployment(
  // Accept list-item types without requiring an index signature.
  raw: {
    uid?: unknown;
    projectId?: unknown;
    created?: unknown;
    createdAt?: unknown;
    buildingAt?: unknown;
    ready?: unknown;
    readyState?: unknown;
    state?: unknown;
    target?: unknown;
    source?: unknown;
  },
  expectedProjectId: string,
  observedAt: string,
): VercelDeploymentEvidence | null {
  const uid = asNonEmptyString(raw.uid);
  const projectId = asNonEmptyString(raw.projectId);
  if (!uid || !projectId) return null;
  if (projectId !== expectedProjectId) return null;

  // Prefer `created` (documented deployment creation time). Accept `createdAt`
  // as a documented sibling when `created` is absent.
  const createdAtMs =
    asFiniteNumber(raw.created) ?? asFiniteNumber(raw.createdAt);
  if (createdAtMs == null) return null;

  const readyState = asNonEmptyString(raw.readyState);
  const state = asNonEmptyString(raw.state);
  const target = asNonEmptyString(raw.target);
  const source = asNonEmptyString(raw.source);
  const buildingAtMs = asFiniteNumber(raw.buildingAt);
  const readyAtMs = asFiniteNumber(raw.ready);

  return {
    provider: "vercel",
    uid,
    resourceId: vercelProjectResourceId(projectId),
    projectId,
    readyState,
    state,
    target,
    createdAtMs,
    buildingAtMs,
    readyAtMs,
    observedAt,
    source,
  };
}

/**
 * Compose investigation authority for a Vercel project from refresh state
 * and persisted deployment rows (already newest-first ordered).
 */
export function composeDeploymentAuthority(
  resourceId: string,
  provider: string,
  kind: string,
  refresh: VercelDeploymentRefresh | null,
  deployments: VercelDeploymentEvidence[],
): DeploymentEvidenceAuthority {
  if (provider !== "vercel" || kind !== "project") {
    return { kind: "not_applicable" };
  }

  if (refresh?.status === "success") {
    if (deployments.length === 0) {
      return {
        kind: "empty",
        observedAt: refresh.observedAt,
        deployments: [],
      };
    }
    return {
      kind: "populated",
      observedAt: refresh.observedAt,
      deployments,
    };
  }

  return {
    kind: "unknown",
    deployments,
    lastSuccessAt: null,
    message: refresh?.status === "failure" ? refresh.message : null,
  };
}
