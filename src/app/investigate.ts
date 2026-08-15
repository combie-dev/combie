import type { Change } from "../domain/change.ts";
import type {
  Relationship,
  RelationshipEvidence,
} from "../domain/relationship.ts";
import type { Resource } from "../domain/resource.ts";
import { BINARY_NAME } from "../cli/constants.ts";
import {
  composeWorkflowRunAuthority,
  type GitHubWorkflowRunEvidence,
  type WorkflowRunEvidenceAuthority,
} from "../providers/github/workflow-run.ts";
import {
  composeDeploymentAuthority,
  type DeploymentEvidenceAuthority,
  type VercelDeploymentEvidence,
} from "../providers/vercel/deployment.ts";
import {
  composeNeonOperationAuthority,
  type NeonOperationEvidence,
  type NeonOperationEvidenceAuthority,
} from "../providers/neon/operation.ts";
import {
  composeReleaseAuthority,
  type ReleaseEvidenceAuthority,
  type SentryReleaseEvidence,
} from "../providers/sentry/release.ts";
import { Store } from "../storage/store.ts";
import { CombieError, notInitialized } from "./errors.ts";
import { getResourceHistoryForResource } from "./history.ts";
import {
  getRelatedContextForResource,
  type RelatedDirection,
  type RelatedNeighbor,
} from "./related.ts";
import {
  composeProviderActivityChronology,
  nativeEvidenceId,
  type ProviderActivityEntry,
} from "./provider-activity.ts";
import {
  composeInvestigationFacts,
  type InvestigationFact,
  type InvestigationFactActivityRef,
  type InvestigationFactStateGroup,
} from "./investigation-facts.ts";
import {
  composeMissingContext,
  formatMissingContextItem,
} from "./missing-context.ts";
import {
  composeInvestigationTimeline,
  type InvestigationTimelineEntry,
} from "./timeline.ts";
import {
  composeSharedCommitContext,
  type GitCommitEvidenceGroup,
} from "./shared-commit-context.ts";

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
  /**
   * Vercel deployment evidence for a one-hop Vercel project neighbor.
   * not_applicable for non-Vercel neighbors or dangling edges.
   */
  deployments: DeploymentEvidenceAuthority;
  /**
   * GitHub workflow-run evidence for a one-hop GitHub repository neighbor.
   * not_applicable for non-GitHub neighbors or dangling edges.
   */
  workflowRuns: WorkflowRunEvidenceAuthority;
  /** Neon operation evidence for a one-hop Neon project neighbor. */
  operations: NeonOperationEvidenceAuthority;
  /** Sentry release evidence for a one-hop Sentry project neighbor. */
  releases: ReleaseEvidenceAuthority;
}

/**
 * Ephemeral, non-persistent composition of what Combie already knows around
 * one exact Resource. One hop only — no graph traversal or inference.
 */
export interface InvestigationContext {
  subject: Resource;
  subjectChanges: Change[];
  related: InvestigationNeighbor[];
  /** Deployment evidence for the subject (Vercel projects only). */
  subjectDeployments: DeploymentEvidenceAuthority;
  /** Workflow-run evidence for the subject (GitHub repositories only). */
  subjectWorkflowRuns: WorkflowRunEvidenceAuthority;
  /** Operation evidence for the subject (Neon projects only). */
  subjectOperations: NeonOperationEvidenceAuthority;
  /** Release evidence for the subject (Sentry projects only). */
  subjectReleases: ReleaseEvidenceAuthority;
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
      `Resource reference is required.\nUsage: ${BINARY_NAME} investigate <resource-id>\nExample: ${BINARY_NAME} investigate vercel:project:prj_abc\nList ids: ${BINARY_NAME} resources`,
    );
  }

  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();

    const subject = store.getResource(resourceRef);
    if (!subject) {
      throw new CombieError(
        "RESOURCE_NOT_FOUND",
        `Resource not found: ${resourceRef}\nUse a stable resource id (provider:kind:providerResourceId).\nList known resources: ${BINARY_NAME} resources`,
      );
    }

    return getInvestigationContextForResource(store, subject);
  } finally {
    store.close();
  }
}

function loadDeploymentAuthority(
  store: Store,
  resource: Resource | null,
): DeploymentEvidenceAuthority {
  if (!resource) {
    return { kind: "not_applicable" };
  }
  if (resource.provider !== "vercel" || resource.kind !== "project") {
    return { kind: "not_applicable" };
  }
  const refresh = store.getVercelDeploymentRefresh(resource.id);
  const deployments = store.listVercelDeploymentsForResource(resource.id);
  return composeDeploymentAuthority(
    resource.id,
    resource.provider,
    resource.kind,
    refresh,
    deployments,
  );
}

function loadWorkflowRunAuthority(
  store: Store,
  resource: Resource | null,
): WorkflowRunEvidenceAuthority {
  if (!resource) {
    return { kind: "not_applicable" };
  }
  if (resource.provider !== "github" || resource.kind !== "repository") {
    return { kind: "not_applicable" };
  }
  const refresh = store.getGitHubWorkflowRunRefresh(resource.id);
  const runs = store.listGitHubWorkflowRunsForResource(resource.id);
  return composeWorkflowRunAuthority(
    resource.provider,
    resource.kind,
    refresh,
    runs,
  );
}

