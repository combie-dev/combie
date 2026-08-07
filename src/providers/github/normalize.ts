import { createResource, type Resource } from "../../domain/resource.ts";
import type { GitHubRepository } from "./client.ts";

export const GITHUB_PROVIDER = "github";

/**
 * Normalize a GitHub repository into a Combie Resource.
 * Stable identity uses GitHub's numeric repository id so renames do not fork identity.
 */
export function normalizeRepository(repo: GitHubRepository): Resource {
  const owner = repo.owner?.login ?? repo.full_name.split("/")[0] ?? "";
  const visibility =
    repo.visibility ?? (repo.private ? "private" : "public");

  return createResource({
    provider: GITHUB_PROVIDER,
    providerResourceId: String(repo.id),
    kind: "repository",
    name: repo.name,
    metadata: {
      owner,
      fullName: repo.full_name,
      visibility,
      private: repo.private,
      defaultBranch: repo.default_branch ?? "main",
      archived: repo.archived ?? false,
      htmlUrl: repo.html_url,
      ...(repo.language ? { language: repo.language } : {}),
    },
  });
}
