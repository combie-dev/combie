import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initCombie } from "../../src/app/init.ts";
import {
  formatInvestigationContext,
  getInvestigationContext,
} from "../../src/app/investigate.ts";
import {
  formatSavedInvestigation,
  getSavedInvestigation,
  listInvestigations,
  parseInvestigationSnapshot,
  saveInvestigation,
  serializeInvestigationSnapshot,
} from "../../src/app/investigations.ts";
import { createResource } from "../../src/domain/resource.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-inv-snap-"));
  initCombie(dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function seedSubject(): ReturnType<typeof createResource> {
  const store = new Store(dir);
  store.init();
  const resource = createResource({
    provider: "sentry",
    providerResourceId: "450",
    kind: "project",
    name: "combie",
    metadata: { slug: "combie", organization_slug: "acme" },
  });
  store.applyResource(resource, {
    id: "obs-1",
    observedAt: "2026-08-16T00:00:00.000Z",
  });
  store.close();
  return resource;
}

describe("investigation snapshots", () => {
  test("save persists one row and live output matches unsaved investigate", () => {
    const subject = seedSubject();
    const live = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: subject.id }),
    );
    const beforeChanges = new Store(dir);
    beforeChanges.init();
    const changeCount = beforeChanges.listChanges().length;
    const relCount = beforeChanges.listRelationships().length;
    beforeChanges.close();

    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });

    expect(saved.liveOutput).toBe(live);
    expect(saved.record.id.startsWith("inv:")).toBe(true);
    expect(saved.record.subjectResourceId).toBe(subject.id);
    expect(saved.record.composedAt).toBe("2026-08-16T12:00:00.000Z");

    const store = new Store(dir);
    store.init();
    expect(store.listInvestigationSummaries()).toHaveLength(1);
    expect(store.listChanges()).toHaveLength(changeCount);
    expect(store.listRelationships()).toHaveLength(relCount);
    store.close();
  });

  test("list empty / many is deterministic by composedAt DESC then id DESC", () => {
    expect(listInvestigations(dir)).toEqual([]);
    seedSubject();
    const a = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T10:00:00.000Z",
    });
    const b = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const listed = listInvestigations(dir);
    expect(listed.map((r) => r.id)).toEqual([b.record.id, a.record.id]);
  });

  test("reopen equals formatted composition from save time", () => {
    seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const reopened = getSavedInvestigation(dir, saved.record.id);
    expect(formatInvestigationContext(reopened.snapshot)).toBe(saved.liveOutput);
    const rendered = formatSavedInvestigation(reopened);
    expect(rendered.startsWith("INVESTIGATION SNAPSHOT")).toBe(true);
    expect(rendered).toContain("Composed by Combie at 2026-08-16T12:00:00.000Z");
    expect(rendered).toContain("It is not current provider truth");
    expect(rendered).not.toMatch(/this snapshot is the current/i);
    expect(rendered).toContain(saved.liveOutput);
  });

  test("reopen is unchanged after later store mutation", () => {
    seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const frozen = formatSavedInvestigation(
      getSavedInvestigation(dir, saved.record.id),
    );

    const store = new Store(dir);
    store.init();
    store.applyResource(
      createResource({
        provider: "sentry",
        providerResourceId: "450",
        kind: "project",
        name: "combie-renamed",
        metadata: { slug: "combie-renamed", organization_slug: "acme" },
      }),
      { id: "obs-2", observedAt: "2026-08-16T13:00:00.000Z" },
    );
    store.close();

    const live = formatInvestigationContext(
      getInvestigationContext({
        baseDir: dir,
        resourceRef: "sentry:project:450",
      }),
    );
    expect(live).toContain("combie-renamed");
    const reopened = formatSavedInvestigation(
      getSavedInvestigation(dir, saved.record.id),
    );
    expect(reopened).toBe(frozen);
    expect(reopened).not.toContain("combie-renamed");
  });

  test("pre-048 database upgrade creates investigations table", () => {
    const path = dbPath(dir);
    const db = new Database(path);
    db.exec(`DROP TABLE IF EXISTS investigations`);
    db.close();

    const store = new Store(dir);
    store.init();
    expect(store.listInvestigationSummaries()).toEqual([]);
    store.close();

    seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
    });
    expect(getSavedInvestigation(dir, saved.record.id).id).toBe(saved.record.id);
  });

  test("invalid id and untrusted snapshot fail without inventing facts", () => {
    expect(() => getSavedInvestigation(dir, "")).toThrow(/Investigation id is required/);
    expect(() => getSavedInvestigation(dir, "inv:missing")).toThrow(
      /Investigation not found/,
    );
    expect(() => parseInvestigationSnapshot("not-json")).toThrow(/untrusted/);
    expect(() => parseInvestigationSnapshot("[]")).toThrow(/untrusted/);
    expect(() => serializeInvestigationSnapshot(
      getInvestigationContext({
        baseDir: dir,
        resourceRef: "missing",
      }),
    )).toThrow(/Resource not found/);
  });
});