function loadNeonOperationAuthority(
  store: Store,
  resource: Resource | null,
): NeonOperationEvidenceAuthority {
  if (
    !resource ||
    resource.provider !== "neon" ||
    resource.kind !== "project"
  ) {
    return { kind: "not_applicable" };
  }
  return composeNeonOperationAuthority(
    resource.provider,
    resource.kind,
    store.getNeonOperationRefresh(resource.id),
    store.listNeonOperationsForResource(resource.id),
  );
}

function loadReleaseAuthority(
  store: Store,
  resource: Resource | null,
): ReleaseEvidenceAuthority {
  if (
    !resource ||
    resource.provider !== "sentry" ||
    resource.kind !== "project"
  ) {
    return { kind: "not_applicable" };
  }
  return composeReleaseAuthority(
    resource.provider,
    resource.kind,
    store.getSentryReleaseRefresh(resource.id),
    store.listSentryReleasesForResource(resource.id),
  );
}

/**
 * Compose investigation context for an already-resolved subject Resource.
 * Reuses one-hop related-context and per-Resource history reads.
 * Provider evidence is read-only local state (no provider calls).
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
      deployments: loadDeploymentAuthority(store, neighbor.resource),
      workflowRuns: loadWorkflowRunAuthority(store, neighbor.resource),
      operations: loadNeonOperationAuthority(store, neighbor.resource),
      releases: loadReleaseAuthority(store, neighbor.resource),
    }),
  );

  return {
    subject,
    subjectChanges: subjectHistory.changes,
    related,
    subjectDeployments: loadDeploymentAuthority(store, subject),
    subjectWorkflowRuns: loadWorkflowRunAuthority(store, subject),
    subjectOperations: loadNeonOperationAuthority(store, subject),
    subjectReleases: loadReleaseAuthority(store, subject),
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

function formatProviderMs(ms: number): string {
  return new Date(ms).toISOString();
}

function formatDeployment(d: VercelDeploymentEvidence): string {
  const lines = [
    `uid: ${d.uid}`,
    `created at: ${formatProviderMs(d.createdAtMs)}`,
  ];
  if (d.buildingAtMs != null) {
    lines.push(`building at: ${formatProviderMs(d.buildingAtMs)}`);
  }
  if (d.readyAtMs != null) {
    lines.push(`ready at: ${formatProviderMs(d.readyAtMs)}`);
  }
  if (d.readyState) lines.push(`readyState: ${d.readyState}`);
  if (d.state && d.state !== d.readyState) lines.push(`state: ${d.state}`);
  if (d.target) lines.push(`target: ${d.target}`);
  if (d.source) lines.push(`source: ${d.source}`);
  if (d.gitCommitSha) lines.push(`git commit sha: ${d.gitCommitSha}`);
  lines.push(`observed by Combie at: ${d.observedAt}`);
  return lines.join("\n");
}

/**
 * Compact local authority marker for detailed evidence sections.
 * Missing Context owns full gap explanation; do not restate it here.
 * Never labels retained rows as "current" or "in latest refresh".
 */
function formatDetailAuthorityMarker(
  kind: "unknown" | "empty" | "populated",
  options: {
    retained: number;
    resultCount: number | null;
    message: string | null;
    emptyObservedAt?: string;
  },
): string {
  if (kind === "unknown") {
    const retained =
      options.retained > 0
        ? " · retained history may be stale"
        : " · no retained rows";
    const msg = options.message ? `\n(${options.message})` : "";
    return `authority: unknown${retained}${msg}`;
  }
  if (kind === "empty") {
    const at = options.emptyObservedAt
      ? ` · last successful refresh observed by Combie at ${options.emptyObservedAt}`
      : "";
    const count =
      options.resultCount === 0
        ? " · latest successful response returned 0"
        : "";
    return `authority: empty${count}${at}`;
  }
  // populated — optional retained vs latest cardinality note (not membership).
  if (
    options.resultCount != null &&
    options.retained !== options.resultCount
  ) {
    return (
      `authority: populated · latest successful response returned ${options.resultCount}; ` +
      `Combie retains ${options.retained} (membership of retained rows is not proven)`
    );
  }
  return "authority: populated";
}

function formatDeploymentsBlock(
  authority: DeploymentEvidenceAuthority,
): string {
  if (authority.kind === "not_applicable") {
    return "Deployment evidence does not apply to this resource.";
  }
  if (authority.kind === "unknown") {
    const marker = formatDetailAuthorityMarker("unknown", {
      retained: authority.deployments.length,
      resultCount: authority.resultCount,
      message: authority.message,
    });
    if (authority.deployments.length === 0) {
      return marker;
    }
    return (
      `${marker}\n\nPrior recorded deployments (may be stale):\n\n` +
      authority.deployments.map(formatDeployment).join("\n\n")
    );
  }
  if (authority.kind === "empty") {
    const marker = formatDetailAuthorityMarker("empty", {
      retained: authority.deployments.length,
      resultCount: authority.resultCount,
      message: null,
      emptyObservedAt: authority.observedAt,
    });
    if (authority.deployments.length === 0) {
      return marker;
    }
    return (
      `${marker}\n\nPreviously recorded deployments (outside the latest successful response):\n\n` +
      authority.deployments.map(formatDeployment).join("\n\n")
    );
  }
  const marker = formatDetailAuthorityMarker("populated", {
    retained: authority.deployments.length,
    resultCount: authority.resultCount,
    message: null,
  });
  if (authority.deployments.length === 0) {
    return marker;
  }
  return `${marker}\n\n${authority.deployments.map(formatDeployment).join("\n\n")}`;
}

