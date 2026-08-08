import type { Resource } from "../domain/resource.ts";
import {
  createRelationship,
  type Relationship,
  type RelationshipEvidence,
} from "../domain/relationship.ts";

/**
 * Compact git linkage stored on Vercel project Resource metadata by normalize.
 * Only provider-backed GitHub references are considered.
 */
export interface VercelGitMetadata {
  provider: string;
  org: string;
  repo: string;
  fullName: string;
  repoId?: string;
  linkType?: string;
}

function asGitMetadata(value: unknown): VercelGitMetadata | null {
  if (!value || typeof value !== "object") return null;
  const g = value as Record<string, unknown>;
  const provider = typeof g.provider === "string" ? g.provider : "";
  const org = typeof g.org === "string" ? g.org : "";
  const repo = typeof g.repo === "string" ? g.repo : "";
  const fullName =
    typeof g.fullName === "string" && g.fullName.length > 0
      ? g.fullName
      : org && repo
        ? `${org}/${repo}`
        : "";
  if (provider !== "github" || !org || !repo || !fullName) {
    return null;
  }
  const out: VercelGitMetadata = {
    provider,
    org,
    repo,
    fullName,
  };
  if (typeof g.repoId === "string" && g.repoId.length > 0) {
    out.repoId = g.repoId;
  } else if (typeof g.repoId === "number" && Number.isFinite(g.repoId)) {
    out.repoId = String(g.repoId);
  }
  if (typeof g.linkType === "string" && g.linkType.length > 0) {
    out.linkType = g.linkType;
  }
  return out;
}

/**
 * Find the GitHub repository Resource that matches deterministic Vercel git evidence.
 *
 * Matching rules (no name heuristics):
 * 1. Primary: Vercel `git.repoId` === GitHub `providerResourceId` (numeric id)
 * 2. Fallback (only when repoId is absent): exact `git.fullName` === GitHub `metadata.fullName`
 *
 * Same display names alone never create a Relationship.
 */
export function matchGitHubRepository(
  git: VercelGitMetadata,
  repositories: Resource[],
): Resource | null {
  if (git.repoId) {
    const byId = repositories.find((r) => r.providerResourceId === git.repoId);
    return byId ?? null;
  }
  const byFullName = repositories.find((r) => {
    const fullName = r.metadata.fullName;
    return typeof fullName === "string" && fullName === git.fullName;
  });
  return byFullName ?? null;
}

function evidenceFor(
  git: VercelGitMetadata,
): RelationshipEvidence {
  const evidence: RelationshipEvidence = {
    source: "vercel",
    mechanism: "git_repository_reference",
    repository: git.fullName,
  };
  if (git.repoId) {
    evidence.githubRepoId = git.repoId;
  }
  if (git.linkType) {
    evidence.vercelLinkType = git.linkType;
  }
  return evidence;
}

/**
 * Infer GitHub repository → source_for → Vercel project Relationships
 * from currently stored Resources. Deterministic only.
 */
export function inferGitHubVercelRelationships(
  resources: Resource[],
): Relationship[] {
  const repositories = resources.filter(
    (r) => r.provider === "github" && r.kind === "repository",
  );
  const projects = resources.filter(
    (r) => r.provider === "vercel" && r.kind === "project",
  );

  if (repositories.length === 0 || projects.length === 0) {
    return [];
  }

  const results: Relationship[] = [];
  const seen = new Set<string>();

  for (const project of projects) {
    const git = asGitMetadata(project.metadata.git);
    if (!git) continue;

    const repo = matchGitHubRepository(git, repositories);
    if (!repo) continue;

    const relationship = createRelationship({
      sourceResourceId: repo.id,
      targetResourceId: project.id,
      kind: "source_for",
      evidence: evidenceFor(git),
    });

    if (seen.has(relationship.id)) continue;
    seen.add(relationship.id);
    results.push(relationship);
  }

  return results;
}

/** Whether a stored Relationship belongs to this Sprint 005 inference path. */
export function isGitHubVercelSourceFor(rel: {
  kind: string;
  sourceResourceId: string;
  targetResourceId: string;
}): boolean {
  return (
    rel.kind === "source_for" &&
    rel.sourceResourceId.startsWith("github:repository:") &&
    rel.targetResourceId.startsWith("vercel:project:")
  );
}
