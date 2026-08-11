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

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-inv-related-context-"));
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

function repo(overrides: Partial<ReturnType<typeof createResource>> = {}) {
  return createResource({
    provider: "github",
    providerResourceId: "915052094",
    kind: "repository",
    name: "demo-hub",
    metadata: { fullName: "sgr0691/demo-hub" },
    ...overrides,
  });
}

function project(overrides: Partial<ReturnType<typeof createResource>> = {}) {
  return createResource({
    provider: "vercel",
    providerResourceId: "prj_demo_hub",
    kind: "project",
    name: "demo-hub",
    metadata: { framework: "nextjs", domains: ["app.example.com"] },
    ...overrides,
  });
}

function zone(overrides: Partial<ReturnType<typeof createResource>> = {}) {
  return createResource({
    provider: "cloudflare",
    providerResourceId: "zone_example",
    kind: "zone",
    name: "example.com",
    metadata: { status: "active" },
    ...overrides,
  });
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
    headSha: "abc123",
    createdAt: "2026-08-09T10:00:00.000Z",
    runStartedAt: "2026-08-09T10:00:05.000Z",
    updatedAt: "2026-08-09T10:05:00.000Z",
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
    readyState: "READY",
    state: "READY",
    target: "production",
    createdAtMs: 1723201000000,
    buildingAtMs: 1723201005000,
    readyAtMs: 1723201300000,
    observedAt: "2026-08-09T12:00:00.000Z",
    source: "git",
    gitCommitSha: null,
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

interface Seeded {
  repository: ReturnType<typeof repo>;
  project: ReturnType<typeof project>;
  zone: ReturnType<typeof zone>;
}

/** Repo source_for project, project uses_domain_in zone. */
function seedHubNeighbors(store: Store): Seeded {
  const resources = {
    repository: repo(),
    project: project(),
    zone: zone(),
  };
  store.applyResource(resources.repository, {
    id: "repo-base",
    observedAt: "2026-08-09T08:00:00.000Z",
  });
  store.applyResource(resources.project, {
    id: "proj-base",
    observedAt: "2026-08-09T08:00:00.000Z",
  });
  store.applyResource(resources.zone, {
    id: "zone-base",
    observedAt: "2026-08-09T08:00:00.000Z",
  });
  store.upsertRelationship(
    createRelationship({
      sourceResourceId: resources.repository.id,
      targetResourceId: resources.project.id,
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "sgr0691/demo-hub",
        githubRepoId: "915052094",
        vercelLinkType: "github",
      },
    }),
  );
  store.upsertRelationship(
    createRelationship({
      sourceResourceId: resources.project.id,
      targetResourceId: resources.zone.id,
      kind: "uses_domain_in",
      evidence: {
        source: "vercel",
        mechanism: "custom_domain_apex",
        apexName: "example.com",
        hostnames: ["app.example.com"],
      },
    }),
  );
  return resources;
}

function relatedSlice(output: string): string {
  return output.slice(
    output.indexOf("RELATED CONTEXT"),
    output.indexOf("KNOWN PROVIDER ACTIVITY"),
  );
}

function detailedSlice(output: string): string {
  return output.slice(output.indexOf("DETAILED EVIDENCE"));
}

