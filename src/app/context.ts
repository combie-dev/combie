import type { Change } from "../domain/change.ts";
import type { Relationship, RelationshipEvidence } from "../domain/relationship.ts";
import type { Resource } from "../domain/resource.ts";
import { Store } from "../storage/store.ts";
import { CombieError, notInitialized } from "./errors.ts";
import { BINARY_NAME } from "../cli/constants.ts";
import type { LastSuccessfulDiscovery } from "./discovery-membership.ts";
import {
  formatCurrentClockLines,
  type ProviderSyncClocks,
} from "./provider-sync-clocks.ts";
import { getResourceHistoryForResource } from "./history.ts";
import {
  getRelatedContextForResource,
  type RelatedNeighbor,
} from "./related.ts";

/** Derived, non-persistent facts Combie knows locally about one exact Resource. */
export interface ResourceContext {
  resource: Resource;
  related: RelatedNeighbor[];
  changes: Change[];
  providerSyncClocks: ProviderSyncClocks;
  lastSuccessfulDiscovery: LastSuccessfulDiscovery | null;
}

export interface GetResourceContextOptions {
  baseDir: string;
  /** Exact deterministic Combie Resource id. */
  resourceRef: string;
}

/**
 * Compose existing local Resource, one-hop Relationship, and target history
 * application reads. This performs no provider calls and persists no Context.
 */
export function getResourceContext(
  options: GetResourceContextOptions,
): ResourceContext {
  const resourceRef = options.resourceRef.trim();
  if (!resourceRef) {
    throw new CombieError(
      "RESOURCE_REF_REQUIRED",
      `Resource reference is required.\nUsage: ${BINARY_NAME} context <resource-id>\nExample: ${BINARY_NAME} context github:repository:1001\nList ids: ${BINARY_NAME} resources`,
    );
  }

  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();

    const resource = store.getResource(resourceRef);
    if (!resource) {
      throw new CombieError(
        "RESOURCE_NOT_FOUND",
        `Resource not found: ${resourceRef}\nUse a stable resource id (provider:kind:providerResourceId).\nList known resources: ${BINARY_NAME} resources`,
      );
    }

    const related = getRelatedContextForResource(store, resource);
    const history = getResourceHistoryForResource(store, resource);
    return {
      resource,
      related: related.related,
      changes: history.changes,
      providerSyncClocks: history.providerSyncClocks,
      lastSuccessfulDiscovery: history.lastSuccessfulDiscovery,
    };
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

function formatValue(value: unknown): string {
  if (value === undefined) return "(absent)";
  return JSON.stringify(value) ?? String(value);
}

function formatEvidence(evidence: RelationshipEvidence): string {
  const details = Object.entries(evidence)
    .filter(([key, value]) => {
      return key !== "source" && key !== "mechanism" && value !== undefined;
    })
    .sort(([left], [right]) => compareText(left, right))
    .map(([key, value]) => `${key}=${formatValue(value)}`);
  const base = [evidence.source, evidence.mechanism].filter(Boolean).join(" ");
  if (details.length === 0) return base || "unknown";
  return `${base || "unknown"} (${details.join("; ")})`;
}

function relationshipNeighborId(
  item: RelatedNeighbor,
): Relationship["sourceResourceId"] {
  return item.direction === "outbound"
    ? item.relationship.targetResourceId
    : item.relationship.sourceResourceId;
}

function formatRelatedNeighbor(item: RelatedNeighbor): string {
  const direction =
    item.direction === "outbound"
      ? `${item.relationship.kind} →`
      : `← ${item.relationship.kind}`;
  const neighborId = relationshipNeighborId(item);
  const identity = item.resource
    ? `${providerLabel(item.resource.provider)} ${item.resource.kind}: ${resourceDisplayName(item.resource)}`
    : neighborId;
  const stableId = item.resource ? `\n${item.resource.id}` : "";
  return (
    `${direction}\n` +
    `${identity}${stableId}\n` +
    `Evidence: ${formatEvidence(item.relationship.evidence)}`
  );
}

function formatChange(change: Change): string {
  const fields = change.fields
    .map(
      (field) =>
        `${field.path}\n  ${formatValue(field.before)} → ${formatValue(field.after)}`,
    )
    .join("\n");
  return `Observed: ${change.observedAt}\n${change.kind}\n${fields}`;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Compact CLI presentation over the derived application facts. */
export function formatResourceContext(context: ResourceContext): string {
  const resource = context.resource;
  const current =
    `${providerLabel(resource.provider)} ${resource.kind}: ${resourceDisplayName(resource)}\n` +
    `${resource.id}\n\n` +
    `CURRENT\n` +
    `provider  ${resource.provider}\n` +
    `kind      ${resource.kind}\n` +
    `name      ${formatValue(resource.name)}\n` +
    formatCurrentClockLines(
      resource,
      context.providerSyncClocks,
      context.lastSuccessfulDiscovery,
    );

  const related =
    context.related.length === 0
      ? "No relationships discovered yet."
      : context.related.map(formatRelatedNeighbor).join("\n\n");

  const changes =
    context.changes.length === 0
      ? "No changes recorded yet."
      : context.changes.map(formatChange).join("\n\n");

  return `${current}\n\nRELATED\n\n${related}\n\nCHANGES\n\n${changes}`;
}
