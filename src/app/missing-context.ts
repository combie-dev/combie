import type { Relationship } from "../domain/relationship.ts";
import type { DeploymentEvidenceAuthority } from "../providers/vercel/deployment.ts";
import type { WorkflowRunEvidenceAuthority } from "../providers/github/workflow-run.ts";
import type { NeonOperationEvidenceAuthority } from "../providers/neon/operation.ts";
import type { IssueEvidenceAuthority } from "../providers/sentry/issue.ts";
import type { ReleaseEvidenceAuthority } from "../providers/sentry/release.ts";
import {
  composeCodeMappingAuthority,
  parseCodeMappings,
} from "../providers/sentry/code-mapping.ts";
import type { InvestigationContext } from "./investigate.ts";
import { composeSharedCommitContext } from "./shared-commit-context.ts";
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
    }
  | {
      kind: "no_deterministic_release_issue_linkage";
      scope: {
        resourceId: string;
        role: "subject";
        relationships: [];
      };
      releaseCount: number;
      issueCount: number;
    }
  | {
      kind: "code_mapping_refresh_unknown";
      scope: {
        resourceId: string;
        role: "subject";
        relationships: [];
      };
      retainedCount: number;
      latestAttemptObservedAt: string | null;
      lastSuccessfulObservedAt: string | null;
      message: string | null;
    }
  | {
      kind: "code_mapping_unmatched_repository";
      scope: {
        resourceId: string;
        role: "subject";
        relationships: [];
      };
      repositories: string[];
    }
  | {
      kind: "code_mapped_to_without_shared_commit";
      scope: {
        resourceId: string;
        role: "subject";
        relationships: [];
      };
      relationshipId: string;
      sourceResourceId: string;
      targetResourceId: string;
    };

interface MutableRelatedSource {
  resourceId: string;
  relationships: MissingContextRelationshipRef[];
  deployments: DeploymentEvidenceAuthority;
  workflowRuns: WorkflowRunEvidenceAuthority;
  operations: NeonOperationEvidenceAuthority;
  releases: ReleaseEvidenceAuthority;
  issues: IssueEvidenceAuthority;
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
  if (family === "sentry_issue") return 2;
  if (family === "sentry_release") return 3;
  return 4;
}