describe("investigate RELATED CONTEXT compact one-hop index (Sprint 036)", () => {
  test("single neighbor: identity, kind, direction, counts; no nested dumps", () => {
    const store = openStore();
    const { repository, project } = seedHubNeighbors(store);
    store.applyResource(
      { ...repository, metadata: { fullName: "sgr0691/demo-hub", private: true } },
      { id: "repo-change", observedAt: "2026-08-09T09:00:00.000Z" },
    );
    store.upsertGitHubWorkflowRun(run());
    store.upsertGitHubWorkflowRun(run({ runId: 9002 }));
    store.setGitHubWorkflowRunRefresh({
      resourceId: repository.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 2,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.close();

    const output = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    const related = relatedSlice(output);
    const detailed = detailedSlice(output);

    // Neighbor identity: provider, kind, display name, stable id.
    expect(related).toContain("GitHub repository: sgr0691/demo-hub");
    expect(related).toContain(repository.id);
    // Exact Relationship kind + inbound direction.
    expect(related).toContain("← source_for");
    // Relationship provenance remains inline.
    expect(related).toContain("git_repository_reference");
    expect(related).toContain('githubRepoId="915052094"');
    // Compact counts: known Change records and retained workflow-run rows.
    expect(related).toContain("changes=1");
    expect(related).toContain("workflowRuns=2");
    // No full nested evidence cards, no Change dump, no full authority marker.
    expect(related).not.toContain("run id:");
    expect(related).not.toContain("Observed: 2026-08-09T09:00:00.000Z");
    expect(related).not.toContain("CHANGES");
    expect(related).not.toContain("latest successful response returned 2");
    // Subject's own id is not rendered as a neighbor identity.
    expect(related).not.toContain("Vercel project: demo-hub");

    // Full cards remain available under DETAILED EVIDENCE after OBSERVATIONS.
    expect(detailed).toContain("DETAILED EVIDENCE");
    expect(detailed).toContain("WORKFLOW RUNS (newest first)");
    expect(detailed).toContain("run id: 9001");
    expect(detailed).toContain("run id: 9002");
    expect(detailed).toContain("started at: 2026-08-09T10:00:05.000Z");
    expect(detailed).toContain("observed by Combie at: 2026-08-09T12:00:00.000Z");
    expect(detailed).toContain("head sha: abc123");
    expect(output.indexOf("RELATED CONTEXT")).toBeLessThan(
      output.indexOf("COMBIE OBSERVATIONS"),
    );
    expect(output.indexOf("COMBIE OBSERVATIONS")).toBeLessThan(
      output.indexOf("DETAILED EVIDENCE"),
    );
  });

  test("multiple neighbors: every neighbor rendered, deterministic, uncapped, unranked", () => {
    const store = openStore();
    const { project, zone } = seedHubNeighbors(store);
    store.close();

    const output = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    const related = relatedSlice(output);

    // Both one-hop neighbors present (GitHub repo + Cloudflare zone).
    expect(related).toContain("GitHub repository: sgr0691/demo-hub");
    expect(related).toContain("Cloudflare zone: example.com");
    expect(related).toContain("← source_for");
    expect(related).toContain("uses_domain_in →");
    // Store canonical order is preserved (kind, source, target) —
    // the zone (changes=0) must not be promoted above the repository.
    expect(related.indexOf("GitHub repository: sgr0691/demo-hub")).toBeLessThan(
      related.indexOf("Cloudflare zone: example.com"),
    );
    expect(related).toContain("changes=0");
  });

  test("multiple Relationships to one neighbor: all edges kept, no identity duplication", () => {
    const store = openStore();
    const { repository, project } = seedHubNeighbors(store);
    // Second canonical edge between the same pair.
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: repository.id,
        targetResourceId: project.id,
        kind: "uses_domain_in",
        evidence: {
          source: "vercel",
          mechanism: "custom_domain_apex",
          apexName: "demo-hub.example.com",
          hostnames: ["demo-hub.example.com"],
        },
      }),
    );
    store.close();

    const output = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    const related = relatedSlice(output);

    // Both Relationship kinds retained, not merged.
    expect(related).toContain("← source_for");
    expect(related).toContain("← uses_domain_in");
    // Both provenance payloads present.
    expect(related).toContain("git_repository_reference");
    expect(related).toContain("custom_domain_apex");
    // Neighbor identity printed once (single block).
    expect(related.match(/GitHub repository: sgr0691\/demo-hub/g)).toHaveLength(1);
    expect(related.match(new RegExp(repository.id, "g"))?.length ?? 0).toBe(1);
  });

  test("change counts are plain counts; no significance wording or count ordering", () => {
    const store = openStore();
    const { repository, project, zone } = seedHubNeighbors(store);
    store.applyResource(
      { ...repository, metadata: { fullName: "sgr0691/demo-hub", private: true } },
      { id: "repo-change", observedAt: "2026-08-09T09:00:00.000Z" },
    );
    store.close();

    const output = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    const related = relatedSlice(output);
    expect(related).toContain("changes=1");
    expect(related).toContain("changes=0");
    expect(related).not.toContain("important");
    expect(related).not.toContain("most recent");
    // 0-change zone stays after 1-change repo (store order, not count order).
    expect(related.indexOf("GitHub repository: sgr0691/demo-hub")).toBeLessThan(
      related.indexOf("Cloudflare zone: example.com"),
    );
  });

  test("evidence summary truthfulness: only applicable families; known-empty stays knowledge", () => {
    const store = openStore();
    const { repository, project } = seedHubNeighbors(store);
    // Vercel neighbor of the GitHub subject: known-empty deployments
    // (latest successful refresh returned 0).
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 0,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.close();

    const output = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: repository.id }),
    );
    const related = relatedSlice(output);
    // Subject GitHub repository sees its Vercel neighbor with known-empty deployments.
    expect(related).toContain("deployments=0 · authority=empty");
    // No zero-field noise: unsupported families stay silent on the neighbor block.
    expect(related).not.toContain("workflowRuns");
    expect(related).not.toContain("operations");
  });

  test("unknown authority with retained rows is qualified and never looks current", () => {
    const store = openStore();
    const { repository, project } = seedHubNeighbors(store);
    store.upsertGitHubWorkflowRun(run());
    store.upsertGitHubWorkflowRun(run({ runId: 9002 }));
    // Refresh failed: unknown authority with retained rows.
    store.setGitHubWorkflowRunRefresh({
      resourceId: repository.id,
      status: "failure",
      observedAt: "2026-08-09T13:00:00.000Z",
      message: "List workflow runs failed",
      resultCount: null,
      lastSuccessfulObservedAt: null,
    });
    store.close();

    const output = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    const related = relatedSlice(output);
    expect(related).toContain("workflowRuns=2 retained");
    expect(related).toContain("authority=unknown");
    // No false current-row semantics, no Missing Context prose duplication.
    expect(related).not.toContain("current workflow run");
    expect(related).not.toContain("latest attempt");
    expect(related).not.toContain("last successful refresh");
    expect(related).not.toContain("returned 2");
    // Missing Context still owns the explanation.
    expect(output).toContain("MISSING CONTEXT");
  });

  test("never-successfully-refreshed neighbor shows no evidence token", () => {
    const store = openStore();
    const { project, zone } = seedHubNeighbors(store);
    store.close();

    const output = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    const related = relatedSlice(output);
    // Zone neighbor has no refresh and no evidence family.
    const zoneBlock = related.slice(related.indexOf("Cloudflare zone: example.com"));
    expect(zoneBlock).not.toContain("workflowRuns");
    expect(zoneBlock).not.toContain("deployments");
    expect(zoneBlock).not.toContain("authority=");
    expect(zoneBlock).toContain("changes=0");
  });

  test("known-empty evidence is knowledge, not missing context", () => {
    const store = openStore();
    const { repository, project } = seedHubNeighbors(store);
    // GitHub neighbor of the Vercel subject: known-empty workflow runs.
    store.setGitHubWorkflowRunRefresh({
      resourceId: repository.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 0,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.close();

    const output = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    const related = relatedSlice(output);
    expect(related).toContain("workflowRuns=0 · authority=empty");
  });

  test("dangling Relationship preserved with compact truthful identity", () => {
    const store = openStore();
    const { project } = seedHubNeighbors(store);
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: "github:repository:gone",
        targetResourceId: project.id,
        kind: "source_for",
        evidence: { source: "vercel", mechanism: "git_repository_reference" },
      }),
    );
    store.close();

    const output = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    const related = relatedSlice(output);
    expect(related).toContain("← source_for");
    expect(related).toContain("github:repository:gone");
    expect(related).toContain("(missing resource)");
    expect(related).toContain("git_repository_reference");
    // No made-up counts for the missing neighbor block itself.
    const danglingBlock = related.slice(
      related.indexOf("github:repository:gone"),
      related.indexOf("Cloudflare zone: example.com"),
    );
    expect(danglingBlock).not.toContain("changes=");
    expect(danglingBlock).not.toContain("workflowRuns");
    // No DETAILED EVIDENCE block for the dangling edge.
    expect(output.indexOf("DETAILED EVIDENCE")).toBe(-1);
  });

  test("uses_domain_in relationship evidence remains traceable", () => {
    const store = openStore();
    const { project, zone } = seedHubNeighbors(store);
    store.close();

    const output = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: project.id }),
    );
    const related = relatedSlice(output);
    expect(related).toContain("uses_domain_in →");
    expect(related).toContain("custom_domain_apex");
    expect(related).toContain('apexName="example.com"');
    expect(related).toContain('hostnames=["app.example.com"]');
  });

  test("DETAILED EVIDENCE holds counterpart neighbor cards across families", () => {
    const store = openStore();
    const { repository, project } = seedHubNeighbors(store);
    const neonProject = createResource({
      provider: "neon",
      providerResourceId: "neon_demo",
      kind: "project",
      name: "demo-db",
      metadata: {},
    });
    store.applyResource(neonProject, {
      id: "neon-base",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: project.id,
        targetResourceId: neonProject.id,
        kind: "uses_domain_in",
        evidence: {
          source: "vercel",
          mechanism: "custom_domain_match",
          apexName: "db.example.com",
          hostnames: ["db.example.com"],
        },
      }),
    );
    store.upsertGitHubWorkflowRun(run());
    store.setGitHubWorkflowRunRefresh({
      resourceId: repository.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.upsertNeonOperation(operation());
    store.setNeonOperationRefresh({
      resourceId: neonProject.id,
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
    const detailed = detailedSlice(output);
    // Neighbor cards for workflow runs and operations appear with identities.
    expect(detailed).toContain("GitHub repository: sgr0691/demo-hub");
    expect(detailed).toContain("Neon project: demo-db");
    expect(detailed).toContain("WORKFLOW RUNS (newest first)");
    expect(detailed).toContain("run id: 9001");
    expect(detailed).toContain("OPERATIONS (newest first)");
    expect(detailed).toContain("operation id: op_1");
    expect(detailed).toContain("status updated at:");
    // No neighbor cards inside the compact Related Context.
    const related = relatedSlice(output);
    expect(related).not.toContain("run id:");
    expect(related).not.toContain("operation id:");
  });

  test("offline, read-only, deterministic", () => {
    const store = openStore();
    const { project } = seedHubNeighbors(store);
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
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(dbHash()).toBe(before);
  });
});