import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, chmodSync } from "node:fs";
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
import type {
  GitHubWorkflowRunEvidence,
  GitHubWorkflowRunRefresh,
} from "../providers/github/workflow-run.ts";
import type {
  NeonOperationEvidence,
  NeonOperationRefresh,
} from "../providers/neon/operation.ts";
import type {
  SentryIssueEvidence,
  SentryIssueRefresh,
} from "../providers/sentry/issue.ts";
import type {
  SentryReleaseEvidence,
  SentryReleaseRefresh,
} from "../providers/sentry/release.ts";
import type {
  VercelDeploymentEvidence,
  VercelDeploymentRefresh,
} from "../providers/vercel/deployment.ts";
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

CREATE TABLE IF NOT EXISTS vercel_deployments (
  uid TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'vercel',
  resource_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  ready_state TEXT,
  state TEXT,
  target TEXT,
  created_at_ms INTEGER NOT NULL,
  building_at_ms INTEGER,
  ready_at_ms INTEGER,
  observed_at TEXT NOT NULL,
  source TEXT,
  git_commit_sha TEXT
);

CREATE INDEX IF NOT EXISTS vercel_deployments_resource_created_uid_idx
  ON vercel_deployments(resource_id, created_at_ms DESC, uid DESC);

CREATE TABLE IF NOT EXISTS vercel_deployment_refresh (
  resource_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  observed_at TEXT NOT NULL,
  message TEXT,
  result_count INTEGER,
  last_success_observed_at TEXT
);

