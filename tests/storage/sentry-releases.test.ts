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
    gitCommitSha: null,
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

  test("Sprint 046: git_commit_sha persists and updates to null on later upsert", () => {
    const sha = "abc123def4567890abc123def4567890abc123de";
    const store = new Store(dir);
    store.init();
    store.upsertSentryRelease(release({ gitCommitSha: sha }));
    let list = store.listSentryReleasesForResource("sentry:project:450");
    expect(list[0]!.gitCommitSha).toBe(sha);
    expect(list[0]!.version).toBe("frontend@1.0.0");
    // Later successful normalize without valid SHA updates to null.
    store.upsertSentryRelease(release({ gitCommitSha: null }));
    list = store.listSentryReleasesForResource("sentry:project:450");
    expect(list[0]!.gitCommitSha).toBeNull();
    store.close();
  });

  test("Sprint 046: pre-046 sentry_releases upgrades with nullable git_commit_sha", () => {
    const sha = "abc123def4567890abc123def4567890abc123de";
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
      CREATE TABLE sentry_releases (
        version TEXT NOT NULL, resource_id TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'sentry', project_id TEXT NOT NULL,
        short_version TEXT, status TEXT, date_created TEXT NOT NULL,
        date_released TEXT, observed_at TEXT NOT NULL,
        PRIMARY KEY (version, resource_id)
      );
      INSERT INTO sentry_releases (
        version, resource_id, project_id, short_version, status,
        date_created, date_released, observed_at
      ) VALUES (
        'frontend@1.0.0', 'sentry:project:450', '450', '1.0.0', 'open',
        '2026-08-09T10:00:00.000Z', NULL, '2026-08-09T12:00:00.000Z'
      );
    `);
    raw.close();

    const upgraded = new Store(dir);
    expect(upgraded.isInitialized()).toBe(true);
    upgraded.init();
    const old = upgraded.listSentryReleasesForResource("sentry:project:450");
    expect(old).toHaveLength(1);
    expect(old[0]!.gitCommitSha).toBeNull();
    expect(old[0]!.version).toBe("frontend@1.0.0");
    upgraded.upsertSentryRelease(release({ gitCommitSha: sha }));
    expect(
      upgraded.listSentryReleasesForResource("sentry:project:450")[0]!
        .gitCommitSha,
    ).toBe(sha);
    upgraded.close();
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
