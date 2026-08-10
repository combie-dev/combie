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
import type { GitHubWorkflowRunEvidence } from "../../src/providers/github/workflow-run.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-inv-wf-"));
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

function seedRepo(store: Store) {
  const repo = createResource({
    provider: "github",
    providerResourceId: "915052094",
    kind: "repository",
    name: "demo",
    metadata: { fullName: "acme/demo", owner: "acme" },
  });
  store.applyResource(repo, {
    id: "repo-baseline",
    observedAt: "2026-08-09T08:00:00.000Z",
  });
  return repo;
}

function run(
  overrides: Partial<GitHubWorkflowRunEvidence> = {},
): GitHubWorkflowRunEvidence {
  return {
    provider: "github",
    runId: 9001,
    resourceId: "github:repository:915052094",
    repositoryId: "915052094",
    workflowId: 101,
    name: "CI",
    runNumber: 42,
    runAttempt: 1,
    event: "push",
    status: "completed",
    conclusion: "success",
    headBranch: "main",
    headSha: "abc123def4567890abc123def4567890abc123de",
    createdAt: "2026-08-09T11:00:00.000Z",
    runStartedAt: "2026-08-09T11:00:05.000Z",
    updatedAt: "2026-08-09T11:05:00.000Z",
    observedAt: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

describe("investigate workflow runs (Sprint 021)", () => {
  test("GitHub subject with runs shows WORKFLOW RUNS ordered newest first", () => {
    const store = openStore();
    const repo = seedRepo(store);
    store.upsertGitHubWorkflowRun(
      run({ runId: 1, createdAt: "2026-08-09T09:00:00.000Z", name: "old" }),
    );
    store.upsertGitHubWorkflowRun(
      run({ runId: 3, createdAt: "2026-08-09T12:00:00.000Z", name: "new" }),
    );
    store.upsertGitHubWorkflowRun(
      run({ runId: 2, createdAt: "2026-08-09T10:00:00.000Z", name: "mid" }),
    );
    store.setGitHubWorkflowRunRefresh({
      resourceId: repo.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
    resultCount: null,
    lastSuccessfulObservedAt: null,
    });
    store.close();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("network must not be used");
    }) as unknown as typeof fetch;
    try {
      const ctx = getInvestigationContext({
        baseDir: dir,
        resourceRef: repo.id,
      });
      expect(ctx.subjectWorkflowRuns.kind).toBe("populated");
      if (ctx.subjectWorkflowRuns.kind === "populated") {
        expect(ctx.subjectWorkflowRuns.runs.map((r) => r.runId)).toEqual([
          3, 2, 1,
        ]);
      }
      const output = formatInvestigationContext(ctx);
      expect(output).toContain("WORKFLOW RUNS (newest first)");
      expect(output).toContain("run id: 3");
      expect(output).toContain("status: completed");
      expect(output).toContain("conclusion: success");
      expect(output).toContain("created at: ");
      expect(output).toContain("started at: ");
      expect(output).toContain("observed by Combie at: ");
      expect(output).toContain("head sha: ");
      expect(output).toContain("COMBIE OBSERVATIONS (newest first)");
      expect(output).not.toContain("triggered");
      expect(output).not.toContain("caused");
      expect(output.indexOf("WORKFLOW RUNS (newest first)")).toBeLessThan(
        output.indexOf("COMBIE OBSERVATIONS (newest first)"),
      );
      expect(output.indexOf("run id: 3")).toBeLessThan(
        output.indexOf("run id: 1"),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("known-empty and unknown render differently", () => {
    const store = openStore();
    const repo = seedRepo(store);
    store.setGitHubWorkflowRunRefresh({
      resourceId: repo.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
    resultCount: null,
    lastSuccessfulObservedAt: null,
    });
    store.close();

    let ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: repo.id,
    });
    expect(ctx.subjectWorkflowRuns.kind).toBe("empty");
    expect(formatInvestigationContext(ctx)).toContain(
      "No workflow runs recorded for this repository in the latest successful response.",
    );

    const store2 = openStore();
    store2.setGitHubWorkflowRunRefresh({
      resourceId: repo.id,
      status: "failure",
      observedAt: "2026-08-09T13:00:00.000Z",
      message: "403 forbidden",
    resultCount: null,
    lastSuccessfulObservedAt: null,
    });
    store2.upsertGitHubWorkflowRun(run({ runId: 9, name: "stale" }));
    store2.close();

    ctx = getInvestigationContext({ baseDir: dir, resourceRef: repo.id });
    expect(ctx.subjectWorkflowRuns.kind).toBe("unknown");
    const out = formatInvestigationContext(ctx);
    expect(out).toContain(
      "Workflow run evidence has not been successfully refreshed.",
    );
    expect(out).toContain("Prior recorded workflow runs (may be stale)");
    expect(out).toContain("run id: 9");
  });

  test("one-hop Vercel subject includes GitHub neighbor workflow runs", () => {
    const store = openStore();
    const repo = seedRepo(store);
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj_demo",
      kind: "project",
      name: "demo",
      metadata: {},
    });
    store.applyResource(project, {
      id: "p1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: repo.id,
        targetResourceId: project.id,
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "acme/demo",
        },
      }),
    );
    store.upsertGitHubWorkflowRun(run());
    store.setGitHubWorkflowRunRefresh({
      resourceId: repo.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
    resultCount: null,
    lastSuccessfulObservedAt: null,
    });
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });
    expect(ctx.subjectWorkflowRuns.kind).toBe("not_applicable");
    expect(ctx.related[0]!.workflowRuns.kind).toBe("populated");
    const out = formatInvestigationContext(ctx);
    expect(out).toContain("WORKFLOW RUNS (newest first)");
    expect(out).toContain("run id: 9001");
    expect(out).not.toContain("corresponds to");
    expect(out).not.toContain("correlated");
  });

  test("Change timeline and Vercel deployments remain independent", () => {
    const store = openStore();
    const repo = seedRepo(store);
    store.applyResource(
      { ...repo, name: "demo-renamed" },
      { id: "name-change", observedAt: "2026-08-09T09:00:00.000Z" },
    );
    store.upsertGitHubWorkflowRun(run());
    store.setGitHubWorkflowRunRefresh({
      resourceId: repo.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
    resultCount: null,
    lastSuccessfulObservedAt: null,
    });
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: repo.id,
    });
    const timeline = composeInvestigationTimeline(ctx);
    expect(timeline.entries.map((e) => e.change.id)).toEqual(["name-change"]);
    expect(timeline.entries.every((e) => e.change.kind === "updated")).toBe(
      true,
    );
    const out = formatInvestigationContext(ctx);
    expect(out).toContain("WORKFLOW RUNS (newest first)");
    expect(out).toContain("Change ID: name-change");
    expect(out).not.toContain("DEPLOYMENTS (newest first)");
  });

  test("offline investigate does not mutate the database", () => {
    const store = openStore();
    const repo = seedRepo(store);
    store.upsertGitHubWorkflowRun(run());
    store.setGitHubWorkflowRunRefresh({
      resourceId: repo.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
    resultCount: null,
    lastSuccessfulObservedAt: null,
    });
    store.close();

    const before = dbHash();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("network must not be used");
    }) as unknown as typeof fetch;
    try {
      const a = getInvestigationContext({
        baseDir: dir,
        resourceRef: repo.id,
      });
      const b = getInvestigationContext({
        baseDir: dir,
        resourceRef: repo.id,
      });
      expect(formatInvestigationContext(a)).toBe(
        formatInvestigationContext(b),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(dbHash()).toBe(before);
  });
});
