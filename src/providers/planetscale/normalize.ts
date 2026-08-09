import { createResource, type Resource } from "../../domain/resource.ts";
import type {
  PlanetScaleBranch,
  PlanetScaleDatabase,
} from "./client.ts";

export const PLANETSCALE_PROVIDER = "planetscale";

export interface PlanetScaleBranchMetadata {
  id: string;
  name: string;
  production: boolean;
  ready: boolean;
  schemaReady?: boolean;
  parentBranch?: string;
  region?: string;
  engine?: string;
}

export interface PlanetScaleDatabaseEnrichment {
  /** Omitted = unknown; [] = authoritative empty. */
  branches?: PlanetScaleBranchMetadata[];
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Compact branch facts. Sorted by name so provider ordering never creates
 * false Changes. Hosts, passwords, and sleep-cycle state are excluded.
 */
export function normalizeBranches(
  branches: PlanetScaleBranch[],
): PlanetScaleBranchMetadata[] {
  const normalized: PlanetScaleBranchMetadata[] = [];
  for (const branch of branches) {
    if (!branch || typeof branch !== "object") continue;
    const id = nonEmptyString(branch.id);
    const name = nonEmptyString(branch.name);
    if (!id || !name) continue;
    const entry: PlanetScaleBranchMetadata = {
      id,
      name,
      production: branch.production === true,
      ready: branch.ready === true,
    };
    if (typeof branch.schema_ready === "boolean") {
      entry.schemaReady = branch.schema_ready;
    }
    const parent = nonEmptyString(branch.parent_branch ?? undefined);
    if (parent) entry.parentBranch = parent;
    const regionSlug = nonEmptyString(branch.region?.slug);
    if (regionSlug) entry.region = regionSlug;
    const engine = nonEmptyString(branch.kind);
    if (engine) entry.engine = engine;
    normalized.push(entry);
  }
  return normalized.sort((a, b) => compareText(a.name, b.name));
}

/**
 * PlanetScale Database → generic Combie `database` Resource.
 * Stable identity is the provider database id (rename-safe).
 * Engine/kind stays provider-backed metadata — no new Resource kinds.
 */
export function normalizeDatabase(
  database: PlanetScaleDatabase,
  enrichment: PlanetScaleDatabaseEnrichment = {},
): Resource {
  const metadata: Record<string, unknown> = {};

  const engine = nonEmptyString(database.kind);
  if (engine) metadata.engine = engine;

  const regionSlug = nonEmptyString(database.region?.slug);
  if (regionSlug) metadata.region = regionSlug;

  if (typeof database.ready === "boolean") {
    metadata.ready = database.ready;
  }

  const defaultBranch = nonEmptyString(database.default_branch);
  if (defaultBranch) metadata.defaultBranch = defaultBranch;

  if (typeof database.production_branches_count === "number") {
    metadata.productionBranchesCount = database.production_branches_count;
  }
  if (typeof database.development_branches_count === "number") {
    metadata.developmentBranchesCount = database.development_branches_count;
  }

  if (enrichment.branches !== undefined) {
    metadata.branches = enrichment.branches;
  }

  return createResource({
    provider: PLANETSCALE_PROVIDER,
    providerResourceId: database.id,
    kind: "database",
    name: database.name,
    metadata,
  });
}
