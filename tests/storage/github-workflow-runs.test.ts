import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createResource } from "../../src/domain/resource.ts";
import type { GitHubWorkflowRunEvidence } from "../../src/providers/github/workflow-run.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-ghwf-store-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function run(
  overrides: Partial<GitHubWorkflowRunEvidence> = {},
): GitHubWorkflowRunEvidence {
  return {
    provider: "github",
    runId: 100,
    resourceId: "github:repository:1",
    repositoryId: "1",
    workflowId: 10,
    name: "CI",
    runNumber: 1,
    runAttempt: 1,
    event: "push",
    status: "in_progress",
    conclusion: null,
    headBranch: "main",
    headSha: "abc",
    createdAt: "2026-08-09T10:00:00.000Z",
    runStartedAt: "2026-08-09T10:00:01.000Z",
    updatedAt: "2026-08-09T10:00:01.000Z",
    observedAt: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

describe("Store github workflow-run persistence", () => {
  test("inserts and lists newest-first with stable run_id tie-break", () => {
    const store = new Store(dir);
    store.init();
    store.upsertGitHubWorkflowRun(
      run({ runId: 1, createdAt: "2026-08-09T09:00:00.000Z" }),
    );
    store.upsertGitHubWorkflowRun(
      run({ runId: 3, createdAt: "2026-08-09T11:00:00.000Z" }),
    );
    store.upsertGitHubWorkflowRun(
      run({ runId: 2, createdAt: "2026-08-09T11:00:00.000Z" }),
    );
    const list = store.listGitHubWorkflowRunsForResource(
      "github:repository:1",
    );
    expect(list.map((r) => r.runId)).toEqual([3, 2, 1]);
    store.close();
  });

  test("rerun updates same run id (attempt/status/conclusion) without duplicates", () => {
    const store = new Store(dir);
    store.init();
    store.upsertGitHubWorkflowRun(run());
    store.upsertGitHubWorkflowRun(
      run({
        runAttempt: 2,
        status: "completed",
        conclusion: "failure",
        observedAt: "2026-08-09T13:00:00.000Z",
      }),
    );
    const list = store.listGitHubWorkflowRunsForResource(
      "github:repository:1",
    );
    expect(list).toHaveLength(1);
    expect(list[0]!.runAttempt).toBe(2);
    expect(list[0]!.status).toBe("completed");
    expect(list[0]!.conclusion).toBe("failure");
    expect(store.countGitHubWorkflowRuns()).toBe(1);
    store.close();
  });

  test("exact Resource association scopes reads", () => {
    const store = new Store(dir);
    store.init();
    store.upsertGitHubWorkflowRun(run());
    store.upsertGitHubWorkflowRun(
      run({
        runId: 200,
        resourceId: "github:repository:2",
        repositoryId: "2",
      }),
    );
    expect(
      store.listGitHubWorkflowRunsForResource("github:repository:1"),
    ).toHaveLength(1);
    store.close();
  });

  test("pre-021 DB upgrade and refresh failure retains rows", () => {
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
    expect(store.isInitialized()).toBe(true);
    store.upsertGitHubWorkflowRun(run());
    store.setGitHubWorkflowRunRefresh({
      resourceId: "github:repository:1",
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
    resultCount: null,
    });
    store.setGitHubWorkflowRunRefresh({
      resourceId: "github:repository:1",
      status: "failure",
      observedAt: "2026-08-09T13:00:00.000Z",
      message: "403",
    resultCount: null,
    });
    expect(store.getGitHubWorkflowRunRefresh("github:repository:1")?.status).toBe(
      "failure",
    );
    expect(
      store.listGitHubWorkflowRunsForResource("github:repository:1"),
    ).toHaveLength(1);
    store.close();
  });

  test("Sprint 027: result_count provenance, pre-027 null, no backfill", () => {
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
      CREATE TABLE github_workflow_runs (
        run_id INTEGER PRIMARY KEY, provider TEXT NOT NULL DEFAULT 'github',
        resource_id TEXT NOT NULL, repository_id TEXT NOT NULL,
        workflow_id INTEGER, name TEXT, run_number INTEGER, run_attempt INTEGER,
        event TEXT, status TEXT, conclusion TEXT, head_branch TEXT, head_sha TEXT,
        created_at TEXT NOT NULL, run_started_at TEXT, updated_at TEXT,
        observed_at TEXT NOT NULL
      );
      CREATE TABLE github_workflow_run_refresh (
        resource_id TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
        observed_at TEXT NOT NULL,
        message TEXT
      );
      INSERT INTO github_workflow_run_refresh (resource_id, status, observed_at, message)
      VALUES ('github:repository:1', 'success', '2026-08-09T11:00:00.000Z', NULL);
      INSERT INTO github_workflow_runs (
        run_id, resource_id, repository_id, created_at, observed_at
      ) VALUES (
        11, 'github:repository:1', '1', '2026-08-09T10:00:00.000Z',
        '2026-08-09T11:00:00.000Z'
      );
      INSERT INTO github_workflow_runs (
        run_id, resource_id, repository_id, created_at, observed_at
      ) VALUES (
        12, 'github:repository:1', '1', '2026-08-09T10:01:00.000Z',
        '2026-08-09T11:00:00.000Z'
      );
    `);
    raw.close();

    const store = new Store(dir);
    expect(store.isInitialized()).toBe(true);
    const upgraded = store.getGitHubWorkflowRunRefresh("github:repository:1");
    expect(upgraded?.resultCount).toBeNull();
    expect(store.listGitHubWorkflowRunsForResource("github:repository:1")).toHaveLength(
      2,
    );

    store.setGitHubWorkflowRunRefresh({
      resourceId: "github:repository:1",
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 0,
    });
    expect(store.getGitHubWorkflowRunRefresh("github:repository:1")?.resultCount).toBe(
      0,
    );

    store.setGitHubWorkflowRunRefresh({
      resourceId: "github:repository:1",
      status: "success",
      observedAt: "2026-08-09T12:30:00.000Z",
      message: null,
      resultCount: 100,
    });
    expect(store.getGitHubWorkflowRunRefresh("github:repository:1")?.resultCount).toBe(
      100,
    );

    store.setGitHubWorkflowRunRefresh({
      resourceId: "github:repository:1",
      status: "failure",
      observedAt: "2026-08-09T13:00:00.000Z",
      message: "403",
      resultCount: 100,
    });
    expect(store.getGitHubWorkflowRunRefresh("github:repository:1")).toEqual({
      resourceId: "github:repository:1",
      status: "failure",
      observedAt: "2026-08-09T13:00:00.000Z",
      message: "403",
      resultCount: 100,
    });
    expect(JSON.stringify(store.getGitHubWorkflowRunRefresh("github:repository:1")))
      .not.toMatch(/ghp_|token|secret/i);
    store.close();
  });

  test("workflow upsert creates zero Resource Changes", () => {
    const store = new Store(dir);
    store.init();
    const repo = createResource({
      provider: "github",
      providerResourceId: "1",
      kind: "repository",
      name: "demo",
      metadata: { fullName: "acme/demo", owner: "acme" },
    });
    store.applyResource(repo, {
      id: "obs-1",
      observedAt: "2026-08-09T09:00:00.000Z",
    });
    store.upsertGitHubWorkflowRun(run());
    store.upsertGitHubWorkflowRun(
      run({ status: "completed", conclusion: "success" }),
    );
    expect(store.listChanges()).toHaveLength(0);
    store.close();
  });
});
