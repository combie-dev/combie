import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createResource } from "../../src/domain/resource.ts";
import type { NeonOperationEvidence } from "../../src/providers/neon/operation.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-neon-op-store-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function operation(
  overrides: Partial<NeonOperationEvidence> = {},
): NeonOperationEvidence {
  return {
    provider: "neon",
    operationId: "op-100",
    resourceId: "neon:project:p1",
    projectId: "p1",
    action: "start_compute",
    status: "running",
    failuresCount: 0,
    branchId: "br-1",
    endpointId: "ep-1",
    createdAt: "2026-08-09T10:00:00.000Z",
    updatedAt: "2026-08-09T10:00:01.000Z",
    retryAt: null,
    totalDurationMs: 1000,
    observedAt: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

describe("Store Neon operation persistence", () => {
  test("lists newest-first with stable operation-id tie-break", () => {
    const store = new Store(dir);
    store.init();
    store.upsertNeonOperation(
      operation({ operationId: "op-a", createdAt: "2026-08-09T09:00:00.000Z" }),
    );
    store.upsertNeonOperation(
      operation({ operationId: "op-c", createdAt: "2026-08-09T11:00:00.000Z" }),
    );
    store.upsertNeonOperation(
      operation({ operationId: "op-b", createdAt: "2026-08-09T11:00:00.000Z" }),
    );
    expect(
      store.listNeonOperationsForResource("neon:project:p1").map((item) => item.operationId),
    ).toEqual(["op-c", "op-b", "op-a"]);
    store.close();
  });

  test("lifecycle retry updates the same stable operation row", () => {
    const store = new Store(dir);
    store.init();
    store.upsertNeonOperation(operation());
    store.upsertNeonOperation(
      operation({
        status: "failed",
        failuresCount: 1,
        retryAt: "2026-08-09T12:30:00.000Z",
        updatedAt: "2026-08-09T12:30:00.000Z",
        observedAt: "2026-08-09T13:00:00.000Z",
      }),
    );
    const list = store.listNeonOperationsForResource("neon:project:p1");
    expect(list).toHaveLength(1);
    expect(list[0]!.status).toBe("failed");
    expect(list[0]!.failuresCount).toBe(1);
    expect(store.countNeonOperations()).toBe(1);
    store.close();
  });

  test("exact Resource association scopes reads", () => {
    const store = new Store(dir);
    store.init();
    store.upsertNeonOperation(operation());
    store.upsertNeonOperation(
      operation({ operationId: "op-200", projectId: "p2", resourceId: "neon:project:p2" }),
    );
    expect(store.listNeonOperationsForResource("neon:project:p1")).toHaveLength(1);
    store.close();
  });

  test("pre-022 DB upgrade is additive and failed refresh retains rows", () => {
    const raw = new Database(dbPath(dir));
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
    store.upsertNeonOperation(operation());
    store.setNeonOperationRefresh({
      resourceId: "neon:project:p1",
      status: "failure",
      observedAt: "2026-08-09T13:00:00.000Z",
      message: "Operation refresh failed (HTTP 403).",
      resultCount: null,
    lastSuccessfulObservedAt: null,
    });
    expect(store.getNeonOperationRefresh("neon:project:p1")?.status).toBe("failure");
    expect(store.listNeonOperationsForResource("neon:project:p1")).toHaveLength(1);
    store.close();
  });

  test("operation upserts create zero Resource Changes", () => {
    const store = new Store(dir);
    store.init();
    store.applyResource(
      createResource({
        provider: "neon",
        providerResourceId: "p1",
        kind: "project",
        name: "database",
        metadata: {},
      }),
      { id: "obs-1", observedAt: "2026-08-09T09:00:00.000Z" },
    );
    store.upsertNeonOperation(operation());
    store.upsertNeonOperation(operation({ status: "finished" }));
    expect(store.listChanges()).toHaveLength(0);
    store.close();
  });
});
