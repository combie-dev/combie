import { createResource, type Resource } from "../../domain/resource.ts";
import type {
  NeonBranch,
  NeonDatabase,
  NeonEndpoint,
  NeonProject,
} from "./client.ts";

export const NEON_PROVIDER = "neon";

export interface NeonBranchMetadata {
  id: string;
  name: string;
  default: boolean;
  protected: boolean;
}

export interface NeonDatabaseMetadata {
  name: string;
  ownerName?: string;
}

export interface NeonEndpointMetadata {
  id: string;
  type?: string;
  branchId?: string;
}

export interface NeonProjectEnrichment {
  /** Omitted = unknown; [] = authoritative empty. */
  branches?: NeonBranchMetadata[];
  databases?: NeonDatabaseMetadata[];
  endpoints?: NeonEndpointMetadata[];
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
 * Compact branch facts. Branch names are unique per project, so sorting by
 * name makes the collection set-like: provider ordering never creates
 * false Changes. Stable branch ids are retained; states and usage counters
 * are volatile and excluded.
 */
export function normalizeBranches(branches: NeonBranch[]): NeonBranchMetadata[] {
  const normalized: NeonBranchMetadata[] = [];
  for (const branch of branches) {
    if (!branch || typeof branch !== "object") continue;
    const id = nonEmptyString(branch.id);
    const name = nonEmptyString(branch.name);
    if (!id || !name) continue;
    normalized.push({
      id,
      name,
      default: branch.default === true,
      protected: branch.protected === true,
    });
  }
  return normalized.sort((a, b) => compareText(a.name, b.name));
}

/**
 * Logical Postgres databases on the project's default branch. Names are
 * future join evidence; numeric ids and branch ids are opaque and excluded.
 */
export function normalizeDatabases(
  databases: NeonDatabase[],
): NeonDatabaseMetadata[] {
  const normalized: NeonDatabaseMetadata[] = [];
  for (const database of databases) {
    if (!database || typeof database !== "object") continue;
    const name = nonEmptyString(database.name);
    if (!name) continue;
    const entry: NeonDatabaseMetadata = { name };
    const ownerName = nonEmptyString(database.owner_name);
    if (ownerName) entry.ownerName = ownerName;
    normalized.push(entry);
  }
  return normalized.sort((a, b) => compareText(a.name, b.name));
}

/**
 * Compute endpoints. Endpoint ids are stable (ep-...). Host is marked
 * sensitive in Neon's schema; state and autoscaling fields are volatile.
 */
export function normalizeEndpoints(
  endpoints: NeonEndpoint[],
): NeonEndpointMetadata[] {
  const normalized: NeonEndpointMetadata[] = [];
  for (const endpoint of endpoints) {
    if (!endpoint || typeof endpoint !== "object") continue;
    const id = nonEmptyString(endpoint.id);
    if (!id) continue;
    const entry: NeonEndpointMetadata = { id };
    const type = nonEmptyString(endpoint.type);
    if (type) entry.type = type;
    const branchId = nonEmptyString(endpoint.branch_id);
    if (branchId) entry.branchId = branchId;
    normalized.push(entry);
  }
  return normalized.sort((a, b) => compareText(a.id, b.id));
}

export function normalizeProject(
  project: NeonProject,
  enrichment: NeonProjectEnrichment = {},
): Resource {
  const metadata: Record<string, unknown> = {};

  const regionId = nonEmptyString(project.region_id);
  if (regionId) metadata.regionId = regionId;
  if (typeof project.pg_version === "number") {
    metadata.pgVersion = project.pg_version;
  }
  const orgId = nonEmptyString(project.org_id);
  if (orgId) metadata.orgId = orgId;
  const orgName = nonEmptyString(project.org_name);
  if (orgName) metadata.orgName = orgName;
  const createdAt = nonEmptyString(project.created_at);
  if (createdAt) metadata.createdAt = createdAt;

  if (enrichment.branches !== undefined) metadata.branches = enrichment.branches;
  if (enrichment.databases !== undefined) metadata.databases = enrichment.databases;
  if (enrichment.endpoints !== undefined) metadata.endpoints = enrichment.endpoints;

  return createResource({
    provider: NEON_PROVIDER,
    providerResourceId: project.id,
    kind: "project",
    name: project.name,
    metadata,
  });
}
