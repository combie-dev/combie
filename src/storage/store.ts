import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import {
  diffResource,
  type Change,
  type ChangeField,
  type ChangeObservation,
} from "../domain/change.ts";
import type { Resource, ResourceKind } from "../domain/resource.ts";
import type {
  Relationship,
  RelationshipEvidence,
  RelationshipKind,
} from "../domain/relationship.ts";
import { dbPath, stateDir } from "./paths.ts";

export interface ProviderRecord {
  id: string;
  name: string;
  status: string;
  lastSyncAt: string | null;
  config: Record<string, unknown>;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  last_sync_at TEXT,
  config_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_resource_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(provider, kind, provider_resource_id)
);

CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  source_resource_id TEXT NOT NULL,
  target_resource_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(source_resource_id, kind, target_resource_id)
);

CREATE TABLE IF NOT EXISTS changes (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind = 'updated'),
  observed_at TEXT NOT NULL,
  fields_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS changes_observed_at_idx
  ON changes(observed_at DESC);

CREATE INDEX IF NOT EXISTS changes_resource_observed_id_idx
  ON changes(resource_id, observed_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS resource_change_baselines (
  resource_id TEXT PRIMARY KEY
);
`;

export interface ApplyResourceObservation extends ChangeObservation {
  /** Missing keys listed here are unknown, so their previous facts survive. */
  preserveMissingMetadataKeys?: string[];
}

export class Store {
  private readonly baseDir: string;
  private db: Database | null = null;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  /** Absolute path to the Combie state directory for this store. */
  get stateDir(): string {
    return stateDir(this.baseDir);
  }

  private getDb(): Database {
    if (!this.db) {
      throw new Error(
        "Store is not open. Call init() before using the store.",
      );
    }
    return this.db;
  }

  /** Apply idempotent schema (safe on existing DBs that predate new tables). */
  private applySchema(db: Database): void {
    db.exec(SCHEMA);
  }

  /** Baseline only Resources that existed before Change detection was enabled. */
  private prepareChangeDetection(db: Database): void {
    const migrate = db.transaction(() => {
      const marker = db
        .query(`SELECT value FROM meta WHERE key = 'change_detection_v1'`)
        .get() as { value: string } | null;
      if (marker) return;
      db.exec(
        `INSERT OR IGNORE INTO resource_change_baselines (resource_id)
         SELECT id FROM resources`,
      );
      db.query(
        `INSERT INTO meta (key, value) VALUES ('change_detection_v1', 'true')`,
      ).run();
    });
    migrate();
  }

  /** Create state directory + schema. Idempotent. */
  init(): void {
    const dir = this.stateDir;
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    if (!this.db) {
      this.db = new Database(dbPath(this.baseDir));
      this.db.exec("PRAGMA journal_mode = WAL;");
      this.db.exec("PRAGMA foreign_keys = ON;");
    }

    this.applySchema(this.db);
    this.db
      .query(
        `INSERT INTO meta (key, value) VALUES ('initialized', 'true')
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run();
    this.prepareChangeDetection(this.db);
    this.db
      .query(
        `INSERT INTO meta (key, value) VALUES ('schema_version', '1')
         ON CONFLICT(key) DO NOTHING`,
      )
      .run();
  }

  isInitialized(): boolean {
    try {
      if (!this.db) {
        const path = dbPath(this.baseDir);
        if (!existsSync(path)) {
          return false;
        }
        this.db = new Database(path);
        this.db.exec("PRAGMA journal_mode = WAL;");
        this.db.exec("PRAGMA foreign_keys = ON;");
      }
      // Ensure newer tables (e.g. relationships) exist on pre-005 databases.
      this.applySchema(this.db);
      const row = this.db
        .query(`SELECT value FROM meta WHERE key = 'initialized'`)
        .get() as { value: string } | null;
      const initialized = row?.value === "true";
      if (initialized) this.prepareChangeDetection(this.db);
      return initialized;
    } catch {
      return false;
    }
  }

  upsertProvider(provider: {
    id: string;
    name: string;
    status: string;
    lastSyncAt?: string | null;
    config?: Record<string, unknown>;
  }): void {
    const db = this.getDb();
    const configJson = JSON.stringify(provider.config ?? {});
    const lastSyncAt = provider.lastSyncAt ?? null;
    db.query(
      `INSERT INTO providers (id, name, status, last_sync_at, config_json)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         status = excluded.status,
         last_sync_at = COALESCE(excluded.last_sync_at, providers.last_sync_at),
         config_json = excluded.config_json`,
    ).run(provider.id, provider.name, provider.status, lastSyncAt, configJson);
  }

  getProvider(id: string): ProviderRecord | null {
    const row = this.getDb()
      .query(
        `SELECT id, name, status, last_sync_at, config_json FROM providers WHERE id = ?`,
      )
      .get(id) as
      | {
          id: string;
          name: string;
          status: string;
          last_sync_at: string | null;
          config_json: string;
        }
      | null;
    return row ? mapProvider(row) : null;
  }

  listProviders(): ProviderRecord[] {
    const rows = this.getDb()
      .query(
        `SELECT id, name, status, last_sync_at, config_json FROM providers ORDER BY id`,
      )
      .all() as Array<{
      id: string;
      name: string;
      status: string;
      last_sync_at: string | null;
      config_json: string;
    }>;
    return rows.map(mapProvider);
  }

  /**
   * Insert or update a resource.
   * On conflict (same provider+kind+provider_resource_id): update name, metadata, updated_at;
   * preserve created_at.
   */
  upsertResource(resource: Resource): void {
    const db = this.getDb();
    const metadataJson = JSON.stringify(resource.metadata);
    db.query(
      `INSERT INTO resources (
         id, provider, provider_resource_id, kind, name,
         metadata_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(provider, kind, provider_resource_id) DO UPDATE SET
         name = excluded.name,
         metadata_json = excluded.metadata_json,
         updated_at = excluded.updated_at`,
    ).run(
      resource.id,
      resource.provider,
      resource.providerResourceId,
      resource.kind,
      resource.name,
      metadataJson,
      resource.createdAt,
      resource.updatedAt,
    );
  }

  listResources(filter?: { provider?: string; kind?: string }): Resource[] {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filter?.provider) {
      conditions.push("provider = ?");
      params.push(filter.provider);
    }
    if (filter?.kind) {
      conditions.push("kind = ?");
      params.push(filter.kind);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.getDb()
      .query(
        `SELECT id, provider, provider_resource_id, kind, name,
                metadata_json, created_at, updated_at
         FROM resources ${where}
         ORDER BY provider, kind, name`,
      )
      .all(...params) as Array<{
      id: string;
      provider: string;
      provider_resource_id: string;
      kind: string;
      name: string;
      metadata_json: string;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map(mapResource);
  }

  getResource(id: string): Resource | null {
    const row = this.getDb()
      .query(
        `SELECT id, provider, provider_resource_id, kind, name,
                metadata_json, created_at, updated_at
         FROM resources WHERE id = ?`,
      )
      .get(id) as
      | {
          id: string;
          provider: string;
          provider_resource_id: string;
          kind: string;
          name: string;
          metadata_json: string;
          created_at: string;
          updated_at: string;
        }
      | null;
    return row ? mapResource(row) : null;
  }

  /**
   * Atomically compare an authoritative normalized Resource, persist at most
   * one Change, and update current state. Initial discovery and upgrade
   * baselines update current state without fabricating history.
   */
  applyResource(
    resource: Resource,
    observation: ApplyResourceObservation,
  ): Change | null {
    const db = this.getDb();
    const apply = db.transaction((): Change | null => {
      const previous = this.getResource(resource.id);
      const effective = previous
        ? preserveUnknownMetadata(previous, resource, observation)
        : resource;
      const baseline = db
        .query(
          `SELECT resource_id FROM resource_change_baselines WHERE resource_id = ?`,
        )
        .get(resource.id) as { resource_id: string } | null;

      let change: Change | null = null;
      if (previous && !baseline) {
        change = diffResource(previous, effective, observation);
        if (change) this.insertChange(change);
      }

      this.upsertResource(effective);
      if (baseline) {
        db.query(
          `DELETE FROM resource_change_baselines WHERE resource_id = ?`,
        ).run(resource.id);
      }
      return change;
    });
    return apply();
  }

  private insertChange(change: Change): void {
    this.getDb()
      .query(
        `INSERT INTO changes (id, resource_id, kind, observed_at, fields_json)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        change.id,
        change.resourceId,
        change.kind,
        change.observedAt,
        serializeChangeFields(change.fields),
      );
  }

  listChanges(): Change[] {
    const rows = this.getDb()
      .query(
        `SELECT id, resource_id, kind, observed_at, fields_json
         FROM changes
         ORDER BY observed_at DESC, rowid DESC`,
      )
      .all() as ChangeRow[];
    return rows.map(mapChange);
  }

  listChangesForResource(resourceId: string): Change[] {
    const rows = this.getDb()
      .query(
        `SELECT id, resource_id, kind, observed_at, fields_json
         FROM changes
         WHERE resource_id = ?
         ORDER BY observed_at DESC, id DESC`,
      )
      .all(resourceId) as ChangeRow[];
    return rows.map(mapChange);
  }

  setLastSync(providerId: string, at: string): void {
    const db = this.getDb();
    const result = db
      .query(`UPDATE providers SET last_sync_at = ? WHERE id = ?`)
      .run(at, providerId);
    if (result.changes === 0) {
      throw new Error(
        `Provider '${providerId}' not found. Connect the provider before syncing.`,
      );
    }
  }

  /**
   * Insert or update a relationship.
   * On conflict (same source+kind+target): update evidence and updated_at;
   * preserve created_at and stable id.
   */
  upsertRelationship(relationship: Relationship): void {
    const db = this.getDb();
    const evidenceJson = JSON.stringify(relationship.evidence);
    db.query(
      `INSERT INTO relationships (
         id, source_resource_id, target_resource_id, kind,
         evidence_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(source_resource_id, kind, target_resource_id) DO UPDATE SET
         evidence_json = excluded.evidence_json,
         updated_at = excluded.updated_at`,
    ).run(
      relationship.id,
      relationship.sourceResourceId,
      relationship.targetResourceId,
      relationship.kind,
      evidenceJson,
      relationship.createdAt,
      relationship.updatedAt,
    );
  }

  listRelationships(): Relationship[] {
    const rows = this.getDb()
      .query(
        `SELECT id, source_resource_id, target_resource_id, kind,
                evidence_json, created_at, updated_at
         FROM relationships
         ORDER BY kind, source_resource_id, target_resource_id`,
      )
      .all() as Array<{
      id: string;
      source_resource_id: string;
      target_resource_id: string;
      kind: string;
      evidence_json: string;
      created_at: string;
      updated_at: string;
    }>;
    return rows.map(mapRelationship);
  }

  /**
   * One-hop Relationships where the Resource is either source or target.
   * Does not invent inverse rows — reverse lookup reads canonical storage.
   */
  listRelationshipsForResource(resourceId: string): Relationship[] {
    const rows = this.getDb()
      .query(
        `SELECT id, source_resource_id, target_resource_id, kind,
                evidence_json, created_at, updated_at
         FROM relationships
         WHERE source_resource_id = ? OR target_resource_id = ?
         ORDER BY kind, source_resource_id, target_resource_id`,
      )
      .all(resourceId, resourceId) as Array<{
      id: string;
      source_resource_id: string;
      target_resource_id: string;
      kind: string;
      evidence_json: string;
      created_at: string;
      updated_at: string;
    }>;
    return rows.map(mapRelationship);
  }

  getRelationship(id: string): Relationship | null {
    const row = this.getDb()
      .query(
        `SELECT id, source_resource_id, target_resource_id, kind,
                evidence_json, created_at, updated_at
         FROM relationships WHERE id = ?`,
      )
      .get(id) as
      | {
          id: string;
          source_resource_id: string;
          target_resource_id: string;
          kind: string;
          evidence_json: string;
          created_at: string;
          updated_at: string;
        }
      | null;
    return row ? mapRelationship(row) : null;
  }

  deleteRelationship(id: string): void {
    this.getDb().query(`DELETE FROM relationships WHERE id = ?`).run(id);
  }

  /**
   * Delete relationships by id. Used for stale inference cleanup.
   */
  deleteRelationshipsByIds(ids: string[]): number {
    if (ids.length === 0) return 0;
    const db = this.getDb();
    let deleted = 0;
    const stmt = db.query(`DELETE FROM relationships WHERE id = ?`);
    for (const id of ids) {
      const result = stmt.run(id);
      deleted += Number(result.changes);
    }
    return deleted;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

function mapProvider(row: {
  id: string;
  name: string;
  status: string;
  last_sync_at: string | null;
  config_json: string;
}): ProviderRecord {
  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(row.config_json) as Record<string, unknown>;
  } catch {
    config = {};
  }
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    lastSyncAt: row.last_sync_at,
    config,
  };
}

function mapResource(row: {
  id: string;
  provider: string;
  provider_resource_id: string;
  kind: string;
  name: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}): Resource {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(row.metadata_json) as Record<string, unknown>;
  } catch {
    metadata = {};
  }
  return {
    id: row.id,
    provider: row.provider,
    providerResourceId: row.provider_resource_id,
    kind: row.kind as ResourceKind,
    name: row.name,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRelationship(row: {
  id: string;
  source_resource_id: string;
  target_resource_id: string;
  kind: string;
  evidence_json: string;
  created_at: string;
  updated_at: string;
}): Relationship {
  let evidence: RelationshipEvidence = {
    source: "unknown",
    mechanism: "unknown",
  };
  try {
    evidence = JSON.parse(row.evidence_json) as RelationshipEvidence;
  } catch {
    /* keep default */
  }
  return {
    id: row.id,
    sourceResourceId: row.source_resource_id,
    targetResourceId: row.target_resource_id,
    kind: row.kind as RelationshipKind,
    evidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface ChangeRow {
  id: string;
  resource_id: string;
  kind: string;
  observed_at: string;
  fields_json: string;
}

interface StoredChangeField {
  path: string;
  beforePresent: boolean;
  before?: unknown;
  afterPresent: boolean;
  after?: unknown;
}

function serializeChangeFields(fields: ChangeField[]): string {
  const stored: StoredChangeField[] = fields.map((field) => ({
    path: field.path,
    beforePresent: field.before !== undefined,
    ...(field.before !== undefined ? { before: field.before } : {}),
    afterPresent: field.after !== undefined,
    ...(field.after !== undefined ? { after: field.after } : {}),
  }));
  return JSON.stringify(stored);
}

function mapChange(row: ChangeRow): Change {
  const stored = JSON.parse(row.fields_json) as StoredChangeField[];
  return {
    id: row.id,
    resourceId: row.resource_id,
    kind: "updated",
    observedAt: row.observed_at,
    fields: stored.map((field) => ({
      path: field.path,
      before: field.beforePresent ? field.before : undefined,
      after: field.afterPresent ? field.after : undefined,
    })),
  };
}

function preserveUnknownMetadata(
  previous: Resource,
  incoming: Resource,
  observation: ApplyResourceObservation,
): Resource {
  const keys = observation.preserveMissingMetadataKeys ?? [];
  if (keys.length === 0) return incoming;

  const metadata = { ...incoming.metadata };
  for (const key of keys) {
    if (
      !Object.prototype.hasOwnProperty.call(incoming.metadata, key) &&
      Object.prototype.hasOwnProperty.call(previous.metadata, key)
    ) {
      metadata[key] = previous.metadata[key];
    }
  }
  return { ...incoming, metadata };
}
