import type { Resource, ResourceKind } from "../domain/resource.ts";
import { Store, type ProviderRecord } from "../storage/store.ts";
import { notInitialized } from "./errors.ts";

export interface ListProvidersResult {
  providers: ProviderRecord[];
}

export interface ListResourcesOptions {
  baseDir: string;
  provider?: string;
  kind?: string;
}

export interface ListResourcesResult {
  resources: Resource[];
}

export function listProviders(baseDir: string): ListProvidersResult {
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) {
      throw notInitialized();
    }
    return { providers: store.listProviders() };
  } finally {
    store.close();
  }
}

export function listResources(options: ListResourcesOptions): ListResourcesResult {
  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) {
      throw notInitialized();
    }
    const filter: { provider?: string; kind?: string } = {};
    if (options.provider) filter.provider = options.provider.toLowerCase();
    if (options.kind) filter.kind = options.kind as ResourceKind;
    return { resources: store.listResources(filter) };
  } finally {
    store.close();
  }
}

/** Format relative time for CLI display. */
export function formatRelativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;
  const seconds = Math.round((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function formatProvidersTable(providers: ProviderRecord[], now = Date.now()): string {
  if (providers.length === 0) {
    return "No providers connected.\nRun: combie connect cloudflare";
  }
  const rows = providers.map((p) => ({
    provider: p.name,
    status: p.status === "connected" ? "Connected" : p.status,
    lastSync: formatRelativeTime(p.lastSyncAt, now),
  }));
  const col1 = Math.max("PROVIDER".length, ...rows.map((r) => r.provider.length));
  const col2 = Math.max("STATUS".length, ...rows.map((r) => r.status.length));
  const header =
    "PROVIDER".padEnd(col1) + "  " + "STATUS".padEnd(col2) + "  " + "LAST SYNC";
  const body = rows
    .map(
      (r) =>
        r.provider.padEnd(col1) + "  " + r.status.padEnd(col2) + "  " + r.lastSync,
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function formatResourcesTable(resources: Resource[]): string {
  if (resources.length === 0) {
    return "No resources discovered yet.\nRun: combie sync";
  }
  const rows = resources.map((r) => ({
    type: r.kind,
    name: r.name,
    provider: r.provider,
  }));
  const col1 = Math.max("TYPE".length, ...rows.map((r) => r.type.length));
  const col2 = Math.max("NAME".length, ...rows.map((r) => r.name.length));
  const header =
    "TYPE".padEnd(col1) + "  " + "NAME".padEnd(col2) + "  " + "PROVIDER";
  const body = rows
    .map(
      (r) =>
        r.type.padEnd(col1) + "  " + r.name.padEnd(col2) + "  " + r.provider,
    )
    .join("\n");
  return `${header}\n${body}`;
}
