import { SentryApiError, sentryErrorMessage, redactSecrets } from "./errors.ts";

const DEFAULT_BASE_URL = "https://sentry.io/api/0";
const MAX_PAGES = 100;

export type FetchLike = typeof fetch;

export interface SentryUser {
  id: string;
  name?: string;
  username?: string;
  email?: string;
}

export interface SentryOrganization {
  id: string;
  slug: string;
  name: string;
}

export interface SentryProject {
  /** Stable numeric id as string. */
  id: string;
  slug: string;
  name: string;
  platform?: string | null;
  status?: string;
  dateCreated?: string;
  organization?: {
    id?: string;
    slug?: string;
    name?: string;
  };
}

export interface SentryClientOptions {
  token: string;
  fetch?: FetchLike;
  baseUrl?: string;
}

/**
 * Parse Sentry Link header for next page.
 * Format: `<url>; rel="next"; results="true", <url>; rel="previous"; results="false"`
 * Only follow next when results="true".
 */
export function parseSentryNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;

  // Split on commas that separate link entries (not inside angle brackets).
  const parts = linkHeader.split(/,\s*(?=<)/);
  for (const part of parts) {
    const urlMatch = part.match(/<([^>]+)>/);
    if (!urlMatch) continue;
    const relMatch = part.match(/rel="([^"]+)"/);
    const resultsMatch = part.match(/results="([^"]+)"/);
    if (relMatch?.[1] === "next" && resultsMatch?.[1] === "true") {
      return urlMatch[1] ?? null;
    }
  }
  return null;
}

export function resolveSentryRequestUrl(pathOrUrl: string, baseUrl: string): string {
  if (!pathOrUrl.startsWith("http")) {
    return `${baseUrl}${pathOrUrl}`;
  }

  let candidate: URL;
  let base: URL;
  try {
    candidate = new URL(pathOrUrl);
    base = new URL(baseUrl);
  } catch {
    throw new Error("invalid Sentry request URL");
  }
  if (candidate.origin !== base.origin) {
    throw new Error("Sentry request URL is not the same origin as the configured API");
  }
  return pathOrUrl;
}

export class SentryClient {
  private readonly token: string;
  private readonly fetchImpl: FetchLike;
  private readonly baseUrl: string;

