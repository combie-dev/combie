import { VercelApiError, vercelErrorMessage, redactSecrets } from "./errors.ts";

const DEFAULT_BASE_URL = "https://api.vercel.com";

export type FetchLike = typeof fetch;

/**
 * Authenticated Vercel user.
 *
 * Live GET /v2/user returns `id` (required in current docs). Older responses
 * and some docs historically used `uid`. Both are accepted when parsing.
 */
export interface VercelUser {
  /** Stable user identity (normalized from `id` or legacy `uid`). */
  id: string;
  email?: string;
  username?: string;
  name?: string;
}

/** Raw user object as returned by the Vercel API before identity normalization. */
interface VercelUserRaw {
  id?: string;
  uid?: string;
  email?: string;
  username?: string;
  name?: string;
}

export interface VercelUserResponse {
  user: VercelUserRaw;
}

/**
 * Git repository linkage returned by Vercel on project list/detail.
 * Present when the project is connected to GitHub/GitLab/Bitbucket.
 * Live list (`GET /v9/projects`) includes this when linked.
 */
export interface VercelProjectLink {
  type?: string;
  org?: string;
  repo?: string;
  /** GitHub numeric repository id when type is github / github-limited. */
  repoId?: number | string;
  repoOwnerId?: number | string;
  productionBranch?: string;
  gitCredentialId?: string;
  createdAt?: number;
  updatedAt?: number;
  deployHooks?: unknown[];
  sourceless?: boolean;
}

export interface VercelProject {
  id: string;
  name: string;
  framework?: string | null;
  accountId: string;
  createdAt?: number;
  updatedAt?: number;
  /** Provider-backed Git link; may be absent for CLI-only / unlinked projects. */
  link?: VercelProjectLink | null;
}

export interface VercelProjectsResponse {
  projects: VercelProject[];
  pagination?: {
    count?: number;
    next?: number | string | null;
    prev?: number | string | null;
  };
}

/** Project domain shape returned by GET /v9/projects/{idOrName}/domains. */
export interface VercelProjectDomain {
  name: string;
  apexName?: string;
  projectId?: string;
  verified?: boolean;
}

export interface VercelProjectDomainsResponse {
  domains: VercelProjectDomain[];
  pagination?: {
    count?: number;
    next?: number | string | null;
    prev?: number | string | null;
  };
}

/**
 * Deployment list item from GET /v7/deployments.
 * Only investigation-relevant fields are typed; other payload fields are ignored.
 */
export interface VercelDeploymentListItem {
  uid?: string;
  projectId?: string;
  name?: string;
  url?: string | null;
  created?: number;
  createdAt?: number;
  buildingAt?: number;
  ready?: number;
  readyState?: string;
  state?: string;
  target?: string | null;
  source?: string;
  creator?: unknown;
  meta?: unknown;
  inspectorUrl?: string | null;
  errorMessage?: string | null;
  errorCode?: string;
  deleted?: number;
}

export interface VercelDeploymentsResponse {
  deployments: VercelDeploymentListItem[];
  pagination?: {
    count?: number;
    next?: number | string | null;
    prev?: number | string | null;
  };
}

export interface VercelClientOptions {
  token: string;
  fetch?: FetchLike;
  baseUrl?: string;
}

export class VercelClient {
  private readonly token: string;
  private readonly fetchImpl: FetchLike;
  private readonly baseUrl: string;