function formatWorkflowRun(run: GitHubWorkflowRunEvidence): string {
  const lines = [`run id: ${run.runId}`];
  if (run.name) lines.push(`workflow: ${run.name}`);
  if (run.workflowId != null) lines.push(`workflow id: ${run.workflowId}`);
  if (run.runNumber != null) lines.push(`run number: ${run.runNumber}`);
  if (run.runAttempt != null) lines.push(`run attempt: ${run.runAttempt}`);
  if (run.event) lines.push(`event: ${run.event}`);
  if (run.status) lines.push(`status: ${run.status}`);
  if (run.conclusion) lines.push(`conclusion: ${run.conclusion}`);
  if (run.headBranch) lines.push(`head branch: ${run.headBranch}`);
  if (run.headSha) lines.push(`head sha: ${run.headSha}`);
  lines.push(`created at: ${run.createdAt}`);
  if (run.runStartedAt) lines.push(`started at: ${run.runStartedAt}`);
  if (run.updatedAt) lines.push(`updated at: ${run.updatedAt}`);
  lines.push(`observed by Combie at: ${run.observedAt}`);
  return lines.join("\n");
}

function formatWorkflowRunsBlock(
  authority: WorkflowRunEvidenceAuthority,
): string {
  if (authority.kind === "not_applicable") {
    return "Workflow run evidence does not apply to this resource.";
  }
  if (authority.kind === "unknown") {
    const marker = formatDetailAuthorityMarker("unknown", {
      retained: authority.runs.length,
      resultCount: authority.resultCount,
      message: authority.message,
    });
    if (authority.runs.length === 0) {
      return marker;
    }
    return (
      `${marker}\n\nPrior recorded workflow runs (may be stale):\n\n` +
      authority.runs.map(formatWorkflowRun).join("\n\n")
    );
  }
  if (authority.kind === "empty") {
    const marker = formatDetailAuthorityMarker("empty", {
      retained: authority.runs.length,
      resultCount: authority.resultCount,
      message: null,
      emptyObservedAt: authority.observedAt,
    });
    if (authority.runs.length === 0) {
      return marker;
    }
    return (
      `${marker}\n\nPreviously recorded workflow runs (outside the latest successful response):\n\n` +
      authority.runs.map(formatWorkflowRun).join("\n\n")
    );
  }
  const marker = formatDetailAuthorityMarker("populated", {
    retained: authority.runs.length,
    resultCount: authority.resultCount,
    message: null,
  });
  // Bounded GitHub note stays factual (cardinality), not row membership.
  const boundNote =
    authority.resultCount === 100
      ? "\n(bounded: ≤100 most-recent runs per repository)"
      : "";
  if (authority.runs.length === 0) {
    return marker + boundNote;
  }
  return (
    `${marker}${boundNote}\n\n` +
    authority.runs.map(formatWorkflowRun).join("\n\n")
  );
}

function formatRelease(release: SentryReleaseEvidence): string {
  const lines = [`version: ${release.version}`];
  if (release.shortVersion) lines.push(`short version: ${release.shortVersion}`);
  if (release.status) lines.push(`status: ${release.status}`);
  lines.push(`created at: ${release.dateCreated}`);
  if (release.dateReleased) {
    lines.push(`released at: ${release.dateReleased}`);
  }
  lines.push(`observed by Combie at: ${release.observedAt}`);
  return lines.join("\n");
}

function formatReleasesBlock(authority: ReleaseEvidenceAuthority): string {
  if (authority.kind === "not_applicable") {
    return "Release evidence does not apply to this resource.";
  }
  if (authority.kind === "unknown") {
    const marker = formatDetailAuthorityMarker("unknown", {
      retained: authority.releases.length,
      resultCount: authority.resultCount,
      message: authority.message,
    });
    if (authority.releases.length === 0) {
      return marker;
    }
    return (
      `${marker}\n\nPrior recorded releases (may be stale):\n\n` +
      authority.releases.map(formatRelease).join("\n\n")
    );
  }
  if (authority.kind === "empty") {
    const marker = formatDetailAuthorityMarker("empty", {
      retained: authority.releases.length,
      resultCount: authority.resultCount,
      message: null,
      emptyObservedAt: authority.observedAt,
    });
    if (authority.releases.length === 0) {
      return marker;
    }
    return (
      `${marker}\n\nPreviously recorded releases (outside the latest successful response):\n\n` +
      authority.releases.map(formatRelease).join("\n\n")
    );
  }
  const marker = formatDetailAuthorityMarker("populated", {
    retained: authority.releases.length,
    resultCount: authority.resultCount,
    message: null,
  });
  const boundNote =
    authority.resultCount === 100
      ? "\n(bounded: ≤100 most-recent releases per project)"
      : "";
  if (authority.releases.length === 0) {
    return marker + boundNote;
  }
  return (
    `${marker}${boundNote}\n\n` +
    authority.releases.map(formatRelease).join("\n\n")
  );
}

