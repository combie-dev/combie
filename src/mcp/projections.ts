import {
  composeInvestigationFacts,
  type InvestigationFact,
} from "../app/investigation-facts.ts";
import type { ResourceContext } from "../app/context.ts";
import type { InvestigationContext } from "../app/investigate.ts";
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
import type { RelatedResourceContext } from "../app/related.ts";
import { lastRequiredProviderAttemptAt } from "../app/relationship-verification-clocks.ts";
import {
  composeSharedCommitContext,
  composeSharedCommitCorrespondences,
} from "../app/shared-commit-context.ts";
import {
  composeInvestigationTimeline,
  type InvestigationTimeline,
} from "../app/timeline.ts";
import type { IncidentRecord } from "../domain/incident.ts";
import type { InvestigationRecord } from "../domain/investigation.ts";
import type { RelationshipKind } from "../domain/relationship.ts";
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
  };
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
  const { related } = projectRelatedContext(context);
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

export function projectInvestigateResourceLive({
  ctx,
  resolutionRows,
  incidentRows,
  investigationRows,
}: ProjectInvestigateResourceLiveOptions) {
  const providerLastAttemptAt = ctx.providerLastAttemptAt ?? {};

  const subject = {
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

  const subjectChanges = ctx.subjectChanges.map((change) => ({
    id: change.id,
    kind: change.kind,
    observedAt: change.observedAt,
    fields: change.fields,
  }));

  const related = ctx.related.map((neighbor) => ({
    direction: neighbor.direction,
    relationship: {
      id: neighbor.relationship.id,
      kind: neighbor.relationship.kind,
      sourceResourceId: neighbor.relationship.sourceResourceId,
      targetResourceId: neighbor.relationship.targetResourceId,
      evidence: neighbor.relationship.evidence,
      ...relationshipVerificationClockFields(
        neighbor.relationship.kind,
        neighbor.relationship.updatedAt,
        providerLastAttemptAt,
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
    changes: neighbor.changes.map((change) => ({
      id: change.id,
      kind: change.kind,
      observedAt: change.observedAt,
      fields: change.fields,
    })),
    deployments: neighbor.deployments,
    workflowRuns: neighbor.workflowRuns,
    operations: neighbor.operations,
    releases: neighbor.releases,
    issues: neighbor.issues,
  }));

  const sharedCommitGroups = composeSharedCommitContext(ctx);

  return {
    subject,
    subjectChanges,
    subjectDeployments: ctx.subjectDeployments,
    subjectWorkflowRuns: ctx.subjectWorkflowRuns,
    subjectOperations: ctx.subjectOperations,
    subjectReleases: ctx.subjectReleases,
    subjectIssues: ctx.subjectIssues,
    related,
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
