import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  formatInvestigationContext,
  getInvestigationContext,
} from "../../src/app/investigate.ts";
import { createResource } from "../../src/domain/resource.ts";
import type { GitHubWorkflowRunEvidence } from "../../src/providers/github/workflow-run.ts";
import type { VercelDeploymentEvidence } from "../../src/providers/vercel/deployment.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-cli-density-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function openStore(): Store {
  const store = new Store(dir);
  store.init();
  return store;
}

function deployment(
  overrides: Partial<VercelDeploymentEvidence> = {},
): VercelDeploymentEvidence {
  return {
    provider: "vercel",
    uid: "dpl_1",
    resourceId: "vercel:project:prj_a",
    projectId: "prj_a",
    readyState: "READY",
    state: "READY",
    target: "production",
    createdAtMs: Date.parse("2026-08-09T10:00:00.000Z"),
    buildingAtMs: Date.parse("2026-08-09T10:00:05.000Z"),
    readyAtMs: Date.parse("2026-08-09T10:01:00.000Z"),
    observedAt: "2026-08-09T12:00:00.000Z",
    source: "git",
    ...overrides,
  };
}

function run(
  overrides: Partial<GitHubWorkflowRunEvidence> = {},
): GitHubWorkflowRunEvidence {
  return {
    provider: "github",
    runId: 42,
    resourceId: "github:repository:1",
    repositoryId: "1",
    workflowId: 9,
    name: "CI",
    runNumber: 3,
    runAttempt: 1,
    event: "push",
    status: "completed",
    conclusion: "failure",
    headBranch: "main",
    headSha: "abc",
    createdAt: "2026-08-09T09:00:00.000Z",
    runStartedAt: "2026-08-09T09:00:05.000Z",
    updatedAt: "2026-08-09T09:05:00.000Z",
    observedAt: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

describe("investigate CLI density (Sprint 032)", () => {
  test("Provider Activity is a compact chronological index, not full cards", () => {
    const store = openStore();
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj_a",
      kind: "project",
      name: "app",
      metadata: {},
    });
    const repo = createResource({
      provider: "github",
      providerResourceId: "1",
      kind: "repository",
      name: "app",
      metadata: { fullName: "acme/app" },
    });
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.applyResource(repo, {
      id: "b2",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.upsertVercelDeployment(deployment());
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.upsertGitHubWorkflowRun(run());
    store.setGitHubWorkflowRunRefresh({
      resourceId: repo.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.close();

    const output = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    const activity = output.slice(
      output.indexOf("KNOWN PROVIDER ACTIVITY"),
      output.indexOf("COMBIE OBSERVATIONS"),
    );

    // Compact one-line index entries.
    expect(activity).toMatch(
      /2026-08-09T10:00:00\.000Z\s+Vercel deployment\s+dpl_1\s+readyState=READY/,
    );
    // Full secondary timestamps remain on detailed cards, not the index.
    expect(activity).not.toContain("building at:");
    expect(activity).not.toContain("ready at:");
    expect(activity).not.toContain("started at:");
    expect(activity).not.toContain("observed by Combie at:");
    // Detailed section still complete.
    expect(output).toContain("building at: 2026-08-09T10:00:05.000Z");
    expect(output).toContain("DEPLOYMENTS (newest first)");
  });

  test("never labels retained rows as current/latest-response members", () => {
    const store = openStore();
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj_a",
      kind: "project",
      name: "app",
      metadata: {},
    });
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.upsertVercelDeployment(deployment({ uid: "dpl_old" }));
    store.upsertVercelDeployment(deployment({ uid: "dpl_new", createdAtMs: 3000 }));
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.close();

    const output = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    expect(output).toContain(
      "latest successful response returned 1; Combie retains 2 (membership of retained rows is not proven)",
    );
    expect(output).not.toContain("in latest refresh");
    expect(output).not.toContain("current deployment");
    expect(output).not.toContain("latest-success record");
    expect(output).not.toContain("from latest response");
  });

  test("unknown detail marker is compact; Missing Context keeps the explanation", () => {
    const store = openStore();
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj_a",
      kind: "project",
      name: "app",
      metadata: {},
    });
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.upsertVercelDeployment(deployment());
    store.close();

    const before = createHash("sha256")
      .update(readFileSync(dbPath(dir)))
      .digest("hex");
    const first = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    const second = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    expect(second).toBe(first);
    expect(first).toContain("authority: unknown · retained history may be stale");
    expect(first).toContain("MISSING CONTEXT");
    expect(first).toContain(
      "Vercel deployment evidence has not yet been successfully refreshed",
    );
    expect(first).not.toContain(
      "Deployment evidence has not been successfully refreshed.",
    );
    const after = createHash("sha256")
      .update(readFileSync(dbPath(dir)))
      .digest("hex");
    expect(after).toBe(before);
  });
});
