import type { Resource } from "../../domain/resource.ts";
import { organizationSlugFromResource } from "./release.ts";

/**
 * Compact Sentry code-mapping fact stored on a Sentry project Resource.
 *
 * Control-plane configuration — not operational activity, not a Change, and
 * not a generic Event. Only GitHub mappings are retained.
 */
export interface SentryCodeMappingFact {
  mappingId: string | null;
  sentryRepoId: string | null;
  repository: string;
  scmProvider: "github";
  githubRepoId?: string;
}

/** Per-project mapping refresh authority stored beside the facts. */
export interface SentryCodeMappingRefresh {
  status: "success" | "failure";
  observedAt: string;
  message: string | null;
  /** Matchable GitHub mappings accepted by the latest successful refresh. */
  resultCount: number | null;
  lastSuccessfulObservedAt: string | null;
}

export type CodeMappingEvidenceAuthority =
  | { kind: "not_applicable" }
  | {
      kind: "unknown";
      mappings: SentryCodeMappingFact[];
      latestAttemptObservedAt: string | null;
      lastSuccessAt: string | null;
      resultCount: number | null;
      message: string | null;
    }
  | {
      kind: "empty";
      observedAt: string;
      resultCount: number | null;
      mappings: SentryCodeMappingFact[];
    }
  | {
      kind: "populated";
      observedAt: string;
      resultCount: number | null;
      mappings: SentryCodeMappingFact[];
    };

export const CODE_MAPPINGS_PER_PAGE = 100;
export const CODE_MAPPINGS_MAX_PAGES = 1;

export { organizationSlugFromResource };

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asIdString(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return asNonEmptyString(value);
}

/**
 * Extract the SCM integration key from a Sentry code-mapping payload.
 * Accepts `provider.key` (serialized integration provider) or a string.
 */
export function scmProviderKeyFromMapping(raw: unknown): string | null {
  if (typeof raw === "string") {
    const key = raw.trim().toLowerCase();
    return key === "" ? null : key;
  }
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.key === "string") {
    const key = obj.key.trim().toLowerCase();
    return key === "" ? null : key;
  }
  if (obj.provider && typeof obj.provider === "object") {
    const nested = obj.provider as Record<string, unknown>;
    if (typeof nested.key === "string") {
      const key = nested.key.trim().toLowerCase();
      return key === "" ? null : key;
    }
  }
  return null;
}

export function isGitHubScmProvider(key: string | null): boolean {
  return key === "github";
}

/**
 * Normalize one organization code-mapping list item.
 * Requires exact projectId === expectedProjectId. Non-GitHub SCM is dropped.
 * Stack/source roots, default branch, slugs, and raw payloads are excluded.
 */
export function normalizeSentryCodeMapping(
  raw: unknown,
  expectedProjectId: string,
): SentryCodeMappingFact | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;

  const projectId = asIdString(item.projectId);
  if (!projectId || projectId !== expectedProjectId) return null;

  const scm = scmProviderKeyFromMapping(item.provider);
  if (!isGitHubScmProvider(scm)) return null;

  const repository = asNonEmptyString(item.repoName);
  if (!repository || !repository.includes("/")) return null;

  const fact: SentryCodeMappingFact = {
    mappingId: asIdString(item.id),
    sentryRepoId: asIdString(item.repoId),
    repository,
    scmProvider: "github",
  };

  const githubRepoId = asIdString(item.githubRepoId);
  if (githubRepoId) fact.githubRepoId = githubRepoId;

  return fact;
}

export function parseCodeMappings(
  value: unknown,
): SentryCodeMappingFact[] | null {
  if (!Array.isArray(value)) return null;
  const out: SentryCodeMappingFact[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (e.scmProvider !== "github") continue;
    const repository = asNonEmptyString(e.repository);
    if (!repository || !repository.includes("/")) continue;
    const fact: SentryCodeMappingFact = {
      mappingId: asIdString(e.mappingId),
      sentryRepoId: asIdString(e.sentryRepoId),
      repository,
      scmProvider: "github",
    };
    const githubRepoId = asIdString(e.githubRepoId);
    if (githubRepoId) fact.githubRepoId = githubRepoId;
    out.push(fact);
  }
  return out;
}

export function parseCodeMappingRefresh(
  value: unknown,
): SentryCodeMappingRefresh | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (r.status !== "success" && r.status !== "failure") return null;
  const observedAt = asNonEmptyString(r.observedAt);
  if (!observedAt) return null;
  return {
    status: r.status,
    observedAt,
    message: typeof r.message === "string" ? r.message : null,
    resultCount:
      typeof r.resultCount === "number" && Number.isFinite(r.resultCount)
        ? r.resultCount
        : null,
    lastSuccessfulObservedAt: asNonEmptyString(r.lastSuccessfulObservedAt),
  };
}

export function hasAuthoritativeCodeMappingEvidence(resource: Resource): boolean {
  return Array.isArray(resource.metadata.codeMappings);
}

export function composeCodeMappingAuthority(
  resource: Resource | null,
): CodeMappingEvidenceAuthority {
  if (!resource || resource.provider !== "sentry" || resource.kind !== "project") {
    return { kind: "not_applicable" };
  }

  const mappings = parseCodeMappings(resource.metadata.codeMappings) ?? [];
  const refresh = parseCodeMappingRefresh(resource.metadata.codeMappingRefresh);

  if (!refresh) {
    return {
      kind: "unknown",
      mappings,
      latestAttemptObservedAt: null,
      lastSuccessAt: null,
      resultCount: null,
      message: null,
    };
  }

  if (refresh.status === "failure") {
    return {
      kind: "unknown",
      mappings,
      latestAttemptObservedAt: refresh.observedAt,
      lastSuccessAt: refresh.lastSuccessfulObservedAt,
      resultCount: refresh.resultCount,
      message: refresh.message,
    };
  }

  if (mappings.length === 0) {
    return {
      kind: "empty",
      observedAt: refresh.observedAt,
      resultCount: refresh.resultCount,
      mappings,
    };
  }

  return {
    kind: "populated",
    observedAt: refresh.observedAt,
    resultCount: refresh.resultCount,
    mappings,
  };
}
