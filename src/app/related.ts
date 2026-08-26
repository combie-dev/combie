import type { Resource } from "../domain/resource.ts";
import type { Relationship } from "../domain/relationship.ts";
import { Store } from "../storage/store.ts";
import { notInitialized, CombieError } from "./errors.ts";
import { BINARY_NAME } from "../cli/constants.ts";
import {
  formatRelationshipClockLines,
  lastAttemptAtByProvider,
  lastRequiredProviderAttemptAt,
} from "./relationship-verification-clocks.ts";

/**
 * Direction of a canonical Relationship relative to the queried Resource.
 * - outbound: queried Resource is the Relationship source (kind → neighbor)
 * - inbound: queried Resource is the Relationship target (← kind — neighbor)
 */
export type RelatedDirection = "outbound" | "inbound";

export interface RelatedNeighbor {
  relationship: Relationship;
  direction: RelatedDirection;
  /** Neighbor Resource when still present; null if dangling. */
  resource: Resource | null;
}

/**
 * One hop on a two-hop path (Sprint 107). Direction is from the walk:
 * outbound means this hop left via the Relationship source → target.
 */
export interface RelatedPathHop {
  relationship: Relationship;
  direction: RelatedDirection;
  resourceId: string;
  resource: Resource | null;
}

/**
 * Exactly two stored Relationships from the subject. Not a Relationship.
 * Not hop-2 evidence. Omitted when none exist.
 */
export interface RelatedPath {
  hops: [RelatedPathHop, RelatedPathHop];
  viaResourceId: string;
  farResourceId: string;
}

export interface RelatedResourceContext {
  resource: Resource;
  related: RelatedNeighbor[];
  /** Read-time two-hop paths over stored edges (Sprint 107). Empty when none. */
  paths: RelatedPath[];
  /** Live required-provider last_attempt_at map (Sprint 084). Not persisted. */
  providerLastAttemptAt: Record<string, string | null>;
}

export interface GetRelatedContextOptions {
  baseDir: string;
  /**
   * Deterministic Combie Resource id:
   * `provider:kind:providerResourceId`
   * e.g. `github:repository:915052094`
   */
  resourceRef: string;
}

function hopFrom(
  relationship: Relationship,
  fromResourceId: string,
): { direction: RelatedDirection; neighborId: string } | null {
  if (relationship.sourceResourceId === fromResourceId) {
    return {
      direction: "outbound",
      neighborId: relationship.targetResourceId,
    };
  }
  if (relationship.targetResourceId === fromResourceId) {
    return {
      direction: "inbound",
      neighborId: relationship.sourceResourceId,
    };
  }
  return null;
}

