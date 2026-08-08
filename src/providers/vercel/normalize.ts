import { createResource, type Resource } from "../../domain/resource.ts";
import type { VercelProject, VercelProjectLink } from "./client.ts";

export const VERCEL_PROVIDER = "vercel";

const GITHUB_LINK_TYPES = new Set(["github", "github-limited"]);

/**
 * Extract compact GitHub repository identity from Vercel project.link.
 * Only GitHub-linked projects; does not dump the full provider payload.
 */
export function extractGitHubLink(
  link: VercelProjectLink | null | undefined,
): Record<string, string> | null {
  if (!link || typeof link !== "object") return null;
  const type = typeof link.type === "string" ? link.type : "";
  if (!GITHUB_LINK_TYPES.has(type)) return null;

  const org = typeof link.org === "string" ? link.org.trim() : "";
  const repo = typeof link.repo === "string" ? link.repo.trim() : "";
  if (!org || !repo) return null;

  const git: Record<string, string> = {
    provider: "github",
    org,
    repo,
    fullName: `${org}/${repo}`,
    linkType: type,
  };

  if (link.repoId != null && link.repoId !== "") {
    git.repoId = String(link.repoId);
  }

  return git;
}

export function normalizeProject(project: VercelProject): Resource {
  const metadata: Record<string, unknown> = {
    accountId: project.accountId,
  };
  if (project.framework) metadata.framework = project.framework;
  if (project.createdAt != null) {
    metadata.createdAt = new Date(project.createdAt).toISOString();
  }
  if (project.updatedAt != null) {
    metadata.updatedAt = new Date(project.updatedAt).toISOString();
  }

  const git = extractGitHubLink(project.link);
  if (git) {
    metadata.git = git;
  }

  return createResource({
    provider: VERCEL_PROVIDER,
    providerResourceId: project.id,
    kind: "project",
    name: project.name,
    metadata,
  });
}
