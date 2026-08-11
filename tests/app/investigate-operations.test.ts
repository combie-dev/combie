import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  formatInvestigationContext,
  getInvestigationContext,
} from "../../src/app/investigate.ts";
import { initCombie } from "../../src/app/init.ts";
import { composeInvestigationTimeline } from "../../src/app/timeline.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import type { NeonOperationEvidence } from "../../src/providers/neon/operation.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-inv-neon-op-"));
  initCombie(dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function openStore(): Store {
  const store = new Store(dir);
  store.isInitialized();
  return store;
}

function seedProject(store: Store) {
  const project = createResource({
    provider: "neon",
    providerResourceId: "steep-moon-132241",
    kind: "project",
    name: "database",
    metadata: { branches: [{ id: "br-1", name: "main" }] },
  });
  store.applyResource(project, {
    id: "baseline",
    observedAt: "2026-08-09T08:00:00.000Z",
  });
  return project;
}

function operation(
  overrides: Partial<NeonOperationEvidence> = {},
): NeonOperationEvidence {
  return {
    provider: "neon",
    operationId: "op-1",
    resourceId: "neon:project:steep-moon-132241",
    projectId: "steep-moon-132241",
    action: "start_compute",
    status: "finished",
    failuresCount: 0,
    branchId: "br-1",
    endpointId: "ep-1",
    createdAt: "2026-08-09T10:00:00.000Z",
    updatedAt: "2026-08-09T10:01:00.000Z",
    retryAt: null,
    totalDurationMs: 60000,
    observedAt: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

function dbHash(): string {
  const path = dbPath(dir);
  return existsSync(path)
    ? createHash("sha256").update(readFileSync(path)).digest("hex")
    : "";
}

describe("investigate Neon operations (Sprint 022)", () => {
  test("Neon subject shows provider-native OPERATIONS newest first", () => {
    const store = openStore();
    const project = seedProject(store);
    store.upsertNeonOperation(
      operation({
        operationId: "op-old",
        createdAt: "2026-08-09T09:00:00.000Z",
      }),
    );
    store.upsertNeonOperation(
      operation({
        operationId: "op-new",
        createdAt: "2026-08-09T11:00:00.000Z",
        status: "failed",
        failuresCount: 2,
        retryAt: "2026-08-09T11:10:00.000Z",
      }),
    );
    store.setNeonOperationRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 2,
    lastSuccessfulObservedAt: null,
    });
    store.close();

    const context = getInvestigationContext({ baseDir: dir, resourceRef: project.id });
    expect(context.subjectOperations.kind).toBe("populated");
    if (context.subjectOperations.kind === "populated") {
      expect(context.subjectOperations.operations.map((item) => item.operationId)).toEqual([
        "op-new",
        "op-old",
      ]);
    }
    const output = formatInvestigationContext(context);
    expect(output).toContain("OPERATIONS (newest first)");
    expect(output).toContain("operation id: op-new");
    expect(output).toContain("action: start_compute");
    expect(output).toContain("status: failed");
    expect(output).toContain("failures count: 2");
    expect(output).toContain("branch id: br-1");
    expect(output).toContain("endpoint id: ep-1");
    expect(output).toContain("created at: 2026-08-09T11:00:00.000Z");
    expect(output).toContain("status updated at: 2026-08-09T10:01:00.000Z");
    expect(output).toContain("last retried at: 2026-08-09T11:10:00.000Z");
    expect(output).toContain("total duration ms: 60000");
    expect(output).toContain("observed by Combie at: 2026-08-09T12:00:00.000Z");
    expect(output).not.toContain("must never be persisted");
    expect(output.indexOf("operation id: op-new")).toBeLessThan(
      output.indexOf("operation id: op-old"),
    );
  });

  test("known empty, unknown, and stale evidence remain distinct", () => {
    const store = openStore();
    const project = seedProject(store);
    store.setNeonOperationRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 0,
    lastSuccessfulObservedAt: null,
    });
    store.close();
    let context = getInvestigationContext({ baseDir: dir, resourceRef: project.id });
    expect(context.subjectOperations.kind).toBe("empty");
    expect(formatInvestigationContext(context)).toContain(
      "authority: empty · latest successful response returned 0 · last successful refresh observed by Combie at 2026-08-09T12:00:00.000Z",
    );

    const store2 = openStore();
    store2.upsertNeonOperation(operation({ operationId: "op-stale" }));
    store2.close();
    context = getInvestigationContext({ baseDir: dir, resourceRef: project.id });
    expect(context.subjectOperations.kind).toBe("empty");
    expect(formatInvestigationContext(context)).toContain(
      "Previously recorded operations (outside the current retained response)",
    );

    const store3 = openStore();
    store3.setNeonOperationRefresh({
      resourceId: project.id,
      status: "failure",
      observedAt: "2026-08-09T13:00:00.000Z",
      message: "Neon operation refresh failed: request forbidden.",
      resultCount: null,
    lastSuccessfulObservedAt: null,
    });
    store3.close();
    context = getInvestigationContext({ baseDir: dir, resourceRef: project.id });
    expect(context.subjectOperations.kind).toBe("unknown");
    const output = formatInvestigationContext(context);
    expect(output).toContain("authority: unknown · retained history may be stale");
    expect(output).toContain("Prior recorded operations (may be stale)");
    expect(output).toContain("operation id: op-stale");
  });

  test("operations do not enter Change timeline or invent Neon relationships", () => {
    const store = openStore();
    const project = seedProject(store);
    store.applyResource(
      { ...project, name: "database-renamed" },
      { id: "name-change", observedAt: "2026-08-09T09:00:00.000Z" },
    );
    store.upsertNeonOperation(operation());
    store.setNeonOperationRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
    lastSuccessfulObservedAt: null,
    });
    store.close();

    const context = getInvestigationContext({ baseDir: dir, resourceRef: project.id });
    expect(context.related).toEqual([]);
    expect(composeInvestigationTimeline(context).entries.map((entry) => entry.change.id)).toEqual([
      "name-change",
    ]);
    const output = formatInvestigationContext(context);
    expect(output).toContain("OPERATIONS (newest first)");
    expect(output).toContain("Change ID: name-change");
    expect(output).not.toContain("caused");
    expect(output).not.toContain("correlated");
  });

  test("unrelated Neon evidence does not cross an existing one-hop relationship", () => {
    const store = openStore();
    const neonProject = seedProject(store);
    const repository = createResource({
      provider: "github",
      providerResourceId: "101",
      kind: "repository",
      name: "acme/app",
      metadata: { fullName: "acme/app" },
    });
    const vercelProject = createResource({
      provider: "vercel",
      providerResourceId: "prj_app",
      kind: "project",
      name: "app",
      metadata: {},
    });
    store.applyResource(repository, {
      id: "repo-baseline",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.applyResource(vercelProject, {
      id: "vercel-baseline",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: repository.id,
        targetResourceId: vercelProject.id,
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "acme/app",
        },
      }),
    );
    store.upsertNeonOperation(operation({ operationId: "neon-only-operation" }));
    store.setNeonOperationRefresh({
      resourceId: neonProject.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
    lastSuccessfulObservedAt: null,
    });
    store.close();

    const context = getInvestigationContext({
      baseDir: dir,
      resourceRef: repository.id,
    });
    expect(context.related).toHaveLength(1);
    expect(context.related[0]!.resource?.id).toBe(vercelProject.id);
    expect(context.related[0]!.operations.kind).toBe("not_applicable");
    expect(formatInvestigationContext(context)).not.toContain(
      "neon-only-operation",
    );

    const verify = openStore();
    expect(verify.listRelationships()).toHaveLength(1);
    verify.close();
  });

  test("offline repeated reads are deterministic and do not mutate the DB", () => {
    const store = openStore();
    const project = seedProject(store);
    store.upsertNeonOperation(operation());
    store.setNeonOperationRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
    lastSuccessfulObservedAt: null,
    });
    store.close();
    const before = dbHash();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("network must not be used");
    }) as unknown as typeof fetch;
    try {
      const first = getInvestigationContext({ baseDir: dir, resourceRef: project.id });
      const second = getInvestigationContext({ baseDir: dir, resourceRef: project.id });
      expect(formatInvestigationContext(first)).toBe(formatInvestigationContext(second));
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(dbHash()).toBe(before);
  });
});
