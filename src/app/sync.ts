import type { Resource, ResourceKind } from "../domain/resource.ts";
import { Store } from "../storage/store.ts";
import { CredentialsStore } from "../storage/credentials.ts";
import { getProvider } from "../provider/registry.ts";
import {
  notInitialized,
  providerNotConnected,
  CombieError,
} from "./errors.ts";

export interface SyncOptions {
  baseDir: string;
  /** When omitted, sync all connected providers. */
  providerId?: string;
}

export interface SyncProviderResult {
  provider: string;
  counts: Partial<Record<ResourceKind, number>>;
  total: number;
  message: string;
}

export interface SyncResult {
  results: SyncProviderResult[];
  message: string;
}

function countByKind(resources: Resource[]): Partial<Record<ResourceKind, number>> {
  const counts: Partial<Record<ResourceKind, number>> = {};
  for (const r of resources) {
    counts[r.kind] = (counts[r.kind] ?? 0) + 1;
  }
  return counts;
}

function formatKindLabel(kind: ResourceKind, n: number): string {
  const labels: Record<ResourceKind, [string, string]> = {
    worker: ["Worker", "Workers"],
    database: ["D1 database", "D1 databases"],
    kv_namespace: ["KV namespace", "KV namespaces"],
    zone: ["zone", "zones"],
  };
  const [one, many] = labels[kind];
  return `${n} ${n === 1 ? one : many}`;
}

async function syncOne(
  store: Store,
  baseDir: string,
  providerId: string,
): Promise<SyncProviderResult> {
  const record = store.getProvider(providerId);
  if (!record || record.status !== "connected") {
    throw providerNotConnected(providerId);
  }

  const provider = getProvider(providerId);
  if (!provider) {
    throw providerNotConnected(providerId);
  }

  const creds = new CredentialsStore(baseDir);
  const token = creds.getCredential(providerId);
  if (!token) {
    throw new CombieError(
      "MISSING_CREDENTIALS",
      `No credentials found for ${providerId}.\nRun: combie connect ${providerId}`,
    );
  }

  const config = record.config ?? {};
  let accountId = typeof config.accountId === "string" ? config.accountId : undefined;

  if (!accountId) {
    const auth = await provider.authenticate(token);
    if (!auth.ok) {
      throw new CombieError(
        "AUTH_FAILED",
        `Cloudflare authentication failed: ${auth.message}`,
      );
    }
    accountId = auth.accountId;
    if (!accountId) {
      throw new CombieError(
        "NO_ACCOUNT",
        "Cloudflare authentication succeeded but no account was found.\nEnsure the token has Account read permission.",
      );
    }
    store.upsertProvider({
      ...record,
      config: {
        ...config,
        accountId,
        accountName: auth.accountName ?? config.accountName ?? null,
      },
    });
  }

  let discovered;
  try {
    discovered = await provider.discoverResources(token, { accountId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new CombieError(
      "DISCOVER_FAILED",
      `Cloudflare sync failed: ${msg}`,
    );
  }

  for (const resource of discovered.resources) {
    store.upsertResource(resource);
  }

  const now = new Date().toISOString();
  store.setLastSync(providerId, now);

  const counts = countByKind(discovered.resources);
  const lines = (Object.keys(counts) as ResourceKind[])
    .filter((k) => (counts[k] ?? 0) > 0)
    .map((k) => formatKindLabel(k, counts[k]!));

  const discoveredBlock =
    lines.length > 0
      ? `Discovered:\n${lines.map((l) => `${l}`).join("\n")}`
      : "Discovered:\n(no supported resources found)";

  const message =
    `${provider.name} sync complete.\n\n` +
    `${discoveredBlock}\n\n` +
    `${discovered.resources.length} resources stored.`;

  return {
    provider: provider.name,
    counts,
    total: discovered.resources.length,
    message,
  };
}

/**
 * Discover, normalize, and upsert resources for connected providers.
 */
export async function syncProviders(options: SyncOptions): Promise<SyncResult> {
  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) {
      throw notInitialized();
    }

    const providers = options.providerId
      ? [options.providerId.toLowerCase()]
      : store.listProviders().filter((p) => p.status === "connected").map((p) => p.id);

    if (providers.length === 0) {
      throw new CombieError(
        "NO_PROVIDERS",
        "No connected providers to sync.\nRun: combie connect cloudflare",
      );
    }

    const results: SyncProviderResult[] = [];
    for (const id of providers) {
      results.push(await syncOne(store, options.baseDir, id));
    }

    return {
      results,
      message: results.map((r) => r.message).join("\n\n"),
    };
  } finally {
    store.close();
  }
}
