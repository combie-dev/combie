import { resourceId } from "../../domain/resource.ts";
import { SENTRY_PROVIDER } from "./normalize.ts";

/**
 * Compact Sentry release evidence.
 *
 * Intentionally Sentry-specific — not a generic Event primitive.
 * Provider lifecycle times stay separate from Combie observation time.
 */
export interface SentryReleaseEvidence {
  provider: "sentry";
  /** Stable Sentry release identity (`version`) within the organization. */
  version: string;
  /** Exact Combie Resource id: `sentry:project:<numeric-id>`. */
  resourceId: string;
  /** Sentry numeric project id as text (exact join key). */
  projectId: string;
  /** Provider shortVersion when present and distinct from version. */
  shortVersion: string | null;
  /** Provider-native status when present (e.g. open). */
  status: string | null;
  /** Provider dateCreated (ISO). Primary ordering time. */
  dateCreated: string;
  /** Provider dateReleased when present (ISO). */
  dateReleased: string | null;
  /** When Combie last observed/upserted this evidence (ISO). */
  observedAt: string;
}

/** Per-project release refresh authority (not deletion authority). */
export interface SentryReleaseRefresh {
  resourceId: string;
  status: "success" | "failure";
  /**
   * Combie observation time of the latest refresh attempt (success or failure).
   * Distinct from lastSuccessfulObservedAt.
   */
  observedAt: string;
  message: string | null;
  /**
   * Number of normalized release rows accepted by the latest successful
   * bounded refresh for this exact project Resource. Null when never
   * successfully refreshed. Not the count of rows currently retained locally.
   * Survives a later failed refresh.
   */
  resultCount: number | null;
  /**
   * Combie observation time of the latest successful bounded refresh for this
   * exact project Resource. Null when never successfully refreshed. Survives
   * a later failed refresh. Not a provider event time and not proof of
   * complete release history.
   */
  lastSuccessfulObservedAt: string | null;
}

export type ReleaseEvidenceAuthority =
  | { kind: "not_applicable" }
  | {
      kind: "unknown";
      releases: SentryReleaseEvidence[];
      latestAttemptObservedAt: string | null;
      lastSuccessAt: string | null;
      resultCount: number | null;
      message: string | null;
    }
  | {
      kind: "empty";
      observedAt: string;
      resultCount: number | null;
      releases: SentryReleaseEvidence[];
    }
  | {
      kind: "populated";
      observedAt: string;
      resultCount: number | null;
      releases: SentryReleaseEvidence[];
    };

/**
 * Explicit retrieval bound: one page of up to 100 most-recent releases per
 * project. Not complete lifetime history. Chosen for request-aware sync
 * while preserving exact project binding.
 */
export const RELEASES_PER_PAGE = 100;
export const RELEASES_MAX_PAGES = 1;

export function sentryProjectResourceId(projectId: string): string {
  return resourceId(SENTRY_PROVIDER, "project", projectId);
}

export function organizationSlugFromResource(resource: {
  metadata: Record<string, unknown>;
}): string | null {
  const slug = resource.metadata.organization_slug;
  if (typeof slug !== "string") return null;
  const trimmed = slug.trim();
  return trimmed === "" ? null : trimmed;
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

function projectIdsFromRelease(raw: {
  projects?: unknown;
}): string[] {
  if (!Array.isArray(raw.projects)) return [];
  const ids: string[] = [];
  for (const entry of raw.projects) {
    if (entry == null || typeof entry !== "object") continue;
    const id = (entry as { id?: unknown }).id;
    if (typeof id === "number" && Number.isFinite(id)) {
      ids.push(String(id));
      continue;
    }
    if (typeof id === "string" && id.trim() !== "") {
      ids.push(id.trim());
    }
  }
  return ids;
}

/**
 * Normalize one organization-release list item into compact evidence.
 * Requires exact projects[].id match to expectedProjectId.
 * Excludes authors, commits, deploys, URLs, owner, data, and issue fields.
 */
export function normalizeSentryRelease(
  raw: {
    id?: unknown;
    version?: unknown;
    shortVersion?: unknown;
    status?: unknown;
    dateCreated?: unknown;
    dateReleased?: unknown;
    projects?: unknown;
    authors?: unknown;
    lastCommit?: unknown;
    lastDeploy?: unknown;
    data?: unknown;
    url?: unknown;
    owner?: unknown;
    commitCount?: unknown;
    newGroups?: unknown;
    firstEvent?: unknown;
    lastEvent?: unknown;
    currentProjectMeta?: unknown;
    userAgent?: unknown;
    ref?: unknown;
  },
  expectedProjectId: string,
  observedAt: string,
): SentryReleaseEvidence | null {
  const version = asNonEmptyString(raw.version);
  if (!version) return null;

  const projectIds = projectIdsFromRelease(raw);
  if (!projectIds.includes(expectedProjectId)) return null;

  const dateCreated = asIsoTimestamp(raw.dateCreated);
  if (!dateCreated) return null;

  const shortVersion = asNonEmptyString(raw.shortVersion);
  return {
    provider: "sentry",
    version,
    resourceId: sentryProjectResourceId(expectedProjectId),
    projectId: expectedProjectId,
    shortVersion:
      shortVersion && shortVersion !== version ? shortVersion : null,
    status: asNonEmptyString(raw.status),
    dateCreated,
    dateReleased: asIsoTimestamp(raw.dateReleased),
    observedAt,
  };
}

export function composeReleaseAuthority(
  provider: string,
  kind: string,
  refresh: SentryReleaseRefresh | null,
  releases: SentryReleaseEvidence[],
): ReleaseEvidenceAuthority {
  if (provider !== "sentry" || kind !== "project") {
    return { kind: "not_applicable" };
  }

  if (refresh?.status === "success") {
    const successAt = refresh.lastSuccessfulObservedAt ?? refresh.observedAt;
    if (refresh.resultCount === 0) {
      return {
        kind: "empty",
        observedAt: successAt,
        resultCount: 0,
        releases,
      };
    }
    if (refresh.resultCount != null && refresh.resultCount > 0) {
      return {
        kind: "populated",
        observedAt: successAt,
        resultCount: refresh.resultCount,
        releases,
      };
    }
    if (releases.length === 0) {
      return {
        kind: "empty",
        observedAt: successAt,
        resultCount: null,
        releases: [],
      };
    }
    return {
      kind: "populated",
      observedAt: successAt,
      resultCount: null,
      releases,
    };
  }

  return {
    kind: "unknown",
    releases,
    latestAttemptObservedAt: refresh?.observedAt ?? null,
    lastSuccessAt: refresh?.lastSuccessfulObservedAt ?? null,
    resultCount: refresh?.resultCount ?? null,
    message: refresh?.status === "failure" ? refresh.message : null,
  };
}
