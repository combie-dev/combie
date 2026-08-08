import type {
  DiscoverResult,
  Provider,
  ProviderAuthResult,
} from "../../provider/types.ts";
import {
  createVercelClient,
  type VercelClient,
  type VercelClientOptions,
} from "./client.ts";
import { VercelApiError } from "./errors.ts";
import { normalizeProject } from "./normalize.ts";

export interface VercelProviderOptions {
  fetch?: VercelClientOptions["fetch"];
  baseUrl?: string;
}

function clientFor(
  token: string,
  options?: VercelProviderOptions,
): VercelClient {
  return createVercelClient(token, {
    fetch: options?.fetch,
    baseUrl: options?.baseUrl,
  });
}

export function createVercelProvider(
  options?: VercelProviderOptions,
): Provider {
  return {
    id: "vercel",
    name: "Vercel",

    async authenticate(token: string): Promise<ProviderAuthResult> {
      if (!token || token.trim() === "") {
        return {
          ok: false,
          message:
            "Vercel authentication failed: token is empty. Provide a token via --token or --use-env.",
        };
      }

      try {
        const client = clientFor(token, options);
        const user = await client.getAuthenticatedUser();
        return {
          ok: true,
          accountId: user.uid,
          accountName: user.username,
        };
      } catch (err) {
        if (err instanceof VercelApiError) {
          return { ok: false, message: err.message };
        }
        const reason = err instanceof Error ? err.message : "unknown error";
        return {
          ok: false,
          message: `Vercel authentication failed: ${reason}`,
        };
      }
    },

    async discoverResources(
      token: string,
      _context: { accountId: string },
    ): Promise<DiscoverResult> {
      const client = clientFor(token, options);

      try {
        const projects = await client.listProjects();
        return {
          resources: projects.map(normalizeProject),
        };
      } catch (err) {
        if (err instanceof VercelApiError) {
          throw new VercelApiError({
            message: `Vercel project discovery failed: ${err.message}`,
            status: err.status,
            endpoint: err.endpoint,
          });
        }
        const reason = err instanceof Error ? err.message : "unknown error";
        throw new Error(`Vercel project discovery failed: ${reason}`);
      }
    },
  };
}

export const vercelProvider: Provider = createVercelProvider();
