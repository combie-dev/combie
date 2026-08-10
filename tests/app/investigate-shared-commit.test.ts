import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  formatInvestigationContext,
  getInvestigationContext,
} from "../../src/app/investigate.ts";
import { initCombie } from "../../src/app/init.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import type { GitHubWorkflowRunEvidence } from "../../src/providers/github/workflow-run.ts";
import type { VercelDeploymentEvidence } from "../../src/providers/vercel/deployment.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

const SHA = "abc123def4567890abc123def4567890abc123de";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-inv-shared-commit-"));
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

function seedRepoAndProject(store: Store) {
  const repository = createResource({
    provider: "github",
    providerResourceId: "915052094",
    kind: "repository",
    name: "demo",
    metadata: { fullName: "acme/demo", owner: "acme" },
  });
  const project = createResource({
    provider: "vercel",
    providerResourceId: "prj_demo_hub",
    kind: "project",
    name: "demo-hub",
    metadata: { accountId: "team_1" },
  });
  store.applyResource(repository, {
    id: "repo-baseline",
    observedAt: "2026-08-09T08:00:00.000Z",
  });
  store.applyResource(project, {
    id: "proj-baseline",
    observedAt: "2026-08-09T08:00:00.000Z",
  });
  store.upsertRelationship(
    createRelationship({
      sourceResourceId: repository.id,
      targetResourceId: project.id,
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "acme/demo",
        githubRepoId: "915052094",
      },
    }),
  );
  return { repository, project };
}

function run(
  overrides: Partial<GitHubWorkflowRunEvidence> = {},
): GitHubWorkflowRunEvidence {
  return {
    provider: "github",
    runId: 9001,
    resourceId: "github:repository:915052094",
    repositoryId: "915052094",
    workflowId: 1,
    name: "CI",
    runNumber: 12,
    runAttempt: 1,
    event: "push",
    status: "completed",
    conclusion: "failure",
    headBranch: "main",
    headSha: SHA,
    createdAt: "2026-08-09T10:00:00.000Z",
    runStartedAt: null,
    updatedAt: null,
    observedAt: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

function dep(
  overrides: Partial<VercelDeploymentEvidence> = {},
): VercelDeploymentEvidence {
  return {
    provider: "vercel",
    uid: "dpl_1",
    resourceId: "vercel:project:prj_demo_hub",
    projectId: "prj_demo_hub",
    readyState: "ERROR",
    state: "ERROR",
    target: "production",
    createdAtMs: 1723201000000,
    buildingAtMs: null,
    readyAtMs: null,
    observedAt: "2026-08-09T12:00:00.000Z",
    source: "git",
    gitCommitSha: SHA,
    ...overrides,
  };
}

describe("investigate shared commit context (Sprint 035)", () => {
  test("CLI shows SHARED COMMIT CONTEXT for matching evidence under source_for", () => {
    const store = openStore();
    const { repository, project } = seedRepoAndProject(store);
    store.upsertGitHubWorkflowRun(run());
    store.setGitHubWorkflowRunRefresh({
      resourceId: repository.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.upsertVercelDeployment(dep());
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.close();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("network must not be used during investigate");
    }) as unknown as typeof fetch;

    try {
      const fromProject = getInvestigationContext({
        baseDir: dir,
        resourceRef: project.id,
      });
      const outProject = formatInvestigationContext(fromProject);
      expect(outProject).toContain("SHARED COMMIT CONTEXT");
      expect(outProject).toContain(`Commit ${SHA}`);
      expect(outProject).toContain("9001");
      expect(outProject).toContain("dpl_1");
      expect(outProject).toContain("git commit sha: " + SHA);
      expect(outProject).toContain("exact Git commit SHA");
      expect(outProject).toContain(
        `${repository.id} source_for ${project.id}`,
      );
      expect(outProject).not.toContain("triggered");
      expect(outProject).not.toContain("caused by");
      expect(outProject).not.toContain("deployed by");
      expect(outProject).not.toContain("same incident");
      expect(outProject.indexOf("RELATED CONTEXT")).toBeLessThan(
        outProject.indexOf("SHARED COMMIT CONTEXT"),
      );
      expect(outProject.indexOf("SHARED COMMIT CONTEXT")).toBeLessThan(
        outProject.indexOf("KNOWN PROVIDER ACTIVITY"),
      );

      const fromRepo = getInvestigationContext({
        baseDir: dir,
        resourceRef: repository.id,
      });
      const outRepo = formatInvestigationContext(fromRepo);
      expect(outRepo).toContain("SHARED COMMIT CONTEXT");
      expect(outRepo).toContain(`Commit ${SHA}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("omits SHARED COMMIT CONTEXT when SHAs differ", () => {
    const store = openStore();
    const { repository, project } = seedRepoAndProject(store);
    store.upsertGitHubWorkflowRun(run({ headSha: SHA }));
    store.setGitHubWorkflowRunRefresh({
      resourceId: repository.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.upsertVercelDeployment(
      dep({ gitCommitSha: "fff111aaa222bbb333ccc444ddd555eee666fff7" }),
    );
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.close();

    const out = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    expect(out).not.toContain("SHARED COMMIT CONTEXT");
  });

  test("offline and read-only: no network, no DB mutation", () => {
    const store = openStore();
    const { repository, project } = seedRepoAndProject(store);
    store.upsertGitHubWorkflowRun(run());
    store.setGitHubWorkflowRunRefresh({
      resourceId: repository.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.upsertVercelDeployment(dep());
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.close();

    const before = dbHash();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("network must not be used");
    }) as unknown as typeof fetch;
    try {
      const a = formatInvestigationContext(
        getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
      );
      const b = formatInvestigationContext(
        getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
      );
      expect(a).toBe(b);
      expect(a).toContain("SHARED COMMIT CONTEXT");
      expect(dbHash()).toBe(before);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
