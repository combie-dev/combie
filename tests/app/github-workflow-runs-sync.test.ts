import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncGitHubWorkflowRuns } from "../../src/app/github-workflow-runs.ts";
import { createResource } from "../../src/domain/resource.ts";
import workflowRunsFixture from "../providers/github/fixtures/workflow-runs.json";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-ghwf-sync-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function repoResource() {
  return createResource({
    provider: "github",
    providerResourceId: "915052094",
    kind: "repository",
    name: "demo",
    metadata: { fullName: "acme/demo", owner: "acme" },
  });
}

describe("syncGitHubWorkflowRuns", () => {
  test("success populates runs with exact repository association", async () => {
    const store = new Store(dir);
    store.init();
    const repo = repoResource();
    store.applyResource(repo, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });

    const result = await syncGitHubWorkflowRuns({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () =>
        Response.json(workflowRunsFixture)) as unknown as typeof fetch,
    });

    expect(result.refreshed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.upserted).toBe(2);
    const list = store.listGitHubWorkflowRunsForResource(repo.id);
    expect(list).toHaveLength(2);
    expect(list.every((r) => r.resourceId === repo.id)).toBe(true);
    expect(store.getGitHubWorkflowRunRefresh(repo.id)?.status).toBe("success");
    expect(store.listChanges()).toHaveLength(0);
    store.close();
  });

  test("known-empty success and failure retain/unknown semantics", async () => {
    const store = new Store(dir);
    store.init();
    const repo = repoResource();
    store.applyResource(repo, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });

    await syncGitHubWorkflowRuns({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () =>
        Response.json({
          total_count: 0,
          workflow_runs: [],
        })) as unknown as typeof fetch,
    });
    expect(store.getGitHubWorkflowRunRefresh(repo.id)?.status).toBe("success");
    expect(store.listGitHubWorkflowRunsForResource(repo.id)).toEqual([]);

    await syncGitHubWorkflowRuns({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-09T12:30:00.000Z",
      fetch: (async () =>
        Response.json(workflowRunsFixture)) as unknown as typeof fetch,
    });
    expect(store.countGitHubWorkflowRuns()).toBe(2);

    await syncGitHubWorkflowRuns({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-09T13:00:00.000Z",
      fetch: (async () =>
        Response.json(
          { message: "Forbidden" },
          { status: 403 },
        )) as unknown as typeof fetch,
    });
    expect(store.getGitHubWorkflowRunRefresh(repo.id)?.status).toBe("failure");
    expect(store.countGitHubWorkflowRuns()).toBe(2);
    store.close();
  });

  test("Sprint 027: result_count 0–100, retained > latest, failure preserves, idempotent", async () => {
    const store = new Store(dir);
    store.init();
    const repo = repoResource();
    store.applyResource(repo, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });

    await syncGitHubWorkflowRuns({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () =>
        Response.json({
          total_count: 0,
          workflow_runs: [],
        })) as unknown as typeof fetch,
    });
    expect(store.getGitHubWorkflowRunRefresh(repo.id)?.resultCount).toBe(0);

    await syncGitHubWorkflowRuns({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-09T12:15:00.000Z",
      fetch: (async () =>
        Response.json(workflowRunsFixture)) as unknown as typeof fetch,
    });
    expect(store.getGitHubWorkflowRunRefresh(repo.id)?.resultCount).toBe(2);
    expect(store.listGitHubWorkflowRunsForResource(repo.id)).toHaveLength(2);

    // Smaller latest response: retained can exceed latest result_count
    const oneRun = {
      total_count: 1,
      workflow_runs: [
        {
          id: 999001,
          name: "CI",
          status: "completed",
          conclusion: "success",
          created_at: "2026-08-09T11:00:00Z",
          repository: { id: 915052094 },
        },
      ],
    };
    await syncGitHubWorkflowRuns({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-09T12:30:00.000Z",
      fetch: (async () => Response.json(oneRun)) as unknown as typeof fetch,
    });
    expect(store.getGitHubWorkflowRunRefresh(repo.id)?.resultCount).toBe(1);
    expect(store.listGitHubWorkflowRunsForResource(repo.id).length).toBeGreaterThan(
      1,
    );

    // Bounded page of 100: cardinality is response size, not complete history.
    const hundred = {
      total_count: 500,
      workflow_runs: Array.from({ length: 100 }, (_, i) => ({
        id: 700000 + i,
        name: "CI",
        status: "completed",
        conclusion: "success",
        created_at: "2026-08-09T10:00:00Z",
        repository: { id: 915052094 },
      })),
    };
    await syncGitHubWorkflowRuns({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-09T12:45:00.000Z",
      fetch: (async () => Response.json(hundred)) as unknown as typeof fetch,
    });
    expect(store.getGitHubWorkflowRunRefresh(repo.id)?.resultCount).toBe(100);

    // Permission failure preserves last success count
    await syncGitHubWorkflowRuns({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-09T13:00:00.000Z",
      fetch: (async () =>
        Response.json(
          { message: "Forbidden" },
          { status: 403 },
        )) as unknown as typeof fetch,
    });
    expect(store.getGitHubWorkflowRunRefresh(repo.id)?.status).toBe("failure");
    expect(store.getGitHubWorkflowRunRefresh(repo.id)?.resultCount).toBe(100);

    // Transient failure also preserves
    await syncGitHubWorkflowRuns({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-09T13:15:00.000Z",
      fetch: (async () =>
        Response.json(
          { message: "Server Error" },
          { status: 500 },
        )) as unknown as typeof fetch,
    });
    expect(store.getGitHubWorkflowRunRefresh(repo.id)?.resultCount).toBe(100);

    // Idempotent recovery
    await syncGitHubWorkflowRuns({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-09T13:30:00.000Z",
      fetch: (async () => Response.json(oneRun)) as unknown as typeof fetch,
    });
    expect(store.getGitHubWorkflowRunRefresh(repo.id)).toEqual({
      resourceId: repo.id,
      status: "success",
      observedAt: "2026-08-09T13:30:00.000Z",
      message: null,
      resultCount: 1,
    });
    store.close();
  });

  test("ignores runs that do not match exact repository id", async () => {
    const store = new Store(dir);
    store.init();
    const repo = repoResource();
    store.applyResource(repo, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    await syncGitHubWorkflowRuns({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () =>
        Response.json({
          total_count: 1,
          workflow_runs: [
            {
              id: 1,
              created_at: "2026-08-09T10:00:00Z",
              repository: { id: 999 },
              status: "completed",
              conclusion: "success",
            },
          ],
        })) as unknown as typeof fetch,
    });
    expect(store.listGitHubWorkflowRunsForResource(repo.id)).toEqual([]);
    expect(store.getGitHubWorkflowRunRefresh(repo.id)?.status).toBe("success");
    store.close();
  });

  test("repeated sync is idempotent including attempt refresh", async () => {
    const store = new Store(dir);
    store.init();
    const repo = repoResource();
    store.applyResource(repo, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    const first = {
      total_count: 1,
      workflow_runs: [
        {
          id: 55,
          name: "CI",
          run_number: 1,
          run_attempt: 1,
          status: "in_progress",
          conclusion: null,
          created_at: "2026-08-09T10:00:00Z",
          repository: { id: 915052094 },
        },
      ],
    };
    await syncGitHubWorkflowRuns({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () => Response.json(first)) as unknown as typeof fetch,
    });
    const second = {
      total_count: 1,
      workflow_runs: [
        {
          id: 55,
          name: "CI",
          run_number: 1,
          run_attempt: 2,
          status: "completed",
          conclusion: "success",
          created_at: "2026-08-09T10:00:00Z",
          repository: { id: 915052094 },
        },
      ],
    };
    await syncGitHubWorkflowRuns({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-09T13:00:00.000Z",
      fetch: (async () => Response.json(second)) as unknown as typeof fetch,
    });
    const list = store.listGitHubWorkflowRunsForResource(repo.id);
    expect(list).toHaveLength(1);
    expect(list[0]!.runAttempt).toBe(2);
    expect(list[0]!.conclusion).toBe("success");
    store.close();
  });
});
