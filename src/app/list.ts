import type { Resource, ResourceKind } from "../domain/resource.ts";
import type { Change } from "../domain/change.ts";
import type { Relationship } from "../domain/relationship.ts";
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

export interface ListChangesResult {
  changes: Change[];
}

export interface ResourceLabel {
  provider: string;
  name: string;
  kind: string;
  /** Prefer fullName for GitHub repositories when present. */
  displayName: string;
}

export interface ListRelationshipsResult {
  relationships: Relationship[];
  /** Resolved labels for source/target when resources still exist. */
  labels: Map<string, ResourceLabel>;
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

export function listRelationships(baseDir: string): ListRelationshipsResult {
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) {
      throw notInitialized();
    }
    const relationships = store.listRelationships();
    const resources = store.listResources();
    const labels = new Map<string, ResourceLabel>();
    for (const r of resources) {
      const fullName =
        typeof r.metadata.fullName === "string" ? r.metadata.fullName : null;
      labels.set(r.id, {
        provider: r.provider,
        name: r.name,
        kind: r.kind,
        displayName: fullName && fullName.length > 0 ? fullName : r.name,
      });
    }
    return { relationships, labels };
  } finally {
    store.close();
  }
}

export function listChanges(baseDir: string): ListChangesResult {
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) {
      throw notInitialized();
    }
    return { changes: store.listChanges() };
  } finally {
    store.close();
  }
}

const PROVIDER_DISPLAY: Record<string, string> = {
  github: "GitHub",
  vercel: "Vercel",
  cloudflare: "Cloudflare",
  sentry: "Sentry",
};

function formatResourceLabel(
  resourceId: string,
  labels: Map<string, ResourceLabel>,
): string {
  const label = labels.get(resourceId);
  if (label) {
    // Display: "GitHub sgr0691/combie" / "Vercel combie-web"
    const providerLabel =
      PROVIDER_DISPLAY[label.provider] ??
      label.provider.charAt(0).toUpperCase() + label.provider.slice(1);
    return `${providerLabel} ${label.displayName}`;
  }
  return resourceId;
}

export function formatRelationshipsTable(
  relationships: Relationship[],
  labels: Map<string, ResourceLabel>,
): string {
  if (relationships.length === 0) {
    return (
      "No relationships discovered yet.\n" +
      "Run: combie sync\n" +
      "(Relationships require deterministic provider evidence, e.g. Vercel GitHub link matched to a GitHub repository.)"
    );
  }

  const rows = relationships.map((rel) => {
    const from = formatResourceLabel(rel.sourceResourceId, labels);
    const to = formatResourceLabel(rel.targetResourceId, labels);
    const evidence =
      rel.evidence.repository ||
      rel.evidence.githubRepoId ||
      rel.evidence.apexName ||
      rel.evidence.mechanism;
    return {
      from,
      kind: rel.kind,
      to,
      evidence: String(evidence),
    };
  });

  const col1 = Math.max("FROM".length, ...rows.map((r) => r.from.length));
  const col2 = Math.max("RELATIONSHIP".length, ...rows.map((r) => r.kind.length));
  const col3 = Math.max("TO".length, ...rows.map((r) => r.to.length));
  const header =
    "FROM".padEnd(col1) +
    "  " +
    "RELATIONSHIP".padEnd(col2) +
    "  " +
    "TO".padEnd(col3) +
    "  " +
    "EVIDENCE";
  const body = rows
    .map(
      (r) =>
        r.from.padEnd(col1) +
        "  " +
        r.kind.padEnd(col2) +
        "  " +
        r.to.padEnd(col3) +
        "  " +
        r.evidence,
    )
    .join("\n");
  return `${header}\n${body}`;
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
    return "No providers connected.\nRun: combie connect cloudflare\nor: combie connect github";
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

export function formatChangesTable(
  changes: Change[],
  now = Date.now(),
): string {
  if (changes.length === 0) {
    return "No changes observed yet.\nRun: combie sync";
  }
  const rows = changes.map((change) => ({
    when: formatRelativeTime(change.observedAt, now),
    resource: change.resourceId,
    kind: change.kind,
    fields: change.fields.map((field) => field.path).join(", "),
  }));
  const col1 = Math.max("WHEN".length, ...rows.map((row) => row.when.length));
  const col2 = Math.max(
    "RESOURCE".length,
    ...rows.map((row) => row.resource.length),
  );
  const col3 = Math.max("CHANGE".length, ...rows.map((row) => row.kind.length));
  const header =
    "WHEN".padEnd(col1) +
    "  " +
    "RESOURCE".padEnd(col2) +
    "  " +
    "CHANGE".padEnd(col3) +
    "  FIELDS";
  const body = rows
    .map(
      (row) =>
        row.when.padEnd(col1) +
        "  " +
        row.resource.padEnd(col2) +
        "  " +
        row.kind.padEnd(col3) +
        "  " +
        row.fields,
    )
    .join("\n");
  return `${header}\n${body}`;
}
