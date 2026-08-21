import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { createResource } from "../../src/domain/resource.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { Store } from "../../src/storage/store.ts";
import { dbPath } from "../../src/storage/paths.ts";

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

  test("isInitialized is a read-only probe and does not migrate legacy state", () => {
    const dir = tempDir();
    dirs.push(dir);
    const path = dbPath(dir);
    const legacy = new Database(path, { create: true });
    legacy.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO meta (key, value) VALUES ('initialized', 'true');
    `);
    legacy.close();

    const digest = () =>
      createHash("sha256").update(readFileSync(path)).digest("hex");
    const before = digest();

    const store = new Store(dir);
    stores.push(store);
    expect(store.isInitialized()).toBe(true);
    store.close();

    expect(digest()).toBe(before);
    const check = new Database(path, { readonly: true });
    const tables = check
      .query("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;
    check.close();
    expect(tables.map((row) => row.name)).toEqual(["meta"]);
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

  test("close checkpoints WAL so combie.db contains committed rows", () => {
    const { store, dir } = openStore();
    store.init();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
    });
    store.close();

    const bytes = readFileSync(dbPath(dir));
    expect(bytes.byteLength).toBeGreaterThan(4096);
    const frozen = new Database(dbPath(dir), { readonly: true });
    const row = frozen
      .query(`SELECT id FROM providers WHERE id = 'github'`)
      .get() as { id: string } | null;
    frozen.close();
    expect(row?.id).toBe("github");
  });

  test("setLastAttempt stamps the latest try without touching lastSyncAt", () => {
    const { store } = openStore();
    store.init();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
    });

    store.setLastSync("github", "2026-08-18T10:00:00.000Z");
    store.setLastAttempt("github", "2026-08-19T09:00:00.000Z");
    expect(store.getProvider("github")!.lastAttemptAt).toBe(
      "2026-08-19T09:00:00.000Z",
    );
    expect(store.getProvider("github")!.lastSyncAt).toBe(
      "2026-08-18T10:00:00.000Z",
    );

    store.setLastSync("github", "2026-08-19T10:00:00.000Z");
    expect(store.getProvider("github")!.lastAttemptAt).toBe(
      "2026-08-19T09:00:00.000Z",
    );
  });

  test("pre-079 providers rows backfill last_attempt_at from last_sync_at on init", () => {
    const dir = tempDir();
    dirs.push(dir);
    const path = dbPath(dir);
    const legacy = new Database(path, { create: true });
    legacy.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO meta (key, value) VALUES ('initialized', 'true');
      CREATE TABLE providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        last_sync_at TEXT,
        config_json TEXT NOT NULL DEFAULT '{}'
      );
      INSERT INTO providers (id, name, status, last_sync_at)
      VALUES ('github', 'GitHub', 'connected', '2026-08-18T10:00:00.000Z');
      INSERT INTO providers (id, name, status, last_sync_at)
      VALUES ('neon', 'Neon', 'connected', NULL);
    `);
    legacy.close();

    const store = new Store(dir);
    stores.push(store);
    store.init();
    expect(store.getProvider("github")!.lastAttemptAt).toBe(
      "2026-08-18T10:00:00.000Z",
    );
    expect(store.getProvider("neon")!.lastAttemptAt).toBeNull();
  });

  test("pre-079 providers reads without init treat missing last_attempt_at as null", () => {
    const dir = tempDir();
    dirs.push(dir);
    const path = dbPath(dir);
    const legacy = new Database(path, { create: true });
    legacy.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO meta (key, value) VALUES ('initialized', 'true');
      CREATE TABLE providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        last_sync_at TEXT,
        config_json TEXT NOT NULL DEFAULT '{}'
      );
      INSERT INTO providers (id, name, status, last_sync_at)
      VALUES ('github', 'GitHub', 'connected', '2026-08-18T10:00:00.000Z');
    `);
    legacy.close();

    const store = new Store(dir);
    stores.push(store);
    expect(store.isInitialized()).toBe(true);
    const github = store.getProvider("github");
    expect(github?.lastSyncAt).toBe("2026-08-18T10:00:00.000Z");
    expect(github?.lastAttemptAt).toBeNull();
    expect(store.listProviders().map((p) => p.id)).toEqual(["github"]);

    const probe = new Database(path, { readonly: true });
    const columns = probe
      .query(`PRAGMA table_info(providers)`)
      .all() as Array<{ name: string }>;
    probe.close();
    expect(columns.some((column) => column.name === "last_attempt_at")).toBe(
      false,
    );
  });

  test("providers schema includes nullable last_discovery_resource_ids", () => {
    const { store, dir } = openStore();
    store.init();
    store.close();
    const db = new Database(dbPath(dir), { readonly: true });
    const columns = db
      .query(`PRAGMA table_info(providers)`)
      .all() as Array<{ name: string; type: string; notnull: number }>;
    db.close();
    const column = columns.find((c) => c.name === "last_discovery_resource_ids");
    expect(column).toBeDefined();
    expect(column!.type).toBe("TEXT");
    expect(column!.notnull).toBe(0);
  });

  test("setLastDiscoveryResourceIds persists that page and a later call replaces the set", () => {
    const { store } = openStore();
    store.init();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
    });
    expect(store.getProvider("github")!.lastDiscoveryResourceIds).toBeNull();

    store.setLastDiscoveryResourceIds("github", [
      "github:repository:1",
      "github:repository:2",
    ]);
    expect(store.getProvider("github")!.lastDiscoveryResourceIds).toEqual([
      "github:repository:1",
      "github:repository:2",
    ]);

    store.setLastDiscoveryResourceIds("github", ["github:repository:1"]);
    expect(store.getProvider("github")!.lastDiscoveryResourceIds).toEqual([
      "github:repository:1",
    ]);
  });

  test("known-empty success persists [] not null", () => {
    const { store } = openStore();
    store.init();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
    });
    store.setLastDiscoveryResourceIds("github", []);
    expect(store.getProvider("github")!.lastDiscoveryResourceIds).toEqual([]);
    expect(store.listProviders()[0]!.lastDiscoveryResourceIds).toEqual([]);
  });

  test("setLastAttempt leaves the discovery set unchanged", () => {
    const { store } = openStore();
    store.init();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
    });
    store.setLastDiscoveryResourceIds("github", ["github:repository:1"]);
    store.setLastAttempt("github", "2026-08-20T09:00:00.000Z");
    expect(store.getProvider("github")!.lastDiscoveryResourceIds).toEqual([
      "github:repository:1",
    ]);
  });

  test("setLastDiscoveryResourceIds does not change lastSyncAt or lastAttemptAt", () => {
    const { store } = openStore();
    store.init();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
    });
    store.setLastSync("github", "2026-08-18T10:00:00.000Z");
    store.setLastAttempt("github", "2026-08-19T09:00:00.000Z");
    store.setLastDiscoveryResourceIds("github", ["github:repository:1"]);
    const github = store.getProvider("github")!;
    expect(github.lastSyncAt).toBe("2026-08-18T10:00:00.000Z");
    expect(github.lastAttemptAt).toBe("2026-08-19T09:00:00.000Z");
  });

  test("upsertProvider does not write or clear lastDiscoveryResourceIds", () => {
    const { store } = openStore();
    store.init();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
    });
    store.setLastDiscoveryResourceIds("github", ["github:repository:1"]);
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
      config: { accountId: "acc" },
    });
    expect(store.getProvider("github")!.lastDiscoveryResourceIds).toEqual([
      "github:repository:1",
    ]);
  });

  test("replaceResourceMetadata does not add or remove discovery ids", () => {
    const { store } = openStore();
    store.init();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
    });
    const kept = createResource({
      provider: "github",
      providerResourceId: "1",
      kind: "repository",
      name: "combie",
      metadata: { language: "TypeScript" },
    });
    const omitted = createResource({
      provider: "github",
      providerResourceId: "2",
      kind: "repository",
      name: "rivora",
      metadata: {},
    });
    store.upsertResource(kept);
    store.upsertResource(omitted);
    store.setLastDiscoveryResourceIds("github", [kept.id]);

    store.replaceResourceMetadata(omitted.id, { language: "Go" });
    expect(store.getProvider("github")!.lastDiscoveryResourceIds).toEqual([
      kept.id,
    ]);
    expect(store.getResource(omitted.id)).not.toBeNull();

    store.replaceResourceMetadata(kept.id, { language: "Rust" });
    expect(store.getProvider("github")!.lastDiscoveryResourceIds).toEqual([
      kept.id,
    ]);
  });

  test("later success omitting an id replaces the set and keeps the Resource row", () => {
    const { store } = openStore();
    store.init();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
    });
    const first = createResource({
      provider: "github",
      providerResourceId: "1",
      kind: "repository",
      name: "combie",
      metadata: {},
    });
    const second = createResource({
      provider: "github",
      providerResourceId: "2",
      kind: "repository",
      name: "rivora",
      metadata: {},
    });
    store.upsertResource(first);
    store.upsertResource(second);
    store.setLastDiscoveryResourceIds("github", [first.id, second.id]);
    store.setLastDiscoveryResourceIds("github", [first.id]);
    expect(store.getProvider("github")!.lastDiscoveryResourceIds).toEqual([
      first.id,
    ]);
    expect(store.getResource(second.id)?.name).toBe("rivora");
  });

  test("setLastDiscoveryResourceIds throws when the provider row is missing", () => {
    const { store } = openStore();
    store.init();
    expect(() =>
      store.setLastDiscoveryResourceIds("github", ["github:repository:1"]),
    ).toThrow(
      "Provider 'github' not found. Connect the provider before syncing.",
    );
  });

  test("corrupt last_discovery_resource_ids is null, not []", () => {
    const { store, dir } = openStore();
    store.init();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
    });
    store.upsertProvider({
      id: "neon",
      name: "Neon",
      status: "connected",
    });
    store.close();

    const raw = new Database(dbPath(dir));
    raw
      .query(
        `UPDATE providers SET last_discovery_resource_ids = ? WHERE id = 'github'`,
      )
      .run("{not-an-array}");
    raw
      .query(
        `UPDATE providers SET last_discovery_resource_ids = ? WHERE id = 'neon'`,
      )
      .run('{"ids":[]}');
    raw.close();

    const reopened = new Store(dir);
    stores.push(reopened);
    expect(reopened.isInitialized()).toBe(true);
    expect(reopened.getProvider("github")!.lastDiscoveryResourceIds).toBeNull();
    expect(reopened.getProvider("neon")!.lastDiscoveryResourceIds).toBeNull();
  });

  test("pre-085 providers reads without init treat missing last_discovery_resource_ids as null", () => {
    const dir = tempDir();
    dirs.push(dir);
    const path = dbPath(dir);
    const legacy = new Database(path, { create: true });
    legacy.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO meta (key, value) VALUES ('initialized', 'true');
      CREATE TABLE providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        last_sync_at TEXT,
        last_attempt_at TEXT,
        config_json TEXT NOT NULL DEFAULT '{}'
      );
      INSERT INTO providers (id, name, status, last_sync_at, last_attempt_at)
      VALUES (
        'github',
        'GitHub',
        'connected',
        '2026-08-18T10:00:00.000Z',
        '2026-08-18T10:00:00.000Z'
      );
    `);
    legacy.close();

    const store = new Store(dir);
    stores.push(store);
    expect(store.isInitialized()).toBe(true);
    const github = store.getProvider("github");
    expect(github?.lastSyncAt).toBe("2026-08-18T10:00:00.000Z");
    expect(github?.lastDiscoveryResourceIds).toBeNull();
    expect(store.listProviders().map((p) => p.lastDiscoveryResourceIds)).toEqual(
      [null],
    );

    const probe = new Database(path, { readonly: true });
    const columns = probe
      .query(`PRAGMA table_info(providers)`)
      .all() as Array<{ name: string }>;
    probe.close();
    expect(
      columns.some((column) => column.name === "last_discovery_resource_ids"),
    ).toBe(false);
  });

  test("pre-085 init adds last_discovery_resource_ids still null with no clock backfill", () => {
    const dir = tempDir();
    dirs.push(dir);
    const path = dbPath(dir);
    const legacy = new Database(path, { create: true });
    legacy.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO meta (key, value) VALUES ('initialized', 'true');
      CREATE TABLE providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        last_sync_at TEXT,
        last_attempt_at TEXT,
        config_json TEXT NOT NULL DEFAULT '{}'
      );
      INSERT INTO providers (id, name, status, last_sync_at, last_attempt_at)
      VALUES (
        'github',
        'GitHub',
        'connected',
        '2026-08-18T10:00:00.000Z',
        '2026-08-18T10:00:00.000Z'
      );
    `);
    legacy.close();

    const store = new Store(dir);
    stores.push(store);
    store.init();
    expect(store.getProvider("github")!.lastDiscoveryResourceIds).toBeNull();
    expect(store.getProvider("github")!.lastSyncAt).toBe(
      "2026-08-18T10:00:00.000Z",
    );

    store.close();
    const probe = new Database(path, { readonly: true });
    const columns = probe
      .query(`PRAGMA table_info(providers)`)
      .all() as Array<{ name: string }>;
    probe.close();
    expect(
      columns.some((column) => column.name === "last_discovery_resource_ids"),
    ).toBe(true);
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

  test("applyResource records only meaningful updates", () => {
    const { store } = openStore();
    store.init();
    const initial = createResource({
      provider: "vercel",
      providerResourceId: "prj_1",
      kind: "project",
      name: "web",
      metadata: { framework: "nextjs" },
    });

    expect(
      store.applyResource(initial, {
        id: "chg-initial",
        observedAt: "2026-08-08T10:00:00.000Z",
      }),
    ).toBeNull();
    expect(store.listChanges()).toEqual([]);

    const updated = { ...initial, name: "web-renamed", updatedAt: "later" };
    const change = store.applyResource(updated, {
      id: "chg-update",
      observedAt: "2026-08-08T11:00:00.000Z",
    });
    expect(change?.fields).toEqual([
      { path: "name", before: "web", after: "web-renamed" },
    ]);
    expect(store.listChanges()).toEqual([change!]);

    expect(
      store.applyResource(
        { ...updated, updatedAt: "bookkeeping-only" },
        {
          id: "chg-identical",
          observedAt: "2026-08-08T12:00:00.000Z",
        },
      ),
    ).toBeNull();
    expect(store.listChanges()).toHaveLength(1);
  });

  test("Change evidence preserves absent values across restart", () => {
    const { store, dir } = openStore();
    store.init();
    const initial = createResource({
      provider: "github",
      providerResourceId: "1",
      kind: "repository",
      name: "repo",
      metadata: { removed: true },
    });
    store.applyResource(initial, {
      id: "chg-initial",
      observedAt: "2026-08-08T10:00:00.000Z",
    });
    store.applyResource(
      { ...initial, metadata: { added: true } },
      { id: "chg-absence", observedAt: "2026-08-08T11:00:00.000Z" },
    );
    store.close();

    const reopened = new Store(dir);
    stores.push(reopened);
    expect(reopened.isInitialized()).toBe(true);
    expect(reopened.listChanges()[0]?.fields).toEqual([
      { path: "metadata.added", before: undefined, after: true },
      { path: "metadata.removed", before: true, after: undefined },
    ]);
  });

  test("A to B to A creates two distinct chronologically listed Changes", () => {
    const { store } = openStore();
    store.init();
    const a = createResource({
      provider: "cloudflare",
      providerResourceId: "worker",
      kind: "worker",
      name: "a",
      metadata: {},
    });
    store.applyResource(a, {
      id: "initial",
      observedAt: "2026-08-08T09:00:00.000Z",
    });
    store.applyResource(
      { ...a, name: "b" },
      { id: "to-b", observedAt: "2026-08-08T10:00:00.000Z" },
    );
    store.applyResource(a, {
      id: "back-to-a",
      observedAt: "2026-08-08T11:00:00.000Z",
    });

    expect(store.listChanges().map((change) => change.id)).toEqual([
      "back-to-a",
      "to-b",
    ]);
  });

  test("Resource update rolls back when Change insertion fails", () => {
    const { store } = openStore();
    store.init();
    const initial = createResource({
      provider: "sentry",
      providerResourceId: "project",
      kind: "project",
      name: "a",
      metadata: {},
    });
    store.applyResource(initial, {
      id: "initial",
      observedAt: "2026-08-08T09:00:00.000Z",
    });
    store.applyResource(
      { ...initial, name: "b" },
      { id: "duplicate", observedAt: "2026-08-08T10:00:00.000Z" },
    );

    expect(() =>
      store.applyResource(
        { ...initial, name: "c" },
        { id: "duplicate", observedAt: "2026-08-08T11:00:00.000Z" },
      ),
    ).toThrow();
    expect(store.getResource(initial.id)?.name).toBe("b");
    expect(store.listChanges()).toHaveLength(1);
  });

  test("Change insertion rolls back when the Resource update fails", () => {
    const { store, dir } = openStore();
    store.init();
    const initial = createResource({
      provider: "github",
      providerResourceId: "rollback",
      kind: "repository",
      name: "before",
      metadata: {},
    });
    store.applyResource(initial, {
      id: "initial",
      observedAt: "2026-08-08T09:00:00.000Z",
    });
    store.close();

    const raw = new Database(dbPath(dir));
    raw.exec(`
      CREATE TRIGGER fail_resource_update
      BEFORE UPDATE ON resources
      BEGIN
        SELECT RAISE(ABORT, 'forced Resource update failure');
      END;
    `);
    raw.close();

    const reopened = new Store(dir);
    stores.push(reopened);
    expect(reopened.isInitialized()).toBe(true);
    expect(() =>
      reopened.applyResource(
        { ...initial, name: "after" },
        { id: "must-rollback", observedAt: "2026-08-08T10:00:00.000Z" },
      ),
    ).toThrow("forced Resource update failure");
    expect(reopened.getResource(initial.id)?.name).toBe("before");
    expect(reopened.listChanges()).toHaveLength(0);
  });

  test("unknown metadata preserves the last authoritative fact", () => {
    const { store } = openStore();
    store.init();
    const initial = createResource({
      provider: "vercel",
      providerResourceId: "prj_domains",
      kind: "project",
      name: "web",
      metadata: { domains: [{ hostname: "app.example.com" }] },
    });
    store.applyResource(initial, {
      id: "initial",
      observedAt: "2026-08-08T09:00:00.000Z",
    });
    const change = store.applyResource(
      { ...initial, name: "renamed", metadata: {} },
      {
        id: "unknown-domains",
        observedAt: "2026-08-08T10:00:00.000Z",
        preserveMissingMetadataKeys: ["domains"],
      },
    );

    expect(change?.fields).toEqual([
      { path: "name", before: "web", after: "renamed" },
    ]);
    expect(store.getResource(initial.id)?.metadata.domains).toEqual(
      initial.metadata.domains,
    );
  });

  test("existing Resources are baselined once before Change detection", () => {
    const { store, dir } = openStore();
    store.init();
    const initial = createResource({
      provider: "github",
      providerResourceId: "legacy",
      kind: "repository",
      name: "legacy-a",
      metadata: {},
    });
    const untouched = createResource({
      provider: "cloudflare",
      providerResourceId: "legacy-zone",
      kind: "zone",
      name: "legacy.example",
      metadata: {},
    });
    store.upsertResource(initial);
    store.upsertResource(untouched);
    store.close();

    // Recreate the pre-Sprint-010 meta state while retaining its Resource row.
    const legacyDb = new Database(dbPath(dir));
    legacyDb.query(`DELETE FROM meta WHERE key = 'change_detection_v1'`).run();
    legacyDb.close();

    const upgraded = new Store(dir);
    stores.push(upgraded);
    expect(upgraded.isInitialized()).toBe(true);
    expect(
      upgraded.applyResource(
        { ...initial, name: "legacy-b" },
        { id: "baseline", observedAt: "2026-08-08T10:00:00.000Z" },
      ),
    ).toBeNull();
    expect(upgraded.listChanges()).toEqual([]);
    expect(upgraded.getResource(initial.id)?.name).toBe("legacy-b");

    upgraded.close();
    const restarted = new Store(dir);
    stores.push(restarted);
    expect(restarted.isInitialized()).toBe(true);
    expect(
      restarted.applyResource(
        { ...untouched, name: "current.example" },
        { id: "late-baseline", observedAt: "2026-08-08T10:30:00.000Z" },
      ),
    ).toBeNull();
    expect(restarted.listChanges()).toEqual([]);

    expect(
      restarted.applyResource(
        { ...initial, name: "legacy-c" },
        { id: "after-baseline", observedAt: "2026-08-08T11:00:00.000Z" },
      )?.fields,
    ).toEqual([
      { path: "name", before: "legacy-b", after: "legacy-c" },
    ]);
  });

  test("listChangesForResource returns empty history for a known Resource", () => {
    const { store } = openStore();
    store.init();
    const resource = createResource({
      provider: "cloudflare",
      providerResourceId: "history-empty",
      kind: "zone",
      name: "example.com",
      metadata: {},
    });
    store.applyResource(resource, {
      id: "initial",
      observedAt: "2026-08-08T09:00:00.000Z",
    });

    expect(store.listChangesForResource(resource.id)).toEqual([]);
  });

  test("listChangesForResource filters exactly and orders stable ties by id", () => {
    const { store } = openStore();
    store.init();
    const resource = createResource({
      provider: "vercel",
      providerResourceId: "history-main",
      kind: "project",
      name: "a",
      metadata: { region: "iad1" },
    });
    const other = createResource({
      provider: "github",
      providerResourceId: "history-other",
      kind: "repository",
      name: "other-a",
      metadata: {},
    });
    store.applyResource(resource, {
      id: "initial-main",
      observedAt: "2026-08-08T09:00:00.000Z",
    });
    store.applyResource(other, {
      id: "initial-other",
      observedAt: "2026-08-08T09:00:00.000Z",
    });
    store.applyResource(
      { ...resource, name: "b" },
      { id: "change-old", observedAt: "2026-08-08T10:00:00.000Z" },
    );
    store.applyResource(
      { ...other, name: "other-b" },
      { id: "change-other", observedAt: "2026-08-08T11:00:00.000Z" },
    );
    store.applyResource(
      { ...resource, name: "c", metadata: { region: "sfo1" } },
      { id: "tie-a", observedAt: "2026-08-08T12:00:00.000Z" },
    );
    store.applyResource(
      { ...resource, name: "d", metadata: { region: "sfo1" } },
      { id: "tie-z", observedAt: "2026-08-08T12:00:00.000Z" },
    );

    const changes = store.listChangesForResource(resource.id);
    expect(changes.map((change) => change.id)).toEqual([
      "tie-z",
      "tie-a",
      "change-old",
    ]);
    expect(changes.some((change) => change.resourceId === other.id)).toBe(false);
    expect(changes[1]?.fields).toEqual([
      { path: "metadata.region", before: "iad1", after: "sfo1" },
      { path: "name", before: "b", after: "c" },
    ]);
  });

  test("scoped Change reads survive restart and do not mutate domain state", () => {
    const { store, dir } = openStore();
    store.init();
    const resource = createResource({
      provider: "sentry",
      providerResourceId: "history-restart",
      kind: "project",
      name: "before",
      metadata: { removed: true },
    });
    store.applyResource(resource, {
      id: "initial",
      observedAt: "2026-08-08T09:00:00.000Z",
    });
    store.applyResource(
      { ...resource, name: "after", metadata: {} },
      { id: "persisted", observedAt: "2026-08-08T10:00:00.000Z" },
    );
    const resourceBefore = store.getResource(resource.id);
    const globalBefore = store.listChanges();
    const relationshipsBefore = store.listRelationships();
    store.close();

    const reopened = new Store(dir);
    stores.push(reopened);
    expect(reopened.isInitialized()).toBe(true);
    expect(reopened.listChangesForResource(resource.id)).toEqual(globalBefore);
    expect(reopened.listChangesForResource(resource.id)).toEqual(globalBefore);
    expect(reopened.getResource(resource.id)).toEqual(resourceBefore);
    expect(reopened.listChanges()).toEqual(globalBefore);
    expect(reopened.listRelationships()).toEqual(relationshipsBefore);
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
