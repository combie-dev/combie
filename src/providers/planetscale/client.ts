import {
  PlanetScaleApiError,
  planetScaleErrorMessage,
  redactSecrets,
} from "./errors.ts";
import {
  decodePlanetScaleCredential,
  planetScaleSecretFragments,
} from "./credentials.ts";

const DEFAULT_BASE_URL = "https://api.planetscale.com/v1";
const PAGE_SIZE = 100;
const MAX_PAGES = 100;

export type FetchLike = typeof fetch;

export interface PlanetScaleOrganization {
  id: string;
  name: string;
}

export interface PlanetScaleDatabase {
  id: string;
  name: string;
  kind?: string;
  ready?: boolean;
  state?: string;
  default_branch?: string;
  branches_count?: number;
  production_branches_count?: number;
  development_branches_count?: number;
  region?: {
    id?: string;
    slug?: string;
    display_name?: string;
    provider?: string;
  } | null;
  html_url?: string;
  url?: string;
  created_at?: string;
  updated_at?: string;
  plan?: string;
  sharded?: boolean;
  // Deliberately untyped / unused: insights, billing, resize flags, counts noise.
}

export interface PlanetScaleBranch {
  id?: string;
  name?: string;
  kind?: string;
  ready?: boolean;
  schema_ready?: boolean;
  production?: boolean;
  parent_branch?: string | null;
  state?: string;
  region?: {
    id?: string;
    slug?: string;
    display_name?: string;
    provider?: string;
  } | null;
  // Hosts / connection addresses intentionally unused (secret-adjacent).
  mysql_address?: string;
  html_url?: string;
}

interface PlanetScaleListResponse<T> {
  type?: string;
  data?: T[];
  current_page?: number;
  per_page?: number;
  next_page?: number | null;
  next_page_url?: string | null;
  prev_page?: number | null;
  total_count?: number;
  total_pages?: number;
}

export interface PlanetScaleClientOptions {
  /** Composite credential: serviceTokenId:serviceToken */
  token: string;
  fetch?: FetchLike;
  baseUrl?: string;
}

export class PlanetScaleClient {
  private readonly authorization: string;
  private readonly secrets: string[];
  private readonly fetchImpl: FetchLike;
  private readonly baseUrl: string;

