import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initCombie } from "../../src/app/init.ts";
import {
  formatInvestigationContext,
  getInvestigationContext,
} from "../../src/app/investigate.ts";
import {
  formatInvestigationArtifact,
  formatInvestigationHistorySection,
  formatInvestigationList,
  formatSavedInvestigation,
  formatWithInvestigationHistory,
  getInvestigationArtifact,
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

  test("snapshot JSON does not persist live provider sync clocks (Sprint 079)", () => {
    const store = new Store(dir);
    store.init();
    store.upsertProvider({
      id: "sentry",
      name: "Sentry",
      status: "connected",
      lastSyncAt: "2026-08-18T10:00:00.000Z",
      lastAttemptAt: "2026-08-19T09:00:00.000Z",
    });
    store.close();
    seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const json = serializeInvestigationSnapshot(saved.record.snapshot);
    expect(json).not.toContain("providerSyncClocks");
    expect(json).not.toContain("providerLastAttemptAt");
    expect(json).not.toContain("lastAttemptAt");
    expect(json).not.toContain("lastSuccessfulSyncAt");
    expect(json).not.toContain("lastSuccessfulDiscovery");
    const jsonWithMembership = serializeInvestigationSnapshot({
      ...saved.record.snapshot,
      lastSuccessfulDiscovery: "included",
    });
    expect(jsonWithMembership).not.toContain("lastSuccessfulDiscovery");

    const live = formatInvestigationContext(
      getInvestigationContext({
        baseDir: dir,
        resourceRef: "sentry:project:450",
      }),
    );
    expect(live).toContain(
      "last provider sync attempt: 2026-08-19T09:00:00.000Z",
    );

    const reopened = getSavedInvestigation(dir, saved.record.id);
    expect(reopened.snapshot.providerSyncClocks).toBeUndefined();
    expect(reopened.snapshot.providerLastAttemptAt).toBeUndefined();
    expect(reopened.snapshot.lastSuccessfulDiscovery).toBeUndefined();
    const reopenedOut = formatInvestigationContext(reopened.snapshot);
    expect(reopenedOut).toContain("observed by Combie at:");
    expect(reopenedOut).not.toContain("last successful provider sync");
    expect(reopenedOut).not.toContain("last provider sync attempt");
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

  test("list by subject returns only matching subjectResourceId in composedAt DESC, id DESC order", () => {
    seedSubject();
    const other = createResource({
      provider: "github",
      providerResourceId: "1001",
      kind: "repository",
      name: "acme/api",
      metadata: {},
    });
    const store = new Store(dir);
    store.init();
    store.applyResource(other, {
      id: "obs-other",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

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
    const c = saveInvestigation({
      baseDir: dir,
      resourceRef: "github:repository:1001",
      composedAt: "2026-08-16T11:00:00.000Z",
    });

    const filtered = listInvestigations(dir, {
      subjectResourceId: "sentry:project:450",
    });
    expect(filtered.map((r) => r.id)).toEqual([b.record.id, a.record.id]);
    expect(
      listInvestigations(dir, { subjectResourceId: "github:repository:1001" }).map(
        (r) => r.id,
      ),
    ).toEqual([c.record.id]);

    const tie = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const tied = listInvestigations(dir, { subjectResourceId: "sentry:project:450" });
    expect(tied.map((r) => r.id)).toEqual([
      ...[tie.record.id, b.record.id].sort((x, y) =>
        y < x ? -1 : y > x ? 1 : 0,
      ),
      a.record.id,
    ]);
  });

  test("subject with zero snapshots is known-empty for that subject", () => {
    seedSubject();
    const records = listInvestigations(dir, {
      subjectResourceId: "sentry:project:450",
    });
    expect(records).toEqual([]);
    const rendered = formatInvestigationList(records, "sentry:project:450");
    expect(rendered).toContain(
      "No investigation snapshots saved for subject sentry:project:450",
    );
    expect(rendered).not.toContain("No investigation snapshots saved yet.");
  });

  test("subject snapshots remain listed after the subject Resource is deleted", () => {
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

    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resources WHERE id = 'sentry:project:450'`);
    db.close();

    const listed = listInvestigations(dir, {
      subjectResourceId: "sentry:project:450",
    });
    expect(listed.map((r) => r.id)).toEqual([b.record.id, a.record.id]);
  });

  test("subject filter is read-only and writes nothing", () => {
    seedSubject();
    saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const store = new Store(dir);
    store.init();
    const invCount = store.listInvestigationSummaries().length;
    const changeCount = store.listChanges().length;
    const relCount = store.listRelationships().length;
    store.close();

    listInvestigations(dir, { subjectResourceId: "sentry:project:450" });

    const after = new Store(dir);
    after.init();
    expect(after.listInvestigationSummaries()).toHaveLength(invCount);
    expect(after.listChanges()).toHaveLength(changeCount);
    expect(after.listRelationships()).toHaveLength(relCount);
    after.close();
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

describe("Sprint 081 artifact handle", () => {
  test("getInvestigationArtifact names the retained row as a local artifact", () => {
    seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const artifact = getInvestigationArtifact(dir, saved.record.id);

    expect(artifact.handle).toBe(saved.record.id);
    expect(artifact.schema).toBe("combie.investigation.snapshot.v048");
    expect(artifact.hash).toMatch(/^sha256:[0-9a-f]{64}$/);

    const store = new Store(dir);
    store.init();
    const row = store.getInvestigationRow(saved.record.id);
    store.close();
    expect(artifact.hash).toBe(
      `sha256:${createHash("sha256").update(row!.snapshotJson).digest("hex")}`,
    );

    expect(artifact.location).toBe(
      `investigations.snapshot_json id=${saved.record.id}`,
    );
    expect(artifact.location).not.toMatch(/[\\/]/);

    expect(artifact.counts.related).toBe(saved.record.snapshot.related.length);
    expect(artifact.counts.subjectChanges).toBe(
      saved.record.snapshot.subjectChanges.length,
    );
    expect(artifact.counts.byteLength).toBe(
      Buffer.byteLength(row!.snapshotJson, "utf8"),
    );
    expect(artifact.retrieve).toContain(`investigation ${saved.record.id}`);
    expect(artifact.retrieve).not.toContain("/");
  });

  test("artifact counts and hash come from the retained snapshot, not live compose", () => {
    seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const frozen = getInvestigationArtifact(dir, saved.record.id);

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

    const live = getInvestigationContext({
      baseDir: dir,
      resourceRef: "sentry:project:450",
    });
    expect(live.subject.name).toBe("combie-renamed");
    expect(live.subjectChanges.length).toBeGreaterThan(
      saved.record.snapshot.subjectChanges.length,
    );

    const reopened = getInvestigationArtifact(dir, saved.record.id);
    expect(reopened).toEqual(frozen);
    expect(reopened.counts.subjectChanges).toBe(
      saved.record.snapshot.subjectChanges.length,
    );
    expect(reopened.counts.subjectChanges).toBeLessThan(
      live.subjectChanges.length,
    );
  });

  test("unknown id and untrusted snapshot fail without a handle", () => {
    expect(() => getInvestigationArtifact(dir, "")).toThrow(
      /Investigation id is required/,
    );
    expect(() => getInvestigationArtifact(dir, "inv:missing")).toThrow(
      /Investigation not found/,
    );

    seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const db = new Database(dbPath(dir));
    db.exec(
      `UPDATE investigations SET snapshot_json = 'not-json' WHERE id = '${saved.record.id}'`,
    );
    db.close();
    expect(() => getInvestigationArtifact(dir, saved.record.id)).toThrow(
      /untrusted/,
    );
  });

  test("formatInvestigationArtifact renders the ARTIFACT block between banner and compose", () => {
    seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const artifact = getInvestigationArtifact(dir, saved.record.id);
    const block = formatInvestigationArtifact(artifact);
    expect(block.startsWith("ARTIFACT\n")).toBe(true);
    expect(block).toContain(`  handle:     ${saved.record.id}`);
    expect(block).toContain(`  schema:     combie.investigation.snapshot.v048`);
    expect(block).toMatch(/  hash:       sha256:[0-9a-f]{64}/);
    expect(block).toContain(
      `  location:   investigations.snapshot_json id=${saved.record.id}`,
    );
    expect(block).toMatch(
      /  counts:     related=\d+, subjectChanges=\d+, byteLength=\d+/,
    );
    expect(block).toContain(`  retrieve:   bun run combie investigation ${saved.record.id}`);

    const rendered = formatSavedInvestigation(saved.record, artifact);
    expect(rendered.startsWith("INVESTIGATION SNAPSHOT")).toBe(true);
    expect(rendered.indexOf("INVESTIGATION SNAPSHOT")).toBeLessThan(
      rendered.indexOf("ARTIFACT"),
    );
    expect(rendered.indexOf("ARTIFACT")).toBeLessThan(
      rendered.indexOf(saved.liveOutput),
    );
    expect(rendered).toContain(saved.liveOutput);

    const without = formatSavedInvestigation(saved.record);
    expect(without).not.toContain("ARTIFACT");
    expect(without).toBe(formatSavedInvestigation(saved.record, undefined));
  });
});

describe("Sprint 069 investigation history", () => {
  test("empty subject omits the section and does not reuse 050 known-empty copy", () => {
    seedSubject();
    const live = formatInvestigationContext(
      getInvestigationContext({
        baseDir: dir,
        resourceRef: "sentry:project:450",
      }),
    );
    expect(formatInvestigationHistorySection([])).toBe("");
    expect(formatWithInvestigationHistory(live, [])).toBe(live);
    expect(formatWithInvestigationHistory(live, [])).not.toContain(
      "INVESTIGATION HISTORY",
    );
    expect(formatWithInvestigationHistory(live, [])).not.toContain(
      "No investigation snapshots saved for subject sentry:project:450",
    );
    expect(
      formatInvestigationList([], "sentry:project:450"),
    ).toContain(
      "No investigation snapshots saved for subject sentry:project:450",
    );
  });

  test("live and reopen summaries are id plus composedAt for that subject only", () => {
    seedSubject();
    const other = createResource({
      provider: "github",
      providerResourceId: "1001",
      kind: "repository",
      name: "acme/api",
      metadata: {},
    });
    const store = new Store(dir);
    store.init();
    store.applyResource(other, {
      id: "obs-other",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const older = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T10:00:00.000Z",
    });
    const newer = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const otherSaved = saveInvestigation({
      baseDir: dir,
      resourceRef: "github:repository:1001",
      composedAt: "2026-08-16T11:00:00.000Z",
    });

    const rows = listInvestigations(dir, {
      subjectResourceId: "sentry:project:450",
    });
    expect(rows.map((r) => r.id)).toEqual([newer.record.id, older.record.id]);

    const live = formatInvestigationContext(
      getInvestigationContext({
        baseDir: dir,
        resourceRef: "sentry:project:450",
      }),
    );
    const rendered = formatWithInvestigationHistory(live, rows);
    expect(rendered).toContain("INVESTIGATION HISTORY");
    expect(rendered).toContain("Retained compositions of this subject.");
    expect(rendered).toContain("They are not current provider truth.");
    expect(rendered).toContain("They are not an incident.");
    expect(rendered).toContain(`${newer.record.id}  2026-08-16T12:00:00.000Z`);
    expect(rendered).toContain(`${older.record.id}  2026-08-16T10:00:00.000Z`);
    expect(rendered.indexOf(newer.record.id)).toBeLessThan(
      rendered.indexOf(older.record.id),
    );
    expect(rendered).not.toContain(otherSaved.record.id);
    expect(rendered).not.toContain("github:repository:1001");
    expect(rendered).toContain(
      `Show: bun run combie investigation ${newer.record.id}`,
    );
    expect(rendered).not.toMatch(/you should/i);
    expect(rendered.indexOf("SUBJECT")).toBeLessThan(
      rendered.indexOf("INVESTIGATION HISTORY"),
    );

    const reopened = formatWithInvestigationHistory(
      formatSavedInvestigation(getSavedInvestigation(dir, older.record.id)),
      rows,
    );
    expect(reopened).toContain("INVESTIGATION SNAPSHOT");
    expect(reopened).toContain("INVESTIGATION HISTORY");
    expect(reopened).toContain(older.record.id);
    expect(reopened).toContain(newer.record.id);
    expect(reopened).not.toContain(otherSaved.record.id);
  });

  test("save liveOutput and snapshot JSON stay InvestigationContext-only", () => {
    seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    expect(saved.liveOutput).not.toContain("INVESTIGATION HISTORY");
    expect(JSON.stringify(saved.record.snapshot)).not.toContain(
      "INVESTIGATION HISTORY",
    );
    expect(saved.record.snapshot).not.toHaveProperty("investigationHistory");

    const store = new Store(dir);
    store.init();
    const row = store.getInvestigationRow(saved.record.id);
    store.close();
    expect(row?.snapshotJson).not.toContain("INVESTIGATION HISTORY");
    expect(JSON.parse(row!.snapshotJson)).not.toHaveProperty(
      "investigationHistory",
    );

    const wrapped = formatWithInvestigationHistory(
      saved.liveOutput,
      listInvestigations(dir, { subjectResourceId: saved.record.subjectResourceId }),
    );
    expect(wrapped).toContain("INVESTIGATION HISTORY");
    expect(wrapped).toContain(saved.record.id);
    const after = new Store(dir);
    after.init();
    expect(after.getInvestigationRow(saved.record.id)?.snapshotJson).toBe(
      row?.snapshotJson,
    );
    after.close();
  });

  test("subject Resource deletion keeps reopen history and live compose fails", () => {
    seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resources WHERE id = 'sentry:project:450'`);
    db.close();

    expect(() =>
      getInvestigationContext({
        baseDir: dir,
        resourceRef: "sentry:project:450",
      }),
    ).toThrow(/Resource not found/);

    const reopened = formatWithInvestigationHistory(
      formatSavedInvestigation(getSavedInvestigation(dir, saved.record.id)),
      listInvestigations(dir, {
        subjectResourceId: saved.record.subjectResourceId,
      }),
    );
    expect(reopened).toContain("INVESTIGATION HISTORY");
    expect(reopened).toContain(saved.record.id);
    expect(reopened).toContain("2026-08-16T12:00:00.000Z");
  });
});
