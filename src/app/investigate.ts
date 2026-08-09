import type { Change } from "../domain/change.ts";
import type {
  Relationship,
  RelationshipEvidence,
} from "../domain/relationship.ts";
import type { Resource } from "../domain/resource.ts";
import { Store } from "../storage/store.ts";
import { CombieError, notInitialized } from "./errors.ts";
import { getResourceHistoryForResource } from "./history.ts";
import {
  getRelatedContextForResource,
  type RelatedDirection,
  type RelatedNeighbor,
} from "./related.ts";
import {
  composeInvestigationTimeline,
  type InvestigationTimelineEntry,
} from "./timeline.ts";

/**
 * One-hop neighbor under investigation: the canonical Relationship, direction
 * from the subject's perspective, the neighbor Resource when present, and that
 * neighbor's full Change history (independently ordered).
 */
export interface InvestigationNeighbor {
  relationship: Relationship;
  direction: RelatedDirection;
  /** Neighbor Resource when still present; null if the edge is dangling. */
  resource: Resource | null;
  /** Full Change history for the neighbor; empty when missing or zero history. */
  changes: Change[];
}

/**
 * Ephemeral, non-persistent composition of what Combie already knows around
 * one exact Resource. One hop only — no graph traversal or inference.
 */
export interface InvestigationContext {
  subject: Resource;
  subjectChanges: Change[];
  related: InvestigationNeighbor[];
}

export interface GetInvestigationContextOptions {
  baseDir: string;
  /** Exact deterministic Combie Resource id. */
  resourceRef: string;
}

/**
 * Compose investigation context from local Resource, Relationship, and Change
 * memory. Performs no provider calls, infers no Relationships, and persists
 * nothing.
 */
export function getInvestigationContext(
  options: GetInvestigationContextOptions,
): InvestigationContext {
  const resourceRef = options.resourceRef.trim();
  if (!resourceRef) {
    throw new CombieError(
      "RESOURCE_REF_REQUIRED",
      "Resource reference is required.\nUsage: combie investigate <resource-id>\nExample: combie investigate vercel:project:prj_abc\nList ids: combie resources",
    );
  }

  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();

    const subject = store.getResource(resourceRef);
    if (!subject) {
      throw new CombieError(
        "RESOURCE_NOT_FOUND",
        `Resource not found: ${resourceRef}\nUse a stable resource id (provider:kind:providerResourceId).\nList known resources: combie resources`,
      );
    }

    return getInvestigationContextForResource(store, subject);
  } finally {
    store.close();
  }
}

/**
 * Compose investigation context for an already-resolved subject Resource.
 * Reuses one-hop related-context and per-Resource history reads.
 */
export function getInvestigationContextForResource(
  store: Store,
  subject: Resource,
): InvestigationContext {
  const subjectHistory = getResourceHistoryForResource(store, subject);
  const relatedContext = getRelatedContextForResource(store, subject);

  const related: InvestigationNeighbor[] = relatedContext.related.map(
    (neighbor: RelatedNeighbor) => ({
      relationship: neighbor.relationship,
      direction: neighbor.direction,
      resource: neighbor.resource,
      changes: neighbor.resource
        ? getResourceHistoryForResource(store, neighbor.resource).changes
        : [],
    }),
  );

  return {
    subject,
    subjectChanges: subjectHistory.changes,
    related,
  };
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

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
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

function formatChange(change: Change): string {
  const fields = change.fields
    .map(
      (field) =>
        `${field.path}\n  ${formatValue(field.before)} → ${formatValue(field.after)}`,
    )
    .join("\n");
  return `Observed: ${change.observedAt}\n${change.kind}\n${fields}`;
}

function formatChangesBlock(changes: Change[]): string {
  if (changes.length === 0) {
    return "No changes recorded yet.";
  }
  return changes.map(formatChange).join("\n\n");
}

function neighborId(item: InvestigationNeighbor): string {
  return item.direction === "outbound"
    ? item.relationship.targetResourceId
    : item.relationship.sourceResourceId;
}

function formatRelatedNeighbor(item: InvestigationNeighbor): string {
  const direction =
    item.direction === "outbound"
      ? `${item.relationship.kind} →`
      : `← ${item.relationship.kind}`;
  const id = neighborId(item);
  const identity = item.resource
    ? `${providerLabel(item.resource.provider)} ${item.resource.kind}: ${resourceDisplayName(item.resource)}`
    : id;
  const stableId = item.resource ? `\n${item.resource.id}` : "\n(missing resource)";
  return (
    `${direction}\n` +
    `${identity}${stableId}\n` +
    `Evidence: ${formatEvidence(item.relationship.evidence)}\n\n` +
    `CHANGES\n\n${formatChangesBlock(item.changes)}`
  );
}

function formatTimelineEntry(entry: InvestigationTimelineEntry): string {
  const identity = `${providerLabel(entry.resource.provider)} ${entry.resource.kind}: ${resourceDisplayName(entry.resource)}`;
  const role = `Role: ${entry.role}`;
  const provenance = entry.relationships
    .map(
      ({ relationship, direction }) =>
        `Relationship: ${relationship.kind} (${direction})\n` +
        `Relationship ID: ${relationship.id}\n` +
        `Evidence: ${formatEvidence(relationship.evidence)}`,
    )
    .join("\n");
  const relationshipBlock = provenance ? `\n${provenance}` : "";
  return (
    `${identity}\n` +
    `ID: ${entry.resource.id}\n` +
    `${role}${relationshipBlock}\n` +
    `Change ID: ${entry.change.id}\n` +
    `${formatChange(entry.change)}`
  );
}

function formatTimeline(context: InvestigationContext): string {
  const timeline = composeInvestigationTimeline(context);
  if (timeline.entries.length === 0) {
    return "No changes recorded in this context yet.";
  }
  return timeline.entries.map(formatTimelineEntry).join("\n\n");
}

/** Deterministic CLI presentation of investigation context. */
export function formatInvestigationContext(
  context: InvestigationContext,
): string {
  const subject = context.subject;
  const header =
    `SUBJECT\n` +
    `${providerLabel(subject.provider)} ${subject.kind}: ${resourceDisplayName(subject)}\n` +
    `ID: ${subject.id}\n\n` +
    `CURRENT\n` +
    `provider  ${subject.provider}\n` +
    `kind      ${subject.kind}\n` +
    `name      ${formatValue(subject.name)}`;

  const subjectChanges =
    `SUBJECT CHANGES\n\n${formatChangesBlock(context.subjectChanges)}`;

  const related =
    context.related.length === 0
      ? "No relationships discovered."
      : context.related.map(formatRelatedNeighbor).join("\n\n");

  return (
    `${header}\n\n` +
    `${subjectChanges}\n\n` +
    `RELATED CONTEXT\n\n${related}\n\n` +
    `TIMELINE (newest first)\n\n${formatTimeline(context)}`
  );
}
