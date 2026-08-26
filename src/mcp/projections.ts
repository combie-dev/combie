import {
  composeInvestigationFacts,
  type InvestigationFact,
} from "../app/investigation-facts.ts";
import type { ResourceContext } from "../app/context.ts";
import type {
  InvestigationContext,
  InvestigationNeighbor,
} from "../app/investigate.ts";
import type {
  DependencyImpactNeighbor,
  OnDemandTarget,
  TaskScopedContext,
} from "../app/task-context.ts";
import type {
  InvestigationArtifact,
  SavedInvestigation,
} from "../app/investigations.ts";
import {
  composeMissingContext,
  noKnownRelationshipsMissingContext,
  type MissingContextItem,
} from "../app/missing-context.ts";
import {
  composeProviderActivityChronology,
  type ProviderActivityChronology,
} from "../app/provider-activity.ts";
import type {
  RelatedPath,
  RelatedResourceContext,
} from "../app/related.ts";
import { lastRequiredProviderAttemptAt } from "../app/relationship-verification-clocks.ts";
import {
  composeSharedCommitContext,
  composeSharedCommitCorrespondences,
} from "../app/shared-commit-context.ts";
import {
  composeInvestigationTimeline,
  type InvestigationTimeline,
} from "../app/timeline.ts";
import type { Change } from "../domain/change.ts";
import type { IncidentRecord } from "../domain/incident.ts";
import type { InvestigationRecord } from "../domain/investigation.ts";
import type {
  Relationship,
  RelationshipKind,
} from "../domain/relationship.ts";
import type { ResolutionRecord } from "../domain/resolution.ts";
import type { Resource } from "../domain/resource.ts";
import type { ProviderRecord } from "../storage/store.ts";

function relationshipVerificationClockFields(
  kind: RelationshipKind,
  lastVerifiedAt: string,
  attempts: Readonly<Record<string, string | null | undefined>>,
) {
  const lastRequired = lastRequiredProviderAttemptAt(kind, attempts);
  return {
    lastVerifiedAt,
    ...(lastRequired != null
      ? { lastRequiredProviderAttemptAt: lastRequired }
      : {}),
  };
}

export function toResolutionMemoryRow(
  record: ResolutionRecord,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: record.id,
    recordedAt: record.recordedAt,
  };
  if (record.investigationId !== undefined) {
    row.investigationId = record.investigationId;
  }
  if (record.decision !== undefined) row.decision = record.decision;
  if (record.action !== undefined) row.action = record.action;
  if (record.outcome !== undefined) row.outcome = record.outcome;
  if (record.evidenceIds !== undefined) row.evidenceIds = record.evidenceIds;
  return row;
}

export function toResolutionMemory(records: ResolutionRecord[]) {
  return records.map(toResolutionMemoryRow);
}

export function toIncidentMemoryRow(
  record: IncidentRecord,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: record.id,
    recordedAt: record.recordedAt,
    resolutionIds: record.resolutionIds,
  };
  if (record.title !== undefined) row.title = record.title;
  if (record.occurredAt !== undefined) row.occurredAt = record.occurredAt;
  return row;
}

export function toIncidentMemory(records: IncidentRecord[]) {
  return records.map(toIncidentMemoryRow);
}

export function toInvestigationHistoryRow(
  record: InvestigationRecord,
): Record<string, unknown> {
  return {
    id: record.id,
    composedAt: record.composedAt,
  };
}

export function toInvestigationHistory(records: InvestigationRecord[]) {
  return records.map(toInvestigationHistoryRow);
}

export function projectInvestigationSnapshot(
  record: SavedInvestigation,
): Record<string, unknown> {
  return {
    id: record.id,
    subjectResourceId: record.subjectResourceId,
    composedAt: record.composedAt,
    subjectPreview: {
      id: record.snapshot.subject.id,
      provider: record.snapshot.subject.provider,
      kind: record.snapshot.subject.kind,
      name: record.snapshot.subject.name,
    },
  };
}

