import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SentryReleaseEvidence } from "../../src/providers/sentry/release.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-sentry-rel-store-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function release(
  overrides: Partial<SentryReleaseEvidence> = {},
): SentryReleaseEvidence {
  return {
    provider: "sentry",
    version: "frontend@1.0.0",
    resourceId: "sentry:project:450",
    projectId: "450",
    shortVersion: "1.0.0",
    status: "open",
    dateCreated: "2026-08-09T10:00:00.000Z",
    dateReleased: null,
    observedAt: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

describe("Store sentry release persistence", () => {
  test("inserts and lists newest-first with stable version tie-break", () => {
    const store = new Store(dir);
    store.init();
    store.upsertSentryRelease(
      release({ version: "a@1", dateCreated: "2026-08-09T09:00:00.000Z" }),
    );
    store.upsertSentryRelease(
      release({ version: "c@1", dateCreated: "2026-08-09T11:00:00.000Z" }),
    );
    store.upsertSentryRelease(
      release({ version: "b@1", dateCreated: "2026-08-09T11:00:00.000Z" }),
    );
    const list = store.listSentryReleasesForResource("sentry:project:450");
    expect(list.map((item) => item.version)).toEqual(["c@1", "b@1", "a@1"]);
    store.close();
  });

  test("repeated upsert updates the same version+project without duplicates", () => {
    const store = new Store(dir);
    store.init();
    store.upsertSentryRelease(release());
    store.upsertSentryRelease(
      release({
        status: "archived",
        dateReleased: "2026-08-09T13:00:00.000Z",
        observedAt: "2026-08-09T13:00:00.000Z",
      }),
    );
    const list = store.listSentryReleasesForResource("sentry:project:450");
    expect(list).toHaveLength(1);
    expect(list[0]!.status).toBe("archived");
    expect(list[0]!.dateReleased).toBe("2026-08-09T13:00:00.000Z");
    expect(store.countSentryReleases()).toBe(1);
    store.close();
  });

  test("exact Resource association scopes reads and allows multi-project copies", () => {
    const store = new Store(dir);
    store.init();
    store.upsertSentryRelease(release());
    store.upsertSentryRelease(
      release({
        resourceId: "sentry:project:451",
        projectId: "451",
      }),
    );
    expect(store.listSentryReleasesForResource("sentry:project:450")).toHaveLength(1);
    expect(store.listSentryReleasesForResource("sentry:project:451")).toHaveLength(1);
    expect(store.countSentryReleases()).toBe(2);
    store.close();
  });

  test("pre-043 DB upgrade and refresh failure retains rows", () => {
    const path = dbPath(dir);
    const raw = new Database(path);
    raw.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO meta (key, value) VALUES ('initialized', 'true');
      CREATE TABLE providers (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL,
        last_sync_at TEXT, config_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE resources (
        id TEXT PRIMARY KEY, provider TEXT NOT NULL,
        provider_resource_id TEXT NOT NULL, kind TEXT NOT NULL,
        name TEXT NOT NULL, metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        UNIQUE(provider, kind, provider_resource_id)
      );
    `);
    raw.close();

    const store = new Store(dir);
    store.init();
    store.upsertSentryRelease(release());
    store.setSentryReleaseRefresh({
      resourceId: "sentry:project:450",
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.setSentryReleaseRefresh({
      resourceId: "sentry:project:450",
      status: "failure",
      observedAt: "2026-08-09T13:00:00.000Z",
      message: "forbidden",
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    expect(store.listSentryReleasesForResource("sentry:project:450")).toHaveLength(1);
    const refresh = store.getSentryReleaseRefresh("sentry:project:450");
    expect(refresh?.status).toBe("failure");
    expect(refresh?.resultCount).toBe(1);
    expect(refresh?.lastSuccessfulObservedAt).toBe("2026-08-09T12:00:00.000Z");
    store.close();
  });
});
