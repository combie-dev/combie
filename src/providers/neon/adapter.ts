import type {
  DiscoverResult,
  Provider,
  ProviderAuthResult,
} from "../../provider/types.ts";
import {
  createNeonClient,
  type NeonClient,
  type NeonClientOptions,
} from "./client.ts";
import { NeonApiError, redactSecrets } from "./errors.ts";
import {
  normalizeBranches,
  normalizeDatabases,
  normalizeEndpoints,
  normalizeProject,
  type NeonProjectEnrichment,
} from "./normalize.ts";

export interface NeonProviderOptions {
  fetch?: NeonClientOptions["fetch"];
  baseUrl?: string;
}

function clientFor(
  token: string,
  options?: NeonProviderOptions,
): NeonClient {
  return createNeonClient(token, {
    fetch: options?.fetch,
    baseUrl: options?.baseUrl,
  });
}

export function createNeonProvider(options?: NeonProviderOptions): Provider {
  return {
    id: "neon",
    name: "Neon",

    async authenticate(token: string): Promise<ProviderAuthResult> {
      if (!token || token.trim() === "") {
        return {
          ok: false,
          message:
            "Neon authentication failed: token is empty. Provide an API key via --token or --use-env.",
        };
      }

      try {
        const client = clientFor(token, options);
        const auth = await client.getAuthDetails();
        const organizations = await client.listCurrentOrganizations();

        if (organizations.length !== 1) {
          const reason =
            organizations.length === 0
              ? "no discovery organization"
              : "multiple organizations";
          return {
            ok: false,
            message:
              `Neon authentication succeeded but ${reason} is visible to this key. ` +
              "Use an organization-scoped or project-scoped organization API key so Combie can identify one trustworthy discovery scope.",
          };
        }

        const organization = organizations[0]!;
        if (
          typeof organization.id !== "string" ||
          organization.id.trim() === "" ||
          (auth.authMethod === "api_key_org" &&
            auth.accountId !== organization.id)
        ) {
          return {
            ok: false,
            message:
              "Neon authentication succeeded but the credential identity did not match a trustworthy organization scope. Re-check the API key and try again.",
          };
        }
        return {
          ok: true,
          accountId: organization.id,
          accountName:
            typeof organization.name === "string" &&
            organization.name.trim() !== ""
              ? organization.name.trim()
              : undefined,
        };
      } catch (err) {
        if (err instanceof NeonApiError) {
          return { ok: false, message: err.message };
        }
        const reason = err instanceof Error ? err.message : "unknown error";
        return {
          ok: false,
          message: `Neon authentication failed: ${redactSecrets(reason, [token])}`,
        };
      }
    },

    async discoverResources(
      token: string,
      context: { accountId: string },
    ): Promise<DiscoverResult> {
      const client = clientFor(token, options);

      try {
        const projects = await client.listProjects(context.accountId);
        const resources: DiscoverResult["resources"] = [];
        for (const project of projects) {
          const enrichment: NeonProjectEnrichment = {};
          let defaultBranchId: string | undefined;

          try {
            const branches = await client.listProjectBranches(project.id);
            enrichment.branches = normalizeBranches(branches);
            defaultBranchId = branches.find(
              (branch) => branch.default === true && typeof branch.id === "string",
            )?.id;
          } catch {
            // Project identity remains authoritative when optional branch
            // enrichment is unavailable. Omission means unknown.
          }

          if (defaultBranchId !== undefined) {
            try {
              enrichment.databases = normalizeDatabases(
                await client.listBranchDatabases(project.id, defaultBranchId),
              );
            } catch {
              // Unknown, not empty: a failed database read must not
              // masquerade as known-empty evidence.
            }
          } else if (enrichment.branches !== undefined) {
            // Branches are known and none is the default branch, so there is
            // authoritatively no default-branch database set to report.
            enrichment.databases = [];
          }

          try {
            enrichment.endpoints = normalizeEndpoints(
              await client.listProjectEndpoints(project.id),
            );
          } catch {
            // Endpoint enrichment is independently optional.
          }

          resources.push(normalizeProject(project, enrichment));
        }
        return {
          resources,
        };
      } catch (err) {
        if (err instanceof NeonApiError) {
          throw new NeonApiError({
            message: `Neon project discovery failed: ${err.message}`,
            status: err.status,
            endpoint: err.endpoint,
          });
        }
        const reason = err instanceof Error ? err.message : "unknown error";
        throw new Error(
          `Neon project discovery failed: ${redactSecrets(reason, [token])}`,
        );
      }
    },
  };
}

export const neonProvider: Provider = createNeonProvider();
