import {
  canonicalizeFullGitCommitSha,
  type DeploymentEvidenceAuthority,
  type VercelDeploymentEvidence,
} from "../providers/vercel/deployment.ts";
import type {
  GitHubWorkflowRunEvidence,
  WorkflowRunEvidenceAuthority,
} from "../providers/github/workflow-run.ts";
import {
  type ReleaseEvidenceAuthority,
  type SentryReleaseEvidence,
} from "../providers/sentry/release.ts";
import { isGitHubSentryCodeMappedTo } from "./infer-github-sentry.ts";
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

export interface SharedCommitReleaseMember {
  evidence: SentryReleaseEvidence;
  authorityKind: SharedCommitMemberAuthority;
  role: SharedCommitMemberRole;
}

/**
 * Ephemeral group of provider evidence that reference the same exact Git
 * commit within one proven source_for or code_mapped_to Relationship.
 *
 * Not lineage. Not causality. Not a durable association.
 */
export interface GitCommitEvidenceGroup {
  /** Canonical full Git commit SHA (40 or 64 lowercase hex). */
  commitSha: string;
  /** Canonical Relationship id. */
  relationshipId: string;
  relationshipKind: "source_for" | "code_mapped_to";
  /** GitHub repository Resource id (source endpoint). */
  sourceResourceId: string;
  /** Vercel project or Sentry project Resource id (target endpoint). */
  targetResourceId: string;
  workflowRuns: SharedCommitWorkflowMember[];
  deployments: SharedCommitDeploymentMember[];
  /** Sentry release members (code_mapped_to groups only; empty for source_for). */
  releases: SharedCommitReleaseMember[];
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
  releases: SharedCommitReleaseMember[];
}

/**
 * Pure, deterministic, offline projection of shared Git commit identity across
 * provider evidence already present on an InvestigationContext.
 *
 * Match predicate (all required):
 * 1. a proven source_for (GitHub repository → Vercel project) or
 *    code_mapped_to (GitHub repository → Sentry project) Relationship
 * 2. workflow run bound to that repository Resource
 * 3. deployment / release evidence bound to that target Resource
 * 4. exact equality of canonical full commit SHAs
 *
 * Global SHA matching is forbidden. Pairwise edges are not emitted —
 * many-to-many evidence collapses to one group per (relationship, commitSha).
 * The two relationship kinds never merge into one group.
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

    if (isGitHubVercelSourceFor(rel)) {
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
          releases: [],
          includesUnknownAuthority:
            workflowRuns.some((m) => m.authorityKind === "unknown") ||
            deployments.some((m) => m.authorityKind === "unknown"),
        });
      }
      continue;
    }

    if (isGitHubSentryCodeMappedTo(rel)) {
      const source = byResourceId.get(rel.sourceResourceId);
      const target = byResourceId.get(rel.targetResourceId);
      if (!source || !target) continue;

      const runsBySha = indexWorkflowRunsBySha(source.workflowRuns);
      const releasesBySha = indexReleasesBySha(target.releases);

      const shas = [...runsBySha.keys()]
        .filter((sha) => releasesBySha.has(sha))
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

      for (const commitSha of shas) {
        const workflowRuns = runsBySha.get(commitSha)!;
        const releases = releasesBySha.get(commitSha)!;
        if (workflowRuns.length === 0 || releases.length === 0) continue;

        groups.push({
          commitSha,
          relationshipId: rel.id,
          relationshipKind: "code_mapped_to",
          sourceResourceId: rel.sourceResourceId,
          targetResourceId: rel.targetResourceId,
          workflowRuns,
          deployments: [],
          releases,
          includesUnknownAuthority:
            workflowRuns.some((m) => m.authorityKind === "unknown") ||
            releases.some((m) => m.authorityKind === "unknown"),
        });
      }
      continue;
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
      releases: membersFromReleaseAuthority(context.subjectReleases, "subject"),
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
      releases: membersFromReleaseAuthority(neighbor.releases, "related"),
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

function membersFromReleaseAuthority(
  authority: ReleaseEvidenceAuthority,
  role: SharedCommitMemberRole,
): SharedCommitReleaseMember[] {
  if (authority.kind === "not_applicable") return [];
  const kind = authority.kind;
  return authority.releases.map((evidence) => ({
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

function indexReleasesBySha(
  members: SharedCommitReleaseMember[],
): Map<string, SharedCommitReleaseMember[]> {
  const map = new Map<string, SharedCommitReleaseMember[]>();
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

/**
 * One exact Git commit referenced by Vercel deployment evidence through a
 * proven source_for Relationship and by Sentry release evidence through a
 * proven code_mapped_to Relationship in the same InvestigationContext.
 *
 * Ephemeral correspondence of provider evidence — not a durable association,
 * not a Vercel↔Sentry Relationship, not lineage or causality.
 */
export interface SharedCommitCorrespondence {
  /** Canonical full Git commit SHA shared by both groups. */
  commitSha: string;
  /** Relationship id of the proven source_for group. */
  sourceForRelationshipId: string;
  /** Relationship id of the proven code_mapped_to group. */
  codeMappedToRelationshipId: string;
  /** GitHub repository Resource id shared by both relationship sources. */
  githubRepositoryId: string;
}

function compareAscending(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Pure, deterministic, offline projection of same-SHA release↔deployment
 * correspondence across shared-commit groups already composed from an
 * InvestigationContext.
 *
 * Sprint 047 conditions (all required):
 * 1. a source_for group with at least one deployment member
 * 2. a code_mapped_to group with at least one release member
 * 3. exact equality of canonical full commit SHAs
 * 4. both relationships share the same GitHub repository source Resource
 *
 * One correspondence per SHA (multiple same-kind groups sharing a SHA
 * collapse; deterministic group order decides). Does not mutate input.
 */
export function composeSharedCommitCorrespondences(
  groups: GitCommitEvidenceGroup[],
): SharedCommitCorrespondence[] {
  const sourceForGroups = groups
    .filter(
      (group) =>
        group.relationshipKind === "source_for" &&
        group.deployments.length > 0,
    )
    .sort((left, right) =>
      compareAscending(left.relationshipId, right.relationshipId),
    );
  const mappedBySha = new Map<string, GitCommitEvidenceGroup>();
  for (const group of groups) {
    if (
      group.relationshipKind !== "code_mapped_to" ||
      group.releases.length === 0
    ) {
      continue;
    }
    const existing = mappedBySha.get(group.commitSha);
    if (!existing || group.relationshipId < existing.relationshipId) {
      mappedBySha.set(group.commitSha, group);
    }
  }

  const correspondences: SharedCommitCorrespondence[] = [];
  const seenShas = new Set<string>();
  for (const group of sourceForGroups) {
    if (seenShas.has(group.commitSha)) continue;
    const mapped = mappedBySha.get(group.commitSha);
    if (!mapped || mapped.sourceResourceId !== group.sourceResourceId) continue;
    seenShas.add(group.commitSha);
    correspondences.push({
      commitSha: group.commitSha,
      sourceForRelationshipId: group.relationshipId,
      codeMappedToRelationshipId: mapped.relationshipId,
      githubRepositoryId: group.sourceResourceId,
    });
  }

  correspondences.sort((left, right) =>
    compareAscending(left.commitSha, right.commitSha),
  );
  return correspondences;
}
