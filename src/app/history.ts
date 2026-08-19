import type { Change } from "../domain/change.ts";
import type { Resource } from "../domain/resource.ts";
import { Store } from "../storage/store.ts";
import { CombieError, notInitialized } from "./errors.ts";
import { BINARY_NAME } from "../cli/constants.ts";
import {
  clocksFromProvider,
  formatCurrentClockLines,
  type ProviderSyncClocks,
} from "./provider-sync-clocks.ts";

export interface ResourceHistory {
  resource: Resource;
  changes: Change[];
  providerSyncClocks: ProviderSyncClocks;
}

export interface GetResourceHistoryOptions {
  baseDir: string;
  /** Exact deterministic Combie Resource id. */
  resourceRef: string;
}

/** Compose an already-resolved current Resource with its ordered Changes. */
export function getResourceHistoryForResource(
  store: Store,
  resource: Resource,
): ResourceHistory {
  return {
    resource,
    changes: store.listChangesForResource(resource.id),
    providerSyncClocks: clocksFromProvider(store.getProvider(resource.provider)),
  };
}

/** Read current Resource state and its observed Changes from local persistence. */
export function getResourceHistory(
  options: GetResourceHistoryOptions,
): ResourceHistory {
  const ref = options.resourceRef.trim();
  if (!ref) {
    throw new CombieError(
      "RESOURCE_REF_REQUIRED",
      `Resource reference is required.\nUsage: ${BINARY_NAME} history <resource-id>\nExample: ${BINARY_NAME} history github:repository:1001\nList ids: ${BINARY_NAME} resources`,
    );
  }

  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) {
      throw notInitialized();
    }

    const resource = store.getResource(ref);
    if (!resource) {
      throw new CombieError(
        "RESOURCE_NOT_FOUND",
        `Resource not found: ${ref}\nUse a stable resource id (provider:kind:providerResourceId).\nList known resources: ${BINARY_NAME} resources`,
      );
    }

    return getResourceHistoryForResource(store, resource);
  } finally {
    store.close();
  }
}

const PROVIDER_DISPLAY: Record<string, string> = {
  github: "GitHub",
  vercel: "Vercel",
  cloudflare: "Cloudflare",
  sentry: "Sentry",
  neon: "Neon",
  planetscale: "PlanetScale",
};

function providerLabel(provider: string): string {
  return (
    PROVIDER_DISPLAY[provider] ??
    provider.charAt(0).toUpperCase() + provider.slice(1)
  );
}

function resourceDisplayName(resource: Resource): string {
  const fullName = resource.metadata.fullName;
  if (typeof fullName === "string" && fullName.length > 0) {
    return fullName;
  }
  return resource.name;
}

function formatValue(value: unknown): string {
  if (value === undefined) {
    return "(absent)";
  }
  return JSON.stringify(value) ?? String(value);
}

/** Human-readable current state plus grouped observations. */
export function formatResourceHistory(history: ResourceHistory): string {
  const resource = history.resource;
  const current =
    `${providerLabel(resource.provider)} ${resource.kind}: ${resourceDisplayName(resource)}\n` +
    `${resource.id}\n\n` +
    `CURRENT\n` +
    `name  ${formatValue(resource.name)}\n` +
    `${formatCurrentClockLines(resource, history.providerSyncClocks)}\n\n` +
    `HISTORY`;

  if (history.changes.length === 0) {
    return (
      `${current}\n\n` +
      `No changes recorded yet.\n` +
      `(Combie has not recorded a Change for this Resource since its trustworthy Change baseline.)`
    );
  }

  const observations = history.changes.map((change) => {
    const fields = change.fields
      .map(
        (field) =>
          `${field.path}\n  ${formatValue(field.before)} → ${formatValue(field.after)}`,
      )
      .join("\n");
    return `Observed: ${change.observedAt}\n${change.kind}\n${fields}`;
  });

  return `${current}\n\n${observations.join("\n\n")}`;
}
