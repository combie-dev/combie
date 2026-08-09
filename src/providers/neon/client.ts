import { NeonApiError, neonErrorMessage, redactSecrets } from "./errors.ts";

const DEFAULT_BASE_URL = "https://console.neon.tech/api/v2";
const PAGE_LIMIT = 400;
const MAX_PAGES = 100;

export type FetchLike = typeof fetch;

/** Credential owner returned by Neon's universal GET /auth endpoint. */
export interface NeonAuthDetails {
  accountId: string;
  authMethod: "api_key_user" | "api_key_org";
}

interface NeonAuthDetailsRaw {
  account_id?: string;
  auth_method?: string;
}

export interface NeonOrganization {
  id: string;
  name: string;
}

interface NeonOrganizationsResponse {
  organizations?: unknown;
}

/**
 * Project shape returned by GET /projects. Wire field names are preserved;
 * volatile usage fields (active_time, cpu_used_sec, ...) are deliberately
 * left untyped so they are never consumed.
 */
export interface NeonProject {
  id: string;
  name: string;
  region_id?: string;
  pg_version?: number;
  org_id?: string;
  org_name?: string;
  created_at?: string;
}

interface NeonProjectsResponse {
  projects?: unknown;
  unavailable_project_ids?: unknown;
  pagination?: {
    cursor?: string;
  };
}

/** Branch shape returned by GET /projects/{id}/branches. */
export interface NeonBranch {
  id?: string;
  name?: string;
  default?: boolean;
  protected?: boolean;
}

interface NeonBranchesResponse {
  branches?: unknown;
  pagination?: {
    next?: string;
    sort_by?: string;
    sort_order?: string;
  };
}

/** Database shape returned by GET /projects/{id}/branches/{id}/databases. */
export interface NeonDatabase {
  id?: number;
  branch_id?: string;
  name?: string;
  owner_name?: string;
}

interface NeonDatabasesResponse {
  databases?: unknown;
}

/** Endpoint shape returned by GET /projects/{id}/endpoints. */
export interface NeonEndpoint {
  id?: string;
  branch_id?: string;
  host?: string;
  type?: string;
}

interface NeonEndpointsResponse {
  endpoints?: unknown;
}

export interface NeonClientOptions {
  token: string;
  fetch?: FetchLike;
  baseUrl?: string;
}

export class NeonClient {
  private readonly token: string;
  private readonly fetchImpl: FetchLike;
  private readonly baseUrl: string;