function formatNeonOperation(operation: NeonOperationEvidence): string {
  const lines = [
    `operation id: ${operation.operationId}`,
    `action: ${operation.action}`,
    `status: ${operation.status}`,
    `failures count: ${operation.failuresCount}`,
  ];
  if (operation.branchId) lines.push(`branch id: ${operation.branchId}`);
  if (operation.endpointId) lines.push(`endpoint id: ${operation.endpointId}`);
  lines.push(`created at: ${operation.createdAt}`);
  lines.push(`status updated at: ${operation.updatedAt}`);
  if (operation.retryAt) lines.push(`last retried at: ${operation.retryAt}`);
  lines.push(`total duration ms: ${operation.totalDurationMs}`);
  lines.push(`observed by Combie at: ${operation.observedAt}`);
  return lines.join("\n");
}

function formatNeonOperationsBlock(
  authority: NeonOperationEvidenceAuthority,
): string {
  if (authority.kind === "not_applicable") {
    return "Operation evidence does not apply to this resource.";
  }
  if (authority.kind === "unknown") {
    const marker = formatDetailAuthorityMarker("unknown", {
      retained: authority.operations.length,
      resultCount: null,
      message: authority.message,
    });
    if (authority.operations.length === 0) {
      return marker;
    }
    return (
      `${marker}\n\nPrior recorded operations (may be stale):\n\n` +
      authority.operations.map(formatNeonOperation).join("\n\n")
    );
  }
  if (authority.kind === "empty") {
    const marker = formatDetailAuthorityMarker("empty", {
      retained: authority.operations.length,
      resultCount: 0,
      message: null,
      emptyObservedAt: authority.observedAt,
    });
    if (authority.operations.length === 0) {
      return marker;
    }
    return (
      `${marker}\n\nPreviously recorded operations (outside the current retained response):\n\n` +
      authority.operations.map(formatNeonOperation).join("\n\n")
    );
  }
  const marker = formatDetailAuthorityMarker("populated", {
    retained: authority.operations.length,
    resultCount: null,
    message: null,
  });
  if (authority.operations.length === 0) {
    return marker;
  }
  return `${marker}\n\n${authority.operations.map(formatNeonOperation).join("\n\n")}`;
}

/**
 * Group one-hop Relationship entries by neighbor Resource id.
 * Preserves first-appearance (store canonical) order; no ranking.
 */
function groupRelatedNeighbors(
  related: InvestigationNeighbor[],
): InvestigationNeighbor[][] {
  const groups: InvestigationNeighbor[][] = [];
  const byId = new Map<string, InvestigationNeighbor[]>();
  for (const item of related) {
    const id = neighborId(item);
    let group = byId.get(id);
    if (!group) {
      group = [];
      byId.set(id, group);
      groups.push(group);
    }
    group.push(item);
  }
  return groups;
}

function relatedDirectionLine(item: InvestigationNeighbor): string {
  return item.direction === "outbound"
    ? `${item.relationship.kind} →`
    : `← ${item.relationship.kind}`;
}

/**
 * Compact truth marker for one neighbor evidence family.
 * Counts mean "Combie currently retains N rows" — never latest-response
 * membership. Omitted for families that do not apply or when nothing is
 * known and nothing is retained (Missing Context owns that gap).
 */
function formatRelatedFamilyToken(
  label: string,
  kind: "not_applicable" | "unknown" | "empty" | "populated",
  retained: number,
): string | null {
  if (kind === "not_applicable") return null;
  if (kind === "populated") return `${label}=${retained} · authority=populated`;
  if (kind === "empty") {
    return retained === 0
      ? `${label}=0 · authority=empty`
      : `${label}=${retained} retained · authority=empty`;
  }
  return retained === 0 ? null : `${label}=${retained} retained · authority=unknown`;
}

/**
 * Compact per-neighbor summary: Change count + applicable evidence family
 * tokens. A plain count, not significance or ranking.
 */
function formatRelatedSummary(item: InvestigationNeighbor): string {
  const parts = [`changes=${item.changes.length}`];
  const tokens = [
    formatRelatedFamilyToken(
      "deployments",
      item.deployments.kind,
      item.deployments.kind === "not_applicable"
        ? 0
        : item.deployments.deployments.length,
    ),
    formatRelatedFamilyToken(
      "workflowRuns",
      item.workflowRuns.kind,
      item.workflowRuns.kind === "not_applicable"
        ? 0
        : item.workflowRuns.runs.length,
    ),
    formatRelatedFamilyToken(
      "operations",
      item.operations.kind,
      item.operations.kind === "not_applicable"
        ? 0
        : item.operations.operations.length,
    ),
    formatRelatedFamilyToken(
      "releases",
      item.releases.kind,
      item.releases.kind === "not_applicable"
        ? 0
        : item.releases.releases.length,
    ),
  ];
  for (const token of tokens) {
    if (token) parts.push(token);
  }
  return parts.join(" · ");
}

/**
 * Compact RELATED CONTEXT block (Sprint 036): one block per neighbor with all
 * canonical edges, identity, direction, evidence, and plain counts.
 * No nested Change or provider evidence dumps here — DETAILED EVIDENCE owns
 * the complete cards.
 */
