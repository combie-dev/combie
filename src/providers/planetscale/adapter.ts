import type {
  DiscoverResult,
  Provider,
  ProviderAuthResult,
  ProviderAuthOptions,
} from "../../provider/types.ts";
import {
  createPlanetScaleClient,
  type PlanetScaleClient,
  type PlanetScaleClientOptions,
  type PlanetScaleOrganization,
} from "./client.ts";
import { decodePlanetScaleCredential } from "./credentials.ts";
import { PlanetScaleApiError, redactSecrets } from "./errors.ts";
import {
  normalizeBranches,
  normalizeDatabase,
  type PlanetScaleDatabaseEnrichment,
} from "./normalize.ts";

export interface PlanetScaleProviderOptions {
  fetch?: PlanetScaleClientOptions["fetch"];
  baseUrl?: string;
}

function clientFor(
  token: string,
  options?: PlanetScaleProviderOptions,
): PlanetScaleClient {
  return createPlanetScaleClient(token, {
    fetch: options?.fetch,
    baseUrl: options?.baseUrl,
  });
}

function secretList(token: string): string[] {
  const fragments = [token];
  const pair = decodePlanetScaleCredential(token);
  if (pair) {
    fragments.push(pair.id, pair.secret);
  }
  return fragments;
}

function resolveOrganization(
  organizations: PlanetScaleOrganization[],
  requested?: string,
):
  | { ok: true; organization: PlanetScaleOrganization }
  | { ok: false; message: string } {
  if (organizations.length === 0) {
    return {
      ok: false,
      message:
        "PlanetScale authentication succeeded but no organization is visible to this service token. " +
        "Grant organization read access (read_organization / read_databases) and try again.",
    };
  }

  const slug = requested?.trim();
  if (slug) {
    const match = organizations.find((org) => org.name === slug);
    if (!match) {
      const available = organizations
        .map((org) => org.name)
        .sort()
        .join(", ");
      return {
        ok: false,
        message:
          `PlanetScale organization "${slug}" is not accessible with this service token. ` +
          (available
            ? `Accessible organizations: ${available}.`
            : "No organizations are accessible.") +
          " Pass --organization <slug> with an accessible organization.",
      };
    }
    return { ok: true, organization: match };
  }

  if (organizations.length === 1) {
    return { ok: true, organization: organizations[0]! };
  }

  const available = organizations
    .map((org) => org.name)
    .sort()
    .join(", ");
  return {
    ok: false,
    message:
      "PlanetScale service token can access multiple organizations. " +
      `Specify one with --organization <slug>. Accessible organizations: ${available}.`,
  };
}

export function createPlanetScaleProvider(
  options?: PlanetScaleProviderOptions,
): Provider {
  return {
    id: "planetscale",
    name: "PlanetScale",

    async authenticate(
      token: string,
      authOptions?: ProviderAuthOptions,
    ): Promise<ProviderAuthResult> {
      if (!token || token.trim() === "") {
        return {
          ok: false,
          message:
            "PlanetScale authentication failed: service-token credentials are empty. " +
            "Provide PLANETSCALE_SERVICE_TOKEN_ID and PLANETSCALE_SERVICE_TOKEN via --use-env, " +
            "or pass --token-id and --token.",
        };
      }

      if (!decodePlanetScaleCredential(token)) {
        return {
          ok: false,
          message:
            "PlanetScale authentication failed: service-token credentials are incomplete. " +
            "Both the service-token ID and secret are required " +
            "(PLANETSCALE_SERVICE_TOKEN_ID and PLANETSCALE_SERVICE_TOKEN).",
        };
      }

      try {
        const client = clientFor(token, options);
        const organizations = await client.listOrganizations();
        const resolved = resolveOrganization(
          organizations,
          authOptions?.organization,
        );
        if (!resolved.ok) {
          return { ok: false, message: resolved.message };
        }
        return {
          ok: true,
          accountId: resolved.organization.id,
          accountName: resolved.organization.name,
        };
      } catch (err) {
        if (err instanceof PlanetScaleApiError) {
          return { ok: false, message: err.message };
        }
        const reason = err instanceof Error ? err.message : "unknown error";
        return {
          ok: false,
          message: `PlanetScale authentication failed: ${redactSecrets(reason, secretList(token))}`,
        };
      }
    },

    async discoverResources(
      token: string,
      context: { accountId: string },
    ): Promise<DiscoverResult> {
      const client = clientFor(token, options);

      try {
        const organizations = await client.listOrganizations();
        const organization = organizations.find(
          (org) => org.id === context.accountId,
        );
        if (!organization) {
          throw new PlanetScaleApiError({
            message:
              "PlanetScale discovery failed: the connected organization is no longer visible to this service token. " +
              "Reconnect with: bun run combie connect planetscale --use-env",
            status: 404,
            endpoint: "/organizations",
          });
        }

        const databases = await client.listDatabases(organization.name);
        const resources: DiscoverResult["resources"] = [];

        for (const database of databases) {
          const enrichment: PlanetScaleDatabaseEnrichment = {};
          try {
            const branches = await client.listBranches(
              organization.name,
              database.name,
            );
            enrichment.branches = normalizeBranches(branches);
          } catch {
            // Database identity remains authoritative when optional branch
            // enrichment is unavailable. Omission means unknown.
          }
          resources.push(normalizeDatabase(database, enrichment));
        }

        return { resources };
      } catch (err) {
        if (err instanceof PlanetScaleApiError) {
          throw new PlanetScaleApiError({
            message: err.message.startsWith("PlanetScale")
              ? err.message
              : `PlanetScale database discovery failed: ${err.message}`,
            status: err.status,
            endpoint: err.endpoint,
          });
        }
        const reason = err instanceof Error ? err.message : "unknown error";
        throw new Error(
          `PlanetScale database discovery failed: ${redactSecrets(reason, secretList(token))}`,
        );
      }
    },
  };
}

export const planetScaleProvider: Provider = createPlanetScaleProvider();