function compareItems(left: MissingContextItem, right: MissingContextItem): number {
  const category = (item: MissingContextItem): number => {
    if (item.kind === "never_successfully_refreshed") return 0;
    if (item.kind === "unknown_current_authority") return 1;
    if (item.kind === "code_mapping_refresh_unknown") return 2;
    if (item.kind === "no_deterministic_release_issue_linkage") return 3;
    if (item.kind === "code_mapped_to_without_shared_commit") return 4;
    if (item.kind === "code_mapping_unmatched_repository") return 5;
    return 6; // no_known_relationships last among implemented categories
  };
  const byCategory = category(left) - category(right);
  if (byCategory !== 0) return byCategory;

  if (
    left.kind === "no_known_relationships" ||
    right.kind === "no_known_relationships" ||
    left.kind === "no_deterministic_release_issue_linkage" ||
    right.kind === "no_deterministic_release_issue_linkage" ||
    left.kind === "code_mapping_refresh_unknown" ||
    right.kind === "code_mapping_refresh_unknown" ||
    left.kind === "code_mapping_unmatched_repository" ||
    right.kind === "code_mapping_unmatched_repository" ||
    left.kind === "code_mapped_to_without_shared_commit" ||
    right.kind === "code_mapped_to_without_shared_commit"
  ) {
    return compareAscending(left.scope.resourceId, right.scope.resourceId);
  }

  const byResource = compareAscending(left.scope.resourceId, right.scope.resourceId);
  if (byResource !== 0) return byResource;

  const byFamily =
    familyOrder(
      (
        left as Exclude<
          MissingContextItem,
          | { kind: "no_known_relationships" }
          | { kind: "no_deterministic_release_issue_linkage" }
          | { kind: "code_mapping_refresh_unknown" }
          | { kind: "code_mapping_unmatched_repository" }
          | { kind: "code_mapped_to_without_shared_commit" }
        >
      ).family,
    ) -
    familyOrder(
      (
        right as Exclude<
          MissingContextItem,
          | { kind: "no_known_relationships" }
          | { kind: "no_deterministic_release_issue_linkage" }
          | { kind: "code_mapping_refresh_unknown" }
          | { kind: "code_mapping_unmatched_repository" }
          | { kind: "code_mapped_to_without_shared_commit" }
        >
      ).family,
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

function issueRetainedCount(
  authority: Exclude<IssueEvidenceAuthority, { kind: "not_applicable" }>,
): number {
  return authority.issues.length;
}

function pushIssueGap(
  items: MissingContextItem[],
  authority: IssueEvidenceAuthority,
  scope: MissingContextScopeRef,
): void {
  if (authority.kind === "not_applicable") return;
  if (authority.kind === "empty" || authority.kind === "populated") return;
  if (authority.kind !== "unknown") return;

  const retainedCount = issueRetainedCount(authority);
  const prior = hasLastSuccessProvenance(
    authority.lastSuccessAt,
    authority.resultCount,
  );
  if (!prior) {
    items.push({
      kind: "never_successfully_refreshed",
      family: "sentry_issue",
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
    family: "sentry_issue",
    provider: "sentry",
    scope,
    retainedCount,
    latestAttemptObservedAt: authority.latestAttemptObservedAt,
    lastSuccessfulObservedAt: authority.lastSuccessAt,
    lastSuccessfulResultCount: authority.resultCount,
    message: authority.message,
  });
}

function retainedEvidenceCount(
  authority: ReleaseEvidenceAuthority | IssueEvidenceAuthority,
): number {
  if (authority.kind === "not_applicable") return 0;
  if ("releases" in authority) return authority.releases.length;
  return authority.issues.length;
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
  pushIssueGap(items, context.subjectIssues, subjectScopeRef);

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
      issues: neighbor.issues,
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
    pushIssueGap(items, source.issues, scope);
  }

  const subjectReleaseCount = retainedEvidenceCount(context.subjectReleases);
  const subjectIssueCount = retainedEvidenceCount(context.subjectIssues);
  if (subjectReleaseCount > 0 && subjectIssueCount > 0) {
    items.push({
      kind: "no_deterministic_release_issue_linkage",
      scope: {
        resourceId: context.subject.id,
        role: "subject",
        relationships: [],
      },
      releaseCount: subjectReleaseCount,
      issueCount: subjectIssueCount,
    });
  }

  const mappingAuthority = composeCodeMappingAuthority(context.subject);
  if (mappingAuthority.kind === "unknown") {
    items.push({
      kind: "code_mapping_refresh_unknown",
      scope: {
        resourceId: context.subject.id,
        role: "subject",
        relationships: [],
      },
      retainedCount: mappingAuthority.mappings.length,
      latestAttemptObservedAt: mappingAuthority.latestAttemptObservedAt,
      lastSuccessfulObservedAt: mappingAuthority.lastSuccessAt,
      message: mappingAuthority.message,
    });
  } else if (mappingAuthority.kind === "populated") {
    const hasCodeMappedEdge = context.related.some(
      (neighbor) => neighbor.relationship.kind === "code_mapped_to",
    );
    if (!hasCodeMappedEdge) {
      const mappings =
        parseCodeMappings(context.subject.metadata.codeMappings) ?? [];
      const repositories = [
        ...new Set(mappings.map((m) => m.repository)),
      ].sort();
      items.push({
        kind: "code_mapping_unmatched_repository",
        scope: {
          resourceId: context.subject.id,
          role: "subject",
          relationships: [],
        },
        repositories,
      });
    }
  }

  // Sprint 046: a proven code_mapped_to edge without a two-sided full commit
  // SHA is truthful Missing Context. One item per distinct edge; a shared
  // group for that edge closes it.
  const mappingEdges = context.related
    .filter((neighbor) => neighbor.relationship.kind === "code_mapped_to")
    .map((neighbor) => neighbor.relationship)
    .sort((left, right) => compareAscending(left.id, right.id));
  const seenEdges = new Set<string>();
  const edgesWithoutGroup = [];
  for (const edge of mappingEdges) {
    if (seenEdges.has(edge.id)) continue;
    seenEdges.add(edge.id);
    edgesWithoutGroup.push(edge);
  }
  const sharedGroups = composeSharedCommitContext(context).filter(
    (group) => group.relationshipKind === "code_mapped_to",
  );
  const groupedRelationshipIds = new Set(
    sharedGroups.map((group) => group.relationshipId),
  );
  for (const edge of edgesWithoutGroup) {
    if (groupedRelationshipIds.has(edge.id)) continue;
    items.push({
      kind: "code_mapped_to_without_shared_commit",
      scope: {
        resourceId: context.subject.id,
        role: "subject",
        relationships: [],
      },
      relationshipId: edge.id,
      sourceResourceId: edge.sourceResourceId,
      targetResourceId: edge.targetResourceId,
    });
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
  if (family === "sentry_issue") return "Sentry issue";
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

  if (item.kind === "no_deterministic_release_issue_linkage") {
    return (
      `No deterministic evidence currently proves a Sentry release caused a ` +
      `Sentry issue for ${item.scope.resourceId} ` +
      `(${item.releaseCount} release${item.releaseCount === 1 ? "" : "s"}, ` +
      `${item.issueCount} issue${item.issueCount === 1 ? "" : "s"} retained).`
    );
  }

  if (item.kind === "code_mapping_refresh_unknown") {
    const retained =
      item.retainedCount > 0
        ? `; ${item.retainedCount} previously recorded ` +
          `code mapping${item.retainedCount === 1 ? "" : "s"} ` +
          `${item.retainedCount === 1 ? "is" : "are"} retained locally ` +
          `and must not be treated as a successful current refresh`
        : "";
    return (
      `Sentry code-mapping evidence has not been successfully refreshed ` +
      `for ${item.scope.resourceId}${retained}.`
    );
  }

  if (item.kind === "code_mapping_unmatched_repository") {
    const listed =
      item.repositories.length > 0
        ? ` (${item.repositories.join(", ")})`
        : "";
    return (
      `Sentry reports a code mapping, but Combie has no matching ` +
      `GitHub repository Resource for ${item.scope.resourceId}${listed}.`
    );
  }

  if (item.kind === "code_mapped_to_without_shared_commit") {
    return (
      `A code_mapped_to relationship exists (${item.relationshipId}), ` +
      `but no full Git commit SHA is currently held on both a GitHub ` +
      `workflow run and a Sentry release.`
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
