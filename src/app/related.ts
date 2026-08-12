import type { Resource } from "../domain/resource.ts";
import type { Relationship } from "../domain/relationship.ts";
import { Store } from "../storage/store.ts";
import { notInitialized, CombieError } from "./errors.ts";
import { BINARY_NAME } from "../cli/constants.ts";

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

export interface RelatedResourceContext {
  resource: Resource;
  related: RelatedNeighbor[];
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

/** Compose already-resolved current state with its canonical one-hop edges. */
export function getRelatedContextForResource(
  store: Store,
  resource: Resource,
): RelatedResourceContext {
  const relationships = store.listRelationshipsForResource(resource.id);
  const related: RelatedNeighbor[] = [];

  for (const relationship of relationships) {
    let direction: RelatedDirection;
    let neighborId: string;

    if (relationship.sourceResourceId === resource.id) {
      direction = "outbound";
      neighborId = relationship.targetResourceId;
    } else if (relationship.targetResourceId === resource.id) {
      direction = "inbound";
      neighborId = relationship.sourceResourceId;
    } else {
      // Defensive: query should only return touching edges
      continue;
    }

    related.push({
      relationship,
      direction,
      resource: store.getResource(neighborId),
    });
  }

  return { resource, related };
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

/** Compact human-readable related-context view. */
export function formatRelatedContext(ctx: RelatedResourceContext): string {
  const header =
    `${providerLabel(ctx.resource.provider)} ${ctx.resource.kind}\n` +
    `${resourceDisplayName(ctx.resource)}`;

  if (ctx.related.length === 0) {
    return (
      `${header}\n\n` +
      `No related resources discovered for this resource.\n` +
      `(Combie only shows relationships supported by current evidence.)`
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
    return `${directionLine}\n${neighborLine}\n${evidenceLine}`;
  });

  return `${header}\n\nRELATED\n\n${blocks.join("\n\n")}`;
}
