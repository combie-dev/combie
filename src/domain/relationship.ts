/**
 * Minimal provider-independent Relationship primitive (Sprint 005).
 *
 * Kind `source_for` means the source Resource is the Git source for the target.
 * Chosen because Vercel project `link` proves a Git repository connection, not
 * deployment semantics — do not call this `deploys_to`.
 */
export type RelationshipKind = "source_for";

/** Compact provenance explaining why the Relationship exists. */
export interface RelationshipEvidence {
  /** Provider that supplied the linking fact (e.g. "vercel"). */
  source: string;
  /** How the link was established (e.g. "git_repository_reference"). */
  mechanism: string;
  /** Canonical owner/repo from provider evidence. */
  repository: string;
  /** GitHub numeric repository id when available. */
  githubRepoId?: string;
  /** Vercel link type when available (e.g. "github"). */
  vercelLinkType?: string;
}

export interface Relationship {
  id: string;
  sourceResourceId: string;
  targetResourceId: string;
  kind: RelationshipKind;
  evidence: RelationshipEvidence;
  createdAt: string;
  updatedAt: string;
}

/**
 * Stable Relationship identity derived from endpoints + kind.
 * Format: `rel:${sourceResourceId}:${kind}:${targetResourceId}`
 */
export function relationshipId(
  sourceResourceId: string,
  kind: RelationshipKind,
  targetResourceId: string,
): string {
  return `rel:${sourceResourceId}:${kind}:${targetResourceId}`;
}

export function createRelationship(
  input: Omit<Relationship, "id" | "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
): Relationship {
  const now = new Date().toISOString();
  return {
    id: relationshipId(
      input.sourceResourceId,
      input.kind,
      input.targetResourceId,
    ),
    sourceResourceId: input.sourceResourceId,
    targetResourceId: input.targetResourceId,
    kind: input.kind,
    evidence: input.evidence,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}
