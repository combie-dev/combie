import type {
  DeploymentEvidenceAuthority,
} from "../providers/vercel/deployment.ts";
import type {
  WorkflowRunEvidenceAuthority,
} from "../providers/github/workflow-run.ts";
import type {
  NeonOperationEvidenceAuthority,
} from "../providers/neon/operation.ts";
import type {
  ReleaseEvidenceAuthority,
} from "../providers/sentry/release.ts";
import type {
  IssueEvidenceAuthority,
} from "../providers/sentry/issue.ts";
import type { ProviderActivityFamily } from "./provider-activity.ts";
import type {
  InvestigationFact,
  InvestigationFactScopeRef,
} from "./investigation-facts.ts";
import { composeInvestigationFacts } from "./investigation-facts.ts";
import type { MissingContextItem } from "./missing-context.ts";
import { composeMissingContext } from "./missing-context.ts";
import {
  composeSharedCommitContext,
  composeSharedCommitCorrespondences,
} from "./shared-commit-context.ts";
import {
  getInvestigationContext,
  type InvestigationContext,
  type InvestigationNeighbor,
} from "./investigate.ts";
import type { SavedInvestigation } from "./investigations.ts";
import { getSavedInvestigation } from "./investigations.ts";
import { CombieError } from "./errors.ts";

/**
 * Sprint 049: compare one saved Investigation snapshot to a live one-hop
 * compose of the same subject from the current local store. Ephemeral,
 * deterministic, bounded — never persisted, never rewrites the snapshot,
 * performs no provider reads, and invents no identities.
 */

export type CompareItemStatus =
  | "unchanged"
  | "changed"
  | "snapshot_only"
  | "current_only";

export interface InvestigationCompare {
  snapshotId: string;
  subjectResourceId: string;
  snapshotComposedAt: string;
  comparedAt: string;
  currentStatus: "available" | "subject_missing";
  sections: InvestigationCompareSection[];
}

export interface CompareSubjectField {
  field: "provider" | "kind" | "providerResourceId" | "name";
  status: "unchanged" | "changed" | "unavailable";
  snapshotValue: string;
  currentValue: string | null;
}

export interface CompareSubjectSection {
  name: "SUBJECT";
  subjectResourceId: string;
  fields: CompareSubjectField[];
}

export interface CompareRelationshipItem {
  status: CompareItemStatus;
  relationshipId: string;
  kind: string;
  sourceResourceId: string;
  targetResourceId: string;
}

export interface CompareRelationshipsSection {
  name: "RELATIONSHIPS";
  items: CompareRelationshipItem[];
}

export interface CompareRelatedResourceItem {
  status: CompareItemStatus | "dangling";
  resourceId: string;
}

export interface CompareRelatedResourcesSection {
  name: "RELATED RESOURCES";
  items: CompareRelatedResourceItem[];
}

export interface CompareFactItem {
  status: CompareItemStatus;
  factKey: string;
  kind: InvestigationFact["kind"];
  family: ProviderActivityFamily | null;
  scopeResourceId: string | null;
  scopeRole: "subject" | "related" | null;
  relationshipId: string | null;
  commitSha: string | null;
}

export interface CompareKnownFactsSection {
  name: "KNOWN FACTS";
  items: CompareFactItem[];
}

export interface CompareMissingContextItem {
  status: CompareItemStatus;
  itemKey: string;
  kind: MissingContextItem["kind"];
  family: ProviderActivityFamily | null;
  scopeResourceId: string | null;
  scopeRole: "subject" | "related" | null;
  relationshipId: string | null;
  commitSha: string | null;
}

export interface CompareMissingContextSection {
  name: "MISSING CONTEXT";
  items: CompareMissingContextItem[];
}

export interface CompareSharedCommitItem {
  status: CompareItemStatus;
  groupKey: string;
  relationshipId: string;
  relationshipKind: "source_for" | "code_mapped_to";
  commitSha: string;
}

export interface CompareSharedCommitSection {
  name: "SHARED COMMIT CONTEXT";
  items: CompareSharedCommitItem[];
}

export interface CompareCorrespondenceItem {
  status: CompareItemStatus;
  commitSha: string;
}

export interface CompareCorrespondenceSection {
  name: "SHARED COMMIT CORRESPONDENCE";
  items: CompareCorrespondenceItem[];
}

export interface CompareAuthorityClockRef {
  authorityKind: "unknown" | "empty" | "populated";
  refreshObservedAt: string | null;
  lastSuccessfulObservedAt: string | null;
  resultCount: number | null;
  latestAttemptObservedAt: string | null;
}

export interface CompareAuthorityClockItem {
  status: "changed";
  family: ProviderActivityFamily;
  scopeResourceId: string;
  scopeRole: "subject" | "related";
  snapshotClocks: CompareAuthorityClockRef;
  currentClocks: CompareAuthorityClockRef;
}