  constructor(options: NeonClientOptions) {
    this.token = options.token;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  async getAuthDetails(): Promise<NeonAuthDetails> {
    const body = await this.getJson<NeonAuthDetailsRaw>(
      "/auth",
      "Validate Neon identity",
    );
    const accountId =
      typeof body?.account_id === "string" && body.account_id.trim() !== ""
        ? body.account_id.trim()
        : undefined;
    const authMethod = body?.auth_method;
    if (
      !accountId ||
      (authMethod !== "api_key_user" && authMethod !== "api_key_org")
    ) {
      throw new NeonApiError({
        message:
          "Validate Neon identity: authentication succeeded but no supported account identity was returned. Re-check the API key and try again.",
        status: 200,
        endpoint: "/auth",
      });
    }
    return { accountId, authMethod };
  }

  async listCurrentOrganizations(): Promise<NeonOrganization[]> {
    const endpoint = "/users/me/organizations";
    const response = await this.getJson<NeonOrganizationsResponse>(
      endpoint,
      "Resolve Neon organization scope",
    );
    if (!Array.isArray(response?.organizations)) {
      throw new NeonApiError({
        message:
          "Resolve Neon organization scope: response did not contain an organizations array. Try again.",
        status: 200,
        endpoint,
      });
    }
    return response.organizations as NeonOrganization[];
  }

  /**
   * List projects within one explicitly resolved organization. Organization
   * and project-scoped keys are additionally constrained by their own scope.
   * Pass `pagination.cursor` back unchanged until absent or empty.
   */
  async listProjects(organizationId?: string): Promise<NeonProject[]> {
    const all: NeonProject[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
      if (organizationId) params.set("org_id", organizationId);
      if (cursor) params.set("cursor", cursor);
      const path = `/projects?${params.toString()}`;
      const response = await this.getJson<NeonProjectsResponse>(
        path,
        "List Neon projects",
      );
      if (!Array.isArray(response?.projects)) {
        throw new NeonApiError({
          message:
            "List Neon projects: response did not contain a projects array. Try again.",
          status: 200,
          endpoint: "/projects",
        });
      }
      if (
        Array.isArray(response.unavailable_project_ids) &&
        response.unavailable_project_ids.length > 0
      ) {
        throw new NeonApiError({
          message:
            "List Neon projects: Neon reported an incomplete project inventory. Try again.",
          status: 200,
          endpoint: "/projects",
        });
      }
      for (const project of response.projects) {
        if (
          !project ||
          typeof project !== "object" ||
          typeof (project as NeonProject).id !== "string" ||
          (project as NeonProject).id.trim() === "" ||
          typeof (project as NeonProject).name !== "string" ||
          (project as NeonProject).name.trim() === ""
        ) {
          throw new NeonApiError({
            message:
              "List Neon projects: response contained a project without a stable id and name. Try again.",
            status: 200,
            endpoint: "/projects",
          });
        }
        all.push(project as NeonProject);
      }

      const next = response.pagination?.cursor;
      if (typeof next !== "string" || next.trim() === "" || response.projects.length === 0) {
        return all;
      }
      if (next === cursor) {
        throw new NeonApiError({
          message:
            "List Neon projects: pagination cursor did not advance. Try again.",
          status: 200,
          endpoint: "/projects",
        });
      }
      cursor = next;
    }
    throw new NeonApiError({
      message: `List Neon projects: pagination exceeded ${MAX_PAGES} pages. Narrow the organization scope and try again.`,
      status: 200,
      endpoint: "/projects",
    });
  }

  async listProjectBranches(projectId: string): Promise<NeonBranch[]> {
    const endpoint = `/projects/${encodeURIComponent(projectId)}/branches`;
    const all: NeonBranch[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({
        limit: "10000",
        sort_by: "name",
        sort_order: "asc",
      });
      if (cursor) params.set("cursor", cursor);
      const response = await this.getJson<NeonBranchesResponse>(
        `${endpoint}?${params.toString()}`,
        `List branches for Neon project ${projectId}`,
      );
      if (!Array.isArray(response?.branches)) {
        throw new NeonApiError({
          message: `List branches for Neon project ${projectId}: response did not contain a branches array. Try again.`,
          status: 200,
          endpoint,
        });
      }
      all.push(...(response.branches as NeonBranch[]));
      const next = response.pagination?.next;
      if (
        typeof next !== "string" ||
        next.trim() === "" ||
        response.branches.length === 0
      ) {
        return all;
      }
      if (next === cursor) {
        throw new NeonApiError({
          message: `List branches for Neon project ${projectId}: pagination cursor did not advance. Try again.`,
          status: 200,
          endpoint,
        });
      }
      cursor = next;
    }
    throw new NeonApiError({
      message: `List branches for Neon project ${projectId}: pagination exceeded ${MAX_PAGES} pages. Narrow the project scope and try again.`,
      status: 200,
      endpoint,
    });
  }

  /** Databases are not paginated in the current API schema. */
  async listBranchDatabases(
    projectId: string,
    branchId: string,
  ): Promise<NeonDatabase[]> {
    const endpoint =
      `/projects/${encodeURIComponent(projectId)}/branches/` +
      `${encodeURIComponent(branchId)}/databases`;
    const response = await this.getJson<NeonDatabasesResponse>(
      endpoint,
      `List databases for Neon branch ${branchId}`,
    );
    if (!Array.isArray(response?.databases)) {
      throw new NeonApiError({
        message: `List databases for Neon branch ${branchId}: response did not contain a databases array. Try again.`,
        status: 200,
        endpoint,
      });
    }
    return response.databases as NeonDatabase[];
  }

  /** Endpoints are not paginated in the current API schema. */
  async listProjectEndpoints(projectId: string): Promise<NeonEndpoint[]> {
    const endpoint = `/projects/${encodeURIComponent(projectId)}/endpoints`;
    const response = await this.getJson<NeonEndpointsResponse>(
      endpoint,
      `List endpoints for Neon project ${projectId}`,
    );
    if (!Array.isArray(response?.endpoints)) {
      throw new NeonApiError({
        message: `List endpoints for Neon project ${projectId}: response did not contain an endpoints array. Try again.`,
        status: 200,
        endpoint,
      });
    }
    return response.endpoints as NeonEndpoint[];
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
      throw new NeonApiError({
        message: `${context}: could not reach Neon API (${redactSecrets(reason, [this.token])}). Check network connectivity and try again.`,
        status: 0,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    let bodyText = "";
    try {
      bodyText = await response.text();
    } catch {
      throw new NeonApiError({
        message: neonErrorMessage(
          context,
          response.status,
          "empty response body",
          [this.token],
        ),
        status: response.status,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    let body: unknown;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      throw new NeonApiError({
        message:
          neonErrorMessage(context, response.status, undefined, [this.token]) +
          " (response was not valid JSON)",
        status: response.status,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    if (!response.ok) {
      const messageFromBody = extractErrorMessage(body);
      throw new NeonApiError({
        message: neonErrorMessage(
          context,
          response.status,
          messageFromBody,
          [this.token],
        ),
        status: response.status,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    return body as T;
  }
}

/** Neon errors are top-level `{ code, message }`; tolerate nested `error`. */
function extractErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const record = body as { message?: unknown; error?: unknown };
  if (typeof record.message === "string" && record.message.trim() !== "") {
    return record.message;
  }
  if (record.error && typeof record.error === "object") {
    const nested = (record.error as { message?: unknown }).message;
    if (typeof nested === "string" && nested.trim() !== "") {
      return nested;
    }
  }
  return undefined;
}

export function createNeonClient(
  token: string,
  options?: Omit<NeonClientOptions, "token">,
): NeonClient {
  return new NeonClient({ token, ...options });
}
