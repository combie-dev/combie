import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SentryIssueEvidence } from "../../src/providers/sentry/issue.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-sentry-iss-store-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function issue(
  overrides: Partial<SentryIssueEvidence> = {},
): SentryIssueEvidence {
  return {
    provider: "sentry",
    issueId: "1001",
    resourceId: "sentry:project:450",
    projectId: "450",
    shortId: "COMBIE-1",
    status: "unresolved",
    level: "error",
    count: 10,
    userCount: 2,
    issueCategory: "error",
    firstSeen: "2026-08-15T14:00:00.000Z",
    lastSeen: "2026-08-15T15:00:00.000Z",
    observedAt: "2026-08-15T16:00:00.000Z",
    ...overrides,
  };
}

describe("Store sentry issue persistence", () => {
  test("lists most-recently-seen first with issue-id tie-break", () => {
    const store = new Store(dir);
    store.init();
    store.upsertSentryIssue(
      issue({ issueId: "a", lastSeen: "2026-08-15T09:00:00.000Z" }),
    );
    store.upsertSentryIssue(
      issue({ issueId: "c", lastSeen: "2026-08-15T11:00:00.000Z" }),
    );
    store.upsertSentryIssue(
      issue({ issueId: "b", lastSeen: "2026-08-15T11:00:00.000Z" }),
    );
    const list = store.listSentryIssuesForResource("sentry:project:450");
    expect(list.map((item) => item.issueId)).toEqual(["c", "b", "a"]);
    store.close();
  });

  test("repeated upsert updates mutable lastSeen/count without duplicates", () => {
    const store = new Store(dir);
    store.init();
    store.upsertSentryIssue(issue());
    store.upsertSentryIssue(
      issue({
        status: "resolved",
        count: 42,
        lastSeen: "2026-08-15T17:00:00.000Z",
        observedAt: "2026-08-15T17:00:00.000Z",
      }),
    );
    const list = store.listSentryIssuesForResource("sentry:project:450");
    expect(list).toHaveLength(1);
    expect(list[0]!.status).toBe("resolved");
    expect(list[0]!.count).toBe(42);
    expect(list[0]!.lastSeen).toBe("2026-08-15T17:00:00.000Z");
    expect(store.countSentryIssues()).toBe(1);
    store.close();
  });

  test("pre-044 DB upgrade and refresh failure retains rows", () => {
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
    store.upsertSentryIssue(issue());
    store.setSentryIssueRefresh({
      resourceId: "sentry:project:450",
      status: "success",
      observedAt: "2026-08-15T16:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-15T16:00:00.000Z",
    });
    store.setSentryIssueRefresh({
      resourceId: "sentry:project:450",
      status: "failure",
      observedAt: "2026-08-15T17:00:00.000Z",
      message: "forbidden",
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-15T16:00:00.000Z",
    });
    expect(store.listSentryIssuesForResource("sentry:project:450")).toHaveLength(1);
    const refresh = store.getSentryIssueRefresh("sentry:project:450");
    expect(refresh?.status).toBe("failure");
    expect(refresh?.resultCount).toBe(1);
    expect(refresh?.lastSuccessfulObservedAt).toBe("2026-08-15T16:00:00.000Z");
    store.close();
  });
});
