/**
 * Minimal provider-independent Relationship primitive (Sprint 005).
 *
 * Kind `source_for` means the source Resource is the Git source for the target.
 * Chosen because Vercel project `link` proves a Git repository connection, not
 * deployment semantics — do not call this `deploys_to`.
 *
 * Kind `uses_domain_in` means the source Vercel project has a custom domain
 * whose normalized apex equals the target Cloudflare zone name. It does not
 * claim hosting, deployment, or current DNS routing semantics.
 *
 * Kind `code_mapped_to` means Sentry reports a project-scoped code mapping
 * that configures the source GitHub repository as source-context for the
 * target Sentry project. It does not claim that the repository reports every
 * error to the project, reuse `source_for`, or prove release/issue causality.
 */
export type RelationshipKind = "source_for" | "uses_domain_in" | "code_mapped_to";

/** Compact provenance explaining why the Relationship exists. */
export interface RelationshipEvidence {
  /** Provider that supplied the linking fact (e.g. "vercel"). */
  source: string;
  /** How the link was established (e.g. "git_repository_reference"). */
  mechanism: string;
  /** Canonical owner/repo from provider evidence (source_for). */
  repository?: string;
  /** GitHub numeric repository id when available (source_for). */
  githubRepoId?: string;
  /** Vercel link type when available (source_for). */
  vercelLinkType?: string;
  /** Normalized custom-domain apex (uses_domain_in). */
  apexName?: string;
  /** Custom hostnames supporting the apex match (uses_domain_in). */
  hostnames?: string[];
  /** Sentry-internal repository id when available (code_mapped_to). */
  sentryRepoId?: string;
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
