import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CombieError } from "../../src/app/errors.ts";
import {
  formatResourceHistory,
  getResourceHistory,
} from "../../src/app/history.ts";
import { initCombie } from "../../src/app/init.ts";
import { createResource } from "../../src/domain/resource.ts";
import { Store } from "../../src/storage/store.ts";

describe("Resource history", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "combie-history-"));
    initCombie(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("known Resource has a clear trustworthy zero-history state", () => {
    const store = new Store(dir);
    store.isInitialized();
    const resource = createResource({
      provider: "cloudflare",
      providerResourceId: "zone-1",
      kind: "zone",
      name: "example.com",
      metadata: { status: "active" },
    });
    store.applyResource(resource, {
      id: "initial",
      observedAt: "2026-08-08T09:00:00.000Z",
    });
    store.close();

    const history = getResourceHistory({
      baseDir: dir,
      resourceRef: resource.id,
    });
    expect(history.resource).toEqual(resource);
    expect(history.changes).toEqual([]);

    const output = formatResourceHistory(history);
    expect(output).toContain("Cloudflare zone: example.com");
    expect(output).toContain(resource.id);
    expect(output).toContain("CURRENT");
    expect(output).toContain("name  \"example.com\"");
    expect(output).toContain("HISTORY");
    expect(output).toContain("No changes recorded yet.");
    expect(output).toContain("trustworthy Change baseline");
  });

  test("returns current persistence plus exact, grouped historical evidence", () => {
    const store = new Store(dir);
    store.isInitialized();
    const initial = createResource({
      provider: "vercel",
      providerResourceId: "prj:with:colons",
      kind: "project",
      name: "web",
      metadata: { framework: "nextjs", domains: ["old.example.com"] },
    });
    store.applyResource(initial, {
      id: "initial",
      observedAt: "2026-08-08T09:00:00.000Z",
    });
    store.applyResource(
      {
        ...initial,
        name: "web-new",
        metadata: { domains: ["new.example.com"], region: null },
      },
      { id: "change-one", observedAt: "2026-08-08T10:00:00.000Z" },
    );
    store.close();

    const history = getResourceHistory({
      baseDir: dir,
      resourceRef: `  ${initial.id}  `,
    });
    expect(history.resource.name).toBe("web-new");
    expect(history.changes).toHaveLength(1);
    expect(history.changes[0]?.observedAt).toBe("2026-08-08T10:00:00.000Z");
    expect(history.changes[0]?.fields).toEqual([
      {
        path: "metadata.domains",
        before: ["old.example.com"],
        after: ["new.example.com"],
      },
      { path: "metadata.framework", before: "nextjs", after: undefined },
      { path: "metadata.region", before: undefined, after: null },
      { path: "name", before: "web", after: "web-new" },
    ]);

    const output = formatResourceHistory(history);
    expect(output.match(/Observed:/g)).toHaveLength(1);
    expect(output).toContain("Observed: 2026-08-08T10:00:00.000Z");
    expect(output).toContain('["old.example.com"] → ["new.example.com"]');
    expect(output).toContain('"nextjs" → (absent)');
    expect(output).toContain("(absent) → null");
    expect(output).toContain('"web" → "web-new"');
  });

  test("filters by the exact opaque Resource id and orders newest first", () => {
    const store = new Store(dir);
    store.isInitialized();
    const first = createResource({
      provider: "github",
      providerResourceId: "1001",
      kind: "repository",
      name: "same-name",
      metadata: { fullName: "acme/same-name" },
    });
    const other = createResource({
      provider: "vercel",
      providerResourceId: "1001",
      kind: "project",
      name: "same-name",
      metadata: {},
    });
    store.applyResource(first, {
      id: "initial-a",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.applyResource(other, {
      id: "initial-b",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.applyResource(
      { ...first, name: "first-change" },
      { id: "older", observedAt: "2026-08-08T09:00:00.000Z" },
    );
    store.applyResource(
      { ...first, name: "second-change" },
      { id: "newer", observedAt: "2026-08-08T11:00:00.000Z" },
    );
    store.applyResource(
      { ...other, name: "other-change" },
      { id: "other", observedAt: "2026-08-08T12:00:00.000Z" },
    );
    store.close();

    const history = getResourceHistory({ baseDir: dir, resourceRef: first.id });
    expect(history.changes.map((change) => change.id)).toEqual(["newer", "older"]);
    expect(
      history.changes.every((change) => change.resourceId === first.id),
    ).toBe(true);
  });

  test("CURRENT shows observation and provider clocks when the provider has them", () => {
    const store = new Store(dir);
    store.isInitialized();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
      lastSyncAt: "2026-08-18T10:00:00.000Z",
      lastAttemptAt: "2026-08-19T09:00:00.000Z",
    });
    const resource = createResource({
      provider: "github",
      providerResourceId: "915052094",
      kind: "repository",
      name: "combie",
      metadata: {},
      createdAt: "2026-08-18T08:00:00.000Z",
      updatedAt: "2026-08-18T08:00:00.000Z",
    });
    store.applyResource(resource, {
      id: "initial",
      observedAt: "2026-08-18T08:00:00.000Z",
    });
    store.close();

    const output = formatResourceHistory(
      getResourceHistory({ baseDir: dir, resourceRef: resource.id }),
    );
    expect(output).toContain("observed by Combie at: 2026-08-18T08:00:00.000Z");
    expect(output).toContain(
      "last successful provider sync: 2026-08-18T10:00:00.000Z",
    );
    expect(output).toContain(
      "last provider sync attempt: 2026-08-19T09:00:00.000Z",
    );
  });

  test("CURRENT omits null provider clock lines", () => {
    const store = new Store(dir);
    store.isInitialized();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
    });
    const resource = createResource({
      provider: "github",
      providerResourceId: "915052094",
      kind: "repository",
      name: "combie",
      metadata: {},
      createdAt: "2026-08-18T08:00:00.000Z",
      updatedAt: "2026-08-18T08:00:00.000Z",
    });
    store.applyResource(resource, {
      id: "initial",
      observedAt: "2026-08-18T08:00:00.000Z",
    });
    store.close();

    const output = formatResourceHistory(
      getResourceHistory({ baseDir: dir, resourceRef: resource.id }),
    );
    expect(output).toContain("observed by Combie at: 2026-08-18T08:00:00.000Z");
    expect(output).not.toContain("last successful provider sync");
    expect(output).not.toContain("last provider sync attempt");
  });

  test("rejects blank, unknown, and uninitialized exact references", () => {
    expect(() => getResourceHistory({ baseDir: dir, resourceRef: "   " })).toThrow(
      CombieError,
    );
    try {
      getResourceHistory({
        baseDir: dir,
        resourceRef: "github:repository:missing",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(CombieError);
      expect((error as CombieError).code).toBe("RESOURCE_NOT_FOUND");
      expect((error as CombieError).message).toContain("combie resources");
    }

    const uninitialized = mkdtempSync(join(tmpdir(), "combie-history-uninit-"));
    try {
      expect(() =>
        getResourceHistory({
          baseDir: uninitialized,
          resourceRef: "github:repository:1",
        }),
      ).toThrow("Combie is not initialized");
    } finally {
      rmSync(uninitialized, { recursive: true, force: true });
    }
  });
});
