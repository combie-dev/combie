import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  formatInvestigationContext,
  getInvestigationContext,
} from "../../src/app/investigate.ts";
import { composeInvestigationTimeline } from "../../src/app/timeline.ts";
import { initCombie } from "../../src/app/init.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import type { SentryReleaseEvidence } from "../../src/providers/sentry/release.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-inv-rel-"));
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

function dbHash(): string {
  const path = dbPath(dir);
  return existsSync(path)
    ? createHash("sha256").update(readFileSync(path)).digest("hex")
    : "";
}

function seedProject(store: Store) {
  const project = createResource({
    provider: "sentry",
    providerResourceId: "450",
    kind: "project",
    name: "combie",
    metadata: { slug: "combie", organization_slug: "acme" },
  });
  store.applyResource(project, {
    id: "proj-baseline",
    observedAt: "2026-08-09T08:00:00.000Z",
  });
  return project;
}

function release(
  overrides: Partial<SentryReleaseEvidence> = {},
): SentryReleaseEvidence {
  return {
    provider: "sentry",
    version: "frontend@1.2.0",
    resourceId: "sentry:project:450",
    projectId: "450",
    shortVersion: "1.2.0",
    status: "open",
    dateCreated: "2026-08-09T12:00:00.000Z",
    dateReleased: "2026-08-09T12:05:00.000Z",
    observedAt: "2026-08-09T14:00:00.000Z",
    gitCommitSha: null,
    ...overrides,
  };
}

describe("investigate Sentry releases (Sprint 043)", () => {
  test("Sentry subject with releases shows RELEASES ordered newest first", () => {
    const store = openStore();
    const project = seedProject(store);
    store.upsertSentryRelease(
      release({ version: "old", dateCreated: "2026-08-09T09:00:00.000Z" }),
    );
    store.upsertSentryRelease(
      release({ version: "new", dateCreated: "2026-08-09T12:00:00.000Z" }),
    );
    store.upsertSentryRelease(
      release({ version: "mid", dateCreated: "2026-08-09T10:00:00.000Z" }),
    );
    store.setSentryReleaseRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T14:00:00.000Z",
      message: null,
      resultCount: 3,
      lastSuccessfulObservedAt: "2026-08-09T14:00:00.000Z",
    });
    store.close();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("network must not be used");
    }) as unknown as typeof fetch;
    try {
      const ctx = getInvestigationContext({
        baseDir: dir,
        resourceRef: project.id,
      });
      expect(ctx.subjectReleases.kind).toBe("populated");
      if (ctx.subjectReleases.kind === "populated") {
        expect(ctx.subjectReleases.releases.map((item) => item.version)).toEqual([
          "new",
          "mid",
          "old",
        ]);
      }
      const output = formatInvestigationContext(ctx);
      expect(output).toContain("RELEASES (newest first)");
      expect(output).toContain("version: new");
      expect(output).toContain("created at: ");
      expect(output).toContain("released at: ");
      expect(output).toContain("observed by Combie at: ");
      expect(output).toContain("KNOWN PROVIDER ACTIVITY (newest first; incomplete)");
      expect(output).toContain("Sentry release  new");
      expect(output).not.toContain("caused");
      expect(output).not.toContain("triggered");
      expect(output.indexOf("RELEASES (newest first)")).toBeLessThan(
        output.indexOf("COMBIE OBSERVATIONS (newest first)"),
      );
      expect(output.indexOf("version: new")).toBeLessThan(
        output.indexOf("version: old"),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("known-empty and unknown render differently", () => {
    const store = openStore();
    const project = seedProject(store);
    store.setSentryReleaseRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 0,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.close();

    let ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });
    expect(ctx.subjectReleases.kind).toBe("empty");
    expect(formatInvestigationContext(ctx)).toContain(
      "authority: empty · latest successful response returned 0 · last successful refresh observed by Combie at 2026-08-09T12:00:00.000Z",
    );

    const store2 = openStore();
    store2.setSentryReleaseRefresh({
      resourceId: project.id,
      status: "failure",
      observedAt: "2026-08-09T13:00:00.000Z",
      message: "403 forbidden",
      resultCount: 0,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store2.upsertSentryRelease(release({ version: "stale" }));
    store2.close();

    ctx = getInvestigationContext({ baseDir: dir, resourceRef: project.id });
    expect(ctx.subjectReleases.kind).toBe("unknown");
    const out = formatInvestigationContext(ctx);
    expect(out).toContain("authority: unknown · retained history may be stale");
    expect(out).toContain("Prior recorded releases (may be stale)");
    expect(out).toContain("version: stale");
  });

  test("one-hop neighbor release evidence appears under DETAILED EVIDENCE", () => {
    const store = openStore();
    const project = seedProject(store);
    const vercel = createResource({
      provider: "vercel",
      providerResourceId: "prj_demo",
      kind: "project",
      name: "demo",
      metadata: {},
    });
    store.applyResource(vercel, {
      id: "p1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: vercel.id,
        targetResourceId: project.id,
        kind: "uses_domain_in",
        evidence: {
          source: "fixture",
          mechanism: "test_neighbor",
          apexName: "example.com",
        },
        createdAt: "2026-08-09T08:00:00.000Z",
        updatedAt: "2026-08-09T08:00:00.000Z",
      }),
    );
    store.upsertSentryRelease(release());
    store.setSentryReleaseRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T14:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T14:00:00.000Z",
    });
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: vercel.id,
    });
    expect(ctx.subjectReleases.kind).toBe("not_applicable");
    expect(ctx.related[0]!.releases.kind).toBe("populated");
    const output = formatInvestigationContext(ctx);
    expect(output).toContain("DETAILED EVIDENCE");
    expect(output).toContain("RELEASES (newest first)");
    expect(output).toContain("version: frontend@1.2.0");
    expect(output).not.toMatch(/SUBJECT[\s\S]*RELEASES \(newest first\)[\s\S]*RELATED CONTEXT/);
  });

  test("releases do not enter Change timeline or invent Sentry relationships", () => {
    const store = openStore();
    const project = seedProject(store);
    store.upsertSentryRelease(release());
    store.setSentryReleaseRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T14:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T14:00:00.000Z",
    });
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });
    expect(composeInvestigationTimeline(ctx).entries).toEqual([]);
    expect(ctx.related).toEqual([]);
    expect(formatInvestigationContext(ctx)).not.toContain("this release caused");
  });

  test("unrelated Sentry evidence does not cross an existing one-hop relationship", () => {
    const store = openStore();
    const project = seedProject(store);
    const other = createResource({
      provider: "sentry",
      providerResourceId: "451",
      kind: "project",
      name: "other",
      metadata: { organization_slug: "acme" },
    });
    store.applyResource(other, {
      id: "p2",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.upsertSentryRelease(
      release({
        version: "secret-other",
        resourceId: other.id,
        projectId: "451",
      }),
    );
    store.setSentryReleaseRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T14:00:00.000Z",
      message: null,
      resultCount: 0,
      lastSuccessfulObservedAt: "2026-08-09T14:00:00.000Z",
    });
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });
    expect(formatInvestigationContext(ctx)).not.toContain("secret-other");
  });

  test("offline investigate does not mutate the database", () => {
    const store = openStore();
    const project = seedProject(store);
    store.upsertSentryRelease(release());
    store.setSentryReleaseRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T14:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T14:00:00.000Z",
    });
    store.close();

    const before = dbHash();
    const first = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    const second = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    expect(first).toBe(second);
    expect(dbHash()).toBe(before);
  });
});