export function projectListProviders(providers: ProviderRecord[]) {
  return {
    providers: providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      status: provider.status,
      lastSyncAt: provider.lastSyncAt,
      ...(provider.lastAttemptAt != null
        ? { lastAttemptAt: provider.lastAttemptAt }
        : {}),
      accountId: provider.config?.accountId ?? null,
      accountName: provider.config?.accountName ?? null,
    })),
  };
}

export function projectListResources(resources: Resource[]) {
  return {
    resources: resources.map((resource) => ({
      id: resource.id,
      provider: resource.provider,
      kind: resource.kind,
      providerResourceId: resource.providerResourceId,
      name: resource.name,
    })),
  };
}

export function projectRelatedContext(ctx: RelatedResourceContext) {
  return {
    subject: {
      id: ctx.resource.id,
      provider: ctx.resource.provider,
      kind: ctx.resource.kind,
      providerResourceId: ctx.resource.providerResourceId,
      name: ctx.resource.name,
    },
    related: ctx.related.map((neighbor) => ({
      direction: neighbor.direction,
      relationship: {
        id: neighbor.relationship.id,
        kind: neighbor.relationship.kind,
        sourceResourceId: neighbor.relationship.sourceResourceId,
        targetResourceId: neighbor.relationship.targetResourceId,
        evidence: neighbor.relationship.evidence,
        createdAt: neighbor.relationship.createdAt,
        ...relationshipVerificationClockFields(
          neighbor.relationship.kind,
          neighbor.relationship.updatedAt,
          ctx.providerLastAttemptAt ?? {},
        ),
      },
      resource: neighbor.resource
        ? {
            id: neighbor.resource.id,
            provider: neighbor.resource.provider,
            kind: neighbor.resource.kind,
            providerResourceId: neighbor.resource.providerResourceId,
            name: neighbor.resource.name,
          }
        : null,
    })),
    ...(ctx.related.length === 0
      ? {
          missingContext: projectMissingContext([
            noKnownRelationshipsMissingContext(ctx.resource.id),
          ]),
        }
      : {}),
    ...((ctx.paths?.length ?? 0) > 0
      ? {
          paths: projectRelatedPaths(
            ctx.paths ?? [],
            ctx.providerLastAttemptAt ?? {},
          ),
        }
      : {}),
  };
}

function projectRelatedPathHop(
  hop: RelatedPath["hops"][number],
  attempts: Readonly<Record<string, string | null | undefined>>,
) {
  return {
    direction: hop.direction,
    resourceId: hop.resourceId,
    relationship: {
      id: hop.relationship.id,
      kind: hop.relationship.kind,
      sourceResourceId: hop.relationship.sourceResourceId,
      targetResourceId: hop.relationship.targetResourceId,
      evidence: deepCopyProjectionValue(hop.relationship.evidence),
      ...relationshipVerificationClockFields(
        hop.relationship.kind,
        hop.relationship.updatedAt,
        attempts,
      ),
    },
    resource: hop.resource
      ? {
          id: hop.resource.id,
          provider: hop.resource.provider,
          kind: hop.resource.kind,
          providerResourceId: hop.resource.providerResourceId,
          name: hop.resource.name,
        }
      : null,
  };
}

export function projectRelatedPaths(
  paths: RelatedPath[],
  attempts: Readonly<Record<string, string | null | undefined>>,
) {
  return paths.map((path) => ({
    viaResourceId: path.viaResourceId,
    farResourceId: path.farResourceId,
    hops: [
      projectRelatedPathHop(path.hops[0], attempts),
      projectRelatedPathHop(path.hops[1], attempts),
    ],
  }));
}

export function projectListInvestigations(records: InvestigationRecord[]) {
  return {
    investigations: records.map((record) => ({
      id: record.id,
      subjectResourceId: record.subjectResourceId,
      composedAt: record.composedAt,
    })),
  };
}

export function projectInvestigationRetrieve(
  record: SavedInvestigation,
  artifact: InvestigationArtifact,
) {
  return {
    ...projectInvestigationSnapshot(record),
    investigationArtifact: artifact,
  };
}

