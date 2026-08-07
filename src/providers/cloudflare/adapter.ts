import type {
  DiscoverResult,
  Provider,
  ProviderAuthResult,
} from "../../provider/types.ts";
import {
  CloudflareClient,
  type CloudflareClientOptions,
  createCloudflareClient,
} from "./client.ts";
import { CloudflareApiError } from "./errors.ts";
import {
  normalizeD1,
  normalizeKvNamespace,
  normalizeWorker,
  normalizeZone,
} from "./normalize.ts";

export interface CloudflareProviderOptions {
  /** Injected fetch for tests; defaults to global fetch. */
  fetch?: CloudflareClientOptions["fetch"];
  baseUrl?: string;
}

function clientFor(
  token: string,
  options?: CloudflareProviderOptions,
): CloudflareClient {
  return createCloudflareClient(token, {
    fetch: options?.fetch,
    baseUrl: options?.baseUrl,
  });
}

/**
 * Create a Cloudflare provider adapter.
 * Optional fetch/baseUrl enable fixture-based tests without live credentials.
 */
export function createCloudflareProvider(
  options?: CloudflareProviderOptions,
): Provider {
  return {
    id: "cloudflare",
    name: "Cloudflare",

    async authenticate(token: string): Promise<ProviderAuthResult> {
      if (!token || token.trim() === "") {
        return {
          ok: false,
          message:
            "Cloudflare authentication failed: API token is empty. Provide a valid API token (for example via combie connect cloudflare).",
        };
      }

      try {
        const client = clientFor(token, options);
        const { accounts } = await client.verifyToken();
        if (accounts.length === 0) {
          return {
            ok: false,
            message:
              "Cloudflare authentication succeeded but no accounts were returned. Ensure the token can access at least one account.",
          };
        }
        const primary = accounts[0]!;
        return {
          ok: true,
          accountId: primary.id,
          accountName: primary.name,
        };
      } catch (err) {
        if (err instanceof CloudflareApiError) {
          return {
            ok: false,
            message: err.message,
          };
        }
        const reason = err instanceof Error ? err.message : "unknown error";
        return {
          ok: false,
          message: `Cloudflare authentication failed: ${reason}`,
        };
      }
    },

    async discoverResources(
      token: string,
      context: { accountId: string },
    ): Promise<DiscoverResult> {
      const client = clientFor(token, options);
      const { accountId } = context;

      // All-or-nothing: any resource type failure fails the whole discovery
      // with a clear, non-secret error message.
      try {
        const [workers, d1s, kvs, zones] = await Promise.all([
          client.listWorkers(accountId),
          client.listD1(accountId),
          client.listKvNamespaces(accountId),
          client.listZones(),
        ]);

        const resources = [
          ...workers.map((w) => normalizeWorker(w, accountId)),
          ...d1s.map((d) => normalizeD1(d, accountId)),
          ...kvs.map((k) => normalizeKvNamespace(k, accountId)),
          ...zones.map((z) => normalizeZone(z)),
        ];

        return { resources };
      } catch (err) {
        if (err instanceof CloudflareApiError) {
          throw new CloudflareApiError({
            message: `Cloudflare resource discovery failed: ${err.message}`,
            status: err.status,
            codes: err.codes,
            endpoint: err.endpoint,
          });
        }
        const reason = err instanceof Error ? err.message : "unknown error";
        throw new Error(`Cloudflare resource discovery failed: ${reason}`);
      }
    },
  };
}

/** Default singleton used by the provider registry (live fetch). */
export const cloudflareProvider: Provider = createCloudflareProvider();