  constructor(options: PlanetScaleClientOptions) {
    const pair = decodePlanetScaleCredential(options.token);
    if (!pair) {
      throw new PlanetScaleApiError({
        message:
          "PlanetScale credentials are incomplete. Provide both the service-token ID and secret (PLANETSCALE_SERVICE_TOKEN_ID and PLANETSCALE_SERVICE_TOKEN).",
        status: 0,
        endpoint: "",
      });
    }
    this.authorization = `${pair.id}:${pair.secret}`;
    this.secrets = planetScaleSecretFragments(options.token);
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  async listOrganizations(): Promise<PlanetScaleOrganization[]> {
    return this.listAll<PlanetScaleOrganization>(
      "/organizations",
      "List PlanetScale organizations",
      (item) =>
        !!item &&
        typeof item === "object" &&
        typeof (item as PlanetScaleOrganization).id === "string" &&
        (item as PlanetScaleOrganization).id.trim() !== "" &&
        typeof (item as PlanetScaleOrganization).name === "string" &&
        (item as PlanetScaleOrganization).name.trim() !== "",
      "organization",
    );
  }

  async listDatabases(
    organizationName: string,
  ): Promise<PlanetScaleDatabase[]> {
    const path = `/organizations/${encodeURIComponent(organizationName)}/databases`;
    return this.listAll<PlanetScaleDatabase>(
      path,
      `List PlanetScale databases for organization ${organizationName}`,
      (item) =>
        !!item &&
        typeof item === "object" &&
        typeof (item as PlanetScaleDatabase).id === "string" &&
        (item as PlanetScaleDatabase).id.trim() !== "" &&
        typeof (item as PlanetScaleDatabase).name === "string" &&
        (item as PlanetScaleDatabase).name.trim() !== "",
      "database",
    );
  }

  async listBranches(
    organizationName: string,
    databaseName: string,
  ): Promise<PlanetScaleBranch[]> {
    const path =
      `/organizations/${encodeURIComponent(organizationName)}` +
      `/databases/${encodeURIComponent(databaseName)}/branches`;
    return this.listAll<PlanetScaleBranch>(
      path,
      `List branches for PlanetScale database ${databaseName}`,
      (item) =>
        !!item &&
        typeof item === "object" &&
        typeof (item as PlanetScaleBranch).id === "string" &&
        typeof (item as PlanetScaleBranch).name === "string",
      "branch",
      // Branch list may include soft-deleted or incomplete rows; filter later
      // in normalize rather than failing the whole page.
      { strictItems: false },
    );
  }

  private async listAll<T>(
    path: string,
    context: string,
    isValid: (item: unknown) => boolean,
    itemLabel: string,
    options?: { strictItems?: boolean },
  ): Promise<T[]> {
    const all: T[] = [];
    let page = 1;
    const strictItems = options?.strictItems !== false;

    for (let i = 0; i < MAX_PAGES; i++) {
      const separator = path.includes("?") ? "&" : "?";
      const pagePath = `${path}${separator}page=${page}&per_page=${PAGE_SIZE}`;
      const response = await this.getJson<PlanetScaleListResponse<T>>(
        pagePath,
        context,
      );

      if (!Array.isArray(response?.data)) {
        throw new PlanetScaleApiError({
          message: `${context}: response did not contain a data array. Try again.`,
          status: 200,
          endpoint: path,
        });
      }

      for (const item of response.data) {
        if (!isValid(item)) {
          if (strictItems) {
            throw new PlanetScaleApiError({
              message: `${context}: response contained a ${itemLabel} without a stable id and name. Try again.`,
              status: 200,
              endpoint: path,
            });
          }
          continue;
        }
        all.push(item as T);
      }

      const nextPage = response.next_page;
      if (
        nextPage === null ||
        nextPage === undefined ||
        response.data.length === 0
      ) {
        return all;
      }
      if (typeof nextPage !== "number" || nextPage <= page) {
        throw new PlanetScaleApiError({
          message: `${context}: pagination did not advance. Try again.`,
          status: 200,
          endpoint: path,
        });
      }
      page = nextPage;
    }

    throw new PlanetScaleApiError({
      message: `${context}: pagination exceeded ${MAX_PAGES} pages. Narrow the organization scope and try again.`,
      status: 200,
      endpoint: path,
    });
  }

  private async getJson<T>(path: string, context: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          Authorization: this.authorization,
          Accept: "application/json",
          "User-Agent": "combie",
        },
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "network error";
      throw new PlanetScaleApiError({
        message: `${context}: could not reach PlanetScale API (${redactSecrets(reason, this.secrets)}). Check network connectivity and try again.`,
        status: 0,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    let bodyText = "";
    try {
      bodyText = await response.text();
    } catch {
      throw new PlanetScaleApiError({
        message: planetScaleErrorMessage(
          context,
          response.status,
          "empty response body",
          this.secrets,
        ),
        status: response.status,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    let body: unknown;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      throw new PlanetScaleApiError({
        message:
          planetScaleErrorMessage(context, response.status, undefined, this.secrets) +
          " (response was not valid JSON)",
        status: response.status,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    if (!response.ok) {
      const messageFromBody = extractErrorMessage(body);
      throw new PlanetScaleApiError({
        message: planetScaleErrorMessage(
          context,
          response.status,
          messageFromBody,
          this.secrets,
        ),
        status: response.status,
        endpoint: path.split("?")[0] ?? path,
      });
    }

    return body as T;
  }
}

function extractErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const record = body as {
    message?: unknown;
    code?: unknown;
    error?: unknown;
  };
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

export function createPlanetScaleClient(
  token: string,
  options?: Omit<PlanetScaleClientOptions, "token">,
): PlanetScaleClient {
  return new PlanetScaleClient({ token, ...options });
}