function enumerateTwoHopPaths(
  store: Store,
  subjectId: string,
  oneHop: RelatedNeighbor[],
): RelatedPath[] {
  const paths: RelatedPath[] = [];
  const seen = new Set<string>();

  for (const first of oneHop) {
    const viaResourceId = hopFrom(first.relationship, subjectId)?.neighborId;
    if (!viaResourceId || viaResourceId === subjectId) continue;

    for (const second of store.listRelationshipsForResource(viaResourceId)) {
      if (second.id === first.relationship.id) continue;
      const secondHop = hopFrom(second, viaResourceId);
      if (!secondHop) continue;
      const farResourceId = secondHop.neighborId;
      if (farResourceId === subjectId || farResourceId === viaResourceId) {
        continue;
      }
      const key = `${first.relationship.id}\u0000${second.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      paths.push({
        hops: [
          {
            relationship: first.relationship,
            direction: first.direction,
            resourceId: viaResourceId,
            resource: first.resource,
          },
          {
            relationship: second,
            direction: secondHop.direction,
            resourceId: farResourceId,
            resource: store.getResource(farResourceId),
          },
        ],
        viaResourceId,
        farResourceId,
      });
    }
  }

  paths.sort((left, right) => {
    const a = `${left.hops[0].relationship.id}\u0000${left.hops[1].relationship.id}`;
    const b = `${right.hops[0].relationship.id}\u0000${right.hops[1].relationship.id}`;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return paths;
}

/** Compose already-resolved current state with its canonical one-hop edges. */
export function getRelatedContextForResource(
  store: Store,
  resource: Resource,
): RelatedResourceContext {
  const relationships = store.listRelationshipsForResource(resource.id);
  const related: RelatedNeighbor[] = [];

  for (const relationship of relationships) {
    const hop = hopFrom(relationship, resource.id);
    if (!hop) continue;
    related.push({
      relationship,
      direction: hop.direction,
      resource: store.getResource(hop.neighborId),
    });
  }

  return {
    resource,
    related,
    paths: enumerateTwoHopPaths(store, resource.id, related),
    providerLastAttemptAt: lastAttemptAtByProvider(store.listProviders()),
  };
}

/**
 * Resolve one Resource and its directly related neighbors (one hop).
 * Reads local state only — no provider network calls.
 */
export function getRelatedContext(
  options: GetRelatedContextOptions,
): RelatedResourceContext {
  const ref = options.resourceRef.trim();
  if (!ref) {
    throw new CombieError(
      "RESOURCE_REF_REQUIRED",
      `Resource reference is required.\nUsage: ${BINARY_NAME} related <resource-id>\nExample: ${BINARY_NAME} related github:repository:1001\nList ids: ${BINARY_NAME} resources`,
    );
  }

  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) {
      throw notInitialized();
    }

    const resource = store.getResource(ref);
    if (!resource) {
      throw new CombieError(
        "RESOURCE_NOT_FOUND",
        `Resource not found: ${ref}\nUse a stable resource id (provider:kind:providerResourceId).\nList known resources: ${BINARY_NAME} resources`,
      );
    }

    return getRelatedContextForResource(store, resource);
  } finally {
    store.close();
  }
}

const PROVIDER_DISPLAY: Record<string, string> = {
  github: "GitHub",
  vercel: "Vercel",
  cloudflare: "Cloudflare",
  sentry: "Sentry",
  neon: "Neon",
  planetscale: "PlanetScale",
};

function providerLabel(provider: string): string {
  return (
    PROVIDER_DISPLAY[provider] ??
    provider.charAt(0).toUpperCase() + provider.slice(1)
  );
}

function resourceDisplayName(resource: Resource): string {
  const fullName = resource.metadata.fullName;
  if (typeof fullName === "string" && fullName.length > 0) {
    return fullName;
  }
  return resource.name;
}

function formatEvidence(relationship: Relationship): string {
  const e = relationship.evidence;
  const parts: string[] = [];
  if (e.source) parts.push(e.source);
  if (e.mechanism) parts.push(e.mechanism);
  const base = parts.join(" ");
  if (e.repository) {
    return base ? `${base} (${e.repository})` : e.repository;
  }
  if (e.apexName) {
    return base ? `${base} (${e.apexName})` : e.apexName;
  }
  if (e.githubRepoId) {
    return base ? `${base} (repoId ${e.githubRepoId})` : `repoId ${e.githubRepoId}`;
  }
  return base || "unknown";
}

function formatNeighborResource(resource: Resource | null, fallbackId: string): string {
  if (!resource) {
    return fallbackId;
  }
  return `${providerLabel(resource.provider)} ${resource.kind}: ${resourceDisplayName(resource)}`;
}

function formatPathHop(
  hop: RelatedPathHop,
  attempts: Readonly<Record<string, string | null>>,
): string {
  const directionLine =
    hop.direction === "outbound"
      ? `${hop.relationship.kind} →`
      : `← ${hop.relationship.kind}`;
  const neighborLine = formatNeighborResource(hop.resource, hop.resourceId);
  const evidenceLine = `Evidence: ${formatEvidence(hop.relationship)}`;
  const clocks = formatRelationshipClockLines(
    hop.relationship.updatedAt,
    lastRequiredProviderAttemptAt(hop.relationship.kind, attempts),
  );
  return `${directionLine}\n${neighborLine}\n${evidenceLine}\n${clocks}`;
}

export function formatRelatedPaths(ctx: RelatedResourceContext): string {
  if (ctx.paths.length === 0) return "";
  const blocks = ctx.paths.map((path) => {
    const hop1 = formatPathHop(path.hops[0], ctx.providerLastAttemptAt);
    const hop2 = formatPathHop(path.hops[1], ctx.providerLastAttemptAt);
    return (
      `${hop1}\n${hop2}\n` +
      `via ${path.viaResourceId}\n` +
      `(two stored Relationships; not a Relationship)`
    );
  });
  return `\n\nPATHS\n\n${blocks.join("\n\n")}`;
}

/** Compact human-readable related-context view. */
export function formatRelatedContext(ctx: RelatedResourceContext): string {
  const header =
    `${providerLabel(ctx.resource.provider)} ${ctx.resource.kind}\n` +
    `${resourceDisplayName(ctx.resource)}`;

  if (ctx.related.length === 0) {
    return (
      `${header}\n\n` +
      `No related resources discovered for this resource.\n` +
      `(Combie only shows relationships supported by current evidence.)` +
      formatRelatedPaths(ctx)
    );
  }

  const blocks = ctx.related.map((item) => {
    const kind = item.relationship.kind;
    const directionLine =
      item.direction === "outbound" ? `${kind} →` : `← ${kind}`;
    const neighborId =
      item.direction === "outbound"
        ? item.relationship.targetResourceId
        : item.relationship.sourceResourceId;
    const neighborLine = formatNeighborResource(item.resource, neighborId);
    const evidenceLine = `Evidence: ${formatEvidence(item.relationship)}`;
    const clocks = formatRelationshipClockLines(
      item.relationship.updatedAt,
      lastRequiredProviderAttemptAt(
        item.relationship.kind,
        ctx.providerLastAttemptAt,
      ),
    );
    return `${directionLine}\n${neighborLine}\n${evidenceLine}\n${clocks}`;
  });

  return `${header}\n\nRELATED\n\n${blocks.join("\n\n")}${formatRelatedPaths(ctx)}`;
}
