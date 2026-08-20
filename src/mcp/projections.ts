import {
  composeInvestigationFacts,
} from "../app/investigation-facts.ts";
import type { InvestigationContext } from "../app/investigate.ts";
import type { SavedInvestigation } from "../app/investigations.ts";
import { composeMissingContext } from "../app/missing-context.ts";
import { composeProviderActivityChronology } from "../app/provider-activity.ts";
import type { RelatedResourceContext } from "../app/related.ts";
import {
  composeSharedCommitContext,
  composeSharedCommitCorrespondences,
} from "../app/shared-commit-context.ts";
import { composeInvestigationTimeline } from "../app/timeline.ts";
import type { IncidentRecord } from "../domain/incident.ts";
import type { InvestigationRecord } from "../domain/investigation.ts";
import type { ResolutionRecord } from "../domain/resolution.ts";
import type { Resource } from "../domain/resource.ts";
import type { ProviderRecord } from "../storage/store.ts";

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
  };
}

export interface ProjectInvestigateResourceLiveOptions {
  ctx: InvestigationContext;
  resolutionRows: ResolutionRecord[];
  incidentRows: IncidentRecord[];
  investigationRows: InvestigationRecord[];
}

export function projectInvestigateResourceLive({
  ctx,
  resolutionRows,
  incidentRows,
  investigationRows,
}: ProjectInvestigateResourceLiveOptions) {
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
    knownFacts: composeInvestigationFacts(ctx),
    missingContext: composeMissingContext(ctx),
    providerActivity: composeProviderActivityChronology(ctx),
    timeline: composeInvestigationTimeline(ctx),
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
