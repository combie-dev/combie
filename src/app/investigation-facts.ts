import type { Relationship } from "../domain/relationship.ts";
import type { DeploymentEvidenceAuthority } from "../providers/vercel/deployment.ts";
import type { WorkflowRunEvidenceAuthority } from "../providers/github/workflow-run.ts";
import type { NeonOperationEvidenceAuthority } from "../providers/neon/operation.ts";
import type { IssueEvidenceAuthority } from "../providers/sentry/issue.ts";
import type { ReleaseEvidenceAuthority } from "../providers/sentry/release.ts";
import type { InvestigationContext } from "./investigate.ts";
import {
  composeProviderActivityChronology,
  nativeEvidenceId,
  type ProviderActivityEntry,
  type ProviderActivityFamily,
} from "./provider-activity.ts";
import type { RelatedDirection } from "./related.ts";
import { composeInvestigationTimeline } from "./timeline.ts";

/** Product noise budget. The structured and rendered surfaces share this cap. */
export const MAX_INVESTIGATION_FACTS = 5;

export interface InvestigationFactRelationshipRef {
  relationshipId: string;
  kind: Relationship["kind"];
  direction: RelatedDirection;
  sourceResourceId: string;
  targetResourceId: string;
}

export type InvestigationFactScopeRef =
  | {
      resourceId: string;
      role: "subject";
      relationships: [];
    }
  | {
      resourceId: string;
      role: "related";
      relationships: InvestigationFactRelationshipRef[];
    };

export type InvestigationFactAuthority =
  | { kind: "populated"; refreshObservedAt: string }
  | { kind: "empty"; refreshObservedAt: string }
  | { kind: "unknown"; refreshObservedAt: null };

interface InvestigationFactActivityBase {
  nativeId: string;
  scope: InvestigationFactScopeRef;
  authority: InvestigationFactAuthority;
  primaryTime: string;
  evidenceObservedAt: string;
}

export type InvestigationFactActivityRef =
  | (InvestigationFactActivityBase & {
      family: "vercel_deployment";
      primaryTimeField: "created";
      recordedReadyState: string | null;
      recordedState: string | null;
    })
  | (InvestigationFactActivityBase & {
      family: "github_workflow_run";
      primaryTimeField: "created_at";
      recordedStatus: string | null;
      recordedConclusion: string | null;
    })
  | (InvestigationFactActivityBase & {
      family: "neon_operation";
      primaryTimeField: "created_at";
      recordedStatus: string;
    })
  | (InvestigationFactActivityBase & {
      family: "sentry_release";
      primaryTimeField: "dateCreated";
      recordedStatus: string | null;
    })
  | (InvestigationFactActivityBase & {
      family: "sentry_issue";
      primaryTimeField: "lastSeen";
      recordedStatus: string | null;
    });

export interface InvestigationFactAuthorityRef {
  family: ProviderActivityFamily;
  scope: InvestigationFactScopeRef;
  authority: InvestigationFactAuthority;
  locallyHeldNativeIds: string[];
  /**
   * Latest successful provider response cardinality from persisted refresh
   * provenance. Null when unknown (including pre-Sprint-027 rows). Distinct
   * from locallyHeldNativeIds.length.
   */
  lastSuccessfulResultCount: number | null;
  /**
   * Combie observation time of the latest successful refresh from persisted
   * provenance. Null when unknown (including pre-Sprint-028 failure history).
   * Not a provider event time.
   */
  lastSuccessfulObservedAt: string | null;
}

export type InvestigationFactReportableAuthorityRef =
  InvestigationFactAuthorityRef;

export interface InvestigationFactStateGroup {
  value: string;
  count: number;
  evidence: InvestigationFactActivityRef[];
}

interface InvestigationFactStateSummaryBase {
  kind: "provider_state_summary";
  subjectResourceId: string;
  totalCount: number;
  groups: InvestigationFactStateGroup[];
  evidence: InvestigationFactActivityRef[];
}

export type InvestigationFactStateSummary =
  | (InvestigationFactStateSummaryBase & {
      family: "vercel_deployment";
      field: "readyState";
    })
  | (InvestigationFactStateSummaryBase & {
      family: "github_workflow_run";
      field: "conclusion";
    })
  | (InvestigationFactStateSummaryBase & {
      family: "neon_operation";
      field: "status";
    })
  | (InvestigationFactStateSummaryBase & {
      family: "sentry_release";
      field: "status";
    })
  | (InvestigationFactStateSummaryBase & {
      family: "sentry_issue";
      field: "status";
    });