export function projectResourceContext(context: ResourceContext) {
  const { related } = projectRelatedContext({
    resource: context.resource,
    related: context.related,
    paths: [],
    providerLastAttemptAt: context.providerLastAttemptAt,
  });
  return {
    subject: {
      id: context.resource.id,
      provider: context.resource.provider,
      kind: context.resource.kind,
      providerResourceId: context.resource.providerResourceId,
      name: context.resource.name,
      updatedAt: context.resource.updatedAt,
      ...(context.providerSyncClocks.lastSuccessfulSyncAt != null
        ? {
            lastSuccessfulProviderSyncAt:
              context.providerSyncClocks.lastSuccessfulSyncAt,
          }
        : {}),
      ...(context.providerSyncClocks.lastAttemptAt != null
        ? {
            lastProviderSyncAttemptAt: context.providerSyncClocks.lastAttemptAt,
          }
        : {}),
      ...(context.lastSuccessfulDiscovery != null
        ? { lastSuccessfulDiscovery: context.lastSuccessfulDiscovery }
        : {}),
    },
    related,
    changes: context.changes.map((change) => ({
      id: change.id,
      kind: change.kind,
      observedAt: change.observedAt,
      fields: change.fields,
    })),
  };
}

export interface ProjectInvestigateResourceLiveOptions {
  ctx: InvestigationContext;
  resolutionRows: ResolutionRecord[];
  incidentRows: IncidentRecord[];
  investigationRows: InvestigationRecord[];
}

function deepCopyProjectionValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(deepCopyProjectionValue);
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    copy[key] = deepCopyProjectionValue((value as Record<string, unknown>)[key]);
  }
  return copy;
}

function projectKnownFacts(facts: InvestigationFact[]): InvestigationFact[] {
  return facts.map((fact) => deepCopyProjectionValue(fact) as InvestigationFact);
}

function projectProviderActivity(
  chronology: ProviderActivityChronology,
): ProviderActivityChronology {
  return deepCopyProjectionValue(chronology) as ProviderActivityChronology;
}

function projectTimeline(timeline: InvestigationTimeline): InvestigationTimeline {
  return deepCopyProjectionValue(timeline) as InvestigationTimeline;
}

function projectMissingContext(items: MissingContextItem[]): MissingContextItem[] {
  return items.map((item) => deepCopyProjectionValue(item) as MissingContextItem);
}

function projectSubject(
  ctx: Pick<
    InvestigationContext,
    "subject" | "providerSyncClocks" | "lastSuccessfulDiscovery"
  >,
) {
  return {
    id: ctx.subject.id,
    provider: ctx.subject.provider,
    kind: ctx.subject.kind,
    providerResourceId: ctx.subject.providerResourceId,
    name: ctx.subject.name,
    metadata: ctx.subject.metadata,
    createdAt: ctx.subject.createdAt,
    updatedAt: ctx.subject.updatedAt,
    ...(ctx.providerSyncClocks?.lastSuccessfulSyncAt != null
      ? {
          lastSuccessfulProviderSyncAt:
            ctx.providerSyncClocks.lastSuccessfulSyncAt,
        }
      : {}),
    ...(ctx.providerSyncClocks?.lastAttemptAt != null
      ? {
          lastProviderSyncAttemptAt: ctx.providerSyncClocks.lastAttemptAt,
        }
      : {}),
    ...(ctx.lastSuccessfulDiscovery != null
      ? { lastSuccessfulDiscovery: ctx.lastSuccessfulDiscovery }
      : {}),
  };
}

function projectChanges(changes: Change[]) {
  return changes.map((change) => ({
    id: change.id,
    kind: change.kind,
    observedAt: change.observedAt,
    fields: change.fields,
  }));
}

function projectResourceIdentity(
  resource: Pick<
    Resource,
    "id" | "provider" | "kind" | "providerResourceId" | "name"
  >,
) {
  return {
    id: resource.id,
    provider: resource.provider,
    kind: resource.kind,
    providerResourceId: resource.providerResourceId,
    name: resource.name,
  };
}

