import { VercelApiError, vercelErrorMessage, redactSecrets } from "./errors.ts";

const DEFAULT_BASE_URL = "https://api.vercel.com";

export type FetchLike = typeof fetch;

export interface VercelUser {
  uid: string;
  email?: string;
  username?: string;
}

export interface VercelUserResponse {
  user: VercelUser;
}

export interface VercelProject {
  id: string;
  name: string;
  framework?: string | null;
  accountId: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface VercelProjectsResponse {
  projects: VercelProject[];
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
    return body.user;
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