export interface InvestigationFactChangeRef {
  changeId: string;
  scope: InvestigationFactScopeRef;
  observedAt: string;
  timeAuthority: "combie_observation";
}

/**
 * A deterministic read-time summary over evidence already present in one
 * InvestigationContext. Facts are ephemeral and have no durable identity.
 */
export type InvestigationFact =
  | {
      kind: "provider_evidence_authority";
      subjectResourceId: string;
      source: InvestigationFactReportableAuthorityRef;
    }
  | InvestigationFactStateSummary
  | {
      kind: "provider_activity_summary";
      subjectResourceId: string;
      totalCount: number;
      families: {
        family: ProviderActivityFamily;
        count: number;
        evidence: InvestigationFactActivityRef[];
      }[];
      sources: InvestigationFactAuthorityRef[];
    }
  | {
      kind: "provider_activity_scope";
      subjectResourceId: string;
      resources: {
        scope: InvestigationFactScopeRef;
        evidence: InvestigationFactActivityRef[];
      }[];
      sources: InvestigationFactAuthorityRef[];
    }
  | {
      kind: "newest_provider_activity";
      subjectResourceId: string;
      selected: InvestigationFactActivityRef;
      compared: InvestigationFactActivityRef[];
    }
  | {
      kind: "resource_change_summary";
      subjectResourceId: string;
      totalCount: number;
      changes: InvestigationFactChangeRef[];
    };

interface MutableAuthoritySource {
  family: ProviderActivityFamily;
  resourceId: string;
  role: "subject" | "related";
  relationships: InvestigationFactRelationshipRef[];
  authority: InvestigationFactAuthority;
  locallyHeldNativeIds: string[];
  lastSuccessfulResultCount: number | null;
  lastSuccessfulObservedAt: string | null;
}

