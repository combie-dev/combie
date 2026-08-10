import { resourceId } from "../../domain/resource.ts";
import { NEON_PROVIDER } from "./normalize.ts";

/** Compact Neon control-plane operation evidence. */
export interface NeonOperationEvidence {
  provider: "neon";
  /** Stable Neon operation UUID. */
  operationId: string;
  /** Exact Combie Resource id: `neon:project:<projectId>`. */
  resourceId: string;
  /** Echoed Neon project id (exact join key). */
  projectId: string;
  /** Provider-native operation action. */
  action: string;
  /** Provider-native mutable lifecycle status. */
  status: string;
  /** Aggregate provider failure count; not an attempt history. */
  failuresCount: number;
  /** Safe provider-native target identifiers when present. */
  branchId: string | null;
  endpointId: string | null;
  /** Provider operation creation time. Primary ordering time. */
  createdAt: string;
  /** Provider time when operation status was last updated. */
  updatedAt: string;
  /** Provider time when the operation was last retried, when present. */
  retryAt: string | null;
  /** Provider-reported total duration in milliseconds. */
  totalDurationMs: number;
  /** When Combie last observed/upserted this evidence. */
  observedAt: string;
}

export interface NeonOperationRefresh {
  resourceId: string;
  status: "success" | "failure";
  /**
   * Combie observation time of the latest refresh attempt (success or failure).
   * Distinct from lastSuccessfulObservedAt.
   */
  observedAt: string;
  message: string | null;
  /** Number returned by the last successful complete page walk; null on failure. */
  resultCount: number | null;
  /**
   * Combie observation time of the latest successful operation refresh for this
   * exact project Resource. Null when never successfully refreshed with
   * provenance. Survives a later failed refresh. Not a provider event time.
   */
  lastSuccessfulObservedAt: string | null;
}

export type NeonOperationEvidenceAuthority =
  | { kind: "not_applicable" }
  | {
      kind: "unknown";
      operations: NeonOperationEvidence[];
      /** Latest refresh attempt observation time when a refresh row exists. */
      latestAttemptObservedAt: string | null;
      lastSuccessAt: string | null;
      message: string | null;
    }
  | {
      kind: "empty";
      observedAt: string;
      /** Previously observed history retained beyond the current provider list. */
      operations: NeonOperationEvidence[];
    }
  | {
      kind: "populated";
      observedAt: string;
      operations: NeonOperationEvidence[];
    };

export function neonProjectResourceId(projectId: string): string {
  return resourceId(NEON_PROVIDER, "project", projectId);
}

function asUuid(value: unknown): string | null {
  return typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      )
    ? value
    : null;
}

function asProviderId(value: unknown): string | null {
  return typeof value === "string" && /^[a-z0-9-]{1,60}$/.test(value)
    ? value
    : null;
}

function asSafeProviderValue(value: unknown): string | null {
  return typeof value === "string" &&
      value.length > 0 &&
      value.length <= 255 &&
      value.trim() === value &&
      !/[\u0000-\u001f\u007f-\u009f]/.test(value)
    ? value
    : null;
}

function asNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
    ? value
    : null;
}

const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

function asIsoTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = RFC3339_DATE_TIME.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendarDay = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDay.getUTCFullYear() !== year ||
    calendarDay.getUTCMonth() !== month - 1 ||
    calendarDay.getUTCDate() !== day
  ) {
    return null;
  }
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds)
    ? new Date(milliseconds).toISOString()
    : null;
}

/**
 * Project one allowlisted Neon operation into durable evidence.
 * Raw provider error text and arbitrary response fields are never copied.
 */
export function normalizeNeonOperation(
  raw: {
    id?: unknown;
    project_id?: unknown;
    branch_id?: unknown;
    endpoint_id?: unknown;
    action?: unknown;
    status?: unknown;
    failures_count?: unknown;
    retry_at?: unknown;
    created_at?: unknown;
    updated_at?: unknown;
    total_duration_ms?: unknown;
    error?: unknown;
    [key: string]: unknown;
  },
  expectedProjectId: string,
  observedAt: string,
): NeonOperationEvidence | null {
  const operationId = asUuid(raw.id);
  const projectId = asProviderId(raw.project_id);
  const action = asSafeProviderValue(raw.action);
  const status = asSafeProviderValue(raw.status);
  const failuresCount = asNonNegativeInteger(raw.failures_count);
  const createdAt = asIsoTimestamp(raw.created_at);
  const updatedAt = asIsoTimestamp(raw.updated_at);
  const branchId = raw.branch_id == null ? null : asProviderId(raw.branch_id);
  const endpointId = raw.endpoint_id == null ? null : asProviderId(raw.endpoint_id);
  const retryAt = raw.retry_at == null ? null : asIsoTimestamp(raw.retry_at);
  const totalDurationMs = asNonNegativeInteger(raw.total_duration_ms);

  if (
    !operationId ||
    !projectId ||
    projectId !== expectedProjectId ||
    !action ||
    !status ||
    failuresCount == null ||
    !createdAt ||
    !updatedAt ||
    (raw.branch_id != null && !branchId) ||
    (raw.endpoint_id != null && !endpointId) ||
    (raw.retry_at != null && !retryAt) ||
    totalDurationMs == null
  ) {
    return null;
  }

  return {
    provider: "neon",
    operationId,
    resourceId: neonProjectResourceId(projectId),
    projectId,
    action,
    status,
    failuresCount,
    branchId,
    endpointId,
    createdAt,
    updatedAt,
    retryAt,
    totalDurationMs,
    observedAt,
  };
}

export function composeNeonOperationAuthority(
  provider: string,
  kind: string,
  refresh: NeonOperationRefresh | null,
  operations: NeonOperationEvidence[],
): NeonOperationEvidenceAuthority {
  if (provider !== "neon" || kind !== "project") {
    return { kind: "not_applicable" };
  }

  if (refresh?.status === "success") {
    const successAt =
      refresh.lastSuccessfulObservedAt ?? refresh.observedAt;
    if (refresh.resultCount === 0) {
      return {
        kind: "empty",
        observedAt: successAt,
        operations,
      };
    }
    return {
      kind: "populated",
      observedAt: successAt,
      operations,
    };
  }

  return {
    kind: "unknown",
    operations,
    latestAttemptObservedAt: refresh?.observedAt ?? null,
    lastSuccessAt: refresh?.lastSuccessfulObservedAt ?? null,
    message: refresh?.status === "failure" ? refresh.message : null,
  };
}
