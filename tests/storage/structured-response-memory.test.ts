import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { Store } from "../../src/storage/store.ts";
import { dbPath } from "../../src/storage/paths.ts";

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "combie-srm-store-"));
}

describe("structured response storage", () => {
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

  test("init creates the four structured response tables", () => {
    const { store, dir } = openStore();
    store.init();
    store.close();
    const db = new Database(dbPath(dir), { readonly: true });
    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;
    db.close();
    const names = tables.map((row) => row.name);
    for (const table of ["recommendations", "decisions", "actions", "outcomes"]) {
      expect(names).toContain(table);
    }
  });

  test("insert/get/list round-trips with recordedAt DESC, id DESC ordering", () => {
    const { store } = openStore();
    store.init();
    store.insertRecommendation({
      id: "rec:a",
      subjectResourceId: "sentry:project:450",
      recordedAt: "2026-08-16T14:00:00.000Z",
      actionKey: "rollback-deployment",
      proposal: "Rollback",
      rationale: "reason",
      evidenceIds: ["dpl_abc"],
    });
    store.insertRecommendation({
      id: "rec:b",
      subjectResourceId: "sentry:project:450",
      recordedAt: "2026-08-16T15:00:00.000Z",
      actionKey: "inspect-database",
      proposal: "Inspect",
    });

    const all = store.listRecommendations({ subjectResourceId: "sentry:project:450" });
    expect(all.map((r) => r.id)).toEqual(["rec:b", "rec:a"]);
    const got = store.getRecommendation("rec:a");
    expect(got?.rationale).toBe("reason");
    expect(got?.evidenceIds).toEqual(["dpl_abc"]);
    expect(store.getRecommendation("rec:missing")).toBeNull();
  });

  test("decision, action, and outcome round-trip with measurement", () => {
    const { store } = openStore();
    store.init();
    store.insertDecision({
      id: "dec:1",
      recommendationId: "rec:1",
      recordedAt: "2026-08-16T14:05:00.000Z",
      disposition: "approved",
    });
    store.insertAction({
      id: "act:1",
      decisionId: "dec:1",
      recordedAt: "2026-08-16T14:10:00.000Z",
      actionKey: "rollback-deployment",
      summary: "Rolled back",
      performedAt: "2026-08-16T14:09:00.000Z",
    });
    store.insertOutcome({
      id: "out:1",
      actionId: "act:1",
      recordedAt: "2026-08-16T14:25:00.000Z",
      assessment: "positive",
      summary: "Recovered",
      measurement: { metric: "error-rate", before: 12.4, after: 1.1, unit: "percent" },
    });

    expect(store.listDecisions({ recommendationId: "rec:1" })).toHaveLength(1);
    expect(store.getAction("act:1")?.performedAt).toBe("2026-08-16T14:09:00.000Z");
    expect(store.getOutcome("out:1")?.measurement).toEqual({
      metric: "error-rate",
      before: 12.4,
      after: 1.1,
      unit: "percent",
    });
  });

  test("pre-111 read-only recall returns empty without migrating or changing bytes", () => {
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
    expect(store.listRecommendations()).toEqual([]);
    expect(store.listDecisions()).toEqual([]);
    expect(store.listActions()).toEqual([]);
    expect(store.listOutcomes()).toEqual([]);
    expect(store.getRecommendation("rec:x")).toBeNull();
    expect(store.getDecision("dec:x")).toBeNull();
    expect(store.getAction("act:x")).toBeNull();
    expect(store.getOutcome("out:x")).toBeNull();
    store.close();

    expect(digest()).toBe(before);
    const check = new Database(path, { readonly: true });
    const tables = check
      .query("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;
    check.close();
    expect(tables.map((row) => row.name)).toEqual(["meta"]);
  });

  test("corrupt evidence_ids and measurement_json are untrusted and omitted", () => {
    const { store, dir } = openStore();
    store.init();
    store.insertRecommendation({
      id: "rec:1",
      subjectResourceId: "sentry:project:450",
      recordedAt: "2026-08-16T14:00:00.000Z",
      actionKey: "rollback-deployment",
      proposal: "Rollback",
    });
    store.insertOutcome({
      id: "out:1",
      actionId: "act:1",
      recordedAt: "2026-08-16T14:25:00.000Z",
      assessment: "positive",
      summary: "Recovered",
    });
    store.close();

    const raw = new Database(dbPath(dir));
    raw
      .query(`UPDATE recommendations SET evidence_ids = ? WHERE id = 'rec:1'`)
      .run("{not-an-array}");
    raw
      .query(`UPDATE outcomes SET measurement_json = ? WHERE id = 'out:1'`)
      .run('{"metric":"m","before":"x"}');
    raw.close();

    const reopened = new Store(dir);
    stores.push(reopened);
    expect(reopened.isInitialized()).toBe(true);
    expect(reopened.getRecommendation("rec:1")?.evidenceIds).toBeUndefined();
    expect(reopened.getOutcome("out:1")?.measurement).toBeUndefined();
  });
});
