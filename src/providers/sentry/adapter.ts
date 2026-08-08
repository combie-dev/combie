import type {
  DiscoverResult,
  Provider,
  ProviderAuthResult,
} from "../../provider/types.ts";
import {
  createSentryClient,
  type SentryClient,
  type SentryClientOptions,
} from "./client.ts";
import { SentryApiError } from "./errors.ts";
import { normalizeProject } from "./normalize.ts";

export interface SentryProviderOptions {
  fetch?: SentryClientOptions["fetch"];
  baseUrl?: string;
}

function clientFor(
  token: string,
  options?: SentryProviderOptions,
): SentryClient {
  return createSentryClient(token, {
    fetch: options?.fetch,
    baseUrl: options?.baseUrl,
  });
}

export function createSentryProvider(
  options?: SentryProviderOptions,
): Provider {
  return {
    id: "sentry",
    name: "Sentry",

    async authenticate(token: string): Promise<ProviderAuthResult> {
      if (!token || token.trim() === "") {
        return {
          ok: false,
          message:
            "Sentry authentication failed: token is empty. Provide a token via --token or --use-env.",
        };
      }

      try {
        const client = clientFor(token, options);
        const user = await client.getAuthenticatedUser();
        return {
          ok: true,
          accountId: user.id,
          accountName: user.username ?? user.name ?? user.email,
        };
      } catch (err) {
        if (err instanceof SentryApiError) {
          return { ok: false, message: err.message };
        }
        const reason = err instanceof Error ? err.message : "unknown error";
        return {
          ok: false,
          message: `Sentry authentication failed: ${reason}`,
        };
      }
    },

    async discoverResources(
      token: string,
      _context: { accountId: string },
    ): Promise<DiscoverResult> {
      const client = clientFor(token, options);

      try {
        const projects = await client.listAllProjects();
        return {
          resources: projects.map(normalizeProject),
        };
      } catch (err) {
        if (err instanceof SentryApiError) {
          throw new SentryApiError({
            message: `Sentry project discovery failed: ${err.message}`,
            status: err.status,
            endpoint: err.endpoint,
          });
        }
        const reason = err instanceof Error ? err.message : "unknown error";
        throw new Error(`Sentry project discovery failed: ${reason}`);
      }
    },
  };
}

export const sentryProvider: Provider = createSentryProvider();
