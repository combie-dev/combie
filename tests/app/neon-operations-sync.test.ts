import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncNeonOperations } from "../../src/app/neon-operations.ts";
import { createResource } from "../../src/domain/resource.ts";
import type { NeonOperationEvidence } from "../../src/providers/neon/operation.ts";
import { Store } from "../../src/storage/store.ts";
import operationsFixture from "../providers/neon/fixtures/operations.json";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-neon-op-sync-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function project(id = "steep-moon-132241") {
  return createResource({
    provider: "neon",
    providerResourceId: id,
    kind: "project",
    name: "database",
    metadata: {},
  });
}

function fetchJson(body: unknown, status = 200): typeof fetch {
  return (async () => Response.json(body, { status })) as unknown as typeof fetch;
}

function staleOperation(): NeonOperationEvidence {
  return {
    provider: "neon",
    operationId: "stale-op",
    resourceId: "neon:project:steep-moon-132241",
    projectId: "steep-moon-132241",
    action: "start_compute",
    status: "running",
    failuresCount: 0,
    branchId: null,
    endpointId: "ep-1",
    createdAt: "2026-08-08T10:00:00.000Z",
    updatedAt: "2026-08-08T10:01:00.000Z",
    retryAt: null,
    totalDurationMs: 60000,
    observedAt: "2026-08-08T12:00:00.000Z",
  };
}

describe("syncNeonOperations", () => {
  test("success persists exact project operations without Resource Changes", async () => {
    const store = new Store(dir);
    store.init();
    const resource = project();
    store.applyResource(resource, { id: "baseline", observedAt: "2026-08-09T08:00:00.000Z" });

    const result = await syncNeonOperations({
      store,
      token: "key",
      projects: [resource],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: fetchJson({ operations: operationsFixture.operations }),
      baseUrl: "https://example.test/api/v2",
    });

    expect(result).toMatchObject({ refreshed: 1, failed: 0, upserted: 2 });
    expect(store.listNeonOperationsForResource(resource.id)).toHaveLength(2);
    expect(store.getNeonOperationRefresh(resource.id)?.status).toBe("success");
    expect(store.listChanges()).toHaveLength(0);
    store.close();
  });

  test("successful empty response is known empty", async () => {
    const store = new Store(dir);
    store.init();
    const resource = project();
    store.upsertNeonOperation(staleOperation());
    const result = await syncNeonOperations({
      store,
      token: "key",
      projects: [resource],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: fetchJson({ operations: [] }),
      baseUrl: "https://example.test/api/v2",
    });
    expect(result.refreshed).toBe(1);
    expect(store.getNeonOperationRefresh(resource.id)?.status).toBe("success");
    expect(store.getNeonOperationRefresh(resource.id)?.resultCount).toBe(0);
    expect(store.listNeonOperationsForResource(resource.id)).toHaveLength(1);
    store.close();
  });

  test("permission failure and project mismatch stay unknown and preserve stale rows", async () => {
    for (const response of [
      Response.json({ message: "connection string postgresql://secret" }, { status: 403 }),
      Response.json({ operations: [{ ...operationsFixture.operations[0], project_id: "wrong" }] }),
    ]) {
      const store = new Store(dir);
      store.init();
      const resource = project();
      store.upsertNeonOperation(staleOperation());
      const result = await syncNeonOperations({
        store,
        token: "key",
        projects: [resource],
        observedAt: "2026-08-09T13:00:00.000Z",
        fetch: (async () => response.clone()) as unknown as typeof fetch,
        baseUrl: "https://example.test/api/v2",
      });
      expect(result).toMatchObject({ refreshed: 0, failed: 1, upserted: 0 });
      expect(store.getNeonOperationRefresh(resource.id)?.status).toBe("failure");
      expect(store.getNeonOperationRefresh(resource.id)?.message).not.toContain("postgresql://");
      expect(store.listNeonOperationsForResource(resource.id)).toHaveLength(1);
      store.close();
      rmSync(dir, { recursive: true, force: true });
      dir = mkdtempSync(join(tmpdir(), "combie-neon-op-sync-"));
    }
  });

  test("Sprint 028: failure preserves lastSuccessfulObservedAt; result_count still nulls", async () => {
    const store = new Store(dir);
    store.init();
    const resource = project();
    await syncNeonOperations({
      store,
      token: "key",
      projects: [resource],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: fetchJson({ operations: operationsFixture.operations }),
      baseUrl: "https://example.test/api/v2",
    });
    expect(store.getNeonOperationRefresh(resource.id)).toMatchObject({
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      resultCount: 2,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });

    await syncNeonOperations({
      store,
      token: "key",
      projects: [resource],
      observedAt: "2026-08-09T12:30:00.000Z",
      fetch: (async () =>
        Response.json({ message: "forbidden" }, { status: 403 })) as unknown as typeof fetch,
      baseUrl: "https://example.test/api/v2",
    });
    const failed = store.getNeonOperationRefresh(resource.id);
    expect(failed?.status).toBe("failure");
    expect(failed?.observedAt).toBe("2026-08-09T12:30:00.000Z");
    // Neon result_count remains null on failure (unchanged Sprint 022/027 semantics).
    expect(failed?.resultCount).toBeNull();
    expect(failed?.lastSuccessfulObservedAt).toBe("2026-08-09T12:00:00.000Z");
    expect(store.listNeonOperationsForResource(resource.id).length).toBeGreaterThan(0);
    store.close();
  });

  test("repeated refresh updates one lifecycle row without duplicates", async () => {
    const store = new Store(dir);
    store.init();
    const resource = project();
    const raw = operationsFixture.operations[0]!;
    await syncNeonOperations({
      store,
      token: "key",
      projects: [resource],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: fetchJson({ operations: [{ ...raw, status: "running" }] }),
      baseUrl: "https://example.test/api/v2",
    });
    await syncNeonOperations({
      store,
      token: "key",
      projects: [resource],
      observedAt: "2026-08-09T13:00:00.000Z",
      fetch: fetchJson({ operations: [{ ...raw, status: "finished" }] }),
      baseUrl: "https://example.test/api/v2",
    });
    expect(store.countNeonOperations()).toBe(1);
    expect(store.listNeonOperationsForResource(resource.id)[0]!.status).toBe("finished");
    store.close();
  });
});
