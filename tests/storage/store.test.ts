import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createResource } from "../../src/domain/resource.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { Store } from "../../src/storage/store.ts";

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "combie-store-"));
}

describe("Store", () => {
  let dirs: string[] = [];
  let stores: Store[] = [];

  afterEach(() => {
    for (const s of stores) {
      try {
        s.close();
      } catch {
        /* ignore */
      }
    }
    stores = [];
    for (const d of dirs) {
      try {
        rmSync(d, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
    dirs = [];
  });

  function openStore(): { store: Store; dir: string } {
    const dir = tempDir();
    dirs.push(dir);
    const store = new Store(dir);
    stores.push(store);
    return { store, dir };
  }

  test("init is idempotent", () => {
    const { store } = openStore();
    expect(store.isInitialized()).toBe(false);

    store.init();
    expect(store.isInitialized()).toBe(true);

    store.init();
    expect(store.isInitialized()).toBe(true);

    store.upsertProvider({
      id: "cloudflare",
      name: "Cloudflare",
      status: "connected",
    });
    store.init();
    expect(store.getProvider("cloudflare")?.status).toBe("connected");
  });

  test("upsertProvider and get/list providers", () => {
    const { store } = openStore();
    store.init();

    store.upsertProvider({
      id: "cloudflare",
      name: "Cloudflare",
      status: "connected",
      config: { accountId: "acc-1" },
    });

    const provider = store.getProvider("cloudflare");
    expect(provider).not.toBeNull();
    expect(provider!.id).toBe("cloudflare");
    expect(provider!.name).toBe("Cloudflare");
    expect(provider!.status).toBe("connected");
    expect(provider!.lastSyncAt).toBeNull();
    expect(provider!.config).toEqual({ accountId: "acc-1" });

    expect(store.listProviders()).toHaveLength(1);

    store.upsertProvider({
      id: "cloudflare",
      name: "Cloudflare",
      status: "error",
      config: { accountId: "acc-1" },
    });
    expect(store.getProvider("cloudflare")!.status).toBe("error");
    expect(store.listProviders()).toHaveLength(1);
  });

  test("setLastSync updates provider metadata", () => {
    const { store } = openStore();
    store.init();
    store.upsertProvider({
      id: "cloudflare",
      name: "Cloudflare",
      status: "connected",
    });

    const at = "2025-01-15T10:00:00.000Z";
    store.setLastSync("cloudflare", at);
    expect(store.getProvider("cloudflare")!.lastSyncAt).toBe(at);
  });

  test("upsertResource does not duplicate on repeated sync", () => {
    const { store } = openStore();
    store.init();

    const first = createResource({
      provider: "cloudflare",
      providerResourceId: "worker-1",
      kind: "worker",
      name: "api-v1",
      metadata: { version: 1 },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });

    store.upsertResource(first);
    expect(store.listResources()).toHaveLength(1);

    const second = createResource({
      provider: "cloudflare",
      providerResourceId: "worker-1",
      kind: "worker",
      name: "api-v2",
      metadata: { version: 2 },
      createdAt: "2025-02-01T00:00:00.000Z",
      updatedAt: "2025-02-01T00:00:00.000Z",
    });

    store.upsertResource(second);

    const all = store.listResources();
    expect(all).toHaveLength(1);
    expect(all[0]!.name).toBe("api-v2");
    expect(all[0]!.metadata).toEqual({ version: 2 });
    expect(all[0]!.updatedAt).toBe("2025-02-01T00:00:00.000Z");
    // created_at preserved from first insert
    expect(all[0]!.createdAt).toBe("2025-01-01T00:00:00.000Z");
    expect(all[0]!.id).toBe("cloudflare:worker:worker-1");
  });

  test("listResources supports provider and kind filters", () => {
    const { store } = openStore();
    store.init();

    store.upsertResource(
      createResource({
        provider: "cloudflare",
        providerResourceId: "w1",
        kind: "worker",
        name: "api",
        metadata: {},
      }),
    );
    store.upsertResource(
      createResource({
        provider: "cloudflare",
        providerResourceId: "z1",
        kind: "zone",
        name: "example.com",
        metadata: {},
      }),
    );
    store.upsertResource(
      createResource({
        provider: "cloudflare",
        providerResourceId: "kv1",
        kind: "kv_namespace",
        name: "cache",
        metadata: {},
      }),
    );

    expect(store.listResources()).toHaveLength(3);
    expect(store.listResources({ provider: "cloudflare" })).toHaveLength(3);
    expect(store.listResources({ kind: "worker" })).toHaveLength(1);
    expect(store.listResources({ kind: "zone" })[0]!.name).toBe("example.com");
    expect(
      store.listResources({ provider: "cloudflare", kind: "kv_namespace" }),
    ).toHaveLength(1);
    expect(store.listResources({ provider: "other" })).toHaveLength(0);
  });

  test("getResource by id", () => {
    const { store } = openStore();
    store.init();

    const resource = createResource({
      provider: "cloudflare",
      providerResourceId: "db-1",
      kind: "database",
      name: "prod-d1",
      metadata: { binding: "DB" },
    });
    store.upsertResource(resource);

    const found = store.getResource(resource.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("prod-d1");
    expect(found!.kind).toBe("database");
    expect(store.getResource("missing")).toBeNull();
  });

  test("upsertRelationship does not duplicate on repeated sync", () => {
    const { store } = openStore();
    store.init();

    const first = createRelationship({
      sourceResourceId: "github:repository:1001",
      targetResourceId: "vercel:project:prj_abc",
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "acme/combie",
        githubRepoId: "1001",
      },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });

    store.upsertRelationship(first);
    expect(store.listRelationships()).toHaveLength(1);

    const second = createRelationship({
      sourceResourceId: "github:repository:1001",
      targetResourceId: "vercel:project:prj_abc",
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "acme/combie",
        githubRepoId: "1001",
        vercelLinkType: "github",
      },
      createdAt: "2025-02-01T00:00:00.000Z",
      updatedAt: "2025-02-01T00:00:00.000Z",
    });

    store.upsertRelationship(second);
    const all = store.listRelationships();
    expect(all).toHaveLength(1);
    expect(all[0]!.evidence.vercelLinkType).toBe("github");
    expect(all[0]!.updatedAt).toBe("2025-02-01T00:00:00.000Z");
    expect(all[0]!.createdAt).toBe("2025-01-01T00:00:00.000Z");
    expect(all[0]!.id).toBe(first.id);
  });

  test("getRelationship and deleteRelationshipsByIds", () => {
    const { store } = openStore();
    store.init();

    const rel = createRelationship({
      sourceResourceId: "github:repository:1",
      targetResourceId: "vercel:project:p1",
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "o/r",
      },
    });
    store.upsertRelationship(rel);

    expect(store.getRelationship(rel.id)?.kind).toBe("source_for");
    expect(store.getRelationship("missing")).toBeNull();

    const deleted = store.deleteRelationshipsByIds([rel.id, "nope"]);
    expect(deleted).toBe(1);
    expect(store.listRelationships()).toHaveLength(0);
  });

  test("listRelationshipsForResource matches source or target", () => {
    const { store } = openStore();
    store.init();

    store.upsertResource(
      createResource({
        provider: "github",
        providerResourceId: "1001",
        kind: "repository",
        name: "combie",
        metadata: { fullName: "acme/combie" },
      }),
    );
    store.upsertResource(
      createResource({
        provider: "vercel",
        providerResourceId: "prj_1",
        kind: "project",
        name: "web",
        metadata: {},
      }),
    );
    store.upsertResource(
      createResource({
        provider: "github",
        providerResourceId: "1002",
        kind: "repository",
        name: "other",
        metadata: { fullName: "acme/other" },
      }),
    );
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: "github:repository:1001",
        targetResourceId: "vercel:project:prj_1",
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "acme/combie",
        },
      }),
    );

    const fromSource = store.listRelationshipsForResource(
      "github:repository:1001",
    );
    const fromTarget = store.listRelationshipsForResource(
      "vercel:project:prj_1",
    );
    const unrelated = store.listRelationshipsForResource(
      "github:repository:1002",
    );

    expect(fromSource).toHaveLength(1);
    expect(fromTarget).toHaveLength(1);
    expect(fromSource[0]!.id).toBe(fromTarget[0]!.id);
    expect(unrelated).toHaveLength(0);
    // still a single canonical row
    expect(store.listRelationships()).toHaveLength(1);
  });

  test("resources and relationships coexist in same store", () => {
    const { store } = openStore();
    store.init();

    store.upsertResource(
      createResource({
        provider: "github",
        providerResourceId: "1001",
        kind: "repository",
        name: "combie",
        metadata: { fullName: "acme/combie" },
      }),
    );
    store.upsertResource(
      createResource({
        provider: "vercel",
        providerResourceId: "prj_1",
        kind: "project",
        name: "web",
        metadata: {},
      }),
    );
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: "github:repository:1001",
        targetResourceId: "vercel:project:prj_1",
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "acme/combie",
        },
      }),
    );

    expect(store.listResources()).toHaveLength(2);
    expect(store.listRelationships()).toHaveLength(1);
  });
});
