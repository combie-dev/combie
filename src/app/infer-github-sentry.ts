import type { Resource } from "../domain/resource.ts";
import {
  createRelationship,
  type Relationship,
  type RelationshipEvidence,
} from "../domain/relationship.ts";
import {
  parseCodeMappings,
  type SentryCodeMappingFact,
} from "../providers/sentry/code-mapping.ts";

/**
 * Find the GitHub repository Resource that matches a Sentry code-mapping fact.
 *
 * Matching rules (no name heuristics):
 * 1. Primary: mapping `githubRepoId` === GitHub `providerResourceId`
 * 2. Fallback (only when githubRepoId is absent): exact `repository`
 *    === GitHub `metadata.fullName`
 *
 * Same display names alone never create a Relationship.
 */
export function matchGitHubRepositoryForMapping(
  mapping: SentryCodeMappingFact,
  repositories: Resource[],
): Resource | null {
  if (mapping.githubRepoId) {
    return (
      repositories.find((r) => r.providerResourceId === mapping.githubRepoId) ??
      null
    );
  }
  return (
    repositories.find((r) => {
      const fullName = r.metadata.fullName;
      return typeof fullName === "string" && fullName === mapping.repository;
    }) ?? null
  );
}

function evidenceFor(mapping: SentryCodeMappingFact): RelationshipEvidence {
  const evidence: RelationshipEvidence = {
    source: "sentry",
    mechanism: "code_mapping",
    repository: mapping.repository,
  };
  if (mapping.githubRepoId) {
    evidence.githubRepoId = mapping.githubRepoId;
  }
  if (mapping.sentryRepoId) {
    evidence.sentryRepoId = mapping.sentryRepoId;
  }
  return evidence;
}

/**
 * Infer GitHub repository → code_mapped_to → Sentry project Relationships
 * from currently stored Resources. Deterministic only.
 */
export function inferGitHubSentryRelationships(
  resources: Resource[],
): Relationship[] {
  const repositories = resources.filter(
    (r) => r.provider === "github" && r.kind === "repository",
  );
  const projects = resources.filter(
    (r) => r.provider === "sentry" && r.kind === "project",
  );

  if (repositories.length === 0 || projects.length === 0) {
    return [];
  }

  const results: Relationship[] = [];
  const seen = new Set<string>();

  for (const project of projects) {
    const mappings = parseCodeMappings(project.metadata.codeMappings);
    if (!mappings || mappings.length === 0) continue;

    for (const mapping of mappings) {
      const repo = matchGitHubRepositoryForMapping(mapping, repositories);
      if (!repo) continue;

      const relationship = createRelationship({
        sourceResourceId: repo.id,
        targetResourceId: project.id,
        kind: "code_mapped_to",
        evidence: evidenceFor(mapping),
      });

      if (seen.has(relationship.id)) continue;
      seen.add(relationship.id);
      results.push(relationship);
    }
  }

  return results;
}

/** Whether a stored Relationship belongs to this Sprint 045 inference path. */
export function isGitHubSentryCodeMappedTo(rel: {
  kind: string;
  sourceResourceId: string;
  targetResourceId: string;
}): boolean {
  return (
    rel.kind === "code_mapped_to" &&
    rel.sourceResourceId.startsWith("github:repository:") &&
    rel.targetResourceId.startsWith("sentry:project:")
  );
}