export interface CompareAuthorityClocksSection {
  name: "AUTHORITY CLOCKS";
  items: CompareAuthorityClockItem[];
}

export type InvestigationCompareSection =
  | CompareSubjectSection
  | CompareRelationshipsSection
  | CompareRelatedResourcesSection
  | CompareKnownFactsSection
  | CompareMissingContextSection
  | CompareSharedCommitSection
  | CompareCorrespondenceSection
  | CompareAuthorityClocksSection;

function compareAscending(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function neighborId(item: InvestigationNeighbor): string {
  return item.direction === "outbound"
    ? item.relationship.targetResourceId
    : item.relationship.sourceResourceId;
}

// ---------------------------------------------------------------------------
// SUBJECT

function subjectSection(
  snapshot: InvestigationContext,
  current: InvestigationContext | null,
): CompareSubjectSection {
  const s = snapshot.subject;
  const fields: CompareSubjectField[] = [];
  for (const field of ["provider", "kind", "providerResourceId", "name"] as const) {
    if (!current) {
      fields.push({
        field,
        status: "unavailable",
        snapshotValue: s[field],
        currentValue: null,
      });
      continue;
    }
    const snapshotValue = s[field];
    const currentValue = current.subject[field];
    fields.push({
      field,
      status: snapshotValue === currentValue ? "unchanged" : "changed",
      snapshotValue,
      currentValue,
    });
  }
  return { name: "SUBJECT", subjectResourceId: s.id, fields };
}

// ---------------------------------------------------------------------------
// RELATIONSHIPS

function relationshipItems(context: InvestigationContext): CompareRelationshipItem[] {
  const byId = new Map<string, CompareRelationshipItem>();
  for (const item of context.related) {
    const relationship = item.relationship;
    byId.set(relationship.id, {
      status: "unchanged",
      relationshipId: relationship.id,
      kind: relationship.kind,
      sourceResourceId: relationship.sourceResourceId,
      targetResourceId: relationship.targetResourceId,
    });
  }
  return [...byId.values()].sort((left, right) =>
    compareAscending(left.relationshipId, right.relationshipId),
  );
}

function relationshipsSection(
  snapshot: InvestigationContext,
  current: InvestigationContext,
): CompareRelationshipsSection {
  const snapshotItems = relationshipItems(snapshot);
  const currentItems = relationshipItems(current);
  const byId = new Map<string, CompareRelationshipItem>();
  for (const item of snapshotItems) {
    byId.set(item.relationshipId, { ...item, status: "snapshot_only" });
  }
  for (const item of currentItems) {
    const existing = byId.get(item.relationshipId);
    if (existing) {
      existing.status = "unchanged";
    } else {
      byId.set(item.relationshipId, { ...item, status: "current_only" });
    }
  }
  return {
    name: "RELATIONSHIPS",
    items: [...byId.values()].sort((left, right) =>
      compareAscending(left.relationshipId, right.relationshipId),
    ),
  };
}

// ---------------------------------------------------------------------------
// RELATED RESOURCES

function relatedResourcesSection(
  snapshot: InvestigationContext,
  current: InvestigationContext,
): CompareRelatedResourcesSection {
  const snapshotById = new Map<string, InvestigationNeighbor>();
  for (const item of snapshot.related) {
    snapshotById.set(neighborId(item), item);
  }
  const currentById = new Map<string, InvestigationNeighbor>();
  for (const item of current.related) {
    currentById.set(neighborId(item), item);
  }
  const ids = [...new Set([...snapshotById.keys(), ...currentById.keys()])].sort();
  const items: CompareRelatedResourceItem[] = [];
  for (const resourceId of ids) {
    const snapshotItem = snapshotById.get(resourceId);
    const currentItem = currentById.get(resourceId);
    if (snapshotItem && !currentItem) {
      items.push({ status: "snapshot_only", resourceId });
    } else if (!snapshotItem && currentItem) {
      items.push({ status: "current_only", resourceId });
    } else {
      items.push({
        status: currentItem!.resource ? "unchanged" : "dangling",
        resourceId,
      });
    }
  }
  return { name: "RELATED RESOURCES", items };
}

// ---------------------------------------------------------------------------
// KNOWN FACTS

function factScopeKey(scope: InvestigationFactScopeRef): string {
  const paths = scope.relationships
    .map((relationship) => relationship.relationshipId)
    .sort()
    .join(",");
  return `${scope.role}\u0000${scope.resourceId}\u0000${paths}`;
}

function factKey(fact: InvestigationFact): string {
  switch (fact.kind) {
    case "provider_evidence_authority":
      return `${fact.kind}\u0000${fact.source.family}\u0000${factScopeKey(fact.source.scope)}`;
    case "provider_state_summary":
      return `${fact.kind}\u0000${fact.family}\u0000${fact.field}`;
    case "provider_activity_summary":
    case "provider_activity_scope":
    case "newest_provider_activity":
    case "resource_change_summary":
      return fact.kind;
    case "code_mapping_relationship":
      return `${fact.kind}\u0000${fact.relationshipId}`;
    case "shared_commit_relationship":
      return `${fact.kind}\u0000${fact.relationshipId}\u0000${fact.commitSha}`;
  }
}

/**
 * Identity-bearing content of a fact, excluding authority-clock fields.
 * Clock-only drift never marks a fact changed (AUTHORITY CLOCKS owns it).
 */
function factContent(fact: InvestigationFact): string[] {
  switch (fact.kind) {
    case "provider_evidence_authority":
      return [...fact.source.locallyHeldNativeIds].sort();
    case "provider_state_summary":
      return fact.groups.map((group) => `${group.value}\u0000${group.count}`).sort();
    case "provider_activity_summary":
      return fact.families
        .map((group) => `${group.family}\u0000${group.count}`)
        .sort();
    case "provider_activity_scope":
      return fact.resources
        .map((resource) => `${resource.scope.role}\u0000${resource.scope.resourceId}`)
        .sort();
    case "newest_provider_activity":
      return [`${fact.selected.family}\u0000${fact.selected.nativeId}`];
    case "resource_change_summary":
      return fact.changes.map((change) => change.changeId).sort();
    case "code_mapping_relationship":
      return fact.repository ? [fact.repository] : [];
    case "shared_commit_relationship":
      return [];
  }
}

function factLabel(fact: InvestigationFact): {
  family: ProviderActivityFamily | null;
  scopeResourceId: string | null;
  scopeRole: "subject" | "related" | null;
  relationshipId: string | null;
  commitSha: string | null;
} {
  switch (fact.kind) {
    case "provider_evidence_authority":
      return {
        family: fact.source.family,
        scopeResourceId: fact.source.scope.resourceId,
        scopeRole: fact.source.scope.role,
        relationshipId: null,
        commitSha: null,
      };
    case "provider_state_summary":
      return {
        family: fact.family,
        scopeResourceId: null,
        scopeRole: null,
        relationshipId: null,
        commitSha: null,
      };
    case "provider_activity_summary":
      return { family: null, scopeResourceId: null, scopeRole: null, relationshipId: null, commitSha: null };
    case "provider_activity_scope":
      return { family: null, scopeResourceId: null, scopeRole: null, relationshipId: null, commitSha: null };
    case "newest_provider_activity":
      return {
        family: fact.selected.family,
        scopeResourceId: fact.selected.scope.resourceId,
        scopeRole: fact.selected.scope.role,
        relationshipId: null,
        commitSha: null,
      };
    case "resource_change_summary":
      return { family: null, scopeResourceId: null, scopeRole: null, relationshipId: null, commitSha: null };
    case "code_mapping_relationship":
      return {
        family: null,
        scopeResourceId: null,
        scopeRole: null,
        relationshipId: fact.relationshipId,
        commitSha: null,
      };
    case "shared_commit_relationship":
      return {
        family: null,
        scopeResourceId: null,
        scopeRole: null,
        relationshipId: fact.relationshipId,
        commitSha: fact.commitSha,
      };
  }
}

function factItems(context: InvestigationContext): CompareFactItem[] {
  return composeInvestigationFacts(context).map((fact) => {
    const label = factLabel(fact);
    return {
      status: "unchanged",
      factKey: factKey(fact),
      kind: fact.kind,
      family: label.family,
      scopeResourceId: label.scopeResourceId,
      scopeRole: label.scopeRole,
      relationshipId: label.relationshipId,
      commitSha: label.commitSha,
    };
  });
}

function knownFactsSection(
  snapshot: InvestigationContext,
  current: InvestigationContext,
): CompareKnownFactsSection {
  const snapshotByKey = new Map<string, CompareFactItem>();
  for (const item of factItems(snapshot)) {
    snapshotByKey.set(item.factKey, item);
  }
  const currentByKey = new Map<string, CompareFactItem>();
  for (const item of factItems(current)) {
    currentByKey.set(item.factKey, item);
  }
  const snapshotContent = new Map(
    composeInvestigationFacts(snapshot).map((fact) => [factKey(fact), factContent(fact)]),
  );
  const currentContent = new Map(
    composeInvestigationFacts(current).map((fact) => [factKey(fact), factContent(fact)]),
  );
  const keys = [...new Set([...snapshotByKey.keys(), ...currentByKey.keys()])].sort();
  const items: CompareFactItem[] = [];
  for (const factKey of keys) {
    const snapshotItem = snapshotByKey.get(factKey);
    const currentItem = currentByKey.get(factKey);
    if (snapshotItem && currentItem) {
      const same = JSON.stringify(snapshotContent.get(factKey)) ===
        JSON.stringify(currentContent.get(factKey));
      items.push({
        ...currentItem,
        status: same ? "unchanged" : "changed",
      });
    } else if (snapshotItem) {
      items.push({ ...snapshotItem, status: "snapshot_only" });
    } else {
      items.push({ ...currentItem!, status: "current_only" });
    }
  }
  return { name: "KNOWN FACTS", items };
}

// ---------------------------------------------------------------------------
// MISSING CONTEXT

function missingContextKey(item: MissingContextItem): string {
  const scope = `${item.scope.role}\u0000${item.scope.resourceId}`;
  switch (item.kind) {
    case "never_successfully_refreshed":
    case "unknown_current_authority":
      return `${item.kind}\u0000${scope}\u0000${item.family}`;
    case "code_mapped_to_without_shared_commit":
      return `${item.kind}\u0000${scope}\u0000${item.relationshipId}`;
    case "shared_commit_correspondence_missing":
      return `${item.kind}\u0000${scope}\u0000${item.commitSha}\u0000${item.groupRelationshipKind}`;
    default:
      return `${item.kind}\u0000${scope}`;
  }
}

function missingContextLabel(item: MissingContextItem): {
  family: ProviderActivityFamily | null;
  scopeResourceId: string | null;
  scopeRole: "subject" | "related" | null;
  relationshipId: string | null;
  commitSha: string | null;
} {
  if (item.kind === "never_successfully_refreshed" || item.kind === "unknown_current_authority") {
    return {
      family: item.family,
      scopeResourceId: item.scope.resourceId,
      scopeRole: item.scope.role,
      relationshipId: null,
      commitSha: null,
    };
  }
  if (item.kind === "code_mapped_to_without_shared_commit") {
    return {
      family: null,
      scopeResourceId: item.scope.resourceId,
      scopeRole: item.scope.role,
      relationshipId: item.relationshipId,
      commitSha: null,
    };
  }
  if (item.kind === "shared_commit_correspondence_missing") {
    return {
      family: null,
      scopeResourceId: item.scope.resourceId,
      scopeRole: item.scope.role,
      relationshipId: item.groupRelationshipId,
      commitSha: item.commitSha,
    };
  }
  return {
    family: null,
    scopeResourceId: item.scope.resourceId,
    scopeRole: item.scope.role,
    relationshipId: null,
    commitSha: null,
  };
}

function missingContextItems(context: InvestigationContext): CompareMissingContextItem[] {
  return composeMissingContext(context).map((item) => {
    const label = missingContextLabel(item);
    return {
      status: "unchanged",
      itemKey: missingContextKey(item),
      kind: item.kind,
      family: label.family,
      scopeResourceId: label.scopeResourceId,
      scopeRole: label.scopeRole,
      relationshipId: label.relationshipId,
      commitSha: label.commitSha,
    };
  });
}

function missingContextSection(
  snapshot: InvestigationContext,
  current: InvestigationContext,
): CompareMissingContextSection {
  const snapshotByKey = new Map(
    missingContextItems(snapshot).map((item) => [item.itemKey, item]),
  );
  const currentByKey = new Map(
    missingContextItems(current).map((item) => [item.itemKey, item]),
  );
  const keys = [...new Set([...snapshotByKey.keys(), ...currentByKey.keys()])].sort();
  const items: CompareMissingContextItem[] = [];
  for (const itemKey of keys) {
    const snapshotItem = snapshotByKey.get(itemKey);
    const currentItem = currentByKey.get(itemKey);
    if (snapshotItem && currentItem) {
      items.push({ ...currentItem, status: "unchanged" });
    } else if (snapshotItem) {
      items.push({ ...snapshotItem, status: "snapshot_only" });
    } else {
      items.push({ ...currentItem!, status: "current_only" });
    }
  }
  return { name: "MISSING CONTEXT", items };
}

// ---------------------------------------------------------------------------
// SHARED COMMIT CONTEXT + CORRESPONDENCE

function sharedCommitItems(context: InvestigationContext): CompareSharedCommitItem[] {
  return composeSharedCommitContext(context).map((group) => ({
    status: "unchanged",
    groupKey: `${group.relationshipKind}\u0000${group.relationshipId}\u0000${group.commitSha}`,
    relationshipId: group.relationshipId,
    relationshipKind: group.relationshipKind,
    commitSha: group.commitSha,
  }));
}

function sharedCommitSection(
  snapshot: InvestigationContext,
  current: InvestigationContext,
): CompareSharedCommitSection {
  const snapshotByKey = new Map(
    sharedCommitItems(snapshot).map((item) => [item.groupKey, item]),
  );
  const currentByKey = new Map(
    sharedCommitItems(current).map((item) => [item.groupKey, item]),
  );
  const keys = [...new Set([...snapshotByKey.keys(), ...currentByKey.keys()])].sort();
  const items: CompareSharedCommitItem[] = [];
  for (const groupKey of keys) {
    const snapshotItem = snapshotByKey.get(groupKey);
    const currentItem = currentByKey.get(groupKey);
    if (snapshotItem && currentItem) {
      items.push({ ...currentItem, status: "unchanged" });
    } else if (snapshotItem) {
      items.push({ ...snapshotItem, status: "snapshot_only" });
    } else {
      items.push({ ...currentItem!, status: "current_only" });
    }
  }
  return { name: "SHARED COMMIT CONTEXT", items };
}

function correspondenceItems(context: InvestigationContext): CompareCorrespondenceItem[] {
  return composeSharedCommitCorrespondences(
    composeSharedCommitContext(context),
  ).map((correspondence) => ({
    status: "unchanged",
    commitSha: correspondence.commitSha,
  }));
}

function correspondenceSection(
  snapshot: InvestigationContext,
  current: InvestigationContext,
): CompareCorrespondenceSection {
  const snapshotByKey = new Map(
    correspondenceItems(snapshot).map((item) => [item.commitSha, item]),
  );
  const currentByKey = new Map(
    correspondenceItems(current).map((item) => [item.commitSha, item]),
  );
  const keys = [...new Set([...snapshotByKey.keys(), ...currentByKey.keys()])].sort();
  const items: CompareCorrespondenceItem[] = [];
  for (const commitSha of keys) {
    const snapshotItem = snapshotByKey.get(commitSha);
    const currentItem = currentByKey.get(commitSha);
    if (snapshotItem && currentItem) {
      items.push({ ...currentItem, status: "unchanged" });
    } else if (snapshotItem) {
      items.push({ ...snapshotItem, status: "snapshot_only" });
    } else {
      items.push({ ...currentItem!, status: "current_only" });
    }
  }
  return { name: "SHARED COMMIT CORRESPONDENCE", items };
}

// ---------------------------------------------------------------------------
// AUTHORITY CLOCKS

type ClockAuthority =
  | { kind: "not_applicable" }
  | {
      kind: "unknown";
      lastSuccessAt: string | null;
      latestAttemptObservedAt: string | null;
      resultCount?: number | null;
    }
  | { kind: "empty"; observedAt: string; resultCount?: number | null }
  | { kind: "populated"; observedAt: string; resultCount?: number | null };

interface ClockSource {
  family: ProviderActivityFamily;
  resourceId: string;
  role: "subject" | "related";
  nativeIds: string[];
  clocks: CompareAuthorityClockRef;
}

function clockSource(
  family: ProviderActivityFamily,
  resourceId: string,
  role: "subject" | "related",
  authority: ClockAuthority,
  nativeIds: string[],
): ClockSource | null {
  if (authority.kind === "not_applicable") return null;
  let refreshObservedAt: string | null;
  let lastSuccessfulObservedAt: string | null;
  let resultCount: number | null;
  let latestAttemptObservedAt: string | null;
  if (authority.kind === "unknown") {
    refreshObservedAt = null;
    lastSuccessfulObservedAt = authority.lastSuccessAt;
    resultCount = authority.resultCount ?? null;
    latestAttemptObservedAt = authority.latestAttemptObservedAt;
  } else {
    refreshObservedAt = authority.observedAt;
    lastSuccessfulObservedAt = authority.observedAt;
    resultCount = authority.resultCount ?? (authority.kind === "empty" ? 0 : null);
    latestAttemptObservedAt = null;
  }
  return {
    family,
    resourceId,
    role,
    nativeIds: [...nativeIds].sort(),
    clocks: {
      authorityKind: authority.kind,
      refreshObservedAt,
      lastSuccessfulObservedAt,
      resultCount,
      latestAttemptObservedAt,
    },
  };
}

function deploymentIds(authority: DeploymentEvidenceAuthority): string[] {
  return authority.kind === "not_applicable"
    ? []
    : authority.deployments.map((deployment) => deployment.uid);
}

function workflowRunIds(authority: WorkflowRunEvidenceAuthority): string[] {
  return authority.kind === "not_applicable"
    ? []
    : authority.runs.map((run) => String(run.runId));
}

function operationIds(authority: NeonOperationEvidenceAuthority): string[] {
  return authority.kind === "not_applicable"
    ? []
    : authority.operations.map((operation) => operation.operationId);
}

function releaseIds(authority: ReleaseEvidenceAuthority): string[] {
  return authority.kind === "not_applicable"
    ? []
    : authority.releases.map((release) => release.version);
}

function issueIds(authority: IssueEvidenceAuthority): string[] {
  return authority.kind === "not_applicable"
    ? []
    : authority.issues.map((issue) => issue.issueId);
}

function familyOrder(family: ProviderActivityFamily): number {
  if (family === "github_workflow_run") return 0;
  if (family === "neon_operation") return 1;
  if (family === "sentry_issue") return 2;
  if (family === "sentry_release") return 3;
  return 4;
}

function collectClockSources(context: InvestigationContext): ClockSource[] {
  const sources = new Map<string, ClockSource>();

  function push(
    family: ProviderActivityFamily,
    resourceId: string,
    role: "subject" | "related",
    authority: ClockAuthority,
    nativeIds: string[],
  ): void {
    const source = clockSource(family, resourceId, role, authority, nativeIds);
    if (!source) return;
    const key = `${family}\u0000${resourceId}`;
    if (!sources.has(key)) {
      sources.set(key, source);
    }
  }

  push(
    "vercel_deployment",
    context.subject.id,
    "subject",
    context.subjectDeployments,
    deploymentIds(context.subjectDeployments),
  );
  push(
    "github_workflow_run",
    context.subject.id,
    "subject",
    context.subjectWorkflowRuns,
    workflowRunIds(context.subjectWorkflowRuns),
  );
  push(
    "neon_operation",
    context.subject.id,
    "subject",
    context.subjectOperations,
    operationIds(context.subjectOperations),
  );
  push(
    "sentry_release",
    context.subject.id,
    "subject",
    context.subjectReleases,
    releaseIds(context.subjectReleases),
  );
  push(
    "sentry_issue",
    context.subject.id,
    "subject",
    context.subjectIssues,
    issueIds(context.subjectIssues),
  );

  for (const neighbor of context.related) {
    if (!neighbor.resource || neighbor.resource.id === context.subject.id) {
      continue;
    }
    push(
      "vercel_deployment",
      neighbor.resource.id,
      "related",
      neighbor.deployments,
      deploymentIds(neighbor.deployments),
    );
    push(
      "github_workflow_run",
      neighbor.resource.id,
      "related",
      neighbor.workflowRuns,
      workflowRunIds(neighbor.workflowRuns),
    );
    push(
      "neon_operation",
      neighbor.resource.id,
      "related",
      neighbor.operations,
      operationIds(neighbor.operations),
    );
    push(
      "sentry_release",
      neighbor.resource.id,
      "related",
      neighbor.releases,
      releaseIds(neighbor.releases),
    );
    push(
      "sentry_issue",
      neighbor.resource.id,
      "related",
      neighbor.issues,
      issueIds(neighbor.issues),
    );
  }

  return [...sources.values()].sort((left, right) => {
    const byFamily = familyOrder(left.family) - familyOrder(right.family);
    if (byFamily !== 0) return byFamily;
    const byRole = left.role === right.role ? 0 : left.role === "subject" ? -1 : 1;
    if (byRole !== 0) return byRole;
    return compareAscending(left.resourceId, right.resourceId);
  });
}

function sameClocks(
  left: CompareAuthorityClockRef,
  right: CompareAuthorityClockRef,
): boolean {
  return (
    left.authorityKind === right.authorityKind &&
    left.refreshObservedAt === right.refreshObservedAt &&
    left.lastSuccessfulObservedAt === right.lastSuccessfulObservedAt &&
    left.resultCount === right.resultCount &&
    left.latestAttemptObservedAt === right.latestAttemptObservedAt
  );
}

function authorityClocksSection(
  snapshot: InvestigationContext,
  current: InvestigationContext,
): CompareAuthorityClocksSection {
  const snapshotSources = new Map(
    collectClockSources(snapshot).map((source) => [
      `${source.family}\u0000${source.resourceId}`,
      source,
    ]),
  );
  const currentSources = new Map(
    collectClockSources(current).map((source) => [
      `${source.family}\u0000${source.resourceId}`,
      source,
    ]),
  );
  const items: CompareAuthorityClockItem[] = [];
  const keys = [...new Set([...snapshotSources.keys(), ...currentSources.keys()])].sort();
  for (const key of keys) {
    const snapshotSource = snapshotSources.get(key);
    const currentSource = currentSources.get(key);
    if (!snapshotSource || !currentSource) continue;
    // Structural change (native identities differ) is owned by KNOWN FACTS.
    if (
      JSON.stringify(snapshotSource.nativeIds) !==
      JSON.stringify(currentSource.nativeIds)
    ) {
      continue;
    }
    if (sameClocks(snapshotSource.clocks, currentSource.clocks)) continue;
    items.push({
      status: "changed",
      family: currentSource.family,
      scopeResourceId: currentSource.resourceId,
      scopeRole: currentSource.role,
      snapshotClocks: snapshotSource.clocks,
      currentClocks: currentSource.clocks,
    });
  }
  return { name: "AUTHORITY CLOCKS", items };
}

// ---------------------------------------------------------------------------
// Pure compare

/**
 * Pure, deterministic, bounded comparison of a saved snapshot against a live
 * one-hop compose of the same subject. Never persists, never rewrites the
 * snapshot, and performs no reads or provider calls of its own.
 */
export function compareInvestigationContexts(
  snapshot: SavedInvestigation,
  current: InvestigationContext | null,
  comparedAt: string,
): InvestigationCompare {
  const base = {
    snapshotId: snapshot.id,
    subjectResourceId: snapshot.subjectResourceId,
    snapshotComposedAt: snapshot.composedAt,
    comparedAt,
  };
  if (!current) {
    return {
      ...base,
      currentStatus: "subject_missing",
      sections: [subjectSection(snapshot.snapshot, null)],
    };
  }
  return {
    ...base,
    currentStatus: "available",
    sections: [
      subjectSection(snapshot.snapshot, current),
      relationshipsSection(snapshot.snapshot, current),
      relatedResourcesSection(snapshot.snapshot, current),
      knownFactsSection(snapshot.snapshot, current),
      missingContextSection(snapshot.snapshot, current),
      sharedCommitSection(snapshot.snapshot, current),
      correspondenceSection(snapshot.snapshot, current),
      authorityClocksSection(snapshot.snapshot, current),
    ],
  };
}

export interface CompareInvestigationOptions {
  baseDir: string;
  investigationId: string;
  comparedAt?: string;
}

/**
 * Load one saved snapshot and compose a live one-hop investigation of the
 * same subject from the current local store. A missing subject Resource is a
 * reported status (subject_missing), not a command failure; any other error
 * propagates unchanged.
 */
export function compareInvestigationToCurrent(
  options: CompareInvestigationOptions,
): InvestigationCompare {
  const saved = getSavedInvestigation(options.baseDir, options.investigationId);
  let current: InvestigationContext | null = null;
  try {
    current = getInvestigationContext({
      baseDir: options.baseDir,
      resourceRef: saved.subjectResourceId,
    });
  } catch (err) {
    if (err instanceof CombieError && err.code === "RESOURCE_NOT_FOUND") {
      current = null;
    } else {
      throw err;
    }
  }
  return compareInvestigationContexts(
    saved,
    current,
    options.comparedAt ?? new Date().toISOString(),
  );
}

// ---------------------------------------------------------------------------
// CLI rendering

const STATUS_WORDS: Record<string, string> = {
  unchanged: "SAME",
  changed: "CHANGED",
  snapshot_only: "SNAPSHOT ONLY",
  current_only: "CURRENT ONLY",
  dangling: "DANGLING",
};

function renderMatchOrItems<T>(
  items: T[],
  label: (item: T) => string,
): string[] {
  if (items.length === 0) return ["  MATCH"];
  if (items.every((item) => (item as { status: string }).status === "unchanged")) {
    return [`  MATCH (${items.length})`];
  }
  const lines: string[] = [];
  for (const item of items) {
    const status = (item as { status: string }).status;
    if (status === "unchanged") continue;
    lines.push(`  ${STATUS_WORDS[status]}  ${label(item)}`);
  }
  return lines;
}

function fieldLabel(field: string): string {
  if (field === "providerResourceId") return "provider resource id";
  return field;
}

function factLabelText(item: CompareFactItem): string {
  const parts: string[] = [item.kind];
  if (item.family) parts.push(item.family);
  if (item.scopeRole && item.scopeResourceId) {
    parts.push(`${item.scopeRole} ${item.scopeResourceId}`);
  }
  if (item.relationshipId) parts.push(item.relationshipId);
  if (item.commitSha) parts.push(`commit ${item.commitSha}`);
  return parts.join(" · ");
}

function missingLabelText(item: CompareMissingContextItem): string {
  const parts: string[] = [item.kind];
  if (item.family) parts.push(item.family);
  if (item.scopeRole && item.scopeResourceId) {
    parts.push(`${item.scopeRole} ${item.scopeResourceId}`);
  }
  if (item.relationshipId) parts.push(item.relationshipId);
  if (item.commitSha) parts.push(`commit ${item.commitSha}`);
  return parts.join(" · ");
}

function clockDiffLines(
  snapshot: CompareAuthorityClockRef,
  current: CompareAuthorityClockRef,
): string[] {
  const fields: Array<[string, (clocks: CompareAuthorityClockRef) => string]> = [
    ["authority", (clocks) => clocks.authorityKind],
    [
      "refresh observed at",
      (clocks) => clocks.refreshObservedAt ?? "(none)",
    ],
    [
      "last successful observed at",
      (clocks) => clocks.lastSuccessfulObservedAt ?? "(none)",
    ],
    [
      "latest response result count",
      (clocks) =>
        clocks.resultCount == null ? "(none)" : String(clocks.resultCount),
    ],
    [
      "latest attempt observed at",
      (clocks) => clocks.latestAttemptObservedAt ?? "(none)",
    ],
  ];
  const lines: string[] = [];
  for (const [label, get] of fields) {
    const before = get(snapshot);
    const after = get(current);
    if (before !== after) {
      lines.push(`    ${label}: ${before} → ${after}`);
    }
  }
  return lines;
}

function formatSection(section: InvestigationCompareSection): string {
  switch (section.name) {
    case "SUBJECT": {
      const lines = [`SUBJECT`];
      const subject = section as CompareSubjectSection;
      if (subject.fields.every((field) => field.status === "unavailable")) {
        lines.push(
          `  current status: subject_missing`,
          `  The subject Resource is not present in the current local store.`,
          `  Current compose is unavailable; no further sections are compared.`,
          `  The snapshot row is unchanged and remains reopenable.`,
        );
        return lines.join("\n");
      }
      lines.push(`  current status: available`);
      for (const field of subject.fields) {
        const status = field.status === "unchanged" ? "SAME" : "CHANGED";
        const currentValue = field.currentValue ?? "(none)";
        lines.push(
          `  ${fieldLabel(field.field).padEnd(20)} ${field.snapshotValue} → ${currentValue} (${status})`,
        );
      }
      return lines.join("\n");
    }
    case "RELATIONSHIPS": {
      const sectionItems = section as CompareRelationshipsSection;
      const lines = [`RELATIONSHIPS`];
      lines.push(
        ...renderMatchOrItems(
          sectionItems.items,
          (item) =>
            `${(item as CompareRelationshipItem).kind} ${(item as CompareRelationshipItem).relationshipId}`,
        ),
      );
      return lines.join("\n");
    }
    case "RELATED RESOURCES": {
      const sectionItems = section as CompareRelatedResourcesSection;
      const lines = [`RELATED RESOURCES`];
      lines.push(
        ...renderMatchOrItems(
          sectionItems.items,
          (item) => (item as CompareRelatedResourceItem).resourceId,
        ),
      );
      return lines.join("\n");
    }
    case "KNOWN FACTS": {
      const sectionItems = section as CompareKnownFactsSection;
      const lines = [`KNOWN FACTS`];
      lines.push(
        ...renderMatchOrItems(sectionItems.items, (item) =>
          factLabelText(item as CompareFactItem),
        ),
      );
      return lines.join("\n");
    }
    case "MISSING CONTEXT": {
      const sectionItems = section as CompareMissingContextSection;
      const lines = [`MISSING CONTEXT`];
      lines.push(
        ...renderMatchOrItems(sectionItems.items, (item) =>
          missingLabelText(item as CompareMissingContextItem),
        ),
      );
      return lines.join("\n");
    }
    case "SHARED COMMIT CONTEXT": {
      const sectionItems = section as CompareSharedCommitSection;
      const lines = [`SHARED COMMIT CONTEXT`];
      lines.push(
        ...renderMatchOrItems(
          sectionItems.items,
          (item) => {
            const shared = item as CompareSharedCommitItem;
            return `${shared.relationshipKind} ${shared.relationshipId} · commit ${shared.commitSha}`;
          },
        ),
      );
      return lines.join("\n");
    }
    case "SHARED COMMIT CORRESPONDENCE": {
      const sectionItems = section as CompareCorrespondenceSection;
      const lines = [`SHARED COMMIT CORRESPONDENCE`];
      lines.push(
        ...renderMatchOrItems(
          sectionItems.items,
          (item) =>
            `commit ${(item as CompareCorrespondenceItem).commitSha}`,
        ),
      );
      return lines.join("\n");
    }
    case "AUTHORITY CLOCKS": {
      const sectionItems = section as CompareAuthorityClocksSection;
      const lines = [`AUTHORITY CLOCKS`];
      if (sectionItems.items.length === 0) {
        lines.push(`  MATCH`);
        return lines.join("\n");
      }
      for (const item of sectionItems.items) {
        lines.push(
          `  ${item.family} · ${item.scopeRole} ${item.scopeResourceId}`,
          ...clockDiffLines(item.snapshotClocks, item.currentClocks),
        );
      }
      return lines.join("\n");
    }
  }
}

export const COMPARE_BANNER_TITLE = "INVESTIGATION COMPARE";

/** Deterministic CLI presentation of a snapshot-to-current comparison. */
export function formatInvestigationCompare(compare: InvestigationCompare): string {
  const header =
    `${COMPARE_BANNER_TITLE}\n` +
    `Snapshot: ${compare.snapshotId}\n` +
    `Subject: ${compare.subjectResourceId}\n` +
    `Snapshot composed at ${compare.snapshotComposedAt} (retained composition)\n` +
    `Compared at ${compare.comparedAt} (live one-hop compose of the same subject from local store state)\n` +
    `The snapshot is not current provider truth, and the live compose does not prove that providers still agree.`;
  return `${header}\n\n${compare.sections.map(formatSection).join("\n\n")}`;
}