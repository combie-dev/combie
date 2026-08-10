import type { Relationship } from "../domain/relationship.ts";
import type { Resource } from "../domain/resource.ts";
import type { GitHubWorkflowRunEvidence } from "../providers/github/workflow-run.ts";
import type { NeonOperationEvidence } from "../providers/neon/operation.ts";
import type { VercelDeploymentEvidence } from "../providers/vercel/deployment.ts";
import type { InvestigationContext } from "./investigate.ts";
import type { RelatedDirection } from "./related.ts";

/** Provider-native evidence families that may appear in provider activity. */
export type ProviderActivityFamily =
  | "vercel_deployment"
  | "github_workflow_run"
  | "neon_operation";

/**
 * Refresh/authority class inherited from the source evidence authority.
 * Only kinds that can contribute rows appear here (not not_applicable).
 */
export type ProviderActivityAuthority = "populated" | "empty" | "unknown";

export interface ProviderActivityRelationship {
  relationship: Relationship;
  direction: RelatedDirection;
}

/**
 * One primary chronology entry projected from one durable provider evidence
 * object. Secondary lifecycle timestamps remain on the evidence object itself.
 */
export type ProviderActivityEntry =
  | {
      family: "vercel_deployment";
      evidence: VercelDeploymentEvidence;
      /** Provider-asserted primary time (deployment created), ISO-8601 UTC. */
      primaryTime: string;
      /** Exact provider field that positioned this entry. */
      primaryTimeField: "created";
      role: "subject" | "related";
      resourceId: string;
      relationships: ProviderActivityRelationship[];
      authority: ProviderActivityAuthority;
    }
  | {
      family: "github_workflow_run";
      evidence: GitHubWorkflowRunEvidence;
      primaryTime: string;
      primaryTimeField: "created_at";
      role: "subject" | "related";
      resourceId: string;
      relationships: ProviderActivityRelationship[];
      authority: ProviderActivityAuthority;
    }
  | {
      family: "neon_operation";
      evidence: NeonOperationEvidence;
      primaryTime: string;
      primaryTimeField: "created_at";
      role: "subject" | "related";
      resourceId: string;
      relationships: ProviderActivityRelationship[];
      authority: ProviderActivityAuthority;
    };

export interface ProviderActivityChronology {
  subject: Resource;
  entries: ProviderActivityEntry[];
}

interface RelatedActivitySource {
  resource: Resource;
  relationships: ProviderActivityRelationship[];
  deployments: {
    authority: ProviderActivityAuthority;
    items: VercelDeploymentEvidence[];
  } | null;
  workflowRuns: {
    authority: ProviderActivityAuthority;
    items: GitHubWorkflowRunEvidence[];
  } | null;
  operations: {
    authority: ProviderActivityAuthority;
    items: NeonOperationEvidence[];
  } | null;
}

function compareDescending(left: string, right: string): number {
  return left < right ? 1 : left > right ? -1 : 0;
}

