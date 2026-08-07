import {
  CloudflareApiError,
  cloudflareErrorMessage,
  type CloudflareApiErrorBody,
} from "./errors.ts";

const DEFAULT_BASE_URL = "https://api.cloudflare.com/client/v4";

export type FetchLike = typeof fetch;

export interface CloudflareEnvelope<T> {
  success: boolean;
  result: T;
  errors?: CloudflareApiErrorBody[];
  messages?: unknown[];
  result_info?: unknown;
}

export interface CloudflareAccount {
  id: string;
  name: string;
  type?: string;
}

export interface CloudflareWorkerScript {
  id: string;
  etag?: string;
  handlers?: string[];
  modified_on?: string;
  created_on?: string;
  usage_model?: string;
  // Some responses use `id` as script name; keep optional name for flexibility
  name?: string;
}

export interface CloudflareD1Database {
  uuid: string;
  name: string;
  version?: string;
  created_at?: string;
  file_size?: number;
  num_tables?: number;
}

export interface CloudflareKvNamespace {
  id: string;
  title: string;
  supports_url_encoding?: boolean;
}

export interface CloudflareZone {
  id: string;
  name: string;
  status?: string;
  paused?: boolean;
  type?: string;
  account?: { id?: string; name?: string };
  name_servers?: string[];
}

export interface CloudflareClientOptions {
  token: string;
  fetch?: FetchLike;
  baseUrl?: string;
}

export class CloudflareClient {
  private readonly token: string;
  private readonly fetchImpl: FetchLike;
  private readonly baseUrl: string;

  constructor(options: CloudflareClientOptions) {
    this.token = options.token;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  async listAccounts(): Promise<CloudflareAccount[]> {
    return this.getResult<CloudflareAccount[]>("/accounts", "List Cloudflare accounts");
  }

  /** Verify token by listing accounts (requires at least account read). */
  async verifyToken(): Promise<{ accounts: CloudflareAccount[] }> {
    const accounts = await this.listAccounts();
    return { accounts };
  }

  async listWorkers(accountId: string): Promise<CloudflareWorkerScript[]> {
    return this.getResult<CloudflareWorkerScript[]>(
      `/accounts/${encodeURIComponent(accountId)}/workers/scripts`,
      "List Cloudflare Workers",
    );
  }

  async listD1(accountId: string): Promise<CloudflareD1Database[]> {
    return this.getResult<CloudflareD1Database[]>(
      `/accounts/${encodeURIComponent(accountId)}/d1/database`,
      "List Cloudflare D1 databases",
    );
  }

  async listKvNamespaces(accountId: string): Promise<CloudflareKvNamespace[]> {
    return this.getResult<CloudflareKvNamespace[]>(
      `/accounts/${encodeURIComponent(accountId)}/storage/kv/namespaces`,
      "List Cloudflare KV namespaces",
    );
  }

  async listZones(): Promise<CloudflareZone[]> {
    return this.getResult<CloudflareZone[]>("/zones", "List Cloudflare zones");
  }

  private async getResult<T>(path: string, context: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
        },
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "network error";
      throw new CloudflareApiError({
        message: `${context}: could not reach Cloudflare API (${reason}). Check network connectivity and try again.`,
        status: 0,
        endpoint: path,
      });
    }

    let body: CloudflareEnvelope<T> | undefined;
    try {
      body = (await response.json()) as CloudflareEnvelope<T>;
    } catch {
      throw new CloudflareApiError({
        message: cloudflareErrorMessage(
          context,
          response.status,
          undefined,
        ) + " (response was not valid JSON)",
        status: response.status,
        endpoint: path,
      });
    }

    if (!response.ok || body.success === false) {
      const errors = body.errors;
      const codes = (errors ?? [])
        .map((e) => e.code)
        .filter((c): c is number => typeof c === "number");
      throw new CloudflareApiError({
        message: cloudflareErrorMessage(context, response.status, errors),
        status: response.status,
        codes,
        endpoint: path,
      });
    }

    // Cloudflare list endpoints return arrays; tolerate null result as empty list when T is array-like
    if (body.result == null) {
      return [] as T;
    }
    return body.result;
  }
}

export function createCloudflareClient(
  token: string,
  options?: Omit<CloudflareClientOptions, "token">,
): CloudflareClient {
  return new CloudflareClient({ token, ...options });
}
