import { GitHubApiError, githubErrorMessage, redactSecrets } from "./errors.ts";

const DEFAULT_BASE_URL = "https://api.github.com";

export type FetchLike = typeof fetch;

export interface GitHubUser {
  id: number;
  login: string;
  name?: string | null;
  type?: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch?: string;
  archived?: boolean;
  language?: string | null;
  owner?: {
    login?: string;
    id?: number;
  };
  visibility?: string;
}

export interface GitHubClientOptions {
  token: string;
  fetch?: FetchLike;
  baseUrl?: string;
}

export class GitHubClient {
  private readonly token: string;
  private readonly fetchImpl: FetchLike;
  private readonly baseUrl: string;

  constructor(options: GitHubClientOptions) {
    this.token = options.token;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  /** Validate token and return the authenticated user. */
  async getAuthenticatedUser(): Promise<GitHubUser> {
    return this.getJson<GitHubUser>("/user", "Validate GitHub identity");
  }

  /**
   * List repositories visible to the authenticated user.
   * Paginates until exhausted (100 per page).
   */
  async listRepositories(): Promise<GitHubRepository[]> {
    const all: GitHubRepository[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const path =
        `/user/repos?per_page=${perPage}&page=${page}` +
        `&affiliation=owner,collaborator,organization_member` +
        `&sort=full_name`;
      const batch = await this.getJson<GitHubRepository[]>(
        path,
        "List GitHub repositories",
      );
      all.push(...batch);
      if (batch.length < perPage) {
        break;
      }
      page += 1;
      // Safety cap against runaway pagination
      if (page > 100) {
        break;
      }
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
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "combie",
        },
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "network error";
      throw new GitHubApiError({
        message: `${context}: could not reach GitHub API (${redactSecrets(reason)}). Check network connectivity and try again.`,
        status: 0,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    let bodyText = "";
    try {
      bodyText = await response.text();
    } catch {
      throw new GitHubApiError({
        message: githubErrorMessage(context, response.status, "empty response body"),
        status: response.status,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    let body: unknown;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      throw new GitHubApiError({
        message:
          githubErrorMessage(context, response.status) +
          " (response was not valid JSON)",
        status: response.status,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    if (!response.ok) {
      const messageFromBody =
        body &&
        typeof body === "object" &&
        "message" in body &&
        typeof (body as { message: unknown }).message === "string"
          ? (body as { message: string }).message
          : undefined;
      throw new GitHubApiError({
        message: githubErrorMessage(context, response.status, messageFromBody),
        status: response.status,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    return body as T;
  }
}

export function createGitHubClient(
  token: string,
  options?: Omit<GitHubClientOptions, "token">,
): GitHubClient {
  return new GitHubClient({ token, ...options });
}
