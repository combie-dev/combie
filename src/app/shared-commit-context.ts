import {
  canonicalizeFullGitCommitSha,
  type DeploymentEvidenceAuthority,
  type VercelDeploymentEvidence,
} from "../providers/vercel/deployment.ts";
import type {
  GitHubWorkflowRunEvidence,
  WorkflowRunEvidenceAuthority,
} from "../providers/github/workflow-run.ts";
import { isGitHubVercelSourceFor } from "./infer-github-vercel.ts";
import type { InvestigationContext } from "./investigate.ts";

/** Authority kinds that may hold evidence rows (not not_applicable). */
export type SharedCommitMemberAuthority = "populated" | "empty" | "unknown";

export type SharedCommitMemberRole = "subject" | "related";

export interface SharedCommitWorkflowMember {
  evidence: GitHubWorkflowRunEvidence;
  authorityKind: SharedCommitMemberAuthority;
  role: SharedCommitMemberRole;
}

export interface SharedCommitDeploymentMember {
  evidence: VercelDeploymentEvidence;
  authorityKind: SharedCommitMemberAuthority;
  role: SharedCommitMemberRole;
}

/**
 * Ephemeral group of provider evidence that reference the same exact Git
 * commit within one proven source_for Relationship.
 *
 * Not lineage. Not causality. Not a durable association.
 */
export interface GitCommitEvidenceGroup {
  /** Canonical full Git commit SHA (40 or 64 lowercase hex). */
  commitSha: string;
  /** Canonical source_for Relationship id. */
  relationshipId: string;
  relationshipKind: "source_for";
  /** GitHub repository Resource id (source endpoint). */
  sourceResourceId: string;
  /** Vercel project Resource id (target endpoint). */
  targetResourceId: string;
  workflowRuns: SharedCommitWorkflowMember[];
  deployments: SharedCommitDeploymentMember[];
  /**
   * True when any member was drawn from unknown-authority retained evidence.
   * Groups operate over held evidence and do not prove latest-response membership.
   */
  includesUnknownAuthority: boolean;
}

interface ResourceEvidenceBundle {
  resourceId: string;
  role: SharedCommitMemberRole;
  workflowRuns: SharedCommitWorkflowMember[];
  deployments: SharedCommitDeploymentMember[];
}

/**
 * Pure, deterministic, offline projection of shared Git commit identity across
 * GitHub workflow-run evidence and Vercel deployment evidence already present
 * on an InvestigationContext.
 *
 * Match predicate (all required):
 * 1. source_for Relationship (GitHub repository → Vercel project)
 * 2. workflow run bound to that repository Resource
 * 3. deployment bound to that Vercel project Resource
 * 4. exact equality of canonical full commit SHAs
 *
 * Global SHA matching is forbidden. Pairwise edges are not emitted —
 * many-to-many evidence collapses to one group per (relationship, commitSha).
 */
export function composeSharedCommitContext(
  context: InvestigationContext,
): GitCommitEvidenceGroup[] {
  const bundles = collectResourceBundles(context);
  const byResourceId = new Map(
    bundles.map((b) => [b.resourceId, b] as const),
  );

  const groups: GitCommitEvidenceGroup[] = [];

  for (const neighbor of context.related) {
    const rel = neighbor.relationship;
    if (!isGitHubVercelSourceFor(rel)) continue;

    const source = byResourceId.get(rel.sourceResourceId);
    const target = byResourceId.get(rel.targetResourceId);
    if (!source || !target) continue;

    const runsBySha = indexWorkflowRunsBySha(source.workflowRuns);
    const deploysBySha = indexDeploymentsBySha(target.deployments);

    const shas = [...runsBySha.keys()]
      .filter((sha) => deploysBySha.has(sha))
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    for (const commitSha of shas) {
      const workflowRuns = runsBySha.get(commitSha)!;
      const deployments = deploysBySha.get(commitSha)!;
      if (workflowRuns.length === 0 || deployments.length === 0) continue;

      groups.push({
        commitSha,
        relationshipId: rel.id,
        relationshipKind: "source_for",
        sourceResourceId: rel.sourceResourceId,
        targetResourceId: rel.targetResourceId,
        workflowRuns,
        deployments,
        includesUnknownAuthority:
          workflowRuns.some((m) => m.authorityKind === "unknown") ||
          deployments.some((m) => m.authorityKind === "unknown"),
      });
    }
  }

  groups.sort((a, b) => {
    if (a.relationshipId !== b.relationshipId) {
      return a.relationshipId < b.relationshipId
        ? -1
        : a.relationshipId > b.relationshipId
          ? 1
          : 0;
    }
    return a.commitSha < b.commitSha
      ? -1
      : a.commitSha > b.commitSha
        ? 1
        : 0;
  });

  return groups;
}

function collectResourceBundles(
  context: InvestigationContext,
): ResourceEvidenceBundle[] {
  const bundles: ResourceEvidenceBundle[] = [
    {
      resourceId: context.subject.id,
      role: "subject",
      workflowRuns: membersFromWorkflowAuthority(
        context.subjectWorkflowRuns,
        "subject",
      ),
      deployments: membersFromDeploymentAuthority(
        context.subjectDeployments,
        "subject",
      ),
    },
  ];

  for (const neighbor of context.related) {
    if (!neighbor.resource) continue;
    bundles.push({
      resourceId: neighbor.resource.id,
      role: "related",
      workflowRuns: membersFromWorkflowAuthority(
        neighbor.workflowRuns,
        "related",
      ),
      deployments: membersFromDeploymentAuthority(
        neighbor.deployments,
        "related",
      ),
    });
  }

  return bundles;
}

function membersFromWorkflowAuthority(
  authority: WorkflowRunEvidenceAuthority,
  role: SharedCommitMemberRole,
): SharedCommitWorkflowMember[] {
  if (authority.kind === "not_applicable") return [];
  const kind = authority.kind;
  return authority.runs.map((evidence) => ({
    evidence,
    authorityKind: kind,
    role,
  }));
}

function membersFromDeploymentAuthority(
  authority: DeploymentEvidenceAuthority,
  role: SharedCommitMemberRole,
): SharedCommitDeploymentMember[] {
  if (authority.kind === "not_applicable") return [];
  const kind = authority.kind;
  return authority.deployments.map((evidence) => ({
    evidence,
    authorityKind: kind,
    role,
  }));
}

function indexWorkflowRunsBySha(
  members: SharedCommitWorkflowMember[],
): Map<string, SharedCommitWorkflowMember[]> {
  const map = new Map<string, SharedCommitWorkflowMember[]>();
  for (const member of members) {
    const sha = canonicalizeFullGitCommitSha(member.evidence.headSha);
    if (!sha) continue;
    const list = map.get(sha);
    if (list) list.push(member);
    else map.set(sha, [member]);
  }
  return map;
}

function indexDeploymentsBySha(
  members: SharedCommitDeploymentMember[],
): Map<string, SharedCommitDeploymentMember[]> {
  const map = new Map<string, SharedCommitDeploymentMember[]>();
  for (const member of members) {
    // Prefer already-canonical stored value; re-validate for composition safety.
    const sha = canonicalizeFullGitCommitSha(member.evidence.gitCommitSha);
    if (!sha) continue;
    const list = map.get(sha);
    if (list) list.push(member);
    else map.set(sha, [member]);
  }
  return map;
}
