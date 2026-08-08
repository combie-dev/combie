import { createResource, type Resource } from "../../domain/resource.ts";
import { domainToASCII } from "node:url";
import type {
  VercelProject,
  VercelProjectDomain,
  VercelProjectLink,
} from "./client.ts";

export const VERCEL_PROVIDER = "vercel";

const GITHUB_LINK_TYPES = new Set(["github", "github-limited"]);
const VERCEL_DEFAULT_APEX = "vercel.app";

export interface VercelDomainMetadata {
  hostname: string;
  apexName: string;
  custom: true;
}

function normalizeDnsName(
  value: unknown,
  options?: { allowWildcard?: boolean },
): string | null {
  if (typeof value !== "string") return null;

  let name = value.trim().replace(/\.+$/, "");
  const wildcard = options?.allowWildcard === true && name.startsWith("*.");
  if (wildcard) name = name.slice(2);
  if (!name || name.includes("*")) return null;

  const ascii = domainToASCII(name).toLowerCase();
  if (!ascii || ascii.length > 253) return null;
  const labels = ascii.split(".");
  if (
    labels.length < 2 ||
    labels.some(
      (label) =>
        !label ||
        label.length > 63 ||
        label.startsWith("-") ||
        label.endsWith("-"),
    )
  ) {
    return null;
  }

  return wildcard ? `*.${ascii}` : ascii;
}

/**
 * Keep only deterministic custom-domain evidence. Vercel's provider-backed
 * apexName avoids guessing registrable domains from label count.
 */
export function normalizeDomains(
  domains: VercelProjectDomain[],
): VercelDomainMetadata[] {
  const normalized: VercelDomainMetadata[] = [];
  const seen = new Set<string>();

  for (const domain of domains) {
    if (!domain || typeof domain !== "object") continue;
    const hostname = normalizeDnsName(domain.name, { allowWildcard: true });
    const apexName = normalizeDnsName(domain.apexName);
    if (!hostname || !apexName) continue;

    const bareHostname = hostname.startsWith("*.") ? hostname.slice(2) : hostname;
    if (
      apexName === VERCEL_DEFAULT_APEX ||
      bareHostname === VERCEL_DEFAULT_APEX ||
      bareHostname.endsWith(`.${VERCEL_DEFAULT_APEX}`) ||
      seen.has(hostname)
    ) {
      continue;
    }

    seen.add(hostname);
    normalized.push({ hostname, apexName, custom: true });
  }

  return normalized.sort((a, b) => {
    const left = `${a.hostname}\0${a.apexName}`;
    const right = `${b.hostname}\0${b.apexName}`;
    return left < right ? -1 : left > right ? 1 : 0;
  });
}

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

export function normalizeProject(
  project: VercelProject,
  domains?: VercelDomainMetadata[],
): Resource {
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
  if (domains !== undefined) {
    metadata.domains = domains;
  }

  return createResource({
    provider: VERCEL_PROVIDER,
    providerResourceId: project.id,
    kind: "project",
    name: project.name,
    metadata,
  });
}
