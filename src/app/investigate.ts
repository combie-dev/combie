import type { Change } from "../domain/change.ts";
import type {
  Relationship,
  RelationshipEvidence,
} from "../domain/relationship.ts";
import type { Resource } from "../domain/resource.ts";
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
    }),
  );

  return {
    subject,
    subjectChanges: subjectHistory.changes,
    related,
    subjectDeployments: loadDeploymentAuthority(store, subject),
    subjectWorkflowRuns: loadWorkflowRunAuthority(store, subject),
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
  lines.push(`observed by Combie at: ${d.observedAt}`);
  return lines.join("\n");
}

function formatDeploymentsBlock(
  authority: DeploymentEvidenceAuthority,
): string {
  if (authority.kind === "not_applicable") {
    return "Deployment evidence does not apply to this resource.";
  }
  if (authority.kind === "unknown") {
    const header =
      "Deployment evidence has not been successfully refreshed.";
    if (authority.message) {
      // Message is already redacted at the provider boundary.
      const stale =
        authority.deployments.length > 0
          ? `\n\nPrior recorded deployments (may be stale):\n\n${authority.deployments.map(formatDeployment).join("\n\n")}`
          : "";
      return `${header}\n(${authority.message})${stale}`;
    }
    if (authority.deployments.length > 0) {
      return (
        `${header}\n\nPrior recorded deployments (may be stale):\n\n` +
        authority.deployments.map(formatDeployment).join("\n\n")
      );
    }
    return header;
  }
  if (authority.kind === "empty") {
    return (
      `No deployments recorded for this project yet.\n` +
      `Last successful refresh observed by Combie at: ${authority.observedAt}`
    );
  }
  return authority.deployments.map(formatDeployment).join("\n\n");
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
    const header =
      "Workflow run evidence has not been successfully refreshed.";
    if (authority.message) {
      const stale =
        authority.runs.length > 0
          ? `\n\nPrior recorded workflow runs (may be stale):\n\n${authority.runs.map(formatWorkflowRun).join("\n\n")}`
          : "";
      return `${header}\n(${authority.message})${stale}`;
    }
    if (authority.runs.length > 0) {
      return (
        `${header}\n\nPrior recorded workflow runs (may be stale):\n\n` +
        authority.runs.map(formatWorkflowRun).join("\n\n")
      );
    }
    return header;
  }
  if (authority.kind === "empty") {
    return (
      `No workflow runs recorded for this repository yet.\n` +
      `Last successful refresh observed by Combie at: ${authority.observedAt}`
    );
  }
  return authority.runs.map(formatWorkflowRun).join("\n\n");
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
  const deploymentSection =
    item.deployments.kind === "not_applicable"
      ? ""
      : `\n\nDEPLOYMENTS (newest first)\n\n${formatDeploymentsBlock(item.deployments)}`;
  const workflowSection =
    item.workflowRuns.kind === "not_applicable"
      ? ""
      : `\n\nWORKFLOW RUNS (newest first)\n\n${formatWorkflowRunsBlock(item.workflowRuns)}`;
  return (
    `${direction}\n` +
    `${identity}${stableId}\n` +
    `Evidence: ${formatEvidence(item.relationship.evidence)}\n\n` +
    `CHANGES\n\n${formatChangesBlock(item.changes)}` +
    deploymentSection +
    workflowSection
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

  const subjectDeployments =
    context.subjectDeployments.kind === "not_applicable"
      ? ""
      : `\n\nDEPLOYMENTS (newest first)\n\n${formatDeploymentsBlock(context.subjectDeployments)}`;

  const subjectWorkflowRuns =
    context.subjectWorkflowRuns.kind === "not_applicable"
      ? ""
      : `\n\nWORKFLOW RUNS (newest first)\n\n${formatWorkflowRunsBlock(context.subjectWorkflowRuns)}`;

  const related =
    context.related.length === 0
      ? "No relationships discovered."
      : context.related.map(formatRelatedNeighbor).join("\n\n");

  return (
    `${header}\n\n` +
    `${subjectChanges}` +
    `${subjectDeployments}` +
    `${subjectWorkflowRuns}\n\n` +
    `RELATED CONTEXT\n\n${related}\n\n` +
    `TIMELINE (newest first)\n\n${formatTimeline(context)}`
  );
}