function compareAscending(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function msToIso(ms: number): string {
  return new Date(ms).toISOString();
}

/** Stable native evidence identity for ordering and display. */
export function nativeEvidenceId(entry: ProviderActivityEntry): string {
  switch (entry.family) {
    case "vercel_deployment":
      return entry.evidence.uid;
    case "github_workflow_run":
      return String(entry.evidence.runId);
    case "neon_operation":
      return entry.evidence.operationId;
  }
}

/**
 * Native-id DESC comparator. Integer GitHub run ids compare numerically so
 * that 10 ranks before 9 (matching store `run_id DESC`); other ids use string
 * DESC (matching uid / operation_id ordering elsewhere).
 */
function compareNativeIdDescending(left: string, right: string): number {
  const leftInt = /^[0-9]+$/.test(left) ? Number(left) : null;
  const rightInt = /^[0-9]+$/.test(right) ? Number(right) : null;
  if (
    leftInt != null &&
    rightInt != null &&
    Number.isSafeInteger(leftInt) &&
    Number.isSafeInteger(rightInt)
  ) {
    return rightInt - leftInt;
  }
  return compareDescending(left, right);
}

/**
 * Collect evidence rows from an authority, preserving whether they came from
 * populated / empty (retained history) / unknown (stale) sources.
 * not_applicable and zero-row empty authorities contribute nothing.
 */
function collectDeployments(
  authority: InvestigationContext["subjectDeployments"],
): {
  authority: ProviderActivityAuthority;
  items: VercelDeploymentEvidence[];
} | null {
  if (authority.kind === "not_applicable") return null;
  if (authority.kind === "populated") {
    return { authority: "populated", items: authority.deployments };
  }
  if (authority.kind === "empty") {
    // Successful empty refresh may still retain historical deployments.
    return authority.deployments.length > 0
      ? { authority: "empty", items: authority.deployments }
      : null;
  }
  // unknown — retain stale rows when present
  return authority.deployments.length > 0
    ? { authority: "unknown", items: authority.deployments }
    : null;
}

function collectWorkflowRuns(
  authority: InvestigationContext["subjectWorkflowRuns"],
): {
  authority: ProviderActivityAuthority;
  items: GitHubWorkflowRunEvidence[];
} | null {
  if (authority.kind === "not_applicable") return null;
  if (authority.kind === "populated") {
    return { authority: "populated", items: authority.runs };
  }
  if (authority.kind === "empty") {
    // Successful empty refresh may still retain historical workflow runs.
    return authority.runs.length > 0
      ? { authority: "empty", items: authority.runs }
      : null;
  }
  return authority.runs.length > 0
    ? { authority: "unknown", items: authority.runs }
    : null;
}

function collectOperations(
  authority: InvestigationContext["subjectOperations"],
): {
  authority: ProviderActivityAuthority;
  items: NeonOperationEvidence[];
} | null {
  if (authority.kind === "not_applicable") return null;
  if (authority.kind === "populated") {
    return { authority: "populated", items: authority.operations };
  }
  if (authority.kind === "empty") {
    // Neon empty may retain historical operations outside the current walk.
    return authority.operations.length > 0
      ? { authority: "empty", items: authority.operations }
      : null;
  }
  return authority.operations.length > 0
    ? { authority: "unknown", items: authority.operations }
    : null;
}

function pushDeploymentEntries(
  entries: ProviderActivityEntry[],
  items: VercelDeploymentEvidence[],
  authority: ProviderActivityAuthority,
  role: "subject" | "related",
  relationships: ProviderActivityRelationship[],
): void {
  for (const evidence of items) {
    entries.push({
      family: "vercel_deployment",
      evidence,
      primaryTime: msToIso(evidence.createdAtMs),
      primaryTimeField: "created",
      role,
      resourceId: evidence.resourceId,
      relationships,
      authority,
    });
  }
}

function pushWorkflowRunEntries(
  entries: ProviderActivityEntry[],
  items: GitHubWorkflowRunEvidence[],
  authority: ProviderActivityAuthority,
  role: "subject" | "related",
  relationships: ProviderActivityRelationship[],
): void {
  for (const evidence of items) {
    entries.push({
      family: "github_workflow_run",
      evidence,
      primaryTime: evidence.createdAt,
      primaryTimeField: "created_at",
      role,
      resourceId: evidence.resourceId,
      relationships,
      authority,
    });
  }
}

function pushOperationEntries(
  entries: ProviderActivityEntry[],
  items: NeonOperationEvidence[],
  authority: ProviderActivityAuthority,
  role: "subject" | "related",
  relationships: ProviderActivityRelationship[],
): void {
  for (const evidence of items) {
    entries.push({
      family: "neon_operation",
      evidence,
      primaryTime: evidence.createdAt,
      primaryTimeField: "created_at",
      role,
      resourceId: evidence.resourceId,
      relationships,
      authority,
    });
  }
}

/**
 * Pure temporal projection of provider-native evidence already present on an
 * InvestigationContext. One durable evidence object → one primary activity
 * entry, ordered by provider-asserted created time (newest first).
 *
 * Does not read storage, call providers, persist, mutate input, include
 * Resource Changes, or infer Relationships/correlation.
 */
export function composeProviderActivityChronology(
  context: InvestigationContext,
): ProviderActivityChronology {
  const entries: ProviderActivityEntry[] = [];

  const subjectDeployments = collectDeployments(context.subjectDeployments);
  if (subjectDeployments) {
    pushDeploymentEntries(
      entries,
      subjectDeployments.items,
      subjectDeployments.authority,
      "subject",
      [],
    );
  }
  const subjectRuns = collectWorkflowRuns(context.subjectWorkflowRuns);
  if (subjectRuns) {
    pushWorkflowRunEntries(
      entries,
      subjectRuns.items,
      subjectRuns.authority,
      "subject",
      [],
    );
  }
  const subjectOps = collectOperations(context.subjectOperations);
  if (subjectOps) {
    pushOperationEntries(
      entries,
      subjectOps.items,
      subjectOps.authority,
      "subject",
      [],
    );
  }

  // Group related neighbors by Resource id so multi-edge neighbors dedupe
  // evidence while retaining every Relationship path (same pattern as timeline).
  const relatedByResource = new Map<string, RelatedActivitySource>();
  for (const neighbor of context.related) {
    if (!neighbor.resource || neighbor.resource.id === context.subject.id) {
      continue;
    }

    let source = relatedByResource.get(neighbor.resource.id);
    if (!source) {
      source = {
        resource: neighbor.resource,
        relationships: [],
        deployments: null,
        workflowRuns: null,
        operations: null,
      };
      relatedByResource.set(neighbor.resource.id, source);
    }

    source.relationships.push({
      relationship: neighbor.relationship,
      direction: neighbor.direction,
    });

    // First non-null collection wins for authority+items; evidence is the same
    // Resource so subsequent edges should see the same store-backed rows.
    if (!source.deployments) {
      source.deployments = collectDeployments(neighbor.deployments);
    }
    if (!source.workflowRuns) {
      source.workflowRuns = collectWorkflowRuns(neighbor.workflowRuns);
    }
    if (!source.operations) {
      source.operations = collectOperations(neighbor.operations);
    }
  }

  for (const source of relatedByResource.values()) {
    const rels = source.relationships;
    if (source.deployments) {
      // Dedupe by native id if multiple edges somehow re-listed.
      const seen = new Set<string>();
      const unique = source.deployments.items.filter((d) => {
        if (seen.has(d.uid)) return false;
        seen.add(d.uid);
        return true;
      });
      pushDeploymentEntries(
        entries,
        unique,
        source.deployments.authority,
        "related",
        rels,
      );
    }
    if (source.workflowRuns) {
      const seen = new Set<number>();
      const unique = source.workflowRuns.items.filter((r) => {
        if (seen.has(r.runId)) return false;
        seen.add(r.runId);
        return true;
      });
      pushWorkflowRunEntries(
        entries,
        unique,
        source.workflowRuns.authority,
        "related",
        rels,
      );
    }
    if (source.operations) {
      const seen = new Set<string>();
      const unique = source.operations.items.filter((o) => {
        if (seen.has(o.operationId)) return false;
        seen.add(o.operationId);
        return true;
      });
      pushOperationEntries(
        entries,
        unique,
        source.operations.authority,
        "related",
        rels,
      );
    }
  }

  // Total order:
  //   primaryTime DESC
  //   family ASC (github_workflow_run < neon_operation < vercel_deployment)
  //   nativeEvidenceId DESC (numeric for pure-digit ids; else string)
  entries.sort((left, right) => {
    const byTime = compareDescending(left.primaryTime, right.primaryTime);
    if (byTime !== 0) return byTime;
    const byFamily = compareAscending(left.family, right.family);
    if (byFamily !== 0) return byFamily;
    return compareNativeIdDescending(
      nativeEvidenceId(left),
      nativeEvidenceId(right),
    );
  });

  return { subject: context.subject, entries };
}
