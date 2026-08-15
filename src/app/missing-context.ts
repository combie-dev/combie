import type { Relationship } from "../domain/relationship.ts";
import type { DeploymentEvidenceAuthority } from "../providers/vercel/deployment.ts";
import type { WorkflowRunEvidenceAuthority } from "../providers/github/workflow-run.ts";
import type { NeonOperationEvidenceAuthority } from "../providers/neon/operation.ts";
import type { ReleaseEvidenceAuthority } from "../providers/sentry/release.ts";
import type { InvestigationContext } from "./investigate.ts";
import type { ProviderActivityFamily } from "./provider-activity.ts";
import type { RelatedDirection } from "./related.ts";

/**
 * One-hop Relationship path that brought a neighbor into investigation scope.
 * Provenance only — not a recommendation.
 */
export interface MissingContextRelationshipRef {
  relationshipId: string;
  kind: Relationship["kind"];
  direction: RelatedDirection;
  sourceResourceId: string;
  targetResourceId: string;
}

export type MissingContextScopeRef =
  | {
      resourceId: string;
      role: "subject";
      relationships: [];
    }
  | {
      resourceId: string;
      role: "related";
      relationships: MissingContextRelationshipRef[];
    };

/**
 * Ephemeral, deterministic inventory of context Combie cannot currently
 * establish or trust within the bounded investigation scope.
 *
 * Not a problem list, priority ranking, or recommendation surface.
 */
export type MissingContextItem =
  | {
      kind: "never_successfully_refreshed";
      family: ProviderActivityFamily;
      provider: "vercel" | "github" | "neon" | "sentry";
      scope: MissingContextScopeRef;
      retainedCount: number;
      latestAttemptObservedAt: string | null;
      message: string | null;
    }
  | {
      kind: "unknown_current_authority";
      family: ProviderActivityFamily;
      provider: "vercel" | "github" | "neon" | "sentry";
      scope: MissingContextScopeRef;
      retainedCount: number;
      latestAttemptObservedAt: string | null;
      lastSuccessfulObservedAt: string | null;
      lastSuccessfulResultCount: number | null;
      message: string | null;
    }
  | {
      kind: "no_known_relationships";
      scope: {
        resourceId: string;
        role: "subject";
        relationships: [];
      };
    };

interface MutableRelatedSource {
  resourceId: string;
  relationships: MissingContextRelationshipRef[];
  deployments: DeploymentEvidenceAuthority;
  workflowRuns: WorkflowRunEvidenceAuthority;
  operations: NeonOperationEvidenceAuthority;
  releases: ReleaseEvidenceAuthority;
}

