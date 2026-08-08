import type { Resource, ResourceKind } from "../domain/resource.ts";
import { Store } from "../storage/store.ts";
import { CredentialsStore } from "../storage/credentials.ts";
import { getProvider } from "../provider/registry.ts";
import {
  notInitialized,
  providerNotConnected,
  CombieError,
} from "./errors.ts";
import {
  inferGitHubVercelRelationships,
  isGitHubVercelSourceFor,
} from "./infer-github-vercel.ts";

export interface SyncOptions {
  baseDir: string;
  /** When omitted, sync all connected providers. */
  providerId?: string;
}

export interface SyncProviderResult {
  provider: string;
  providerId: string;
  ok: boolean;
  counts: Partial<Record<ResourceKind, number>>;
  total: number;
  message: string;
  error?: string;
}

export interface RelationshipSyncSummary {
  /** Whether relationship inference ran (both GitHub + Vercel succeeded). */
  refreshed: boolean;
  inferred: number;
  removed: number;
  message: string;
}

export interface SyncResult {
  results: SyncProviderResult[];
  /** True when every attempted provider succeeded. */
  ok: boolean;
  message: string;
  totalResources: number;
  relationships?: RelationshipSyncSummary;
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
    repository: ["repository", "repositories"],
    project: ["project", "projects"],
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
  let accountId =
    typeof config.accountId === "string" ? config.accountId : undefined;

  if (!accountId) {
    const auth = await provider.authenticate(token);
    if (!auth.ok) {
      throw new CombieError(
        "AUTH_FAILED",
        `${provider.name} authentication failed: ${auth.message}`,
      );
    }
    accountId = auth.accountId;
    if (!accountId) {
      throw new CombieError(
        "NO_ACCOUNT",
        `${provider.name} authentication succeeded but no account identity was returned.\nReconnect with: combie connect ${providerId}`,
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
      `${provider.name} sync failed: ${msg}`,
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
      ? `Discovered:\n${lines.map((l) => `  ${l}`).join("\n")}`
      : "Discovered:\n  (no supported resources found)";

  const message =
    `Syncing ${provider.name}...\n` +
    `✓ ${discovered.resources.length} resource${discovered.resources.length === 1 ? "" : "s"}\n` +
    `${discoveredBlock}`;

  return {
    provider: provider.name,
    providerId,
    ok: true,
    counts,
    total: discovered.resources.length,
    message,
  };
}

/**
 * Discover, normalize, and upsert resources for connected providers.
 *
 * Multi-provider behavior:
 * - attempt each configured provider
 * - persist successful results
 * - report failures clearly
 * - ok=false when any provider fails
 */
export async function syncProviders(options: SyncOptions): Promise<SyncResult> {
  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) {
      throw notInitialized();
    }

    const providers = options.providerId
      ? [options.providerId.toLowerCase()]
      : store
          .listProviders()
          .filter((p) => p.status === "connected")
          .map((p) => p.id);

    if (providers.length === 0) {
      throw new CombieError(
        "NO_PROVIDERS",
        "No connected providers to sync.\nRun: combie connect cloudflare\nor: combie connect github\nor: combie connect vercel\nor: combie connect sentry",
      );
    }

    const results: SyncProviderResult[] = [];

    for (const id of providers) {
      try {
        results.push(await syncOne(store, options.baseDir, id));
      } catch (err) {
        const provider = getProvider(id);
        const name = provider?.name ?? id;
        const errorMessage =
          err instanceof CombieError
            ? err.message
            : err instanceof Error
              ? err.message
              : String(err);
        results.push({
          provider: name,
          providerId: id,
          ok: false,
          counts: {},
          total: 0,
          message: `Syncing ${name}...\n✗ failed`,
          error: errorMessage,
        });
      }
    }

    const ok = results.every((r) => r.ok);
    const totalResources = results
      .filter((r) => r.ok)
      .reduce((sum, r) => sum + r.total, 0);

    const parts: string[] = [];
    for (const r of results) {
      parts.push(r.message);
      if (r.error) {
        parts.push(r.error);
      }
    }

    const relationships = refreshGitHubVercelRelationships(store, results);
    if (relationships.message) {
      parts.push(relationships.message);
    }

    const summary =
      results.length > 1
        ? `\nSync ${ok ? "complete" : "finished with errors"}.\n${totalResources} resources stored from successful providers.`
        : results[0]?.ok
          ? `\n${results[0].total} resources stored.`
          : "";

    return {
      results,
      ok,
      totalResources,
      relationships,
      message: parts.join("\n\n") + summary,
    };
  } finally {
    store.close();
  }
}

/**
 * Refresh GitHub↔Vercel source_for Relationships only when both providers
 * succeeded in this sync run (complete evidence). Incomplete evidence never
 * triggers destructive stale cleanup.
 */
function refreshGitHubVercelRelationships(
  store: Store,
  results: SyncProviderResult[],
): RelationshipSyncSummary {
  const githubResult = results.find((r) => r.providerId === "github");
  const vercelResult = results.find((r) => r.providerId === "vercel");

  // Both providers must have been attempted and succeeded this run.
  if (!githubResult?.ok || !vercelResult?.ok) {
    return {
      refreshed: false,
      inferred: 0,
      removed: 0,
      message: "",
    };
  }

  const resources = store.listResources();
  const inferred = inferGitHubVercelRelationships(resources);
  const inferredIds = new Set(inferred.map((r) => r.id));

  for (const rel of inferred) {
    store.upsertRelationship(rel);
  }

  const existing = store.listRelationships().filter(isGitHubVercelSourceFor);
  const staleIds = existing
    .filter((r) => !inferredIds.has(r.id))
    .map((r) => r.id);
  const removed = store.deleteRelationshipsByIds(staleIds);

  const n = inferred.length;
  const message =
    n === 0
      ? `Relationships:\n  0 GitHub → Vercel source_for (no deterministic matches)`
      : `Relationships:\n  ${n} GitHub → Vercel source_for` +
        (removed > 0 ? `\n  ${removed} stale relationship${removed === 1 ? "" : "s"} removed` : "");

  return {
    refreshed: true,
    inferred: n,
    removed,
    message,
  };
}