function projectRelationshipLeaf(
  neighbor: {
    relationship: Pick<
      Relationship,
      | "id"
      | "kind"
      | "sourceResourceId"
      | "targetResourceId"
      | "evidence"
      | "updatedAt"
    >;
  },
  attempts: Readonly<Record<string, string | null | undefined>>,
) {
  return {
    id: neighbor.relationship.id,
    kind: neighbor.relationship.kind,
    sourceResourceId: neighbor.relationship.sourceResourceId,
    targetResourceId: neighbor.relationship.targetResourceId,
    evidence: neighbor.relationship.evidence,
    ...relationshipVerificationClockFields(
      neighbor.relationship.kind,
      neighbor.relationship.updatedAt,
      attempts,
    ),
  };
}

/** Full one-hop neighbor projection (relationship + identity + changes + evidence). */
function projectRelatedNeighborDetail(
  neighbor: InvestigationNeighbor,
  attempts: Readonly<Record<string, string | null | undefined>>,
) {
  return {
    direction: neighbor.direction,
    relationship: projectRelationshipLeaf(neighbor, attempts),
    resource: neighbor.resource ? projectResourceIdentity(neighbor.resource) : null,
    changes: projectChanges(neighbor.changes),
    deployments: neighbor.deployments,
    workflowRuns: neighbor.workflowRuns,
    operations: neighbor.operations,
    releases: neighbor.releases,
    issues: neighbor.issues,
    ...(neighbor.githubIssues ? { githubIssues: neighbor.githubIssues } : {}),
  };
}

/** Thin one-hop neighbor projection (direction + relationship + identity only). */
function projectRelatedNeighborIdentity(
  neighbor: DependencyImpactNeighbor,
  attempts: Readonly<Record<string, string | null | undefined>>,
) {
  return {
    direction: neighbor.direction,
    relationship: projectRelationshipLeaf(neighbor, attempts),
    resource: neighbor.resource ? projectResourceIdentity(neighbor.resource) : null,
  };
}

export function projectInvestigateResourceLive({
  ctx,
  resolutionRows,
  incidentRows,
  investigationRows,
}: ProjectInvestigateResourceLiveOptions) {
  const providerLastAttemptAt = ctx.providerLastAttemptAt ?? {};

  const related = ctx.related.map((neighbor) =>
    projectRelatedNeighborDetail(neighbor, providerLastAttemptAt),
  );

  const sharedCommitGroups = composeSharedCommitContext(ctx);

  return {
    subject: projectSubject(ctx),
    subjectChanges: projectChanges(ctx.subjectChanges),
    subjectDeployments: ctx.subjectDeployments,
    subjectWorkflowRuns: ctx.subjectWorkflowRuns,
    subjectOperations: ctx.subjectOperations,
    subjectReleases: ctx.subjectReleases,
    subjectIssues: ctx.subjectIssues,
    ...(ctx.subjectGitHubIssues
      ? { subjectGitHubIssues: ctx.subjectGitHubIssues }
      : {}),
    related,
    ...((ctx.paths?.length ?? 0) > 0
      ? {
          paths: projectRelatedPaths(
            ctx.paths ?? [],
            providerLastAttemptAt,
          ),
        }
      : {}),
    knownFacts: projectKnownFacts(composeInvestigationFacts(ctx)),
    missingContext: projectMissingContext(composeMissingContext(ctx)),
    providerActivity: projectProviderActivity(composeProviderActivityChronology(ctx)),
    timeline: projectTimeline(composeInvestigationTimeline(ctx)),
    sharedCommitContext: sharedCommitGroups,
    sharedCommitCorrespondences:
      composeSharedCommitCorrespondences(sharedCommitGroups),
    ...(resolutionRows.length > 0
      ? { resolutionMemory: toResolutionMemory(resolutionRows) }
      : {}),
    ...(incidentRows.length > 0
      ? { incidentMemory: toIncidentMemory(incidentRows) }
      : {}),
    ...(investigationRows.length > 0
      ? { investigationHistory: toInvestigationHistory(investigationRows) }
      : {}),
  };
}