function formatRelatedNeighborBlock(group: InvestigationNeighbor[]): string {
  const first = group[0]!;
  const id = neighborId(first);
  const identity = first.resource
    ? `${providerLabel(first.resource.provider)} ${first.resource.kind}: ${resourceDisplayName(first.resource)}\n${first.resource.id}`
    : `${id}\n(missing resource)`;
  const lines = [identity];
  for (const item of group) {
    lines.push(relatedDirectionLine(item));
    lines.push(`Evidence: ${formatEvidence(item.relationship.evidence)}`);
  }
  if (first.resource) {
    lines.push(formatRelatedSummary(first));
  }
  return lines.join("\n");
}

/**
 * Complete provider evidence for one-hop neighbors (Sprint 036).
 * Keeps every full card available while RELATED CONTEXT becomes an index.
 * Omitted entirely when no neighbor has retained evidence rows.
 */
function formatDetailedEvidence(context: InvestigationContext): string {
  const blocks: string[] = [];
  for (const group of groupRelatedNeighbors(context.related)) {
    const first = group[0]!;
    if (!first.resource) continue;
    const sections: string[] = [];
    if (
      first.deployments.kind !== "not_applicable" &&
      first.deployments.deployments.length > 0
    ) {
      sections.push(
        `DEPLOYMENTS (newest first)\n\n${formatDeploymentsBlock(first.deployments)}`,
      );
    }
    if (
      first.workflowRuns.kind !== "not_applicable" &&
      first.workflowRuns.runs.length > 0
    ) {
      sections.push(
        `WORKFLOW RUNS (newest first)\n\n${formatWorkflowRunsBlock(first.workflowRuns)}`,
      );
    }
    if (
      first.operations.kind !== "not_applicable" &&
      first.operations.operations.length > 0
    ) {
      sections.push(
        `OPERATIONS (newest first)\n\n${formatNeonOperationsBlock(first.operations)}`,
      );
    }
    if (
      first.releases.kind !== "not_applicable" &&
      first.releases.releases.length > 0
    ) {
      sections.push(
        `RELEASES (newest first)\n\n${formatReleasesBlock(first.releases)}`,
      );
    }
    if (sections.length === 0) continue;
    const identity =
      `${providerLabel(first.resource.provider)} ${first.resource.kind}: ${resourceDisplayName(first.resource)}\n` +
      first.resource.id;
    const edges = group.map(relatedDirectionLine).join("\n");
    blocks.push(`${identity}\n${edges}\n\n${sections.join("\n\n")}`);
  }
  if (blocks.length === 0) return "";
  return `DETAILED EVIDENCE\n\n${blocks.join("\n\n")}`;
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

/** Combie observation-time surface (Resource Changes). Formerly TIMELINE. */
function formatCombieObservations(context: InvestigationContext): string {
  const timeline = composeInvestigationTimeline(context);
  if (timeline.entries.length === 0) {
    return "No changes recorded in this context yet.";
  }
  return timeline.entries.map(formatTimelineEntry).join("\n\n");
}

function formatActivityAuthorityTag(entry: ProviderActivityEntry): string {
  // Compact trust marker only — Missing Context owns full gap explanation.
  if (entry.authority === "unknown") {
    return "authority=unknown(may be stale)";
  }
  if (entry.authority === "empty") {
    return "authority=empty(previously recorded)";
  }
  return "authority=populated";
}

function formatActivityScope(entry: ProviderActivityEntry): string {
  if (entry.role === "subject") {
    return "role=subject";
  }
  const kinds = [
    ...new Set(entry.relationships.map(({ relationship }) => relationship.kind)),
  ].sort();
  if (kinds.length === 0) {
    return "role=related";
  }
  return `role=related via ${kinds.join(",")}`;
}

/**
 * Compact chronology index row (Sprint 032).
 * Full cards remain in DEPLOYMENTS / WORKFLOW RUNS / OPERATIONS.
 * Does not re-print secondary timestamps or multi-line evidence bodies.
 */
function formatProviderActivityEntry(entry: ProviderActivityEntry): string {
  const id = nativeEvidenceId(entry);
  const scope = formatActivityScope(entry);
  const auth = formatActivityAuthorityTag(entry);

  if (entry.family === "vercel_deployment") {
    const d = entry.evidence;
    const state =
      d.readyState != null
        ? `readyState=${d.readyState}`
        : d.state != null
          ? `state=${d.state}`
          : "readyState=-";
    return (
      `${entry.primaryTime}  Vercel deployment  ${id}  ${state}  ` +
      `${scope}  ${auth}  resource=${entry.resourceId}`
    );
  }

  if (entry.family === "github_workflow_run") {
    const r = entry.evidence;
    const name = r.name ? ` name=${JSON.stringify(r.name)}` : "";
    const status = r.status != null ? ` status=${r.status}` : "";
    const conclusion =
      r.conclusion != null ? ` conclusion=${r.conclusion}` : "";
    return (
      `${entry.primaryTime}  GitHub workflow run  ${id}${name}${status}${conclusion}  ` +
      `${scope}  ${auth}  resource=${entry.resourceId}`
    );
  }

  if (entry.family === "sentry_release") {
    const release = entry.evidence;
    const status = release.status != null ? ` status=${release.status}` : "";
    return (
      `${entry.primaryTime}  Sentry release  ${id}${status}  ` +
      `${scope}  ${auth}  resource=${entry.resourceId}`
    );
  }

  const op = entry.evidence;
  return (
    `${entry.primaryTime}  Neon operation  ${id}  action=${op.action}  ` +
    `status=${op.status}  ${scope}  ${auth}  resource=${entry.resourceId}`
  );
}

/**
 * Ephemeral provider-activity chronology (Sprint 024). Incomplete by design:
 * what Combie currently knows from local provider evidence only.
 * Sprint 032: compact index — not a second full evidence dump.
 */
function formatProviderActivity(context: InvestigationContext): string {
  const chronology = composeProviderActivityChronology(context);
  if (chronology.entries.length === 0) {
    return "No provider activity known for this investigation.";
  }
  return chronology.entries.map(formatProviderActivityEntry).join("\n");
}

function providerActivityName(
  family: InvestigationFactActivityRef["family"],
  count: number,
): string {
  if (family === "vercel_deployment") {
    return count === 1 ? "Vercel deployment" : "Vercel deployments";
  }
  if (family === "github_workflow_run") {
    return count === 1 ? "GitHub workflow run" : "GitHub workflow runs";
  }
  if (family === "sentry_release") {
    return count === 1 ? "Sentry release" : "Sentry releases";
  }
  return count === 1 ? "Neon operation" : "Neon operations";
}

function providerAuthorityName(
  family: InvestigationFactActivityRef["family"],
): string {
  if (family === "vercel_deployment") return "Vercel deployment";
  if (family === "github_workflow_run") return "GitHub workflow-run";
  if (family === "sentry_release") return "Sentry release";
  return "Neon operation";
}

function providerEvidenceNoun(
  family: InvestigationFactActivityRef["family"],
  count: number,
): string {
  if (family === "vercel_deployment") {
    return count === 1 ? "deployment" : "deployments";
  }
  if (family === "github_workflow_run") {
    return count === 1 ? "workflow run" : "workflow runs";
  }
  if (family === "sentry_release") {
    return count === 1 ? "release" : "releases";
  }
  return count === 1 ? "operation" : "operations";
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function formatStateGroups(
  groups: InvestigationFactStateGroup[],
  field: string,
  qualifier: "recorded" | "last recorded",
): string {
  return joinList(
    groups.map(
      (group) =>
        `${group.count} ${group.count === 1 ? "has" : "have"} ${qualifier} ${field}: ${group.value}`,
    ),
  );
}

function newestRecordedState(
  activity: InvestigationFactActivityRef,
): { field: string; value: string | null } {
  if (activity.family === "vercel_deployment") {
    return { field: "readyState", value: activity.recordedReadyState };
  }
  if (activity.family === "github_workflow_run") {
    return { field: "conclusion", value: activity.recordedConclusion };
  }
  if (activity.family === "sentry_release") {
    return { field: "status", value: activity.recordedStatus };
  }
  return { field: "status", value: activity.recordedStatus };
}

function formatInvestigationFact(fact: InvestigationFact): string {
  if (fact.kind === "provider_evidence_authority") {
    const { source } = fact;
    const family = providerAuthorityName(source.family);
    const retained = source.locallyHeldNativeIds.length;
    const retainedNoun = providerEvidenceNoun(source.family, retained);
    const resultCount = source.lastSuccessfulResultCount;
    const lastSuccessAt = source.lastSuccessfulObservedAt;
    const atClause = lastSuccessAt != null ? ` at ${lastSuccessAt}` : "";

    if (source.authority.kind === "unknown") {
      if (resultCount != null) {
        const returnedNoun = providerEvidenceNoun(source.family, resultCount);
        const refreshLabel =
          source.family === "github_workflow_run" && resultCount === 100
            ? "last successful bounded refresh"
            : "last successful refresh";
        if (retained === 0) {
          return (
            `${family} evidence for ${source.scope.resourceId} is currently unknown; ` +
            `the ${refreshLabel}${atClause} returned ${resultCount} ${returnedNoun}.`
          );
        }
        return (
          `${family} evidence for ${source.scope.resourceId} is currently unknown; ` +
          `the ${refreshLabel}${atClause} returned ${resultCount} ${returnedNoun}, ` +
          `and ${retained} previously recorded ${retainedNoun} remain retained locally.`
        );
      }
      if (lastSuccessAt != null) {
        if (retained === 0) {
          return (
            `${family} evidence for ${source.scope.resourceId} is currently unknown; ` +
            `the last successful refresh was observed by Combie at ${lastSuccessAt}.`
          );
        }
        return (
          `${family} evidence for ${source.scope.resourceId} is currently unknown; ` +
          `the last successful refresh was observed by Combie at ${lastSuccessAt}, ` +
          `and ${retained} previously recorded ${retainedNoun} remain retained locally.`
        );
      }
      if (retained === 0) {
        return `${family} evidence for ${source.scope.resourceId} has unknown current refresh authority; no absence can be inferred.`;
      }
      return (
        `${family} evidence for ${source.scope.resourceId} has unknown current refresh authority; ` +
        `${retained} previously recorded ${retainedNoun} may be stale.`
      );
    }

    if (source.authority.kind === "empty") {
      if (source.family === "neon_operation") {
        return retained === 0
          ? `The latest successful Neon operation refresh${atClause} for ${source.scope.resourceId} returned no current operations.`
          : `The latest successful Neon operation refresh${atClause} for ${source.scope.resourceId} returned no current operations; ${retained} previously recorded ${retainedNoun} ${retained === 1 ? "is" : "are"} retained.`;
      }
      if (retained === 0) {
        return (
          `The latest successful ${family} refresh${atClause} for ${source.scope.resourceId} ` +
          `returned no ${providerEvidenceNoun(source.family, 0)}.`
        );
      }
      return (
        `The latest successful ${family} refresh${atClause} for ${source.scope.resourceId} returned no ${providerEvidenceNoun(source.family, 0)}; ` +
        `${retained} previously recorded ${retainedNoun} remain retained locally.`
      );
    }

    // Populated authority fact: only emitted when result count and retained differ.
    const returned = resultCount ?? 0;
    const returnedNoun = providerEvidenceNoun(source.family, returned);
    if (source.family === "github_workflow_run") {
      const bound =
        returned === 100
          ? "bounded GitHub workflow-run refresh"
          : "GitHub workflow-run refresh";
      return (
        `The latest successful ${bound}${atClause} for ${source.scope.resourceId} returned ${returned} ${returnedNoun}; ` +
        `Combie currently retains ${retained} ${retainedNoun} for this repository.`
      );
    }
    return (
      `The latest successful ${family} refresh${atClause} for ${source.scope.resourceId} returned ${returned} ${returnedNoun}; ` +
      `Combie currently retains ${retained} ${retainedNoun} for this resource.`
    );
  }

  if (fact.kind === "provider_state_summary") {
    const historical = fact.evidence.some(
      (item) => item.authority.kind !== "populated",
    );
    const possiblyStale = fact.evidence.some(
      (item) => item.authority.kind === "unknown",
    );
    const activity = providerActivityName(fact.family, fact.totalCount);
    const opening = historical
      ? `Among ${fact.totalCount} previously recorded ${activity}, `
      : `Of ${fact.totalCount} ${activity} held by Combie, `;
    const groups = formatStateGroups(
      fact.groups,
      fact.field,
      historical ? "last recorded" : "recorded",
    );
    return `${opening}${groups}.${possiblyStale ? " Evidence may be stale." : ""}`;
  }

  if (fact.kind === "provider_activity_summary") {
    const families = fact.families.map(
      (group) =>
        `${group.count} ${providerActivityName(group.family, group.count)}`,
    );
    return (
      `Combie currently holds ${fact.totalCount} provider activity records in scope: ` +
      `${joinList(families)}.`
    );
  }

  if (fact.kind === "provider_activity_scope") {
    const subjectPresent = fact.resources.some(
      (resource) => resource.scope.role === "subject",
    );
    const related = fact.resources.filter(
      (resource) => resource.scope.role === "related",
    );
    const relationshipKinds = [
      ...new Set(
        related.flatMap((resource) =>
          resource.scope.relationships.map((path) => path.kind)
        ),
      ),
    ].sort(compareText);
    const paths = relationshipKinds.length > 0
      ? ` through ${joinList(relationshipKinds)}`
      : "";
    if (subjectPresent) {
      return (
        `Known provider activity appears on the subject and ${related.length} ` +
        `directly related ${related.length === 1 ? "Resource" : "Resources"}${paths}.`
      );
    }
    return (
      `Known provider activity rows currently held by Combie come from ${related.length} directly related ` +
      `${related.length === 1 ? "Resource" : "Resources"}${paths}.`
    );
  }

  if (fact.kind === "newest_provider_activity") {
    const selected = fact.selected;
    const name = providerActivityName(selected.family, 1);
    const state = newestRecordedState(selected);
    const stateText = state.value == null
      ? ""
      : `; its ${selected.authority.kind === "populated" ? "recorded" : "last recorded"} ${state.field} is ${state.value}`;
    if (selected.authority.kind === "unknown") {
      return (
        `The newest retained ${name} is ${selected.nativeId}, by ` +
        `${selected.primaryTimeField} ${selected.primaryTime}${stateText}. Evidence may be stale.`
      );
    }
    if (selected.authority.kind === "empty") {
      return (
        `The newest previously recorded ${name} is ${selected.nativeId}, by ` +
        `${selected.primaryTimeField} ${selected.primaryTime}${stateText}.`
      );
    }
    return (
      `The newest known provider activity is ${name} ${selected.nativeId}, by ` +
      `${selected.primaryTimeField} ${selected.primaryTime}${stateText}.`
    );
  }

  const subjectChanges = fact.changes.filter(
    (change) => change.scope.role === "subject",
  ).length;
  const relatedChanges = fact.changes.length - subjectChanges;
  const relatedResources = new Set(
    fact.changes
      .filter((change) => change.scope.role === "related")
      .map((change) => change.scope.resourceId),
  ).size;
  const parts: string[] = [];
  if (subjectChanges > 0) {
    parts.push(
      `${subjectChanges} Resource ${subjectChanges === 1 ? "Change" : "Changes"} for the subject`,
    );
  }
  if (relatedChanges > 0) {
    parts.push(
      `${relatedChanges} Resource ${relatedChanges === 1 ? "Change" : "Changes"} across ${relatedResources} directly related ${relatedResources === 1 ? "Resource" : "Resources"}`,
    );
  }
  return `Combie has recorded ${joinList(parts)}.`;
}

function formatKnownFacts(context: InvestigationContext): string {
  const facts = composeInvestigationFacts(context);
  if (facts.length === 0) {
    return "No additional deterministic facts to summarize from the currently known investigation evidence.";
  }
  return facts.map((fact) => `- ${formatInvestigationFact(fact)}`).join("\n");
}

function formatMissingContext(context: InvestigationContext): string {
  const items = composeMissingContext(context);
  if (items.length === 0) {
    return "No missing or untrusted context is currently known for the supported investigation scope.";
  }
  return items.map((item) => `- ${formatMissingContextItem(item)}`).join("\n");
}

/**
 * Compact SHARED COMMIT CONTEXT section.
 * Omitted entirely when no eligible groups exist (supplemental surface).
 * Never implies lineage, trigger, or current latest-response membership.
 */
export function formatSharedCommitContext(
  groups: GitCommitEvidenceGroup[],
): string {
  if (groups.length === 0) return "";

  const blocks = groups.map((group) => {
    const lines: string[] = [`Commit ${group.commitSha}`];
    if (group.includesUnknownAuthority) {
      lines.push(
        "(among held evidence; not proven latest-response membership; some rows may be stale)",
      );
    } else {
      lines.push(
        "(among held evidence; not proven latest-response membership)",
      );
    }

    lines.push("");
    lines.push("GitHub workflow runs");
    for (const member of group.workflowRuns) {
      const run = member.evidence;
      const parts = [`• ${run.runId}`];
      if (run.name) parts.push(run.name);
      if (run.conclusion) parts.push(`conclusion=${run.conclusion}`);
      else if (run.status) parts.push(`status=${run.status}`);
      lines.push(parts.join(" · "));
    }

    lines.push("");
    lines.push("Vercel deployments");
    for (const member of group.deployments) {
      const d = member.evidence;
      const parts = [`• ${d.uid}`];
      if (d.readyState) parts.push(`readyState=${d.readyState}`);
      lines.push(parts.join(" · "));
    }

    lines.push("");
    lines.push("Basis");
    lines.push("• exact Git commit SHA");
    lines.push(
      `• ${group.sourceResourceId} source_for ${group.targetResourceId}`,
    );
    return lines.join("\n");
  });

  return `SHARED COMMIT CONTEXT\n\n${blocks.join("\n\n")}`;
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

  const knownFacts = `KNOWN FACTS\n\n${formatKnownFacts(context)}`;
  const missingContext = `MISSING CONTEXT\n\n${formatMissingContext(context)}`;

  const subjectDeployments =
    context.subjectDeployments.kind === "not_applicable"
      ? ""
      : `\n\nDEPLOYMENTS (newest first)\n\n${formatDeploymentsBlock(context.subjectDeployments)}`;

  const subjectWorkflowRuns =
    context.subjectWorkflowRuns.kind === "not_applicable"
      ? ""
      : `\n\nWORKFLOW RUNS (newest first)\n\n${formatWorkflowRunsBlock(context.subjectWorkflowRuns)}`;

  const subjectOperations =
    context.subjectOperations.kind === "not_applicable"
      ? ""
      : `\n\nOPERATIONS (newest first)\n\n${formatNeonOperationsBlock(context.subjectOperations)}`;

  const subjectReleases =
    context.subjectReleases.kind === "not_applicable"
      ? ""
      : `\n\nRELEASES (newest first)\n\n${formatReleasesBlock(context.subjectReleases)}`;

  const related =
    context.related.length === 0
      ? "No relationships discovered."
      : groupRelatedNeighbors(context.related)
          .map(formatRelatedNeighborBlock)
          .join("\n\n");

  const sharedCommitGroups = composeSharedCommitContext(context);
  const sharedCommitSection = formatSharedCommitContext(sharedCommitGroups);
  const sharedCommitBlock =
    sharedCommitSection === "" ? "" : `\n\n${sharedCommitSection}`;

  const detailedEvidence = formatDetailedEvidence(context);
  const detailedBlock = detailedEvidence === "" ? "" : `\n\n${detailedEvidence}`;

  // Chronology supplements detailed sections (DEPLOYMENTS / WORKFLOW RUNS /
  // OPERATIONS) and stays separate from Resource Change observations.
  // MISSING CONTEXT sits after KNOWN FACTS so trust boundaries appear before
  // detailed evidence scanning — without ranking or recommendations.
  // SHARED COMMIT CONTEXT is supplemental identity context after RELATED;
  // omitted when empty. Not lineage and not a chronology merge.
  // RELATED CONTEXT is a compact one-hop index (Sprint 036); complete
  // neighbor evidence cards remain under DETAILED EVIDENCE at the end.
  return (
    `${header}\n\n` +
    `${knownFacts}\n\n` +
    `${missingContext}\n\n` +
    `${subjectChanges}` +
    `${subjectDeployments}` +
    `${subjectWorkflowRuns}` +
    `${subjectOperations}` +
    `${subjectReleases}\n\n` +
    `RELATED CONTEXT\n\n${related}` +
    `${sharedCommitBlock}\n\n` +
    `KNOWN PROVIDER ACTIVITY (newest first; incomplete)\n\n` +
    `${formatProviderActivity(context)}\n\n` +
    `COMBIE OBSERVATIONS (newest first)\n\n` +
    `${formatCombieObservations(context)}` +
    `${detailedBlock}`
  );
}