  constructor(options: VercelClientOptions) {
    this.token = options.token;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  async getAuthenticatedUser(): Promise<VercelUser> {
    const body = await this.getJson<VercelUserResponse>(
      "/v2/user",
      "Validate Vercel identity",
    );
    const raw = body.user;
    // Live API documents `id`; some historical payloads used `uid`.
    const id =
      typeof raw?.id === "string" && raw.id.trim() !== ""
        ? raw.id
        : typeof raw?.uid === "string" && raw.uid.trim() !== ""
          ? raw.uid
          : undefined;
    if (!id) {
      throw new VercelApiError({
        message:
          "Validate Vercel identity: authentication succeeded but no user id was returned. Re-check the token and try again.",
        status: 200,
        endpoint: "/v2/user",
      });
    }
    return {
      id,
      email: raw.email,
      username: raw.username,
      name: raw.name,
    };
  }

  async listProjects(): Promise<VercelProject[]> {
    const all: VercelProject[] = [];
    let next: string | number | null = null;

    for (let page = 0; page < 100; page++) {
      const path: string = next != null
        ? `/v9/projects?until=${encodeURIComponent(String(next))}`
        : "/v9/projects";
      const response: VercelProjectsResponse = await this.getJson<VercelProjectsResponse>(
        path,
        "List Vercel projects",
      );
      all.push(...response.projects);

      const paginationNext: string | number | null | undefined = response.pagination?.next;
      if (paginationNext == null || response.projects.length === 0) {
        break;
      }
      next = paginationNext;
    }

    return all;
  }

  async listProjectDomains(projectId: string): Promise<VercelProjectDomain[]> {
    const all: VercelProjectDomain[] = [];
    const endpoint = `/v9/projects/${encodeURIComponent(projectId)}/domains`;
    let next: string | number | null = null;

    for (let page = 0; page < 100; page++) {
      const path: string = next != null
        ? `${endpoint}?until=${encodeURIComponent(String(next))}`
        : endpoint;
      const response: VercelProjectDomainsResponse =
        await this.getJson<VercelProjectDomainsResponse>(
          path,
          `List domains for Vercel project ${projectId}`,
        );
      if (!Array.isArray(response?.domains)) {
        throw new VercelApiError({
          message: `List domains for Vercel project ${projectId}: response did not contain a domains array. Try again.`,
          status: 200,
          endpoint,
        });
      }
      all.push(...response.domains);

      const paginationNext: string | number | null | undefined =
        response.pagination?.next;
      if (paginationNext == null || response.domains.length === 0) {
        break;
      }
      next = paginationNext;
    }

    return all;
  }

  /**
   * List deployments for one exact Vercel project via GET /v7/deployments.
   *
   * Filters by projectId so each item's project association is authoritative.
   * Walks pagination.next timestamps with `until` (same family as projects).
   * Does not invent since/watermark incremental sync.
   */
  async listDeploymentsForProject(
    projectId: string,
  ): Promise<VercelDeploymentListItem[]> {
    const all: VercelDeploymentListItem[] = [];
    const basePath = `/v7/deployments?projectId=${encodeURIComponent(projectId)}&limit=100`;
    let next: string | number | null = null;

    for (let page = 0; page < 100; page++) {
      const path: string =
        next != null
          ? `${basePath}&until=${encodeURIComponent(String(next))}`
          : basePath;
      const response: VercelDeploymentsResponse =
        await this.getJson<VercelDeploymentsResponse>(
          path,
          `List deployments for Vercel project ${projectId}`,
        );
      if (!Array.isArray(response?.deployments)) {
        throw new VercelApiError({
          message: `List deployments for Vercel project ${projectId}: response did not contain a deployments array. Try again.`,
          status: 200,
          endpoint: "/v7/deployments",
        });
      }
      all.push(...response.deployments);

      const paginationNext: string | number | null | undefined =
        response.pagination?.next;
      if (paginationNext == null || response.deployments.length === 0) {
        break;
      }
      next = paginationNext;
    }

    return all;
  }

  private async getJson<T>(path: string, context: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
          "User-Agent": "combie",
        },
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "network error";
      throw new VercelApiError({
        message: `${context}: could not reach Vercel API (${redactSecrets(reason)}). Check network connectivity and try again.`,
        status: 0,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    let bodyText = "";
    try {
      bodyText = await response.text();
    } catch {
      throw new VercelApiError({
        message: vercelErrorMessage(context, response.status, "empty response body"),
        status: response.status,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    let body: unknown;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      throw new VercelApiError({
        message:
          vercelErrorMessage(context, response.status) +
          " (response was not valid JSON)",
        status: response.status,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    if (!response.ok) {
      const errorObj =
        body &&
        typeof body === "object" &&
        "error" in body &&
        typeof (body as { error: unknown }).error === "object" &&
        (body as { error: unknown }).error !== null
          ? (body as { error: { message?: string; code?: string } }).error
          : undefined;
      const messageFromBody = errorObj?.message;
      throw new VercelApiError({
        message: vercelErrorMessage(context, response.status, messageFromBody),
        status: response.status,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    return body as T;
  }
}

export function createVercelClient(
  token: string,
  options?: Omit<VercelClientOptions, "token">,
): VercelClient {
  return new VercelClient({ token, ...options });
}