  constructor(options: SentryClientOptions) {
    this.token = options.token;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  /**
   * Validate identity via GET /auth/.
   *
   * Live personal tokens often return 403 on `/users/me/` while `/auth/`
   * returns the authenticated user (id, username, name, email).
   */
  async getAuthenticatedUser(): Promise<SentryUser> {
    const body = await this.getJson<Record<string, unknown>>(
      "/auth/",
      "Validate Sentry identity",
    );
    const id =
      typeof body?.id === "string" && body.id.trim() !== ""
        ? body.id
        : typeof body?.id === "number"
          ? String(body.id)
          : undefined;
    if (!id) {
      throw new SentryApiError({
        message:
          "Validate Sentry identity: authentication succeeded but no user id was returned. Re-check the token and try again.",
        status: 200,
        endpoint: "/auth/",
      });
    }
    return {
      id,
      name: typeof body.name === "string" ? body.name : undefined,
      username: typeof body.username === "string" ? body.username : undefined,
      email: typeof body.email === "string" ? body.email : undefined,
    };
  }

  async listOrganizations(): Promise<SentryOrganization[]> {
    return this.paginateList<SentryOrganization>(
      "/organizations/",
      "List Sentry organizations",
    );
  }

  async listProjectsForOrganization(orgSlug: string): Promise<SentryProject[]> {
    const path = `/organizations/${encodeURIComponent(orgSlug)}/projects/`;
    return this.paginateList<SentryProject>(
      path,
      `List Sentry projects for organization ${orgSlug}`,
    );
  }

  /**
   * List projects across all accessible organizations.
   * Deduplicates by project id when a project appears under multiple paths.
   */
  async listAllProjects(): Promise<SentryProject[]> {
    const orgs = await this.listOrganizations();
    const byId = new Map<string, SentryProject>();

    for (const org of orgs) {
      const projects = await this.listProjectsForOrganization(org.slug);
      for (const project of projects) {
        const id = String(project.id);
        if (!byId.has(id)) {
          byId.set(id, {
            ...project,
            id,
            // Ensure org context is present when API omits nested organization.
            organization: project.organization ?? {
              id: org.id,
              slug: org.slug,
              name: org.name,
            },
          });
        }
      }
    }

    return [...byId.values()];
  }

  /**
   * List organization releases filtered to one exact project id via
   * GET /organizations/{organization_slug}/releases/?project={project_id}.
   *
   * Explicit bound: at most `maxPages` Link-header pages of `perPage`
   * (default 1×100). Not complete lifetime history.
   */
  async listOrganizationReleases(
    organizationSlug: string,
    projectId: string,
    options?: { perPage?: number; maxPages?: number },
  ): Promise<unknown[]> {
    const perPage = options?.perPage ?? 100;
    const maxPages = options?.maxPages ?? 1;
    const context = `List Sentry releases for organization ${organizationSlug} project ${projectId}`;
    const initialPath =
      `/organizations/${encodeURIComponent(organizationSlug)}/releases/` +
      `?project=${encodeURIComponent(projectId)}&per_page=${perPage}`;

    const all: unknown[] = [];
    let pathOrUrl = initialPath;

    for (let page = 0; page < maxPages; page++) {
      const { body, headers } = await this.getJsonWithMeta<unknown>(
        pathOrUrl,
        context,
      );

      if (!Array.isArray(body)) {
        throw new SentryApiError({
          message: `${context}: expected a JSON array response.`,
          status: 200,
          endpoint: this.endpointLabel(pathOrUrl),
        });
      }

      all.push(...body);
      const nextUrl = parseSentryNextLink(
        headers.get("Link") ?? headers.get("link"),
      );
      if (!nextUrl || body.length === 0) {
        break;
      }
      pathOrUrl = nextUrl;
    }

    return all;
  }

  /**
   * List organization issue aggregates filtered to one exact project id via
   * GET /organizations/{organization_slug}/issues/?project={project_id}.
   *
   * Uses empty `query=` so the default `is:unresolved` filter is not applied.
   * Sorts by last seen (`date`). Bound: at most `maxPages` Link pages of
   * `limit` (default 1×100). Not complete lifetime history.
   */
  async listOrganizationIssues(
    organizationSlug: string,
    projectId: string,
    options?: { perPage?: number; maxPages?: number },
  ): Promise<unknown[]> {
    const perPage = options?.perPage ?? 100;
    const maxPages = options?.maxPages ?? 1;
    const context = `List Sentry issues for organization ${organizationSlug} project ${projectId}`;
    const initialPath =
      `/organizations/${encodeURIComponent(organizationSlug)}/issues/` +
      `?project=${encodeURIComponent(projectId)}&query=&sort=date&limit=${perPage}`;

    const all: unknown[] = [];
    let pathOrUrl = initialPath;

    for (let page = 0; page < maxPages; page++) {
      const { body, headers } = await this.getJsonWithMeta<unknown>(
        pathOrUrl,
        context,
      );

      if (!Array.isArray(body)) {
        throw new SentryApiError({
          message: `${context}: expected a JSON array response.`,
          status: 200,
          endpoint: this.endpointLabel(pathOrUrl),
        });
      }

      all.push(...body);
      const nextUrl = parseSentryNextLink(
        headers.get("Link") ?? headers.get("link"),
      );
      if (!nextUrl || body.length === 0) {
        break;
      }
      pathOrUrl = nextUrl;
    }

    return all;
  }

  /**
   * List organization code mappings filtered to one exact project id via
   * GET /organizations/{organization_slug}/code-mappings/?project={project_id}.
   *
   * Sentry marks this GET private in its publish status; it is the production
   * UI/Terraform read path and the only project-scoped deterministic join.
   * Bound: at most `maxPages` Link pages of `per_page` (default 1×100).
   */
  async listOrganizationCodeMappings(
    organizationSlug: string,
    projectId: string,
    options?: { perPage?: number; maxPages?: number },
  ): Promise<unknown[]> {
    const perPage = options?.perPage ?? 100;
    const maxPages = options?.maxPages ?? 1;
    const context = `List Sentry code mappings for organization ${organizationSlug} project ${projectId}`;
    const initialPath =
      `/organizations/${encodeURIComponent(organizationSlug)}/code-mappings/` +
      `?project=${encodeURIComponent(projectId)}&per_page=${perPage}`;

    const all: unknown[] = [];
    let pathOrUrl = initialPath;

    for (let page = 0; page < maxPages; page++) {
      const { body, headers } = await this.getJsonWithMeta<unknown>(
        pathOrUrl,
        context,
      );

      if (!Array.isArray(body)) {
        throw new SentryApiError({
          message: `${context}: expected a JSON array response.`,
          status: 200,
          endpoint: this.endpointLabel(pathOrUrl),
        });
      }

      all.push(...body);
      const nextUrl = parseSentryNextLink(
        headers.get("Link") ?? headers.get("link"),
      );
      if (!nextUrl || body.length === 0) {
        break;
      }
      pathOrUrl = nextUrl;
    }

    return all;
  }

  private async paginateList<T>(
    initialPath: string,
    context: string,
  ): Promise<T[]> {
    const all: T[] = [];
    let nextUrl: string | null = null;
    let pathOrUrl: string = initialPath;

    for (let page = 0; page < MAX_PAGES; page++) {
      const { body, headers } = await this.getJsonWithMeta<T[]>(
        pathOrUrl,
        context,
      );

      if (!Array.isArray(body)) {
        throw new SentryApiError({
          message: `${context}: expected a JSON array response.`,
          status: 200,
          endpoint: this.endpointLabel(pathOrUrl),
        });
      }

      all.push(...body);
      nextUrl = parseSentryNextLink(headers.get("Link") ?? headers.get("link"));
      if (!nextUrl || body.length === 0) {
        break;
      }
      pathOrUrl = nextUrl;
    }

    return all;
  }

  private async getJson<T>(pathOrUrl: string, context: string): Promise<T> {
    const { body } = await this.getJsonWithMeta<T>(pathOrUrl, context);
    return body;
  }

  private async getJsonWithMeta<T>(
    pathOrUrl: string,
    context: string,
  ): Promise<{ body: T; headers: Headers }> {
    const endpoint = this.endpointLabel(pathOrUrl);
    let url: string;
    try {
      url = resolveSentryRequestUrl(pathOrUrl, this.baseUrl);
    } catch {
      throw new SentryApiError({
        message: `${context}: refused to follow a Sentry Link URL that is not the same origin as the configured Sentry API.`,
        status: 0,
        endpoint,
      });
    }

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
      throw new SentryApiError({
        message: `${context}: could not reach Sentry API (${redactSecrets(reason, [this.token])}). Check network connectivity and try again.`,
        status: 0,
        endpoint,
      });
    }

    let bodyText = "";
    try {
      bodyText = await response.text();
    } catch {
      throw new SentryApiError({
        message: sentryErrorMessage(context, response.status, "empty response body", [this.token]),
        status: response.status,
        endpoint,
      });
    }

    let body: unknown;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      throw new SentryApiError({
        message:
          sentryErrorMessage(context, response.status, undefined, [this.token]) +
          " (response was not valid JSON)",
        status: response.status,
        endpoint,
      });
    }

    if (!response.ok) {
      const detail = extractSentryErrorDetail(body);
      throw new SentryApiError({
        message: sentryErrorMessage(context, response.status, detail, [this.token]),
        status: response.status,
        endpoint,
      });
    }

    return { body: body as T, headers: response.headers };
  }

  private endpointLabel(pathOrUrl: string): string {
    if (!pathOrUrl.startsWith("http")) {
      return pathOrUrl.split("?")[0] ?? pathOrUrl;
    }
    try {
      const parsed = new URL(pathOrUrl);
      return parsed.pathname;
    } catch {
      return pathOrUrl;
    }
  }
}

function extractSentryErrorDetail(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const obj = body as Record<string, unknown>;
  if (typeof obj.detail === "string") return obj.detail;
  if (
    obj.detail &&
    typeof obj.detail === "object" &&
    obj.detail !== null &&
    "message" in obj.detail &&
    typeof (obj.detail as { message: unknown }).message === "string"
  ) {
    return (obj.detail as { message: string }).message;
  }
  if (typeof obj.message === "string") return obj.message;
  return undefined;
}

export function createSentryClient(
  token: string,
  options?: Omit<SentryClientOptions, "token">,
): SentryClient {
  return new SentryClient({ token, ...options });
}
