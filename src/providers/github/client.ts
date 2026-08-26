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

/**
 * Workflow-run list item from GET /repos/{owner}/{repo}/actions/runs.
 * Only investigation-relevant fields are typed; other payload is ignored.
 */
export interface GitHubWorkflowRunListItem {
  id?: number;
  name?: string | null;
  workflow_id?: number;
  run_number?: number;
  run_attempt?: number;
  event?: string;
  status?: string | null;
  conclusion?: string | null;
  head_branch?: string | null;
  head_sha?: string;
  created_at?: string;
  run_started_at?: string;
  updated_at?: string;
  repository?: {
    id?: number;
    name?: string;
    full_name?: string;
  } | null;
  actor?: unknown;
  triggering_actor?: unknown;
  head_commit?: unknown;
  logs_url?: string;
  jobs_url?: string;
  html_url?: string;
}

export interface GitHubWorkflowRunsResponse {
  total_count?: number;
  workflow_runs: GitHubWorkflowRunListItem[];
}

/**
 * Issue list item from GET /repos/{owner}/{repo}/issues.
 * GitHub returns issues AND pull requests as a JSON array (not wrapped).
 * Pull requests are identified by a `pull_request` object; normalize drops them.
 */
export interface GitHubIssueListItem {
  id?: number;
  number?: number;
  state?: string | null;
  title?: string | null;
  body?: string | null;
  comments?: number;
  user?: unknown;
  labels?: unknown;
  assignees?: unknown;
  html_url?: string;
  created_at?: string;
  updated_at?: string | null;
  closed_at?: string | null;
  pull_request?: unknown;
  repository?: {
    id?: number;
    name?: string;
    full_name?: string;
  } | null;
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

  /**
   * List workflow runs for one repository via
   * GET /repos/{owner}/{repo}/actions/runs.
   *
   * Explicit bound: at most `maxPages` pages of `perPage` (default 1×100).
   * Not complete lifetime history. Uses existing API version headers.
   */
  async listWorkflowRuns(
    owner: string,
    repo: string,
    options?: { perPage?: number; maxPages?: number },
  ): Promise<GitHubWorkflowRunListItem[]> {
    const perPage = options?.perPage ?? 100;
    const maxPages = options?.maxPages ?? 1;
    const all: GitHubWorkflowRunListItem[] = [];
    const endpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs`;

    for (let page = 1; page <= maxPages; page++) {
      const path = `${endpoint}?per_page=${perPage}&page=${page}`;
      const response = await this.getJson<GitHubWorkflowRunsResponse>(
        path,
        `List workflow runs for ${owner}/${repo}`,
      );
      if (!Array.isArray(response?.workflow_runs)) {
        throw new GitHubApiError({
          message: `List workflow runs for ${owner}/${repo}: response did not contain a workflow_runs array. Try again.`,
          status: 200,
          endpoint,
        });
      }
      all.push(...response.workflow_runs);
      if (response.workflow_runs.length < perPage) {
        break;
      }
    }

    return all;
  }

  /**
   * List issues for one repository via GET /repos/{owner}/{repo}/issues.
   *
   * Official query: state=all&sort=updated&direction=desc. Response is a
   * JSON array (not wrapped). Explicit bound: at most `maxPages` pages of
   * `perPage` (default 1×100). Not complete lifetime history. GitHub includes
   * pull requests in this list; callers drop rows with `pull_request`.
   */
  async listIssues(
    owner: string,
    repo: string,
    options?: { perPage?: number; maxPages?: number },
  ): Promise<GitHubIssueListItem[]> {
    const perPage = options?.perPage ?? 100;
    const maxPages = options?.maxPages ?? 1;
    const all: GitHubIssueListItem[] = [];
    const endpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`;

    for (let page = 1; page <= maxPages; page++) {
      const path =
        `${endpoint}?state=all&sort=updated&direction=desc` +
        `&per_page=${perPage}&page=${page}`;
      const response = await this.getJson<unknown>(
        path,
        `List issues for ${owner}/${repo}`,
      );
      if (!Array.isArray(response)) {
        throw new GitHubApiError({
          message: `List issues for ${owner}/${repo}: response was not an array. Try again.`,
          status: 200,
          endpoint,
        });
      }
      all.push(...(response as GitHubIssueListItem[]));
      if (response.length < perPage) {
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
        message: `${context}: could not reach GitHub API (${redactSecrets(reason, [this.token])}). Check network connectivity and try again.`,
        status: 0,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    let bodyText = "";
    try {
      bodyText = await response.text();
    } catch {
      throw new GitHubApiError({
        message: githubErrorMessage(context, response.status, "empty response body", [this.token]),
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
          githubErrorMessage(context, response.status, undefined, [this.token]) +
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
        message: githubErrorMessage(context, response.status, messageFromBody, [this.token]),
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