/**
 * Task-scoped projection (Sprint 109). Shared by CLI `investigate --task` and
 * MCP `investigate_resource` task mode. Reuses the same leaf shapes as the
 * full live projection; only the selected sections are rendered.
 */
export function projectTaskContext(tc: TaskScopedContext) {
  const result: Record<string, unknown> = {
    task: {
      profile: tc.task.profile,
      subjectResourceId: tc.task.subjectResourceId,
    },
    subject: projectSubject(tc.subjectContext),
  };

  if (tc.profile === "change-review") {
    result.subjectChanges = projectChanges(tc.subjectChanges);
    result.subjectDeployments = tc.subjectDeployments;
    result.subjectWorkflowRuns = tc.subjectWorkflowRuns;
    result.subjectOperations = tc.subjectOperations;
    result.subjectReleases = tc.subjectReleases;
    result.subjectIssues = tc.subjectIssues;
    if (tc.subjectGitHubIssues) {
      result.subjectGitHubIssues = tc.subjectGitHubIssues;
    }
    result.related = tc.related.map((neighbor) =>
      projectRelatedNeighborDetail(neighbor, tc.providerLastAttemptAt),
    );
    if (tc.paths.length > 0) {
      result.paths = projectRelatedPaths(tc.paths, tc.providerLastAttemptAt);
    }
    result.knownFacts = projectKnownFacts(tc.knownFacts);
    result.missingContext = projectMissingContext(tc.missingContext);
    result.providerActivity = projectProviderActivity(tc.providerActivity);
    result.timeline = projectTimeline(tc.timeline);
    result.sharedCommitContext = tc.sharedCommitContext;
    result.sharedCommitCorrespondences = tc.sharedCommitCorrespondences;
  } else if (tc.profile === "dependency-impact") {
    result.related = tc.related.map((neighbor) =>
      projectRelatedNeighborIdentity(neighbor, tc.providerLastAttemptAt),
    );
    if (tc.paths.length > 0) {
      result.paths = projectRelatedPaths(tc.paths, tc.providerLastAttemptAt);
    }
    result.missingContext = projectMissingContext(tc.missingContext);
  } else {
    result.investigationHistory = toInvestigationHistory(
      tc.investigationHistory,
    );
    result.resolutionMemory = toResolutionMemory(tc.resolutionMemory);
    result.incidentMemory = toIncidentMemory(tc.incidentMemory);
  }

  result.availableOnDemand = projectOnDemandTargets(tc.onDemandTargets);

  return result;
}

/**
 * Retrieval syntax for one on-demand target (Sprint 110). The literal binary
 * name is `combie` — the CLI-facing / released name, independent of any build
 * constant. The resource id stays one inert argv array element even when it
 * contains shell metacharacters; it is never interpolated into a command
 * string.
 */
function projectOnDemandTarget(target: OnDemandTarget): Record<string, unknown> {
  if (target.kind === "current-investigation") {
    return {
      kind: "current-investigation",
      subjectResourceId: target.subjectResourceId,
      cli: {
        argv: ["combie", "investigate", target.subjectResourceId, "--json"],
      },
      mcp: {
        tool: "investigate_resource",
        arguments: { resourceId: target.subjectResourceId },
      },
    };
  }
  return {
    kind: "retained-investigation",
    investigationId: target.investigationId,
    subjectResourceId: target.subjectResourceId,
    composedAt: target.composedAt,
    cli: {
      argv: ["combie", "investigation", target.investigationId],
    },
    mcp: {
      tool: "investigate_resource",
      arguments: { investigationId: target.investigationId },
      returns: "retained-snapshot-handle",
    },
  };
}

export function projectOnDemandTargets(targets: OnDemandTarget[]) {
  return targets.map(projectOnDemandTarget);
}