function compareAscending(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareDescending(left: string, right: string): number {
  return left < right ? 1 : left > right ? -1 : 0;
}

function compareNativeIdDescending(left: string, right: string): number {
  const leftNumber = /^[0-9]+$/.test(left) ? Number(left) : null;
  const rightNumber = /^[0-9]+$/.test(right) ? Number(right) : null;
  if (
    leftNumber != null &&
    rightNumber != null &&
    Number.isSafeInteger(leftNumber) &&
    Number.isSafeInteger(rightNumber)
  ) {
    return rightNumber - leftNumber;
  }
  return compareDescending(left, right);
}

function relationshipRef(
  relationship: Relationship,
  direction: RelatedDirection,
): InvestigationFactRelationshipRef {
  return {
    relationshipId: relationship.id,
    kind: relationship.kind,
    direction,
    sourceResourceId: relationship.sourceResourceId,
    targetResourceId: relationship.targetResourceId,
  };
}

function compareRelationshipRef(
  left: InvestigationFactRelationshipRef,
  right: InvestigationFactRelationshipRef,
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
  refs: InvestigationFactRelationshipRef[],
): InvestigationFactRelationshipRef[] {
  const unique = new Map<string, InvestigationFactRelationshipRef>();
  for (const ref of refs) {
    const key = `${ref.relationshipId}\u0000${ref.direction}`;
    unique.set(key, unique.get(key) ?? ref);
  }
  return [...unique.values()].sort(compareRelationshipRef);
}

function scopeRef(source: MutableAuthoritySource): InvestigationFactScopeRef {
  if (source.role === "subject") {
    return { resourceId: source.resourceId, role: "subject", relationships: [] };
  }
  return {
    resourceId: source.resourceId,
    role: "related",
    relationships: normalizeRelationshipRefs(source.relationships),
  };
}

function authorityRef(
  source: MutableAuthoritySource,
): InvestigationFactAuthorityRef {
  return {
    family: source.family,
    scope: scopeRef(source),
    authority: source.authority,
    locallyHeldNativeIds: [...source.locallyHeldNativeIds],
    lastSuccessfulResultCount: source.lastSuccessfulResultCount,
    lastSuccessfulObservedAt: source.lastSuccessfulObservedAt,
  };
}

function reportableAuthorityRef(
  source: MutableAuthoritySource,
): InvestigationFactReportableAuthorityRef {
  return authorityRef(source);
}

/** Emit a populated authority fact only when retained memory differs from latest success. */
function shouldReportPopulatedAuthority(source: MutableAuthoritySource): boolean {
  if (source.authority.kind !== "populated") return false;
  if (source.lastSuccessfulResultCount == null) return false;
  return source.locallyHeldNativeIds.length !== source.lastSuccessfulResultCount;
}

function sourceKey(family: ProviderActivityFamily, resourceId: string): string {
  return `${family}\u0000${resourceId}`;
}

function authorityFromDeployment(
  authority: Exclude<DeploymentEvidenceAuthority, { kind: "not_applicable" }>,
): InvestigationFactAuthority {
  if (authority.kind === "unknown") {
    return { kind: "unknown", refreshObservedAt: null };
  }
  return { kind: authority.kind, refreshObservedAt: authority.observedAt };
}

function resultCountFromDeployment(
  authority: Exclude<DeploymentEvidenceAuthority, { kind: "not_applicable" }>,
): number | null {
  return authority.resultCount;
}

function lastSuccessAtFromDeployment(
  authority: Exclude<DeploymentEvidenceAuthority, { kind: "not_applicable" }>,
): string | null {
  if (authority.kind === "unknown") return authority.lastSuccessAt;
  return authority.observedAt;
}

function authorityFromRuns(
  authority: Exclude<WorkflowRunEvidenceAuthority, { kind: "not_applicable" }>,
): InvestigationFactAuthority {
  if (authority.kind === "unknown") {
    return { kind: "unknown", refreshObservedAt: null };
  }
  return { kind: authority.kind, refreshObservedAt: authority.observedAt };
}

function resultCountFromRuns(
  authority: Exclude<WorkflowRunEvidenceAuthority, { kind: "not_applicable" }>,
): number | null {
  return authority.resultCount;
}

function lastSuccessAtFromRuns(
  authority: Exclude<WorkflowRunEvidenceAuthority, { kind: "not_applicable" }>,
): string | null {
  if (authority.kind === "unknown") return authority.lastSuccessAt;
  return authority.observedAt;
}

function authorityFromOperations(
  authority: Exclude<NeonOperationEvidenceAuthority, { kind: "not_applicable" }>,
): InvestigationFactAuthority {
  if (authority.kind === "unknown") {
    return { kind: "unknown", refreshObservedAt: null };
  }
  return { kind: authority.kind, refreshObservedAt: authority.observedAt };
}

function resultCountFromOperations(
  authority: Exclude<NeonOperationEvidenceAuthority, { kind: "not_applicable" }>,
): number | null {
  // Neon refresh result_count is only authoritative on the latest success.
  // Failure overwrites it to null; empty/populated expose it via kind.
  if (authority.kind === "empty") return 0;
  if (authority.kind === "populated") {
    // Neon does not yet surface resultCount on the authority DTO; retained
    // cardinality is not a substitute. Unknown / pre-count remains null.
    return null;
  }
  return null;
}

function lastSuccessAtFromOperations(
  authority: Exclude<NeonOperationEvidenceAuthority, { kind: "not_applicable" }>,
): string | null {
  if (authority.kind === "unknown") return authority.lastSuccessAt;
  return authority.observedAt;
}

function deploymentIds(
  authority: Exclude<DeploymentEvidenceAuthority, { kind: "not_applicable" }>,
): string[] {
  return [...new Set(authority.deployments.map((item) => item.uid))].sort(
    compareNativeIdDescending,
  );
}

function runIds(
  authority: Exclude<WorkflowRunEvidenceAuthority, { kind: "not_applicable" }>,
): string[] {
  return [...new Set(authority.runs.map((item) => String(item.runId)))].sort(
    compareNativeIdDescending,
  );
}

function operationIds(
  authority: Exclude<NeonOperationEvidenceAuthority, { kind: "not_applicable" }>,
): string[] {
  return [...new Set(authority.operations.map((item) => item.operationId))].sort(
    compareNativeIdDescending,
  );
}

function authorityFromReleases(
  authority: Exclude<ReleaseEvidenceAuthority, { kind: "not_applicable" }>,
): InvestigationFactAuthority {
  if (authority.kind === "unknown") {
    return { kind: "unknown", refreshObservedAt: null };
  }
  return { kind: authority.kind, refreshObservedAt: authority.observedAt };
}

function resultCountFromReleases(
  authority: Exclude<ReleaseEvidenceAuthority, { kind: "not_applicable" }>,
): number | null {
  return authority.resultCount;
}

function lastSuccessAtFromReleases(
  authority: Exclude<ReleaseEvidenceAuthority, { kind: "not_applicable" }>,
): string | null {
  if (authority.kind === "unknown") return authority.lastSuccessAt;
  return authority.observedAt;
}

function releaseIds(
  authority: Exclude<ReleaseEvidenceAuthority, { kind: "not_applicable" }>,
): string[] {
  return [...new Set(authority.releases.map((item) => item.version))].sort(
    compareNativeIdDescending,
  );
}

function authorityFromIssues(
  authority: Exclude<IssueEvidenceAuthority, { kind: "not_applicable" }>,
): InvestigationFactAuthority {
  if (authority.kind === "unknown") {
    return { kind: "unknown", refreshObservedAt: null };
  }
  return { kind: authority.kind, refreshObservedAt: authority.observedAt };
}

function resultCountFromIssues(
  authority: Exclude<IssueEvidenceAuthority, { kind: "not_applicable" }>,
): number | null {
  return authority.resultCount;
}

function lastSuccessAtFromIssues(
  authority: Exclude<IssueEvidenceAuthority, { kind: "not_applicable" }>,
): string | null {
  if (authority.kind === "unknown") return authority.lastSuccessAt;
  return authority.observedAt;
}

function issueIds(
  authority: Exclude<IssueEvidenceAuthority, { kind: "not_applicable" }>,
): string[] {
  return [...new Set(authority.issues.map((item) => item.issueId))].sort(
    compareNativeIdDescending,
  );
}

function collectAuthoritySources(
  context: InvestigationContext,
): MutableAuthoritySource[] {
  const sources = new Map<string, MutableAuthoritySource>();

  function upsert(
    family: ProviderActivityFamily,
    resourceId: string,
    role: "subject" | "related",
    relationships: InvestigationFactRelationshipRef[],
    authority: InvestigationFactAuthority,
    locallyHeldNativeIds: string[],
    lastSuccessfulResultCount: number | null,
    lastSuccessfulObservedAt: string | null,
  ): void {
    const key = sourceKey(family, resourceId);
    const existing = sources.get(key);
    if (existing) {
      existing.relationships.push(...relationships);
      return;
    }
    sources.set(key, {
      family,
      resourceId,
      role,
      relationships: [...relationships],
      authority,
      locallyHeldNativeIds,
      lastSuccessfulResultCount,
      lastSuccessfulObservedAt,
    });
  }

  function addAuthorities(
    resourceId: string,
    role: "subject" | "related",
    relationships: InvestigationFactRelationshipRef[],
    deployments: DeploymentEvidenceAuthority,
    runs: WorkflowRunEvidenceAuthority,
    operations: NeonOperationEvidenceAuthority,
    releases: ReleaseEvidenceAuthority,
    issues: IssueEvidenceAuthority,
  ): void {
    if (deployments.kind !== "not_applicable") {
      upsert(
        "vercel_deployment",
        resourceId,
        role,
        relationships,
        authorityFromDeployment(deployments),
        deploymentIds(deployments),
        resultCountFromDeployment(deployments),
        lastSuccessAtFromDeployment(deployments),
      );
    }
    if (runs.kind !== "not_applicable") {
      upsert(
        "github_workflow_run",
        resourceId,
        role,
        relationships,
        authorityFromRuns(runs),
        runIds(runs),
        resultCountFromRuns(runs),
        lastSuccessAtFromRuns(runs),
      );
    }
    if (operations.kind !== "not_applicable") {
      upsert(
        "neon_operation",
        resourceId,
        role,
        relationships,
        authorityFromOperations(operations),
        operationIds(operations),
        resultCountFromOperations(operations),
        lastSuccessAtFromOperations(operations),
      );
    }
    if (releases.kind !== "not_applicable") {
      upsert(
        "sentry_release",
        resourceId,
        role,
        relationships,
        authorityFromReleases(releases),
        releaseIds(releases),
        resultCountFromReleases(releases),
        lastSuccessAtFromReleases(releases),
      );
    }
    if (issues.kind !== "not_applicable") {
      upsert(
        "sentry_issue",
        resourceId,
        role,
        relationships,
        authorityFromIssues(issues),
        issueIds(issues),
        resultCountFromIssues(issues),
        lastSuccessAtFromIssues(issues),
      );
    }
  }

  addAuthorities(
    context.subject.id,
    "subject",
    [],
    context.subjectDeployments,
    context.subjectWorkflowRuns,
    context.subjectOperations,
    context.subjectReleases,
    context.subjectIssues,
  );

  for (const neighbor of context.related) {
    if (!neighbor.resource || neighbor.resource.id === context.subject.id) {
      continue;
    }
    addAuthorities(
      neighbor.resource.id,
      "related",
      [relationshipRef(neighbor.relationship, neighbor.direction)],
      neighbor.deployments,
      neighbor.workflowRuns,
      neighbor.operations,
      neighbor.releases,
      neighbor.issues,
    );
  }

  for (const source of sources.values()) {
    source.relationships = normalizeRelationshipRefs(source.relationships);
  }

  return [...sources.values()].sort((left, right) => {
    const byRole = left.role === right.role ? 0 : left.role === "subject" ? -1 : 1;
    return (
      byRole ||
      compareAscending(left.family, right.family) ||
      compareAscending(left.resourceId, right.resourceId)
    );
  });
}

function authorityForEntry(
  entry: ProviderActivityEntry,
  sourceByKey: Map<string, MutableAuthoritySource>,
): InvestigationFactAuthority {
  const source = sourceByKey.get(sourceKey(entry.family, entry.resourceId));
  if (!source) {
    throw new Error(
      `Provider activity source authority missing for ${entry.family}:${entry.resourceId}.`,
    );
  }
  return source.authority;
}

function compactScope(entry: ProviderActivityEntry): InvestigationFactScopeRef {
  if (entry.role === "subject") {
    return { resourceId: entry.resourceId, role: "subject", relationships: [] };
  }
  return {
    resourceId: entry.resourceId,
    role: "related",
    relationships: normalizeRelationshipRefs(
      entry.relationships.map(({ relationship, direction }) =>
        relationshipRef(relationship, direction)
      ),
    ),
  };
}

function activityRef(
  entry: ProviderActivityEntry,
  sourceByKey: Map<string, MutableAuthoritySource>,
): InvestigationFactActivityRef {
  const base = {
    nativeId: nativeEvidenceId(entry),
    scope: compactScope(entry),
    authority: authorityForEntry(entry, sourceByKey),
    primaryTime: entry.primaryTime,
    evidenceObservedAt: entry.evidence.observedAt,
  };
  if (entry.family === "vercel_deployment") {
    return {
      ...base,
      family: entry.family,
      primaryTimeField: entry.primaryTimeField,
      recordedReadyState: entry.evidence.readyState,
      recordedState: entry.evidence.state,
    };
  }
  if (entry.family === "github_workflow_run") {
    return {
      ...base,
      family: entry.family,
      primaryTimeField: entry.primaryTimeField,
      recordedStatus: entry.evidence.status,
      recordedConclusion: entry.evidence.conclusion,
    };
  }
  if (entry.family === "sentry_release") {
    return {
      ...base,
      family: entry.family,
      primaryTimeField: entry.primaryTimeField,
      recordedStatus: entry.evidence.status,
    };
  }
  if (entry.family === "sentry_issue") {
    return {
      ...base,
      family: entry.family,
      primaryTimeField: entry.primaryTimeField,
      recordedStatus: entry.evidence.status,
    };
  }
  return {
    ...base,
    family: entry.family,
    primaryTimeField: entry.primaryTimeField,
    recordedStatus: entry.evidence.status,
  };
}

function sourceRefsForEvidence(
  evidence: InvestigationFactActivityRef[],
  sourceByKey: Map<string, MutableAuthoritySource>,
): InvestigationFactAuthorityRef[] {
  const keys = new Set(
    evidence.map((item) => sourceKey(item.family, item.scope.resourceId)),
  );
  return [...keys]
    .map((key) => sourceByKey.get(key))
    .filter((source): source is MutableAuthoritySource => source != null)
    .sort((left, right) => {
      const byRole = left.role === right.role ? 0 : left.role === "subject" ? -1 : 1;
      return (
        byRole ||
        compareAscending(left.family, right.family) ||
        compareAscending(left.resourceId, right.resourceId)
      );
    })
    .map(authorityRef);
}

function stateValue(
  evidence: InvestigationFactActivityRef,
  field: "readyState" | "status" | "conclusion",
): string | null {
  if (evidence.family === "vercel_deployment") {
    return field === "readyState" ? evidence.recordedReadyState : null;
  }
  if (evidence.family === "github_workflow_run") {
    if (field === "status") return evidence.recordedStatus;
    return field === "conclusion" ? evidence.recordedConclusion : null;
  }
  if (evidence.family === "sentry_release") {
    return field === "status" ? evidence.recordedStatus : null;
  }
  if (evidence.family === "sentry_issue") {
    return field === "status" ? evidence.recordedStatus : null;
  }
  return field === "status" ? evidence.recordedStatus : null;
}

function stateSummary(
  subjectResourceId: string,
  family: ProviderActivityFamily,
  field: "readyState" | "status" | "conclusion",
  evidence: InvestigationFactActivityRef[],
): InvestigationFactStateSummary | null {
  if (evidence.length < 2) return null;
  const groups = new Map<string, InvestigationFactActivityRef[]>();
  for (const item of evidence) {
    const value = stateValue(item, field);
    if (value == null) {
      continue;
    }
    const group = groups.get(value) ?? [];
    group.push(item);
    groups.set(value, group);
  }
  if (groups.size === 0) return null;
  const grouped = [...groups.entries()]
    .sort(([left], [right]) => compareAscending(left, right))
    .map(([value, items]) => ({ value, count: items.length, evidence: items }));

  if (family === "vercel_deployment" && field === "readyState") {
    return {
      kind: "provider_state_summary",
      subjectResourceId,
      family,
      field,
      totalCount: evidence.length,
      groups: grouped,
      evidence,
    };
  }
  if (
    family === "github_workflow_run" &&
    field === "conclusion"
  ) {
    return {
      kind: "provider_state_summary",
      subjectResourceId,
      family,
      field,
      totalCount: evidence.length,
      groups: grouped,
      evidence,
    };
  }
  if (family === "neon_operation" && field === "status") {
    return {
      kind: "provider_state_summary",
      subjectResourceId,
      family,
      field,
      totalCount: evidence.length,
      groups: grouped,
      evidence,
    };
  }
  if (family === "sentry_release" && field === "status") {
    return {
      kind: "provider_state_summary",
      subjectResourceId,
      family,
      field,
      totalCount: evidence.length,
      groups: grouped,
      evidence,
    };
  }
  if (family === "sentry_issue" && field === "status") {
    return {
      kind: "provider_state_summary",
      subjectResourceId,
      family,
      field,
      totalCount: evidence.length,
      groups: grouped,
      evidence,
    };
  }
  return null;
}

function scopeFromChangeEntry(
  entry: ReturnType<typeof composeInvestigationTimeline>["entries"][number],
): InvestigationFactScopeRef {
  if (entry.role === "subject") {
    return { resourceId: entry.resource.id, role: "subject", relationships: [] };
  }
  return {
    resourceId: entry.resource.id,
    role: "related",
    relationships: normalizeRelationshipRefs(
      entry.relationships.map(({ relationship, direction }) =>
        relationshipRef(relationship, direction)
      ),
    ),
  };
}

/**
 * Pure, deterministic, bounded projection over already-composed investigation
 * evidence. It performs no reads, writes, provider calls, clock reads, IDs,
 * correlation, interpretation, or mutation.
 */
export function composeInvestigationFacts(
  context: InvestigationContext,
): InvestigationFact[] {
  const subjectResourceId = context.subject.id;
  const rawSources = collectAuthoritySources(context);
  const sourceByKey = new Map(
    rawSources.map((source) => [sourceKey(source.family, source.resourceId), source]),
  );
  const chronology = composeProviderActivityChronology(context);
  const activities = chronology.entries.map((entry) =>
    activityRef(entry, sourceByKey)
  );

  const candidates: InvestigationFact[] = [];

  // Highest priority: unknown/stale authority, then authoritative known-empty,
  // then populated cases where retained local memory differs from latest success.
  for (const source of rawSources.filter(
    (item) => item.authority.kind === "unknown",
  )) {
    candidates.push({
      kind: "provider_evidence_authority",
      subjectResourceId,
      source: reportableAuthorityRef(source),
    });
  }
  for (const source of rawSources.filter(
    (item) => item.authority.kind === "empty",
  )) {
    candidates.push({
      kind: "provider_evidence_authority",
      subjectResourceId,
      source: reportableAuthorityRef(source),
    });
  }
  for (const source of rawSources.filter(shouldReportPopulatedAuthority)) {
    candidates.push({
      kind: "provider_evidence_authority",
      subjectResourceId,
      source: reportableAuthorityRef(source),
    });
  }

  // Provider-native state fields stay distinct, and only multi-row evidence
  // earns a state fact.
  const stateFacts: InvestigationFactStateSummary[] = [];
  const families: ProviderActivityFamily[] = [
    "github_workflow_run",
    "neon_operation",
    "sentry_issue",
    "sentry_release",
    "vercel_deployment",
  ];
  for (const family of families) {
    const familyEvidence = activities.filter((item) => item.family === family);
    const fields =
      family === "vercel_deployment"
        ? (["readyState"] as const)
        : family === "github_workflow_run"
          ? (["conclusion"] as const)
          : (["status"] as const);
    for (const field of fields) {
      const summary = stateSummary(
        subjectResourceId,
        family,
        field,
        familyEvidence,
      );
      if (summary) stateFacts.push(summary);
    }
  }
  candidates.push(...stateFacts);

  const familyGroups = families
    .map((family) => ({
      family,
      evidence: activities.filter((item) => item.family === family),
    }))
    .filter((group) => group.evidence.length > 0);

  // A multi-family total always adds orientation. For one family, emit a count
  // only when no higher-value state distribution already carries that count.
  if (
    activities.length >= 2 &&
    (familyGroups.length >= 2 || stateFacts.length === 0)
  ) {
    candidates.push({
      kind: "provider_activity_summary",
      subjectResourceId,
      totalCount: activities.length,
      families: familyGroups.map((group) => ({
        family: group.family,
        count: group.evidence.length,
        evidence: group.evidence,
      })),
      sources: sourceRefsForEvidence(activities, sourceByKey),
    });
  }

  const activityByResource = new Map<string, InvestigationFactActivityRef[]>();
  for (const activity of activities) {
    const current = activityByResource.get(activity.scope.resourceId) ?? [];
    current.push(activity);
    activityByResource.set(activity.scope.resourceId, current);
  }
  const resourceGroups = [...activityByResource.values()]
    .map((evidence) => ({ scope: evidence[0]!.scope, evidence }))
    .sort((left, right) => {
      const byRole =
        left.scope.role === right.scope.role
          ? 0
          : left.scope.role === "subject"
            ? -1
            : 1;
      return byRole || compareAscending(left.scope.resourceId, right.scope.resourceId);
    });
  if (resourceGroups.some((group) => group.scope.role === "related")) {
    candidates.push({
      kind: "provider_activity_scope",
      subjectResourceId,
      resources: resourceGroups,
      sources: sourceRefsForEvidence(activities, sourceByKey),
    });
  }

  if (activities.length >= 2) {
    candidates.push({
      kind: "newest_provider_activity",
      subjectResourceId,
      selected: activities[0]!,
      compared: activities,
    });
  }

  const timeline = composeInvestigationTimeline(context);
  if (timeline.entries.length >= 2) {
    candidates.push({
      kind: "resource_change_summary",
      subjectResourceId,
      totalCount: timeline.entries.length,
      changes: timeline.entries.map((entry) => ({
        changeId: entry.change.id,
        scope: scopeFromChangeEntry(entry),
        observedAt: entry.change.observedAt,
        timeAuthority: "combie_observation",
      })),
    });
  }

  return candidates.slice(0, MAX_INVESTIGATION_FACTS);
}
