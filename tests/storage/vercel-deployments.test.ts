import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createResource } from "../../src/domain/resource.ts";
import type { VercelDeploymentEvidence } from "../../src/providers/vercel/deployment.ts";
import { Store } from "../../src/storage/store.ts";
import { Database } from "bun:sqlite";
import { dbPath } from "../../src/storage/paths.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-deploy-store-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function evidence(
  overrides: Partial<VercelDeploymentEvidence> = {},
): VercelDeploymentEvidence {
  return {
    provider: "vercel",
    uid: "dpl_1",
    resourceId: "vercel:project:prj_a",
    projectId: "prj_a",
    readyState: "BUILDING",
    state: "BUILDING",
    target: "production",
    createdAtMs: 2000,
    buildingAtMs: 2100,
    readyAtMs: null,
    observedAt: "2026-08-09T10:00:00.000Z",
    source: "git",
    ...overrides,
  };
}

describe("Store vercel deployment persistence", () => {
  test("inserts and lists newest-first with stable uid tie-break", () => {
    const store = new Store(dir);
    store.init();
    store.upsertVercelDeployment(
      evidence({ uid: "dpl_b", createdAtMs: 1000 }),
    );
    store.upsertVercelDeployment(
      evidence({ uid: "dpl_a", createdAtMs: 3000 }),
    );
    store.upsertVercelDeployment(
      evidence({ uid: "dpl_c", createdAtMs: 3000 }),
    );
    const list = store.listVercelDeploymentsForResource(
      "vercel:project:prj_a",
    );
    expect(list.map((d) => d.uid)).toEqual(["dpl_c", "dpl_a", "dpl_b"]);
    store.close();
  });

  test("repeated upsert is idempotent and refreshes status/state", () => {
    const store = new Store(dir);
    store.init();
    store.upsertVercelDeployment(evidence());
    store.upsertVercelDeployment(
      evidence({
        readyState: "READY",
        state: "READY",
        readyAtMs: 5000,
        observedAt: "2026-08-09T11:00:00.000Z",
      }),
    );
    const list = store.listVercelDeploymentsForResource(
      "vercel:project:prj_a",
    );
    expect(list).toHaveLength(1);
    expect(list[0]!.readyState).toBe("READY");
    expect(list[0]!.readyAtMs).toBe(5000);
    expect(list[0]!.observedAt).toBe("2026-08-09T11:00:00.000Z");
    expect(store.countVercelDeployments()).toBe(1);
    store.close();
  });

  test("exact Resource association scopes reads", () => {
    const store = new Store(dir);
    store.init();
    store.upsertVercelDeployment(evidence());
    store.upsertVercelDeployment(
      evidence({
        uid: "dpl_other",
        resourceId: "vercel:project:prj_b",
        projectId: "prj_b",
      }),
    );
    expect(
      store.listVercelDeploymentsForResource("vercel:project:prj_a"),
    ).toHaveLength(1);
    expect(
      store.listVercelDeploymentsForResource("vercel:project:prj_b")[0]!
        .uid,
    ).toBe("dpl_other");
    store.close();
  });

  test("refresh success/failure and pre-020 DB upgrade", () => {
    // Pre-020 database: resources only, no deployment tables.
    const path = dbPath(dir);
    const raw = new Database(path);
    raw.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO meta (key, value) VALUES ('initialized', 'true');
      CREATE TABLE providers (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL,
        last_sync_at TEXT, config_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE resources (
        id TEXT PRIMARY KEY, provider TEXT NOT NULL,
        provider_resource_id TEXT NOT NULL, kind TEXT NOT NULL,
        name TEXT NOT NULL, metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        UNIQUE(provider, kind, provider_resource_id)
      );
    `);
    raw.close();

    const store = new Store(dir);
    expect(store.isInitialized()).toBe(true);
    // Tables created on open.
    store.upsertVercelDeployment(evidence());
    store.setVercelDeploymentRefresh({
      resourceId: "vercel:project:prj_a",
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
    resultCount: null,
    lastSuccessfulObservedAt: null,
    });
    expect(store.getVercelDeploymentRefresh("vercel:project:prj_a")?.status).toBe(
      "success",
    );
    store.setVercelDeploymentRefresh({
      resourceId: "vercel:project:prj_a",
      status: "failure",
      observedAt: "2026-08-09T13:00:00.000Z",
      message: "timeout",
    resultCount: null,
    lastSuccessfulObservedAt: null,
    });
    expect(store.getVercelDeploymentRefresh("vercel:project:prj_a")).toEqual({
      resourceId: "vercel:project:prj_a",
      status: "failure",
      observedAt: "2026-08-09T13:00:00.000Z",
      message: "timeout",
    resultCount: null,
    lastSuccessfulObservedAt: null,
    });
    // Failure does not delete deployments.
    expect(store.listVercelDeploymentsForResource("vercel:project:prj_a")).toHaveLength(
      1,
    );
    store.close();
  });

  test("Sprint 027: result_count provenance, pre-027 null, no backfill", () => {
    // Pre-027 refresh table without result_count column.
    const path = dbPath(dir);
    const raw = new Database(path);
    raw.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO meta (key, value) VALUES ('initialized', 'true');
      CREATE TABLE providers (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL,
        last_sync_at TEXT, config_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE resources (
        id TEXT PRIMARY KEY, provider TEXT NOT NULL,
        provider_resource_id TEXT NOT NULL, kind TEXT NOT NULL,
        name TEXT NOT NULL, metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        UNIQUE(provider, kind, provider_resource_id)
      );
      CREATE TABLE vercel_deployments (
        uid TEXT PRIMARY KEY, provider TEXT NOT NULL DEFAULT 'vercel',
        resource_id TEXT NOT NULL, project_id TEXT NOT NULL,
        ready_state TEXT, state TEXT, target TEXT,
        created_at_ms INTEGER NOT NULL, building_at_ms INTEGER,
        ready_at_ms INTEGER, observed_at TEXT NOT NULL, source TEXT
      );
      CREATE TABLE vercel_deployment_refresh (
        resource_id TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
        observed_at TEXT NOT NULL,
        message TEXT
      );
      INSERT INTO vercel_deployment_refresh (resource_id, status, observed_at, message)
      VALUES ('vercel:project:prj_a', 'success', '2026-08-09T11:00:00.000Z', NULL);
      INSERT INTO vercel_deployments (
        uid, resource_id, project_id, ready_state, state, target,
        created_at_ms, observed_at
      ) VALUES (
        'dpl_old', 'vercel:project:prj_a', 'prj_a', 'READY', 'READY', 'production',
        1000, '2026-08-09T11:00:00.000Z'
      );
    `);
    raw.close();

    const store = new Store(dir);
    expect(store.isInitialized()).toBe(true);
    const upgraded = store.getVercelDeploymentRefresh("vercel:project:prj_a");
    // Pre-028 success rows safely backfill lastSuccessfulObservedAt from
    // observed_at (status proves success). result_count stays null (no count
    // backfill from retained evidence).
    expect(upgraded).toEqual({
      resourceId: "vercel:project:prj_a",
      status: "success",
      observedAt: "2026-08-09T11:00:00.000Z",
      message: null,
      resultCount: null,
      lastSuccessfulObservedAt: "2026-08-09T11:00:00.000Z",
    });
    // Must not backfill result_count from retained evidence count.
    expect(store.listVercelDeploymentsForResource("vercel:project:prj_a")).toHaveLength(
      1,
    );
    expect(upgraded?.resultCount).toBeNull();

    store.setVercelDeploymentRefresh({
      resourceId: "vercel:project:prj_a",
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 0,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    expect(store.getVercelDeploymentRefresh("vercel:project:prj_a")?.resultCount).toBe(
      0,
    );

    store.setVercelDeploymentRefresh({
      resourceId: "vercel:project:prj_a",
      status: "success",
      observedAt: "2026-08-09T12:30:00.000Z",
      message: null,
      resultCount: 2,
      lastSuccessfulObservedAt: "2026-08-09T12:30:00.000Z",
    });
    expect(store.getVercelDeploymentRefresh("vercel:project:prj_a")?.resultCount).toBe(
      2,
    );

    // Failure preserves last successful result count and time when caller passes them.
    store.setVercelDeploymentRefresh({
      resourceId: "vercel:project:prj_a",
      status: "failure",
      observedAt: "2026-08-09T13:00:00.000Z",
      message: "timeout",
      resultCount: 2,
      lastSuccessfulObservedAt: "2026-08-09T12:30:00.000Z",
    });
    expect(store.getVercelDeploymentRefresh("vercel:project:prj_a")).toEqual({
      resourceId: "vercel:project:prj_a",
      status: "failure",
      observedAt: "2026-08-09T13:00:00.000Z",
      message: "timeout",
      resultCount: 2,
      lastSuccessfulObservedAt: "2026-08-09T12:30:00.000Z",
    });
    // Secrets never appear on refresh rows.
    const row = store.getVercelDeploymentRefresh("vercel:project:prj_a");
    expect(JSON.stringify(row)).not.toMatch(/token|secret|password/i);
    store.close();
  });

  test("Sprint 028: last_success_observed_at backfill and failure preservation", () => {
    const path = dbPath(dir);
    const raw = new Database(path);
    raw.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO meta (key, value) VALUES ('initialized', 'true');
      CREATE TABLE providers (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL,
        last_sync_at TEXT, config_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE resources (
        id TEXT PRIMARY KEY, provider TEXT NOT NULL,
        provider_resource_id TEXT NOT NULL, kind TEXT NOT NULL,
        name TEXT NOT NULL, metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        UNIQUE(provider, kind, provider_resource_id)
      );
      CREATE TABLE vercel_deployment_refresh (
        resource_id TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
        observed_at TEXT NOT NULL,
        message TEXT,
        result_count INTEGER
      );
      INSERT INTO vercel_deployment_refresh
        (resource_id, status, observed_at, message, result_count)
      VALUES
        ('vercel:project:ok', 'success', '2026-08-09T11:00:00.000Z', NULL, 2),
        ('vercel:project:fail', 'failure', '2026-08-09T12:00:00.000Z', 'timeout', 3);
    `);
    raw.close();

    const store = new Store(dir);
    expect(store.isInitialized()).toBe(true);
    // Success row: safe backfill from observed_at.
    expect(store.getVercelDeploymentRefresh("vercel:project:ok")).toEqual({
      resourceId: "vercel:project:ok",
      status: "success",
      observedAt: "2026-08-09T11:00:00.000Z",
      message: null,
      resultCount: 2,
      lastSuccessfulObservedAt: "2026-08-09T11:00:00.000Z",
    });
    // Failure row: never invent success time from latest attempt.
    expect(store.getVercelDeploymentRefresh("vercel:project:fail")).toEqual({
      resourceId: "vercel:project:fail",
      status: "failure",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: "timeout",
      resultCount: 3,
      lastSuccessfulObservedAt: null,
    });
    store.close();
  });

  test("deployment upsert does not create Resource Changes", () => {
    const store = new Store(dir);
    store.init();
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj_a",
      kind: "project",
      name: "a",
      metadata: { accountId: "team_x" },
    });
    store.applyResource(project, {
      id: "obs-1",
      observedAt: "2026-08-09T09:00:00.000Z",
    });
    expect(store.listChanges()).toHaveLength(0);
    store.upsertVercelDeployment(evidence());
    store.upsertVercelDeployment(
      evidence({ readyState: "READY", observedAt: "2026-08-09T10:00:00.000Z" }),
    );
    expect(store.listChanges()).toHaveLength(0);
    const after = store.getResource(project.id)!;
    expect(after.metadata).toEqual({ accountId: "team_x" });
    store.close();
  });
});
