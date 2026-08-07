import type {
  DiscoverResult,
  Provider,
  ProviderAuthResult,
} from "../../provider/types.ts";
import {
  createGitHubClient,
  type GitHubClient,
  type GitHubClientOptions,
} from "./client.ts";
import { GitHubApiError } from "./errors.ts";
import { normalizeRepository } from "./normalize.ts";

export interface GitHubProviderOptions {
  /** Injected fetch for tests; defaults to global fetch. */
  fetch?: GitHubClientOptions["fetch"];
  baseUrl?: string;
}

function clientFor(
  token: string,
  options?: GitHubProviderOptions,
): GitHubClient {
  return createGitHubClient(token, {
    fetch: options?.fetch,
    baseUrl: options?.baseUrl,
  });
}

/**
 * Create a GitHub provider adapter.
 * Optional fetch/baseUrl enable fixture-based tests without live credentials.
 */
export function createGitHubProvider(
  options?: GitHubProviderOptions,
): Provider {
  return {
    id: "github",
    name: "GitHub",

    async authenticate(token: string): Promise<ProviderAuthResult> {
      if (!token || token.trim() === "") {
        return {
          ok: false,
          message:
            "GitHub authentication failed: token is empty. Provide a token via --token, --use-env, or --use-gh.",
        };
      }

      try {
        const client = clientFor(token, options);
        const user = await client.getAuthenticatedUser();
        return {
          ok: true,
          // Reuse optional account fields as provider identity (user id / login).
          accountId: String(user.id),
          accountName: user.login,
        };
      } catch (err) {
        if (err instanceof GitHubApiError) {
          return {
            ok: false,
            message: err.message,
          };
        }
        const reason = err instanceof Error ? err.message : "unknown error";
        return {
          ok: false,
          message: `GitHub authentication failed: ${reason}`,
        };
      }
    },

    async discoverResources(
      token: string,
      _context: { accountId: string },
    ): Promise<DiscoverResult> {
      const client = clientFor(token, options);

      try {
        const repos = await client.listRepositories();
        return {
          resources: repos.map(normalizeRepository),
        };
      } catch (err) {
        if (err instanceof GitHubApiError) {
          throw new GitHubApiError({
            message: `GitHub repository discovery failed: ${err.message}`,
            status: err.status,
            endpoint: err.endpoint,
          });
        }
        const reason = err instanceof Error ? err.message : "unknown error";
        throw new Error(`GitHub repository discovery failed: ${reason}`);
      }
    },
  };
}

/** Default singleton used by the provider registry (live fetch). */
export const githubProvider: Provider = createGitHubProvider();
