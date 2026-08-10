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
import type { NeonOperationEvidence } from "../../src/providers/neon/operation.ts";
import type { VercelDeploymentEvidence } from "../../src/providers/vercel/deployment.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

const CREDENTIAL_ENV_KEYS = [
  "CLOUDFLARE_API_TOKEN",
  "GITHUB_TOKEN",
  "GH_TOKEN",
  "VERCEL_TOKEN",
  "SENTRY_AUTH_TOKEN",
  "SENTRY_TOKEN",
  "NEON_API_KEY",
  "PLANETSCALE_SERVICE_TOKEN_ID",
  "PLANETSCALE_SERVICE_TOKEN",
] as const;

function withoutCredentialEnvironment<T>(run: () => T): T {
  const previous = new Map<string, string | undefined>();
  for (const key of CREDENTIAL_ENV_KEYS) {
    previous.set(key, process.env[key]);
    delete process.env[key];
  }
  try {
    return run();
  } finally {
    for (const key of CREDENTIAL_ENV_KEYS) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-inv-activity-"));
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

function dep(
  overrides: Partial<VercelDeploymentEvidence> = {},
): VercelDeploymentEvidence {
  return {
    provider: "vercel",
    uid: "dpl_1",
    resourceId: "vercel:project:prj_demo_hub",
    projectId: "prj_demo_hub",
    readyState: "READY",
    state: "READY",
    target: "production",
    createdAtMs: Date.parse("2026-08-09T10:02:00.000Z"),
    buildingAtMs: Date.parse("2026-08-09T10:02:05.000Z"),
    readyAtMs: Date.parse("2026-08-09T10:03:00.000Z"),
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
    runId: 9001,
    resourceId: "github:repository:915052094",
    repositoryId: "915052094",
    workflowId: 1,
    name: "ci",
    runNumber: 12,
    runAttempt: 1,
    event: "push",
    status: "completed",
    conclusion: "success",
    headBranch: "main",
    headSha: "abc123",
    createdAt: "2026-08-09T10:00:00.000Z",
    runStartedAt: "2026-08-09T10:00:05.000Z",
    updatedAt: "2026-08-09T10:01:00.000Z",
    observedAt: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

function operation(
  overrides: Partial<NeonOperationEvidence> = {},
): NeonOperationEvidence {
  return {
    provider: "neon",
    operationId: "op_1",
    resourceId: "neon:project:neon_demo",
    projectId: "neon_demo",
    action: "start_compute",
    status: "finished",
    failuresCount: 0,
    branchId: null,
    endpointId: "ep_1",
    createdAt: "2026-08-09T10:05:00.000Z",
    updatedAt: "2026-08-09T10:05:20.000Z",
    retryAt: null,
    totalDurationMs: 20000,
    observedAt: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

function seedMultiFamily(store: Store) {
  const project = createResource({
    provider: "vercel",
    providerResourceId: "prj_demo_hub",
    kind: "project",
    name: "demo-hub",
    metadata: { accountId: "team_1" },
  });
  const repository = createResource({
    provider: "github",
    providerResourceId: "915052094",
    kind: "repository",
    name: "demo-hub",
    metadata: { fullName: "sgr0691/demo-hub" },
  });
  const neonProject = createResource({
    provider: "neon",
    providerResourceId: "neon_demo",
    kind: "project",
    name: "demo-db",
    metadata: {},
  });
  const observedAt = "2026-08-09T08:00:00.000Z";
  store.applyResource(project, { id: "seed-project", observedAt });
  store.applyResource(repository, { id: "seed-repository", observedAt });
  store.applyResource(neonProject, { id: "seed-neon", observedAt });
  store.upsertRelationship(
    createRelationship({
      sourceResourceId: repository.id,
      targetResourceId: project.id,
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "sgr0691/demo-hub",
        githubRepoId: "915052094",
        vercelLinkType: "github",
      },
      createdAt: observedAt,
      updatedAt: observedAt,
    }),
  );
  store.upsertRelationship(
    createRelationship({
      sourceResourceId: project.id,
      targetResourceId: neonProject.id,
      kind: "uses_domain_in",
      evidence: {
        source: "vercel",
        mechanism: "custom_domain_match",
        apexName: "example.com",
        hostnames: ["www.example.com"],
      },
      createdAt: observedAt,
      updatedAt: observedAt,
    }),
  );
  return { project, repository, neonProject };
}

describe("investigate provider activity chronology (Sprint 024)", () => {
  test("renders KNOWN PROVIDER ACTIVITY across all three families", () => {
    const store = openStore();
    const { project, repository, neonProject } = seedMultiFamily(store);
    store.upsertVercelDeployment(dep());
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
    resultCount: null,
    lastSuccessfulObservedAt: null,
    });
    store.upsertGitHubWorkflowRun(run());
    store.setGitHubWorkflowRunRefresh({
      resourceId: repository.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
    resultCount: null,
    lastSuccessfulObservedAt: null,
    });
    store.upsertNeonOperation(operation());
    store.setNeonOperationRefresh({
      resourceId: neonProject.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
    lastSuccessfulObservedAt: null,
    });
    store.close();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("network must not be used during investigate");
    }) as unknown as typeof fetch;

    try {
      withoutCredentialEnvironment(() => {
        const before = dbHash();
        const ctx = getInvestigationContext({
          baseDir: dir,
          resourceRef: project.id,
        });
        const output = formatInvestigationContext(ctx);

        expect(output).toContain(
          "KNOWN PROVIDER ACTIVITY (newest first; incomplete)",
        );
        expect(output).toContain("Vercel deployment: dpl_1");
        expect(output).toContain("GitHub workflow run: 9001");
        expect(output).toContain("Neon operation: op_1");

        // Newest-first by provider-native primary (created) time.
        expect(output.indexOf("Neon operation: op_1")).toBeLessThan(
          output.indexOf("Vercel deployment: dpl_1"),
        );
        expect(output.indexOf("Vercel deployment: dpl_1")).toBeLessThan(
          output.indexOf("GitHub workflow run: 9001"),
        );

        // Primary timestamp semantics are explicit per family.
        expect(output).toContain("created at: 2026-08-09T10:02:00.000Z");
        expect(output).toContain("created at: 2026-08-09T10:00:00.000Z");
        expect(output).toContain("created at: 2026-08-09T10:05:00.000Z");

        // Secondary lifecycle timestamps remain visible.
        expect(output).toContain("building at: 2026-08-09T10:02:05.000Z");
        expect(output).toContain("ready at: 2026-08-09T10:03:00.000Z");
        expect(output).toContain("started at: 2026-08-09T10:00:05.000Z");
        expect(output).toContain("updated at: 2026-08-09T10:01:00.000Z");
        expect(output).toContain("status updated at: 2026-08-09T10:05:20.000Z");

        // Provider-native state terminology preserved.
        expect(output).toContain("readyState: READY");
        expect(output).toContain("status: completed");
        expect(output).toContain("conclusion: success");
        expect(output).toContain("action: start_compute");

        // Subject/neighbor distinction and Relationship provenance.
        expect(output).toContain("Role: subject");
        expect(output).toContain("Role: related");
        expect(output).toContain("Relationship: source_for (inbound)");
        expect(output).toContain("Relationship: uses_domain_in (outbound)");

        // Combie observation time remains evidence.
        expect(output).toContain(
          "observed by Combie at: 2026-08-09T12:00:00.000Z",
        );

        // Detailed evidence sections remain alongside the chronology.
        expect(output).toContain("DEPLOYMENTS (newest first)");
        expect(output).toContain("WORKFLOW RUNS (newest first)");
        expect(output).toContain("OPERATIONS (newest first)");

        // Resource Changes remain a separate Combie-observation surface.
        expect(output).toContain("COMBIE OBSERVATIONS (newest first)");
        expect(output).not.toContain("TIMELINE (newest first)");
        expect(
          output.indexOf("KNOWN PROVIDER ACTIVITY (newest first; incomplete)"),
        ).toBeLessThan(output.indexOf("COMBIE OBSERVATIONS (newest first)"));

        // No correlation or causality language.
        expect(output).not.toContain("triggered");
        expect(output).not.toContain("caused");
        expect(output).not.toContain("correlated");
        expect(output).not.toContain("explains");

        // Investigation remains read-only.
        expect(dbHash()).toBe(before);
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("repeated investigation output is deterministic", () => {
    const store = openStore();
    const { project } = seedMultiFamily(store);
    store.upsertVercelDeployment(dep({ uid: "dpl_a", createdAtMs: 2000 }));
    store.upsertVercelDeployment(dep({ uid: "dpl_b", createdAtMs: 1000 }));
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
    resultCount: null,
    lastSuccessfulObservedAt: null,
    });
    store.close();

    const first = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    const second = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    expect(second).toBe(first);
  });

  test("renders a truthful empty state when no provider evidence is known", () => {
    const store = openStore();
    const worker = createResource({
      provider: "cloudflare",
      providerResourceId: "wkr_demo",
      kind: "worker",
      name: "demo-worker",
      metadata: {},
    });
    store.applyResource(worker, {
      id: "seed-worker",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.close();

    const output = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: worker.id }),
    );

    expect(output).toContain(
      "KNOWN PROVIDER ACTIVITY (newest first; incomplete)",
    );
    expect(output).toContain(
      "No provider activity known for this investigation.",
    );
    expect(output).not.toContain("No provider activity occurred");
  });

  test("unknown refresh keeps retained evidence marked as possibly stale", () => {
    const store = openStore();
    const { project } = seedMultiFamily(store);
    store.upsertVercelDeployment(dep());
    store.close();

    const output = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );

    expect(output).toContain("KNOWN PROVIDER ACTIVITY (newest first; incomplete)");
    expect(output).toContain("Vercel deployment: dpl_1");
    expect(output).toContain("Authority: unknown (may be stale)");
  });

  test("known-empty Neon refresh keeps retained history marked as previously recorded", () => {
    const store = openStore();
    const { neonProject } = seedMultiFamily(store);
    store.upsertNeonOperation(operation());
    store.setNeonOperationRefresh({
      resourceId: neonProject.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 0,
    lastSuccessfulObservedAt: null,
    });
    store.close();

    const output = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: neonProject.id }),
    );

    expect(output).toContain("Neon operation: op_1");
    expect(output).toContain("Authority: empty (previously recorded)");
  });

  test("Resource Changes remain temporally separate from provider activity", () => {
    const store = openStore();
    const { project } = seedMultiFamily(store);
    store.upsertVercelDeployment(dep());
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
    resultCount: null,
    lastSuccessfulObservedAt: null,
    });
    store.applyResource(
      { ...project, name: "demo-hub-renamed" },
      { id: "seed-change", observedAt: "2026-08-09T11:00:00.000Z" },
    );
    store.close();

    const output = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );

    const activityIndex = output.indexOf(
      "KNOWN PROVIDER ACTIVITY (newest first; incomplete)",
    );
    const observationsIndex = output.indexOf("COMBIE OBSERVATIONS (newest first)");
    expect(activityIndex).toBeGreaterThan(-1);
    expect(observationsIndex).toBeGreaterThan(-1);
    expect(activityIndex).toBeLessThan(observationsIndex);

    const observations = output.slice(observationsIndex);
    expect(observations).toContain("Change ID:");
    expect(observations).toContain("Observed: 2026-08-09T11:00:00.000Z");
    expect(observations).not.toContain("Vercel deployment: dpl_1");

    const activity = output.slice(activityIndex, observationsIndex);
    expect(activity).toContain("Vercel deployment: dpl_1");
    expect(activity).not.toContain("Change ID:");
  });
});
