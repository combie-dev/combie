import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { Store } from "../../src/storage/store.ts";
import { dbPath } from "../../src/storage/paths.ts";

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "combie-ilink-store-"));
}

describe("incident link storage", () => {
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

  test("init creates incident_links with canonical pair constraints", () => {
    const { store, dir } = openStore();
    store.init();
    store.close();
    const db = new Database(dbPath(dir), { readonly: true });
    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;
    expect(tables.map((row) => row.name)).toContain("incident_links");
    const sql = (
      db
        .query(
          `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'incident_links'`,
        )
        .get() as { sql: string }
    ).sql;
    db.close();
    expect(sql).toContain("incident_a_id");
    expect(sql).toContain("incident_b_id");
    expect(sql).toContain("CHECK");
    expect(sql).toContain("UNIQUE");
  });

  test("insert/get/list round-trips with recordedAt DESC, id DESC ordering", () => {
    const { store } = openStore();
    store.init();
    store.insertIncidentLink({
      id: "ilink:a",
      incidentIds: ["inc:alpha", "inc:beta"],
      recordedAt: "2026-08-16T14:00:00.000Z",
      reason: "Same failure mode",
    });
    store.insertIncidentLink({
      id: "ilink:b",
      incidentIds: ["inc:gamma", "inc:zeta"],
      recordedAt: "2026-08-16T15:00:00.000Z",
      reason: "Shared rollback",
    });

    const all = store.listIncidentLinkRows();
    expect(all.map((r) => r.id)).toEqual(["ilink:b", "ilink:a"]);
    const got = store.getIncidentLinkRow("ilink:a");
    expect(got).toEqual({
      id: "ilink:a",
      incidentIds: ["inc:alpha", "inc:beta"],
      recordedAt: "2026-08-16T14:00:00.000Z",
      reason: "Same failure mode",
    });
    expect(store.getIncidentLinkRow("ilink:missing")).toBeNull();
  });

  test("list filters by exact membership in either endpoint", () => {
    const { store } = openStore();
    store.init();
    store.insertIncidentLink({
      id: "ilink:1",
      incidentIds: ["inc:a", "inc:b"],
      recordedAt: "2026-08-16T14:00:00.000Z",
      reason: "one",
    });
    store.insertIncidentLink({
      id: "ilink:2",
      incidentIds: ["inc:b", "inc:c"],
      recordedAt: "2026-08-16T15:00:00.000Z",
      reason: "two",
    });
    store.insertIncidentLink({
      id: "ilink:3",
      incidentIds: ["inc:d", "inc:e"],
      recordedAt: "2026-08-16T16:00:00.000Z",
      reason: "three",
    });

    expect(
      store.listIncidentLinkRows({ incidentId: "inc:b" }).map((r) => r.id),
    ).toEqual(["ilink:2", "ilink:1"]);
    expect(store.listIncidentLinkRows({ incidentId: "inc:missing" })).toEqual(
      [],
    );
  });

  test("UNIQUE pair rejects duplicate insert with a clear error", () => {
    const { store } = openStore();
    store.init();
    store.insertIncidentLink({
      id: "ilink:1",
      incidentIds: ["inc:a", "inc:b"],
      recordedAt: "2026-08-16T14:00:00.000Z",
      reason: "first",
    });
    expect(() =>
      store.insertIncidentLink({
        id: "ilink:2",
        incidentIds: ["inc:a", "inc:b"],
        recordedAt: "2026-08-16T15:00:00.000Z",
        reason: "retry",
      }),
    ).toThrow(/INCIDENT_LINK_EXISTS|UNIQUE/i);
  });

  test("CHECK rejects non-canonical a >= b order", () => {
    const { store } = openStore();
    store.init();
    expect(() =>
      store.insertIncidentLink({
        id: "ilink:bad",
        incidentIds: ["inc:z", "inc:a"],
        recordedAt: "2026-08-16T14:00:00.000Z",
        reason: "bad order",
      }),
    ).toThrow();
  });

  test("pre-112 read-only recall returns empty without migrating or changing bytes", () => {
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
    expect(store.listIncidentLinkRows()).toEqual([]);
    expect(store.listIncidentLinkRows({ incidentId: "inc:x" })).toEqual([]);
    expect(store.getIncidentLinkRow("ilink:x")).toBeNull();
    store.close();

    expect(digest()).toBe(before);
    const check = new Database(path, { readonly: true });
    const tables = check
      .query("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;
    check.close();
    expect(tables.map((row) => row.name)).toEqual(["meta"]);
  });

  test("explicit init upgrades additively without rewriting existing rows", () => {
    const dir = tempDir();
    dirs.push(dir);
    const path = dbPath(dir);
    const legacy = new Database(path, { create: true });
    legacy.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO meta (key, value) VALUES ('initialized', 'true');
      CREATE TABLE incidents (
        id TEXT PRIMARY KEY,
        recorded_at TEXT NOT NULL,
        occurred_at TEXT,
        title TEXT,
        resolution_ids TEXT NOT NULL
      );
      INSERT INTO incidents (id, recorded_at, title, resolution_ids)
      VALUES ('inc:keep', '2026-08-16T12:00:00.000Z', 'keep', '["res:1","res:2"]');
    `);
    legacy.close();

    const store = new Store(dir);
    stores.push(store);
    store.init();
    const incident = store.getIncidentRow("inc:keep");
    expect(incident?.id).toBe("inc:keep");
    expect(incident?.title).toBe("keep");
    store.insertIncidentLink({
      id: "ilink:new",
      incidentIds: ["inc:a", "inc:b"],
      recordedAt: "2026-08-26T12:00:00.000Z",
      reason: "upgrade path",
    });
    expect(store.getIncidentLinkRow("ilink:new")?.reason).toBe("upgrade path");
    store.close();
  });
});