CREATE TABLE IF NOT EXISTS github_workflow_runs (
  run_id INTEGER PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'github',
  resource_id TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  workflow_id INTEGER,
  name TEXT,
  run_number INTEGER,
  run_attempt INTEGER,
  event TEXT,
  status TEXT,
  conclusion TEXT,
  head_branch TEXT,
  head_sha TEXT,
  created_at TEXT NOT NULL,
  run_started_at TEXT,
  updated_at TEXT,
  observed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS github_workflow_runs_resource_created_id_idx
  ON github_workflow_runs(resource_id, created_at DESC, run_id DESC);

CREATE TABLE IF NOT EXISTS github_workflow_run_refresh (
  resource_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  observed_at TEXT NOT NULL,
  message TEXT,
  result_count INTEGER,
  last_success_observed_at TEXT
);

CREATE TABLE IF NOT EXISTS neon_operations (
  operation_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'neon',
  resource_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  failures_count INTEGER NOT NULL,
  branch_id TEXT,
  endpoint_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  retry_at TEXT,
  total_duration_ms INTEGER NOT NULL,
  observed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS neon_operations_resource_created_id_idx
  ON neon_operations(resource_id, created_at DESC, operation_id DESC);

CREATE TABLE IF NOT EXISTS neon_operation_refresh (
  resource_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  observed_at TEXT NOT NULL,
  message TEXT,
  result_count INTEGER,
  last_success_observed_at TEXT
);

CREATE TABLE IF NOT EXISTS sentry_releases (
  version TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'sentry',
  project_id TEXT NOT NULL,
  short_version TEXT,
  status TEXT,
  date_created TEXT NOT NULL,
  date_released TEXT,
  git_commit_sha TEXT,
  observed_at TEXT NOT NULL,
  PRIMARY KEY (version, resource_id)
);

CREATE INDEX IF NOT EXISTS sentry_releases_resource_created_version_idx
  ON sentry_releases(resource_id, date_created DESC, version DESC);

CREATE TABLE IF NOT EXISTS sentry_release_refresh (
  resource_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  observed_at TEXT NOT NULL,
  message TEXT,
  result_count INTEGER,
  last_success_observed_at TEXT
);

CREATE TABLE IF NOT EXISTS sentry_issues (
  issue_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'sentry',
  project_id TEXT NOT NULL,
  short_id TEXT,
  status TEXT,
  level TEXT,
  count INTEGER,
  user_count INTEGER,
  issue_category TEXT,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  PRIMARY KEY (issue_id, resource_id)
);

CREATE INDEX IF NOT EXISTS sentry_issues_resource_last_seen_id_idx
  ON sentry_issues(resource_id, last_seen DESC, issue_id DESC);

CREATE TABLE IF NOT EXISTS sentry_issue_refresh (
  resource_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  observed_at TEXT NOT NULL,
  message TEXT,
  result_count INTEGER,
  last_success_observed_at TEXT
);

CREATE TABLE IF NOT EXISTS investigations (
  id TEXT PRIMARY KEY,
  subject_resource_id TEXT NOT NULL,
  composed_at TEXT NOT NULL,
  snapshot_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS investigations_composed_at_id_idx
  ON investigations(composed_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS resolutions (
  id TEXT PRIMARY KEY,
  investigation_id TEXT,
  subject_resource_id TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  decision TEXT,
  action TEXT,
  outcome TEXT,
  evidence_ids TEXT
);

CREATE INDEX IF NOT EXISTS resolutions_recorded_at_id_idx
  ON resolutions(recorded_at DESC, id DESC);
`;

export interface ApplyResourceObservation extends ChangeObservation {
  /** Missing keys listed here are unknown, so their previous facts survive. */
  preserveMissingMetadataKeys?: string[];
}

export class Store {
  private readonly baseDir: string;
  private db: Database | null = null;
  private dbReadOnly = false;

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

  /** Reopen through the explicit write path before any state mutation. */
  private getWritableDb(): Database {
    if (this.dbReadOnly) {
      this.init();
    }
    return this.getDb();
  }

  /** Apply idempotent schema (safe on existing DBs that predate new tables). */
  private applySchema(db: Database): void {
    db.exec(SCHEMA);
    this.ensureRefreshResultCountColumns(db);
    this.ensureRefreshLastSuccessObservedAtColumns(db);
    // Sprint 035: pre-035 vercel_deployments lack git_commit_sha (nullable).
    this.ensureNullableTextColumn(db, "vercel_deployments", "git_commit_sha");
    // Sprint 046: pre-046 sentry_releases lack git_commit_sha (nullable).
    this.ensureNullableTextColumn(db, "sentry_releases", "git_commit_sha");
    // Sprint 054: pre-054 resolutions lack evidence_ids (nullable JSON array).
    this.ensureNullableTextColumn(db, "resolutions", "evidence_ids");
    // Sprint 057: pre-057 investigation_id is NOT NULL. Rebuild so Resource-
    // anchored rows can omit it. Existing rows keep their investigation ids.
    this.ensureResolutionsInvestigationIdNullable(db);
  }

  /**
   * Additive upgrade: pre-027 refresh tables lack result_count.
   * Existing rows become NULL (unknown provenance) — never backfilled from
   * retained evidence row counts.
   */
  private ensureRefreshResultCountColumns(db: Database): void {
    this.ensureNullableIntegerColumn(db, "vercel_deployment_refresh", "result_count");
    this.ensureNullableIntegerColumn(db, "github_workflow_run_refresh", "result_count");
  }

  /**
   * Additive upgrade: pre-028 refresh tables lack last_success_observed_at.
   * Safe backfill only when status='success' (observed_at is then proven to
   * be a successful refresh time). Failure rows stay NULL — never invent
   * authority history by copying latest-attempt observed_at.
   */
  private ensureRefreshLastSuccessObservedAtColumns(db: Database): void {
    const tables = [
      "vercel_deployment_refresh",
      "github_workflow_run_refresh",
      "neon_operation_refresh",
    ] as const;
    for (const table of tables) {
      const added = this.ensureNullableTextColumn(
        db,
        table,
        "last_success_observed_at",
      );
      if (!added) continue;
      // Only backfill rows whose current status proves a successful refresh.
      db.exec(
        `UPDATE ${table}
         SET last_success_observed_at = observed_at
         WHERE status = 'success'
           AND last_success_observed_at IS NULL`,
      );
    }
  }

  private ensureNullableIntegerColumn(
    db: Database,
    table: string,
    column: string,
  ): void {
    const rows = db
      .query(`PRAGMA table_info(${table})`)
      .all() as Array<{ name: string }>;
    // Table may not exist yet on pre-evidence DBs; CREATE TABLE above adds it.
    if (rows.length === 0) return;
    if (rows.some((row) => row.name === column)) return;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} INTEGER`);
  }

  /** Returns true when the column was newly added. */
  private ensureNullableTextColumn(
    db: Database,
    table: string,
    column: string,
  ): boolean {
    const rows = db
      .query(`PRAGMA table_info(${table})`)
      .all() as Array<{ name: string }>;
    if (rows.length === 0) return false;
    if (rows.some((row) => row.name === column)) return false;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT`);
    return true;
  }

  /**
   * Sprint 057: drop NOT NULL on resolutions.investigation_id.
   * CREATE TABLE IF NOT EXISTS cannot change an existing column.
   * Copies rows unchanged — never invents an investigation id.
   */
  private ensureResolutionsInvestigationIdNullable(db: Database): void {
    const columns = db
      .query(`PRAGMA table_info(resolutions)`)
      .all() as Array<{ name: string; notnull: number }>;
    if (columns.length === 0) return;
    const investigation = columns.find((column) => column.name === "investigation_id");
    if (!investigation || investigation.notnull === 0) return;
    const hasEvidence = columns.some((column) => column.name === "evidence_ids");
    db.exec(`
      CREATE TABLE resolutions_057 (
        id TEXT PRIMARY KEY,
        investigation_id TEXT,
        subject_resource_id TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        decision TEXT,
        action TEXT,
        outcome TEXT,
        evidence_ids TEXT
      );
    `);
    if (hasEvidence) {
      db.exec(
        `INSERT INTO resolutions_057 (
           id, investigation_id, subject_resource_id, recorded_at,
           decision, action, outcome, evidence_ids
         )
         SELECT id, investigation_id, subject_resource_id, recorded_at,
                decision, action, outcome, evidence_ids
         FROM resolutions`,
      );
    } else {
      db.exec(
        `INSERT INTO resolutions_057 (
           id, investigation_id, subject_resource_id, recorded_at,
           decision, action, outcome, evidence_ids
         )
         SELECT id, investigation_id, subject_resource_id, recorded_at,
                decision, action, outcome, NULL
         FROM resolutions`,
      );
    }
    db.exec(`DROP TABLE resolutions`);
    db.exec(`ALTER TABLE resolutions_057 RENAME TO resolutions`);
    db.exec(
      `CREATE INDEX IF NOT EXISTS resolutions_recorded_at_id_idx
       ON resolutions(recorded_at DESC, id DESC)`,
    );
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
    mkdirSync(dir, { recursive: true, mode: 0o700 });

    if (this.dbReadOnly) {
      this.db?.close();
      this.db = null;
      this.dbReadOnly = false;
    }

    if (!this.db) {
      this.db = new Database(dbPath(this.baseDir));
      this.db.exec("PRAGMA journal_mode = WAL;");
      this.db.exec("PRAGMA foreign_keys = ON;");
      if (process.platform !== "win32") {
        chmodSync(dbPath(this.baseDir), 0o600);
      }
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
        this.db = new Database(path, { readonly: true });
        this.dbReadOnly = true;
      }
      const row = this.db
        .query(`SELECT value FROM meta WHERE key = 'initialized'`)
        .get() as { value: string } | null;
      return row?.value === "true";
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
    const db = this.getWritableDb();
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
    const db = this.getWritableDb();
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
    const db = this.getWritableDb();
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

  /**
   * Replace Resource metadata without emitting a Change.
   * Used for control-plane enrichment (code mappings) that must not pollute
   * the Change timeline.
   */
  replaceResourceMetadata(
    resourceId: string,
    metadata: Record<string, unknown>,
  ): void {
    const current = this.getResource(resourceId);
    if (!current) return;
    const now = new Date().toISOString();
    this.getWritableDb()
      .query(
        `UPDATE resources SET metadata_json = ?, updated_at = ? WHERE id = ?`,
      )
      .run(JSON.stringify(metadata), now, resourceId);
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
    const db = this.getWritableDb();
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
    const db = this.getWritableDb();
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
    this.getWritableDb().query(`DELETE FROM relationships WHERE id = ?`).run(id);
  }

  /**
   * Delete relationships by id. Used for stale inference cleanup.
   */
  deleteRelationshipsByIds(ids: string[]): number {
    if (ids.length === 0) return 0;
    const db = this.getWritableDb();
    let deleted = 0;
    const stmt = db.query(`DELETE FROM relationships WHERE id = ?`);
    for (const id of ids) {
      const result = stmt.run(id);
      deleted += Number(result.changes);
    }
    return deleted;
  }

  /**
   * Insert or update Vercel deployment evidence by stable deployment uid.
   * Refreshes latest readyState/state/lifecycle times and Combie observedAt.
   * Does not create Resource Changes.
   */
  upsertVercelDeployment(deployment: VercelDeploymentEvidence): void {
    const db = this.getWritableDb();
    db.query(
      `INSERT INTO vercel_deployments (
         uid, provider, resource_id, project_id,
         ready_state, state, target,
         created_at_ms, building_at_ms, ready_at_ms,
         observed_at, source, git_commit_sha
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uid) DO UPDATE SET
         provider = excluded.provider,
         resource_id = excluded.resource_id,
         project_id = excluded.project_id,
         ready_state = excluded.ready_state,
         state = excluded.state,
         target = excluded.target,
         created_at_ms = excluded.created_at_ms,
         building_at_ms = excluded.building_at_ms,
         ready_at_ms = excluded.ready_at_ms,
         observed_at = excluded.observed_at,
         source = excluded.source,
         git_commit_sha = excluded.git_commit_sha`,
    ).run(
      deployment.uid,
      deployment.provider,
      deployment.resourceId,
      deployment.projectId,
      deployment.readyState,
      deployment.state,
      deployment.target,
      deployment.createdAtMs,
      deployment.buildingAtMs,
      deployment.readyAtMs,
      deployment.observedAt,
      deployment.source,
      deployment.gitCommitSha,
    );
  }

  /**
   * Newest-first deployment evidence for an exact Vercel project Resource.
   * Ordering: provider created_at_ms DESC, uid DESC (stable tie-break).
   */
  listVercelDeploymentsForResource(
    resourceId: string,
  ): VercelDeploymentEvidence[] {
    const rows = this.getDb()
      .query(
        `SELECT uid, provider, resource_id, project_id,
                ready_state, state, target,
                created_at_ms, building_at_ms, ready_at_ms,
                observed_at, source, git_commit_sha
         FROM vercel_deployments
         WHERE resource_id = ?
         ORDER BY created_at_ms DESC, uid DESC`,
      )
      .all(resourceId) as VercelDeploymentRow[];
    return rows.map(mapVercelDeployment);
  }

  countVercelDeployments(): number {
    const row = this.getDb()
      .query(`SELECT COUNT(*) AS n FROM vercel_deployments`)
      .get() as { n: number };
    return Number(row.n);
  }

  setVercelDeploymentRefresh(refresh: VercelDeploymentRefresh): void {
    this.getWritableDb()
      .query(
        `INSERT INTO vercel_deployment_refresh (
           resource_id, status, observed_at, message, result_count,
           last_success_observed_at
         ) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(resource_id) DO UPDATE SET
           status = excluded.status,
           observed_at = excluded.observed_at,
           message = excluded.message,
           result_count = excluded.result_count,
           last_success_observed_at = excluded.last_success_observed_at`,
      )
      .run(
        refresh.resourceId,
        refresh.status,
        refresh.observedAt,
        refresh.message,
        refresh.resultCount,
        refresh.lastSuccessfulObservedAt,
      );
  }

  getVercelDeploymentRefresh(
    resourceId: string,
  ): VercelDeploymentRefresh | null {
    const row = this.getDb()
      .query(
        `SELECT resource_id, status, observed_at, message, result_count,
                last_success_observed_at
         FROM vercel_deployment_refresh
         WHERE resource_id = ?`,
      )
      .get(resourceId) as
      | {
          resource_id: string;
          status: string;
          observed_at: string;
          message: string | null;
          result_count: number | null;
          last_success_observed_at: string | null;
        }
      | null;
    if (!row) return null;
    return {
      resourceId: row.resource_id,
      status: row.status as "success" | "failure",
      observedAt: row.observed_at,
      message: row.message,
      resultCount: row.result_count,
      lastSuccessfulObservedAt: row.last_success_observed_at,
    };
  }

  /**
   * Insert or update GitHub workflow-run evidence by stable run id.
   * Reruns update run_attempt/status/conclusion on the same row.
   * Does not create Resource Changes.
   */
  upsertGitHubWorkflowRun(run: GitHubWorkflowRunEvidence): void {
    this.getWritableDb()
      .query(
        `INSERT INTO github_workflow_runs (
           run_id, provider, resource_id, repository_id,
           workflow_id, name, run_number, run_attempt, event,
           status, conclusion, head_branch, head_sha,
           created_at, run_started_at, updated_at, observed_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(run_id) DO UPDATE SET
           provider = excluded.provider,
           resource_id = excluded.resource_id,
           repository_id = excluded.repository_id,
           workflow_id = excluded.workflow_id,
           name = excluded.name,
           run_number = excluded.run_number,
           run_attempt = excluded.run_attempt,
           event = excluded.event,
           status = excluded.status,
           conclusion = excluded.conclusion,
           head_branch = excluded.head_branch,
           head_sha = excluded.head_sha,
           created_at = excluded.created_at,
           run_started_at = excluded.run_started_at,
           updated_at = excluded.updated_at,
           observed_at = excluded.observed_at`,
      )
      .run(
        run.runId,
        run.provider,
        run.resourceId,
        run.repositoryId,
        run.workflowId,
        run.name,
        run.runNumber,
        run.runAttempt,
        run.event,
        run.status,
        run.conclusion,
        run.headBranch,
        run.headSha,
        run.createdAt,
        run.runStartedAt,
        run.updatedAt,
        run.observedAt,
      );
  }

  /**
   * Newest-first workflow runs for an exact GitHub repository Resource.
   * Ordering: created_at DESC, run_id DESC.
   */
  listGitHubWorkflowRunsForResource(
    resourceId: string,
  ): GitHubWorkflowRunEvidence[] {
    const rows = this.getDb()
      .query(
        `SELECT run_id, provider, resource_id, repository_id,
                workflow_id, name, run_number, run_attempt, event,
                status, conclusion, head_branch, head_sha,
                created_at, run_started_at, updated_at, observed_at
         FROM github_workflow_runs
         WHERE resource_id = ?
         ORDER BY created_at DESC, run_id DESC`,
      )
      .all(resourceId) as GitHubWorkflowRunRow[];
    return rows.map(mapGitHubWorkflowRun);
  }

  countGitHubWorkflowRuns(): number {
    const row = this.getDb()
      .query(`SELECT COUNT(*) AS n FROM github_workflow_runs`)
      .get() as { n: number };
    return Number(row.n);
  }

  setGitHubWorkflowRunRefresh(refresh: GitHubWorkflowRunRefresh): void {
    this.getWritableDb()
      .query(
        `INSERT INTO github_workflow_run_refresh (
           resource_id, status, observed_at, message, result_count,
           last_success_observed_at
         ) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(resource_id) DO UPDATE SET
           status = excluded.status,
           observed_at = excluded.observed_at,
           message = excluded.message,
           result_count = excluded.result_count,
           last_success_observed_at = excluded.last_success_observed_at`,
      )
      .run(
        refresh.resourceId,
        refresh.status,
        refresh.observedAt,
        refresh.message,
        refresh.resultCount,
        refresh.lastSuccessfulObservedAt,
      );
  }

  getGitHubWorkflowRunRefresh(
    resourceId: string,
  ): GitHubWorkflowRunRefresh | null {
    const row = this.getDb()
      .query(
        `SELECT resource_id, status, observed_at, message, result_count,
                last_success_observed_at
         FROM github_workflow_run_refresh
         WHERE resource_id = ?`,
      )
      .get(resourceId) as
      | {
          resource_id: string;
          status: string;
          observed_at: string;
          message: string | null;
          result_count: number | null;
          last_success_observed_at: string | null;
        }
      | null;
    if (!row) return null;
    return {
      resourceId: row.resource_id,
      status: row.status as "success" | "failure",
      observedAt: row.observed_at,
      message: row.message,
      resultCount: row.result_count,
      lastSuccessfulObservedAt: row.last_success_observed_at,
    };
  }

  /** Upsert the latest observed lifecycle for one stable Neon operation id. */
  upsertNeonOperation(operation: NeonOperationEvidence): void {
    this.getWritableDb()
      .query(
        `INSERT INTO neon_operations (
           operation_id, provider, resource_id, project_id,
           action, status, failures_count, branch_id, endpoint_id,
           created_at, updated_at, retry_at, total_duration_ms, observed_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(operation_id) DO UPDATE SET
           provider = excluded.provider,
           resource_id = excluded.resource_id,
           project_id = excluded.project_id,
           action = excluded.action,
           status = excluded.status,
           failures_count = excluded.failures_count,
           branch_id = excluded.branch_id,
           endpoint_id = excluded.endpoint_id,
           created_at = excluded.created_at,
           updated_at = excluded.updated_at,
           retry_at = excluded.retry_at,
           total_duration_ms = excluded.total_duration_ms,
           observed_at = excluded.observed_at`,
      )
      .run(
        operation.operationId,
        operation.provider,
        operation.resourceId,
        operation.projectId,
        operation.action,
        operation.status,
        operation.failuresCount,
        operation.branchId,
        operation.endpointId,
        operation.createdAt,
        operation.updatedAt,
        operation.retryAt,
        operation.totalDurationMs,
        operation.observedAt,
      );
  }

  /** Newest-first operations for one exact Neon project Resource. */
  listNeonOperationsForResource(resourceId: string): NeonOperationEvidence[] {
    const rows = this.getDb()
      .query(
        `SELECT operation_id, provider, resource_id, project_id,
                action, status, failures_count, branch_id, endpoint_id,
                created_at, updated_at, retry_at,
                total_duration_ms, observed_at
         FROM neon_operations
         WHERE resource_id = ?
         ORDER BY created_at DESC, operation_id DESC`,
      )
      .all(resourceId) as NeonOperationRow[];
    return rows.map(mapNeonOperation);
  }

  countNeonOperations(): number {
    const row = this.getDb()
      .query(`SELECT COUNT(*) AS n FROM neon_operations`)
      .get() as { n: number };
    return Number(row.n);
  }

  setNeonOperationRefresh(refresh: NeonOperationRefresh): void {
    this.getWritableDb()
      .query(
        `INSERT INTO neon_operation_refresh (
           resource_id, status, observed_at, message, result_count,
           last_success_observed_at
         ) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(resource_id) DO UPDATE SET
           status = excluded.status,
           observed_at = excluded.observed_at,
           message = excluded.message,
           result_count = excluded.result_count,
           last_success_observed_at = excluded.last_success_observed_at`,
      )
      .run(
        refresh.resourceId,
        refresh.status,
        refresh.observedAt,
        refresh.message,
        refresh.resultCount,
        refresh.lastSuccessfulObservedAt,
      );
  }

  getNeonOperationRefresh(resourceId: string): NeonOperationRefresh | null {
    const row = this.getDb()
      .query(
        `SELECT resource_id, status, observed_at, message, result_count,
                last_success_observed_at
         FROM neon_operation_refresh
         WHERE resource_id = ?`,
      )
      .get(resourceId) as
      | {
          resource_id: string;
          status: string;
          observed_at: string;
          message: string | null;
          result_count: number | null;
          last_success_observed_at: string | null;
        }
      | null;
    if (!row) return null;
    return {
      resourceId: row.resource_id,
      status: row.status as "success" | "failure",
      observedAt: row.observed_at,
      message: row.message,
      resultCount: row.result_count,
      lastSuccessfulObservedAt: row.last_success_observed_at,
    };
  }

  /**
   * Insert or update Sentry release evidence by version + project Resource.
   * A multi-project release is stored once per exact project binding.
   * Does not create Resource Changes.
   */
  upsertSentryRelease(release: SentryReleaseEvidence): void {
    this.getWritableDb()
      .query(
        `INSERT INTO sentry_releases (
           version, resource_id, provider, project_id,
           short_version, status, date_created, date_released,
           git_commit_sha, observed_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(version, resource_id) DO UPDATE SET
           provider = excluded.provider,
           project_id = excluded.project_id,
           short_version = excluded.short_version,
           status = excluded.status,
           date_created = excluded.date_created,
           date_released = excluded.date_released,
           git_commit_sha = excluded.git_commit_sha,
           observed_at = excluded.observed_at`,
      )
      .run(
        release.version,
        release.resourceId,
        release.provider,
        release.projectId,
        release.shortVersion,
        release.status,
        release.dateCreated,
        release.dateReleased,
        release.gitCommitSha,
        release.observedAt,
      );
  }

  /**
   * Newest-first releases for an exact Sentry project Resource.
   * Ordering: date_created DESC, version DESC.
   */
  listSentryReleasesForResource(resourceId: string): SentryReleaseEvidence[] {
    const rows = this.getDb()
      .query(
        `SELECT version, resource_id, provider, project_id,
                short_version, status, date_created, date_released,
                git_commit_sha, observed_at
         FROM sentry_releases
         WHERE resource_id = ?
         ORDER BY date_created DESC, version DESC`,
      )
      .all(resourceId) as SentryReleaseRow[];
    return rows.map(mapSentryRelease);
  }

  countSentryReleases(): number {
    const row = this.getDb()
      .query(`SELECT COUNT(*) AS n FROM sentry_releases`)
      .get() as { n: number };
    return Number(row.n);
  }

  setSentryReleaseRefresh(refresh: SentryReleaseRefresh): void {
    this.getWritableDb()
      .query(
        `INSERT INTO sentry_release_refresh (
           resource_id, status, observed_at, message, result_count,
           last_success_observed_at
         ) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(resource_id) DO UPDATE SET
           status = excluded.status,
           observed_at = excluded.observed_at,
           message = excluded.message,
           result_count = excluded.result_count,
           last_success_observed_at = excluded.last_success_observed_at`,
      )
      .run(
        refresh.resourceId,
        refresh.status,
        refresh.observedAt,
        refresh.message,
        refresh.resultCount,
        refresh.lastSuccessfulObservedAt,
      );
  }

  /**
   * Insert or update Sentry issue-aggregate evidence by issue id + project
   * Resource. Does not create Resource Changes.
   */
  upsertSentryIssue(issue: SentryIssueEvidence): void {
    this.getWritableDb()
      .query(
        `INSERT INTO sentry_issues (
           issue_id, resource_id, provider, project_id, short_id,
           status, level, count, user_count, issue_category,
           first_seen, last_seen, observed_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(issue_id, resource_id) DO UPDATE SET
           provider = excluded.provider,
           project_id = excluded.project_id,
           short_id = excluded.short_id,
           status = excluded.status,
           level = excluded.level,
           count = excluded.count,
           user_count = excluded.user_count,
           issue_category = excluded.issue_category,
           first_seen = excluded.first_seen,
           last_seen = excluded.last_seen,
           observed_at = excluded.observed_at`,
      )
      .run(
        issue.issueId,
        issue.resourceId,
        issue.provider,
        issue.projectId,
        issue.shortId,
        issue.status,
        issue.level,
        issue.count,
        issue.userCount,
        issue.issueCategory,
        issue.firstSeen,
        issue.lastSeen,
        issue.observedAt,
      );
  }

  /**
   * Most-recently-seen-first issues for an exact Sentry project Resource.
   * Ordering: last_seen DESC, issue_id DESC.
   */
  listSentryIssuesForResource(resourceId: string): SentryIssueEvidence[] {
    const rows = this.getDb()
      .query(
        `SELECT issue_id, resource_id, provider, project_id, short_id,
                status, level, count, user_count, issue_category,
                first_seen, last_seen, observed_at
         FROM sentry_issues
         WHERE resource_id = ?
         ORDER BY last_seen DESC, issue_id DESC`,
      )
      .all(resourceId) as SentryIssueRow[];
    return rows.map(mapSentryIssue);
  }

  countSentryIssues(): number {
    const row = this.getDb()
      .query(`SELECT COUNT(*) AS n FROM sentry_issues`)
      .get() as { n: number };
    return Number(row.n);
  }

  setSentryIssueRefresh(refresh: SentryIssueRefresh): void {
    this.getWritableDb()
      .query(
        `INSERT INTO sentry_issue_refresh (
           resource_id, status, observed_at, message, result_count,
           last_success_observed_at
         ) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(resource_id) DO UPDATE SET
           status = excluded.status,
           observed_at = excluded.observed_at,
           message = excluded.message,
           result_count = excluded.result_count,
           last_success_observed_at = excluded.last_success_observed_at`,
      )
      .run(
        refresh.resourceId,
        refresh.status,
        refresh.observedAt,
        refresh.message,
        refresh.resultCount,
        refresh.lastSuccessfulObservedAt,
      );
  }

  getSentryReleaseRefresh(resourceId: string): SentryReleaseRefresh | null {
    const row = this.getDb()
      .query(
        `SELECT resource_id, status, observed_at, message, result_count,
                last_success_observed_at
         FROM sentry_release_refresh
         WHERE resource_id = ?`,
      )
      .get(resourceId) as
      | {
          resource_id: string;
          status: string;
          observed_at: string;
          message: string | null;
          result_count: number | null;
          last_success_observed_at: string | null;
        }
      | null;
    if (!row) return null;
    return {
      resourceId: row.resource_id,
      status: row.status as "success" | "failure",
      observedAt: row.observed_at,
      message: row.message,
      resultCount: row.result_count,
      lastSuccessfulObservedAt: row.last_success_observed_at,
    };
  }

  getSentryIssueRefresh(resourceId: string): SentryIssueRefresh | null {
    const row = this.getDb()
      .query(
        `SELECT resource_id, status, observed_at, message, result_count,
                last_success_observed_at
         FROM sentry_issue_refresh
         WHERE resource_id = ?`,
      )
      .get(resourceId) as
      | {
          resource_id: string;
          status: string;
          observed_at: string;
          message: string | null;
          result_count: number | null;
          last_success_observed_at: string | null;
        }
      | null;
    if (!row) return null;
    return {
      resourceId: row.resource_id,
      status: row.status as "success" | "failure",
      observedAt: row.observed_at,
      message: row.message,
      resultCount: row.result_count,
      lastSuccessfulObservedAt: row.last_success_observed_at,
    };
  }

  insertInvestigation(row: {
    id: string;
    subjectResourceId: string;
    composedAt: string;
    snapshotJson: string;
  }): void {
    this.getWritableDb()
      .query(
        `INSERT INTO investigations (
           id, subject_resource_id, composed_at, snapshot_json
         ) VALUES (?, ?, ?, ?)`,
      )
      .run(row.id, row.subjectResourceId, row.composedAt, row.snapshotJson);
  }

  listInvestigationSummaries(filter?: {
    subjectResourceId?: string;
  }): Array<{
    id: string;
    subjectResourceId: string;
    composedAt: string;
  }> {
    const db = this.getDb();
    const table = db
      .query(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'investigations'`,
      )
      .get() as { name: string } | null;
    if (!table) return [];
    const where =
      filter?.subjectResourceId !== undefined
        ? "WHERE subject_resource_id = ?"
        : "";
    const params =
      filter?.subjectResourceId !== undefined
        ? [filter.subjectResourceId]
        : [];
    const rows = db
      .query(
        `SELECT id, subject_resource_id, composed_at
         FROM investigations
         ${where}
         ORDER BY composed_at DESC, id DESC`,
      )
      .all(...params) as Array<{
      id: string;
      subject_resource_id: string;
      composed_at: string;
    }>;
    return rows.map((row) => ({
      id: row.id,
      subjectResourceId: row.subject_resource_id,
      composedAt: row.composed_at,
    }));
  }

  getInvestigationRow(id: string): {
    id: string;
    subjectResourceId: string;
    composedAt: string;
    snapshotJson: string;
  } | null {
    const row = this.getDb()
      .query(
        `SELECT id, subject_resource_id, composed_at, snapshot_json
         FROM investigations
         WHERE id = ?`,
      )
      .get(id) as
      | {
          id: string;
          subject_resource_id: string;
          composed_at: string;
          snapshot_json: string;
        }
      | null;
    if (!row) return null;
    return {
      id: row.id,
      subjectResourceId: row.subject_resource_id,
      composedAt: row.composed_at,
      snapshotJson: row.snapshot_json,
    };
  }

  insertResolution(row: {
    id: string;
    investigationId?: string;
    subjectResourceId: string;
    recordedAt: string;
    decision?: string;
    action?: string;
    outcome?: string;
    evidenceIds?: string[];
  }): void {
    this.getWritableDb()
      .query(
        `INSERT INTO resolutions (
           id, investigation_id, subject_resource_id, recorded_at,
           decision, action, outcome, evidence_ids
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        row.id,
        row.investigationId ?? null,
        row.subjectResourceId,
        row.recordedAt,
        row.decision ?? null,
        row.action ?? null,
        row.outcome ?? null,
        row.evidenceIds ? JSON.stringify(row.evidenceIds) : null,
      );
  }

  /** Read-only probe: pre-054 DBs lack the additive evidence_ids column. */
  private hasResolutionEvidenceColumn(db: Database): boolean {
    const rows = db
      .query(`PRAGMA table_info(resolutions)`)
      .all() as Array<{ name: string }>;
    return rows.some((row) => row.name === "evidence_ids");
  }

  listResolutionSummaries(filter?: {
    investigationId?: string;
    subjectResourceId?: string;
    evidenceId?: string;
  }): ResolutionRow[] {
    const db = this.getDb();
    const table = db
      .query(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'resolutions'`,
      )
      .get() as { name: string } | null;
    if (!table) return [];
    const clauses: string[] = [];
    const params: string[] = [];
    if (filter?.investigationId !== undefined) {
      clauses.push("investigation_id = ?");
      params.push(filter.investigationId);
    }
    if (filter?.subjectResourceId !== undefined) {
      clauses.push("subject_resource_id = ?");
      params.push(filter.subjectResourceId);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const evidence = this.hasResolutionEvidenceColumn(db)
      ? ", evidence_ids"
      : "";
    const rows = db
      .query(
        `SELECT id, investigation_id, subject_resource_id, recorded_at,
                decision, action, outcome${evidence}
         FROM resolutions
         ${where}
         ORDER BY recorded_at DESC, id DESC`,
      )
      .all(...params) as ResolutionSqlRow[];
    let mapped = rows.map((row) => mapResolutionRow(row, evidence !== ""));
    if (filter?.evidenceId !== undefined) {
      mapped = mapped.filter((row) =>
        row.evidenceIds?.includes(filter.evidenceId!),
      );
    }
    return mapped;
  }

  getResolutionRow(id: string): ResolutionRow | null {
    const db = this.getDb();
    const table = db
      .query(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'resolutions'`,
      )
      .get() as { name: string } | null;
    if (!table) return null;
    const evidence = this.hasResolutionEvidenceColumn(db)
      ? ", evidence_ids"
      : "";
    const row = db
      .query(
        `SELECT id, investigation_id, subject_resource_id, recorded_at,
                decision, action, outcome${evidence}
         FROM resolutions
         WHERE id = ?`,
      )
      .get(id) as ResolutionSqlRow | null;
    if (!row) return null;
    return mapResolutionRow(row, evidence !== "");
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.dbReadOnly = false;
    }
  }
}

type ResolutionSqlRow = {
  id: string;
  investigation_id: string | null;
  subject_resource_id: string;
  recorded_at: string;
  decision: string | null;
  action: string | null;
  outcome: string | null;
  evidence_ids?: string | null;
};

type ResolutionRow = {
  id: string;
  investigationId?: string;
  subjectResourceId: string;
  recordedAt: string;
  decision?: string;
  action?: string;
  outcome?: string;
  evidenceIds?: string[];
};

/**
 * Stored evidence_ids is a JSON array of exact ids. Corrupt or non-array
 * payloads are untrusted and omitted — never surfaced as invented evidence.
 */
function parseResolutionEvidence(raw: string | null | undefined): string[] | undefined {
  if (raw == null) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.every((value) => typeof value === "string")
    ) {
      return parsed.length > 0 ? (parsed as string[]) : undefined;
    }
  } catch {
    // Untrusted stored payload: skip without inventing ids.
  }
  return undefined;
}

function mapResolutionRow(
  row: ResolutionSqlRow,
  hasEvidenceColumn: boolean,
): ResolutionRow {
  const evidence = hasEvidenceColumn
    ? parseResolutionEvidence(row.evidence_ids)
    : undefined;
  return {
    id: row.id,
    ...(row.investigation_id ? { investigationId: row.investigation_id } : {}),
    subjectResourceId: row.subject_resource_id,
    recordedAt: row.recorded_at,
    ...(row.decision ? { decision: row.decision } : {}),
    ...(row.action ? { action: row.action } : {}),
    ...(row.outcome ? { outcome: row.outcome } : {}),
    ...(evidence ? { evidenceIds: evidence } : {}),
  };
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

interface VercelDeploymentRow {
  uid: string;
  provider: string;
  resource_id: string;
  project_id: string;
  ready_state: string | null;
  state: string | null;
  target: string | null;
  created_at_ms: number;
  building_at_ms: number | null;
  ready_at_ms: number | null;
  observed_at: string;
  source: string | null;
  git_commit_sha: string | null;
}

function mapVercelDeployment(row: VercelDeploymentRow): VercelDeploymentEvidence {
  return {
    provider: "vercel",
    uid: row.uid,
    resourceId: row.resource_id,
    projectId: row.project_id,
    readyState: row.ready_state,
    state: row.state,
    target: row.target,
    createdAtMs: row.created_at_ms,
    buildingAtMs: row.building_at_ms,
    readyAtMs: row.ready_at_ms,
    observedAt: row.observed_at,
    source: row.source,
    gitCommitSha: row.git_commit_sha,
  };
}

interface GitHubWorkflowRunRow {
  run_id: number;
  provider: string;
  resource_id: string;
  repository_id: string;
  workflow_id: number | null;
  name: string | null;
  run_number: number | null;
  run_attempt: number | null;
  event: string | null;
  status: string | null;
  conclusion: string | null;
  head_branch: string | null;
  head_sha: string | null;
  created_at: string;
  run_started_at: string | null;
  updated_at: string | null;
  observed_at: string;
}

function mapGitHubWorkflowRun(
  row: GitHubWorkflowRunRow,
): GitHubWorkflowRunEvidence {
  return {
    provider: "github",
    runId: row.run_id,
    resourceId: row.resource_id,
    repositoryId: row.repository_id,
    workflowId: row.workflow_id,
    name: row.name,
    runNumber: row.run_number,
    runAttempt: row.run_attempt,
    event: row.event,
    status: row.status,
    conclusion: row.conclusion,
    headBranch: row.head_branch,
    headSha: row.head_sha,
    createdAt: row.created_at,
    runStartedAt: row.run_started_at,
    updatedAt: row.updated_at,
    observedAt: row.observed_at,
  };
}

interface NeonOperationRow {
  operation_id: string;
  provider: string;
  resource_id: string;
  project_id: string;
  action: string;
  status: string;
  failures_count: number;
  branch_id: string | null;
  endpoint_id: string | null;
  created_at: string;
  updated_at: string;
  retry_at: string | null;
  total_duration_ms: number;
  observed_at: string;
}

function mapNeonOperation(row: NeonOperationRow): NeonOperationEvidence {
  return {
    provider: "neon",
    operationId: row.operation_id,
    resourceId: row.resource_id,
    projectId: row.project_id,
    action: row.action,
    status: row.status,
    failuresCount: row.failures_count,
    branchId: row.branch_id,
    endpointId: row.endpoint_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    retryAt: row.retry_at,
    totalDurationMs: row.total_duration_ms,
    observedAt: row.observed_at,
  };
}

interface SentryReleaseRow {
  version: string;
  resource_id: string;
  provider: string;
  project_id: string;
  short_version: string | null;
  status: string | null;
  date_created: string;
  date_released: string | null;
  git_commit_sha: string | null;
  observed_at: string;
}

function mapSentryRelease(row: SentryReleaseRow): SentryReleaseEvidence {
  return {
    provider: "sentry",
    version: row.version,
    resourceId: row.resource_id,
    projectId: row.project_id,
    shortVersion: row.short_version,
    status: row.status,
    dateCreated: row.date_created,
    dateReleased: row.date_released,
    observedAt: row.observed_at,
    gitCommitSha: row.git_commit_sha,
  };
}

interface SentryIssueRow {
  issue_id: string;
  resource_id: string;
  provider: string;
  project_id: string;
  short_id: string | null;
  status: string | null;
  level: string | null;
  count: number | null;
  user_count: number | null;
  issue_category: string | null;
  first_seen: string;
  last_seen: string;
  observed_at: string;
}

function mapSentryIssue(row: SentryIssueRow): SentryIssueEvidence {
  return {
    provider: "sentry",
    issueId: row.issue_id,
    resourceId: row.resource_id,
    projectId: row.project_id,
    shortId: row.short_id,
    status: row.status,
    level: row.level,
    count: row.count,
    userCount: row.user_count,
    issueCategory: row.issue_category,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    observedAt: row.observed_at,
  };
}
