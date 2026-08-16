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
import type { SentryReleaseEvidence } from "../../src/providers/sentry/release.ts";
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

function seedRepoAndSentryProject(store: Store) {
  const repository = createResource({
    provider: "github",
    providerResourceId: "915052094",
    kind: "repository",
    name: "demo",
    metadata: { fullName: "acme/demo", owner: "acme" },
  });
  const sentryProject = createResource({
    provider: "sentry",
    providerResourceId: "450",
    kind: "project",
    name: "combie",
    metadata: { organizationSlug: "acme" },
  });
  store.applyResource(repository, {
    id: "repo-baseline",
    observedAt: "2026-08-09T08:00:00.000Z",
  });
  store.applyResource(sentryProject, {
    id: "sentry-baseline",
    observedAt: "2026-08-09T08:00:00.000Z",
  });
  store.upsertRelationship(
    createRelationship({
      sourceResourceId: repository.id,
      targetResourceId: sentryProject.id,
      kind: "code_mapped_to",
      evidence: {
        source: "sentry",
        mechanism: "code_mapping",
        repository: "acme/demo",
      },
    }),
  );
  return { repository, sentryProject };
}

function sentryRelease(
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
    dateReleased: null,
    observedAt: "2026-08-09T12:00:00.000Z",
    gitCommitSha: SHA,
    ...overrides,
  };
}

describe("investigate shared commit context (Sprint 046)", () => {
  test("CLI shows code_mapped_to SHARED COMMIT CONTEXT and release git commit", () => {
    const store = openStore();
    const { repository, sentryProject } = seedRepoAndSentryProject(store);
    store.upsertGitHubWorkflowRun(run());
    store.setGitHubWorkflowRunRefresh({
      resourceId: repository.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.upsertSentryRelease(sentryRelease());
    store.setSentryReleaseRefresh({
      resourceId: sentryProject.id,
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
        resourceRef: sentryProject.id,
      });
      const outProject = formatInvestigationContext(fromProject);
      expect(outProject).toContain("SHARED COMMIT CONTEXT");
      expect(outProject).toContain(`Commit ${SHA}`);
      expect(outProject).toContain("Sentry releases");
      expect(outProject).toContain("frontend@1.2.0");
      expect(outProject).toContain("status=open");
      expect(outProject).toContain("9001");
      expect(outProject).toContain("git commit: " + SHA);
      expect(outProject).toContain(
        "GitHub workflow-run and Sentry release evidence reference the same exact Git commit within an already-proven code_mapped_to resource relationship",
      );
      expect(outProject).toContain(
        `${repository.id} code_mapped_to ${sentryProject.id}`,
      );
      expect(outProject).not.toContain("triggered");
      expect(outProject).not.toContain("caused by");
      expect(outProject).not.toContain("deployed by");
      expect(outProject).not.toContain("same incident");
      expect(outProject).toContain("MISSING CONTEXT");
      expect(outProject).not.toContain(
        "no full Git commit SHA is currently held on both a GitHub workflow run and a Sentry release",
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

  test("one-sided SHA under code_mapped_to → no group, MISSING CONTEXT item", () => {
    const store = openStore();
    const { repository, sentryProject } = seedRepoAndSentryProject(store);
    store.upsertGitHubWorkflowRun(run());
    store.setGitHubWorkflowRunRefresh({
      resourceId: repository.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.upsertSentryRelease(sentryRelease({ gitCommitSha: null }));
    store.setSentryReleaseRefresh({
      resourceId: sentryProject.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.close();

    const out = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: sentryProject.id }),
    );
    expect(out).not.toContain("SHARED COMMIT CONTEXT");
    expect(out).toContain("MISSING CONTEXT");
    expect(out).toContain(
      "A code_mapped_to relationship exists (" +
        `rel:${repository.id}:code_mapped_to:${sentryProject.id}), ` +
        "but no full Git commit SHA is currently held on both a GitHub workflow run and a Sentry release.",
    );
  });
});
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

describe("investigate shared commit correspondence (Sprint 047)", () => {
  function seedHub(store: Store) {
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
    const sentryProject = createResource({
      provider: "sentry",
      providerResourceId: "450",
      kind: "project",
      name: "combie",
      metadata: { organizationSlug: "acme" },
    });
    store.applyResource(repository, {
      id: "repo-baseline",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.applyResource(project, {
      id: "proj-baseline",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.applyResource(sentryProject, {
      id: "sentry-baseline",
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
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: repository.id,
        targetResourceId: sentryProject.id,
        kind: "code_mapped_to",
        evidence: {
          source: "sentry",
          mechanism: "code_mapping",
          repository: "acme/demo",
        },
      }),
    );
    return { repository, project, sentryProject };
  }

  function refreshRun(store: Store, repositoryId: string) {
    store.setGitHubWorkflowRunRefresh({
      resourceId: repositoryId,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
  }

  test("CLI surfaces the same-commit correspondence through both proven edges", () => {
    const store = openStore();
    const { repository, project, sentryProject } = seedHub(store);
    store.upsertGitHubWorkflowRun(run());
    refreshRun(store, repository.id);
    store.upsertVercelDeployment(dep());
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.upsertSentryRelease(sentryRelease());
    store.setSentryReleaseRefresh({
      resourceId: sentryProject.id,
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
      const out = formatInvestigationContext(
        getInvestigationContext({ baseDir: dir, resourceRef: repository.id }),
      );
      expect(out).toContain("SHARED COMMIT CONTEXT");
      expect(out).toContain("Same-commit correspondence");
      expect(out).toContain(
        `rel:${repository.id}:source_for:${project.id}`,
      );
      expect(out).toContain(
        `rel:${repository.id}:code_mapped_to:${sentryProject.id}`,
      );
      expect(out).toContain(SHA);
      expect(out).not.toContain("triggered");
      expect(out).not.toContain("caused by");
      expect(out).not.toContain("deployed by");
      expect(out).not.toContain("same incident");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("Vercel subject does not invent a correspondence; MISSING CONTEXT is truthful", () => {
    const store = openStore();
    const { repository, project, sentryProject } = seedHub(store);
    store.upsertGitHubWorkflowRun(run());
    refreshRun(store, repository.id);
    store.upsertVercelDeployment(dep());
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.upsertSentryRelease(sentryRelease());
    store.setSentryReleaseRefresh({
      resourceId: sentryProject.id,
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
      const out = formatInvestigationContext(
        getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
      );
      expect(out).not.toContain("Same-commit correspondence");
      expect(out).toContain("MISSING CONTEXT");
      expect(out).toContain(
        "Sentry release evidence is outside this Vercel subject's one-hop scope",
      );
      expect(out).not.toContain("connect a Sentry");
      expect(out).not.toContain("add a provider");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("offline and read-only for the correspondence path", () => {
    const store = openStore();
    const { repository, project, sentryProject } = seedHub(store);
    store.upsertGitHubWorkflowRun(run());
    refreshRun(store, repository.id);
    store.upsertVercelDeployment(dep());
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.upsertSentryRelease(sentryRelease());
    store.setSentryReleaseRefresh({
      resourceId: sentryProject.id,
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
        getInvestigationContext({ baseDir: dir, resourceRef: repository.id }),
      );
      const b = formatInvestigationContext(
        getInvestigationContext({ baseDir: dir, resourceRef: repository.id }),
      );
      expect(a).toBe(b);
      expect(a).toContain("Same-commit correspondence");
      expect(dbHash()).toBe(before);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
