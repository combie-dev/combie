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
import type { VercelDeploymentEvidence } from "../../src/providers/vercel/deployment.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-inv-deploy-"));
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

function seedProject(store: Store, id = "prj_demo_hub") {
  const project = createResource({
    provider: "vercel",
    providerResourceId: id,
    kind: "project",
    name: "demo-hub",
    metadata: { accountId: "team_1" },
  });
  store.applyResource(project, {
    id: "proj-baseline",
    observedAt: "2026-08-09T08:00:00.000Z",
  });
  return project;
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
    ...overrides,
  };
}

describe("investigate deployments (Sprint 020)", () => {
  test("Vercel subject with deployments shows DEPLOYMENTS section ordered newest first", () => {
    const store = openStore();
    const project = seedProject(store);
    store.upsertVercelDeployment(
      dep({ uid: "dpl_old", createdAtMs: 1000, readyState: "ERROR" }),
    );
    store.upsertVercelDeployment(
      dep({ uid: "dpl_new", createdAtMs: 3000, readyState: "READY" }),
    );
    store.upsertVercelDeployment(
      dep({ uid: "dpl_mid", createdAtMs: 2000, readyState: "BUILDING" }),
    );
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
    });
    store.close();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("network must not be used during investigate");
    }) as unknown as typeof fetch;

    try {
      const ctx = getInvestigationContext({
        baseDir: dir,
        resourceRef: project.id,
      });
      expect(ctx.subjectDeployments.kind).toBe("populated");
      if (ctx.subjectDeployments.kind === "populated") {
        expect(ctx.subjectDeployments.deployments.map((d) => d.uid)).toEqual([
          "dpl_new",
          "dpl_mid",
          "dpl_old",
        ]);
      }

      const output = formatInvestigationContext(ctx);
      expect(output).toContain("DEPLOYMENTS (newest first)");
      expect(output).toContain("uid: dpl_new");
      expect(output).toContain("created at: ");
      expect(output).toContain("ready at: ");
      expect(output).toContain("building at: ");
      expect(output).toContain("observed by Combie at: 2026-08-09T12:00:00.000Z");
      expect(output).toContain("readyState: READY");
      // TIMELINE remains Change-only; no deployment merge language.
      expect(output).toContain("TIMELINE (newest first)");
      expect(output).not.toContain("triggered deployment");
      expect(output).not.toContain("caused by");
      expect(output.indexOf("DEPLOYMENTS (newest first)")).toBeLessThan(
        output.indexOf("TIMELINE (newest first)"),
      );
      // Ordering: dpl_new before dpl_old
      expect(output.indexOf("uid: dpl_new")).toBeLessThan(
        output.indexOf("uid: dpl_old"),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("zero deployments after successful refresh is explicit known-empty", () => {
    const store = openStore();
    const project = seedProject(store);
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
    });
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });
    expect(ctx.subjectDeployments.kind).toBe("empty");
    const output = formatInvestigationContext(ctx);
    expect(output).toContain("No deployments recorded for this project yet.");
    expect(output).not.toContain(
      "Deployment evidence has not been successfully refreshed.",
    );
  });

  test("unknown/unrefreshed deployment evidence is distinct from empty", () => {
    const store = openStore();
    const project = seedProject(store);
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });
    expect(ctx.subjectDeployments.kind).toBe("unknown");
    const output = formatInvestigationContext(ctx);
    expect(output).toContain(
      "Deployment evidence has not been successfully refreshed.",
    );
    expect(output).not.toContain(
      "No deployments recorded for this project yet.",
    );
  });

  test("failed refresh with stale deployments remains unknown and retains evidence", () => {
    const store = openStore();
    const project = seedProject(store);
    store.upsertVercelDeployment(dep({ uid: "dpl_stale" }));
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "failure",
      observedAt: "2026-08-09T13:00:00.000Z",
      message: "List deployments failed (HTTP 500)",
    });
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });
    expect(ctx.subjectDeployments.kind).toBe("unknown");
    if (ctx.subjectDeployments.kind === "unknown") {
      expect(ctx.subjectDeployments.deployments).toHaveLength(1);
    }
    const output = formatInvestigationContext(ctx);
    expect(output).toContain(
      "Deployment evidence has not been successfully refreshed.",
    );
    expect(output).toContain("Prior recorded deployments (may be stale)");
    expect(output).toContain("uid: dpl_stale");
  });

  test("one-hop related Vercel project includes deployment evidence", () => {
    const store = openStore();
    const project = seedProject(store);
    const repo = createResource({
      provider: "github",
      providerResourceId: "1001",
      kind: "repository",
      name: "demo-hub",
      metadata: { fullName: "acme/demo-hub" },
    });
    store.applyResource(repo, {
      id: "repo-baseline",
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
          repository: "acme/demo-hub",
        },
      }),
    );
    store.upsertVercelDeployment(dep({ uid: "dpl_related" }));
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
    });
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: repo.id,
    });
    expect(ctx.subjectDeployments.kind).toBe("not_applicable");
    expect(ctx.related).toHaveLength(1);
    expect(ctx.related[0]!.deployments.kind).toBe("populated");
    const output = formatInvestigationContext(ctx);
    expect(output).toContain("RELATED CONTEXT");
    expect(output).toContain("DEPLOYMENTS (newest first)");
    expect(output).toContain("uid: dpl_related");
    // No causal language linking GitHub to deployment.
    expect(output).not.toContain("triggered");
    expect(output).not.toContain("corresponds to");
  });

  test("dangling relationship does not invent deployments; Change timeline unchanged", () => {
    const store = openStore();
    const project = seedProject(store);
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: "github:repository:missing",
        targetResourceId: project.id,
        kind: "source_for",
        evidence: { source: "vercel", mechanism: "git_repository_reference" },
      }),
    );
    store.applyResource(
      {
        ...project,
        name: "demo-hub-renamed",
      },
      { id: "name-change", observedAt: "2026-08-09T09:00:00.000Z" },
    );
    store.upsertVercelDeployment(dep());
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
    });
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });
    expect(ctx.related[0]!.resource).toBeNull();
    expect(ctx.related[0]!.deployments.kind).toBe("not_applicable");
    const timeline = composeInvestigationTimeline(ctx);
    expect(timeline.entries.every((e) => e.change.kind === "updated")).toBe(
      true,
    );
    expect(timeline.entries.map((e) => e.change.id)).toEqual(["name-change"]);
    const output = formatInvestigationContext(ctx);
    expect(output).toContain("TIMELINE (newest first)");
    expect(output).toContain("Change ID: name-change");
    expect(output).toContain("DEPLOYMENTS (newest first)");
  });

  test("offline investigate does not mutate the database", () => {
    const store = openStore();
    const project = seedProject(store);
    store.upsertVercelDeployment(dep());
    store.setVercelDeploymentRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
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
        resourceRef: project.id,
      });
      const b = getInvestigationContext({
        baseDir: dir,
        resourceRef: project.id,
      });
      expect(formatInvestigationContext(a)).toBe(
        formatInvestigationContext(b),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(dbHash()).toBe(before);
  });

  test("non-Vercel subject does not show a subject DEPLOYMENTS section", () => {
    const store = openStore();
    const repo = createResource({
      provider: "github",
      providerResourceId: "9",
      kind: "repository",
      name: "solo",
      metadata: {},
    });
    store.applyResource(repo, {
      id: "r1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: repo.id,
    });
    expect(ctx.subjectDeployments.kind).toBe("not_applicable");
    const output = formatInvestigationContext(ctx);
    // Subject section should not claim deployments for a repository.
    expect(output).not.toMatch(
      /SUBJECT[\s\S]*DEPLOYMENTS \(newest first\)[\s\S]*RELATED CONTEXT/,
    );
  });
});