function compareAscending(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareRelationshipRef(
  left: MissingContextRelationshipRef,
  right: MissingContextRelationshipRef,
): number {
  return (
    compareAscending(left.relationshipId, right.relationshipId) ||
    compareAscending(left.direction, right.direction) ||
    compareAscending(left.kind, right.kind) ||
    compareAscending(left.sourceResourceId, right.sourceResourceId) ||
    compareAscending(left.targetResourceId, right.targetResourceId)
  );
}

function normalizeRelationshipRefs(
  refs: MissingContextRelationshipRef[],
): MissingContextRelationshipRef[] {
  const unique = new Map<string, MissingContextRelationshipRef>();
  for (const ref of refs) {
    const key = `${ref.relationshipId}\u0000${ref.direction}`;
    unique.set(key, unique.get(key) ?? ref);
  }
  return [...unique.values()].sort(compareRelationshipRef);
}

function relationshipRef(
  relationship: Relationship,
  direction: RelatedDirection,
): MissingContextRelationshipRef {
  return {
    relationshipId: relationship.id,
    kind: relationship.kind,
    direction,
    sourceResourceId: relationship.sourceResourceId,
    targetResourceId: relationship.targetResourceId,
  };
}

function familyOrder(family: ProviderActivityFamily): number {
  // Stable organizational order — not importance.
  if (family === "github_workflow_run") return 0;
  if (family === "neon_operation") return 1;
  if (family === "sentry_release") return 2;
  return 3;
}

function compareItems(left: MissingContextItem, right: MissingContextItem): number {
  const category = (item: MissingContextItem): number => {
    if (item.kind === "never_successfully_refreshed") return 0;
    if (item.kind === "unknown_current_authority") return 1;
    return 2; // no_known_relationships last among implemented categories
  };
  const byCategory = category(left) - category(right);
  if (byCategory !== 0) return byCategory;

  if (
    left.kind === "no_known_relationships" ||
    right.kind === "no_known_relationships"
  ) {
    return compareAscending(left.scope.resourceId, right.scope.resourceId);
  }

  const byResource = compareAscending(left.scope.resourceId, right.scope.resourceId);
  if (byResource !== 0) return byResource;

  const byFamily =
    familyOrder(
      (left as Exclude<MissingContextItem, { kind: "no_known_relationships" }>)
        .family,
    ) -
    familyOrder(
      (right as Exclude<MissingContextItem, { kind: "no_known_relationships" }>)
        .family,
    );
  if (byFamily !== 0) return byFamily;

  return compareAscending(left.scope.role, right.scope.role);
}

/**
 * True when last-success time or result-count provenance proves a prior
 * successful refresh. Distinct from retained local rows alone.
 */
function hasLastSuccessProvenance(
  lastSuccessAt: string | null,
  resultCount: number | null | undefined,
): boolean {
  if (lastSuccessAt != null) return true;
  if (resultCount != null) return true;
  return false;
}

function deploymentRetainedCount(
  authority: Exclude<DeploymentEvidenceAuthority, { kind: "not_applicable" }>,
): number {
  return authority.deployments.length;
}

function runRetainedCount(
  authority: Exclude<WorkflowRunEvidenceAuthority, { kind: "not_applicable" }>,
): number {
  return authority.runs.length;
}

function operationRetainedCount(
  authority: Exclude<NeonOperationEvidenceAuthority, { kind: "not_applicable" }>,
): number {
  return authority.operations.length;
}

function pushDeploymentGap(
  items: MissingContextItem[],
  authority: DeploymentEvidenceAuthority,
  scope: MissingContextScopeRef,
): void {
  if (authority.kind === "not_applicable") return;
  // Known empty / populated are knowledge, not missing context.
  if (authority.kind === "empty" || authority.kind === "populated") return;
  if (authority.kind !== "unknown") return;

  const retainedCount = deploymentRetainedCount(authority);
  const prior = hasLastSuccessProvenance(
    authority.lastSuccessAt,
    authority.resultCount,
  );
  if (!prior) {
    items.push({
      kind: "never_successfully_refreshed",
      family: "vercel_deployment",
      provider: "vercel",
      scope,
      retainedCount,
      latestAttemptObservedAt: authority.latestAttemptObservedAt,
      message: authority.message,
    });
    return;
  }
  items.push({
    kind: "unknown_current_authority",
    family: "vercel_deployment",
    provider: "vercel",
    scope,
    retainedCount,
    latestAttemptObservedAt: authority.latestAttemptObservedAt,
    lastSuccessfulObservedAt: authority.lastSuccessAt,
    lastSuccessfulResultCount: authority.resultCount,
    message: authority.message,
  });
}

function pushWorkflowGap(
  items: MissingContextItem[],
  authority: WorkflowRunEvidenceAuthority,
  scope: MissingContextScopeRef,
): void {
  if (authority.kind === "not_applicable") return;
  if (authority.kind === "empty" || authority.kind === "populated") return;
  if (authority.kind !== "unknown") return;

  const retainedCount = runRetainedCount(authority);
  const prior = hasLastSuccessProvenance(
    authority.lastSuccessAt,
    authority.resultCount,
  );
  if (!prior) {
    items.push({
      kind: "never_successfully_refreshed",
      family: "github_workflow_run",
      provider: "github",
      scope,
      retainedCount,
      latestAttemptObservedAt: authority.latestAttemptObservedAt,
      message: authority.message,
    });
    return;
  }
  items.push({
    kind: "unknown_current_authority",
    family: "github_workflow_run",
    provider: "github",
    scope,
    retainedCount,
    latestAttemptObservedAt: authority.latestAttemptObservedAt,
    lastSuccessfulObservedAt: authority.lastSuccessAt,
    lastSuccessfulResultCount: authority.resultCount,
    message: authority.message,
  });
}

function releaseRetainedCount(
  authority: Exclude<ReleaseEvidenceAuthority, { kind: "not_applicable" }>,
): number {
  return authority.releases.length;
}

function pushReleaseGap(
  items: MissingContextItem[],
  authority: ReleaseEvidenceAuthority,
  scope: MissingContextScopeRef,
): void {
  if (authority.kind === "not_applicable") return;
  if (authority.kind === "empty" || authority.kind === "populated") return;
  if (authority.kind !== "unknown") return;

  const retainedCount = releaseRetainedCount(authority);
  const prior = hasLastSuccessProvenance(
    authority.lastSuccessAt,
    authority.resultCount,
  );
  if (!prior) {
    items.push({
      kind: "never_successfully_refreshed",
      family: "sentry_release",
      provider: "sentry",
      scope,
      retainedCount,
      latestAttemptObservedAt: authority.latestAttemptObservedAt,
      message: authority.message,
    });
    return;
  }
  items.push({
    kind: "unknown_current_authority",
    family: "sentry_release",
    provider: "sentry",
    scope,
    retainedCount,
    latestAttemptObservedAt: authority.latestAttemptObservedAt,
    lastSuccessfulObservedAt: authority.lastSuccessAt,
    lastSuccessfulResultCount: authority.resultCount,
    message: authority.message,
  });
}

function pushOperationGap(
  items: MissingContextItem[],
  authority: NeonOperationEvidenceAuthority,
  scope: MissingContextScopeRef,
): void {
  if (authority.kind === "not_applicable") return;
  if (authority.kind === "empty" || authority.kind === "populated") return;
  if (authority.kind !== "unknown") return;

  const retainedCount = operationRetainedCount(authority);
  // Neon unknown DTO has no resultCount; lastSuccessAt is the success-time signal.
  const prior = hasLastSuccessProvenance(authority.lastSuccessAt, null);
  if (!prior) {
    items.push({
      kind: "never_successfully_refreshed",
      family: "neon_operation",
      provider: "neon",
      scope,
      retainedCount,
      latestAttemptObservedAt: authority.latestAttemptObservedAt,
      message: authority.message,
    });
    return;
  }
  items.push({
    kind: "unknown_current_authority",
    family: "neon_operation",
    provider: "neon",
    scope,
    retainedCount,
    latestAttemptObservedAt: authority.latestAttemptObservedAt,
    lastSuccessfulObservedAt: authority.lastSuccessAt,
    // Neon failure path nulls result_count; do not invent a count.
    lastSuccessfulResultCount: null,
    message: authority.message,
  });
}

function subjectScope(resourceId: string): MissingContextScopeRef {
  return { resourceId, role: "subject", relationships: [] };
}

function relatedScope(
  resourceId: string,
  relationships: MissingContextRelationshipRef[],
): MissingContextScopeRef {
  return {
    resourceId,
    role: "related",
    relationships: normalizeRelationshipRefs(relationships),
  };
}

/**
 * Pure, deterministic, offline projection of supported missing/untrusted
 * context for the subject and its one-hop neighbors.
 *
 * Exhaustive for the supported taxonomy within one-hop scope — not capped by
 * MAX_INVESTIGATION_FACTS. Does not query providers, mutate storage, rank,
 * score, correlate, or recommend inspection.
 */
export function composeMissingContext(
  context: InvestigationContext,
): MissingContextItem[] {
  const items: MissingContextItem[] = [];

  const subjectScopeRef = subjectScope(context.subject.id);
  pushDeploymentGap(items, context.subjectDeployments, subjectScopeRef);
  pushWorkflowGap(items, context.subjectWorkflowRuns, subjectScopeRef);
  pushOperationGap(items, context.subjectOperations, subjectScopeRef);
  pushReleaseGap(items, context.subjectReleases, subjectScopeRef);

  const relatedById = new Map<string, MutableRelatedSource>();
  for (const neighbor of context.related) {
    if (!neighbor.resource || neighbor.resource.id === context.subject.id) {
      continue;
    }
    const resourceId = neighbor.resource.id;
    const existing = relatedById.get(resourceId);
    const path = relationshipRef(neighbor.relationship, neighbor.direction);
    if (existing) {
      existing.relationships.push(path);
      continue;
    }
    relatedById.set(resourceId, {
      resourceId,
      relationships: [path],
      deployments: neighbor.deployments,
      workflowRuns: neighbor.workflowRuns,
      operations: neighbor.operations,
      releases: neighbor.releases,
    });
  }

  const relatedSources = [...relatedById.values()].sort((left, right) =>
    compareAscending(left.resourceId, right.resourceId)
  );
  for (const source of relatedSources) {
    const scope = relatedScope(source.resourceId, source.relationships);
    pushDeploymentGap(items, source.deployments, scope);
    pushWorkflowGap(items, source.workflowRuns, scope);
    pushOperationGap(items, source.operations, scope);
    pushReleaseGap(items, source.releases, scope);
  }

  // Combie graph knowledge only — does not claim external systems have no edges.
  if (context.related.length === 0) {
    items.push({
      kind: "no_known_relationships",
      scope: {
        resourceId: context.subject.id,
        role: "subject",
        relationships: [],
      },
    });
  }

  return items.sort(compareItems);
}

/** Family display name for CLI/facts-style wording. */
export function missingContextFamilyName(family: ProviderActivityFamily): string {
  if (family === "vercel_deployment") return "Vercel deployment";
  if (family === "github_workflow_run") return "GitHub workflow-run";
  if (family === "sentry_release") return "Sentry release";
  return "Neon operation";
}

/**
 * Render one structured Missing Context item as a single CLI line body
 * (without the leading bullet). Pure formatting over structured fields.
 */
export function formatMissingContextItem(item: MissingContextItem): string {
  if (item.kind === "no_known_relationships") {
    return (
      `No one-hop Relationships are currently known to Combie for ` +
      `${item.scope.resourceId}.`
    );
  }

  const family = missingContextFamilyName(item.family);
  const resourceId = item.scope.resourceId;
  const path =
    item.scope.role === "related" && item.scope.relationships.length > 0
      ? ` (via ${item.scope.relationships.map((r) => r.kind).sort().join(", ")})`
      : "";

  if (item.kind === "never_successfully_refreshed") {
    const retained =
      item.retainedCount > 0
        ? `; ${item.retainedCount} previously recorded ` +
          `${item.retainedCount === 1 ? "row is" : "rows are"} retained locally` +
          ` and must not be treated as a successful current refresh`
        : "";
    return (
      `${family} evidence has not yet been successfully refreshed for ` +
      `${resourceId}${path}${retained}.`
    );
  }

  // unknown_current_authority
  const lastSuccess =
    item.lastSuccessfulObservedAt != null
      ? ` last successful refresh at ${item.lastSuccessfulObservedAt}`
      : item.lastSuccessfulResultCount != null
        ? " last successful refresh"
        : "";
  const countPart =
    item.lastSuccessfulResultCount != null
      ? ` returned ${item.lastSuccessfulResultCount}` +
        (item.family === "github_workflow_run" &&
        item.lastSuccessfulResultCount === 100
          ? " (bounded)"
          : "") +
        " record" +
        (item.lastSuccessfulResultCount === 1 ? "" : "s")
      : "";
  const retained =
    item.retainedCount > 0
      ? `; ${item.retainedCount} previously recorded ` +
        `${item.retainedCount === 1 ? "row remains" : "rows remain"} retained locally`
      : "";
  const prior =
    lastSuccess !== "" || countPart !== ""
      ? `; the${lastSuccess}${countPart}`
      : "";
  return (
    `${family} evidence is currently unknown for ${resourceId}${path}` +
    `${prior}${retained}.`
  );
}
