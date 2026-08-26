import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CombieError } from "../../src/app/errors.ts";
import { initCombie } from "../../src/app/init.ts";
import {
  getInvestigationContext,
  type InvestigationContext,
} from "../../src/app/investigate.ts";
import {
  composeTaskContext,
  isTaskProfile,
  normalizeTaskProfile,
  TASK_PROFILES,
  type TaskScopedContext,
} from "../../src/app/task-context.ts";
import { listIncidentsForSubject, recordIncident } from "../../src/app/incidents.ts";
import {
  listInvestigations,
  saveInvestigation,
} from "../../src/app/investigations.ts";
import { recordResolution } from "../../src/app/resolutions.ts";
import { listResolutions } from "../../src/app/resolutions.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import { projectTaskContext } from "../../src/mcp/projections.ts";
import { safeJson } from "../../src/mcp/serialization.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

describe("task profiles", () => {
  test("accepts exactly the three explicit profiles", () => {
    expect(TASK_PROFILES).toEqual([
      "change-review",
      "dependency-impact",
      "response-recall",
    ]);
    for (const profile of TASK_PROFILES) {
      expect(isTaskProfile(profile)).toBe(true);
      expect(normalizeTaskProfile(profile)).toBe(profile);
    }
    expect(isTaskProfile("fix-this")).toBe(false);
    expect(isTaskProfile("")).toBe(false);
    expect(isTaskProfile(42)).toBe(false);
  });

  test("unknown profile fails with one stable actionable error", () => {
    let caught: CombieError | undefined;
    try {
      normalizeTaskProfile("deploy-review");
    } catch (err) {
      caught = err as CombieError;
    }
    expect(caught).toBeDefined();
    expect(caught!.code).toBe("TASK_PROFILE_UNKNOWN");
    expect(caught!.message).toContain(
      "change-review, dependency-impact, response-recall",
    );
  });
});

describe("task-scoped deterministic composition", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "combie-task-context-"));
    initCombie(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function seedEdgeStore(): {
    repository: ReturnType<typeof createResource>;
    project: ReturnType<typeof createResource>;
  } {
    const repository = createResource({
      provider: "github",
      providerResourceId: "repo-task",
      kind: "repository",
      name: "task-repo",
      metadata: { fullName: "acme/task-repo" },
    });
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj_task",
      kind: "project",
      name: "task-project",
      metadata: { framework: "nextjs" },
    });
    const store = new Store(dir);
    store.init();
    store.applyResource(repository, {
      id: "repo-base",
      observedAt: "2026-08-26T08:00:00.000Z",
    });
    store.applyResource(project, {
      id: "project-base",
      observedAt: "2026-08-26T08:00:00.000Z",
    });
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: repository.id,
        targetResourceId: project.id,
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "acme/task-repo",
          githubRepoId: "repo-task",
          vercelLinkType: "github",
        },
      }),
    );
    store.close();
    return { repository, project };
  }

  function compose(profile: TaskScopedContext["task"]["profile"]) {
    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: "github:repository:repo-task",
    });
    return composeTaskContext({
      task: profile,
      ctx,
      resolutionRows: listResolutions(dir, {
        subjectResourceId: ctx.subject.id,
      }),
      incidentRows: listIncidentsForSubject(dir, ctx.subject.id),
      investigationRows: listInvestigations(dir, {
        subjectResourceId: ctx.subject.id,
      }),
    });
  }

  function changeReviewSections(tc: TaskScopedContext) {
    if (tc.profile !== "change-review") {
      throw new Error(`Expected change-review, got ${tc.profile}`);
    }
    return {
      subjectChanges: tc.subjectChanges,
      knownFacts: tc.knownFacts,
      missingContext: tc.missingContext,
      providerActivity: tc.providerActivity,
      timeline: tc.timeline,
      sharedCommitContext: tc.sharedCommitContext,
      sharedCommitCorrespondences: tc.sharedCommitCorrespondences,
    };
  }

  test("change-review selects evidence sections and excludes memory", () => {
    seedEdgeStore();
    const tc = compose("change-review");
    expect(tc.task).toEqual({
      profile: "change-review",
      subjectResourceId: "github:repository:repo-task",
    });
    const sections = changeReviewSections(tc);
    for (const value of Object.values(sections)) {
      expect(value).toBeDefined();
    }
    expect("ctx" in tc).toBe(false);
    expect("investigationHistory" in tc).toBe(false);
    expect("resolutionMemory" in tc).toBe(false);
    expect("incidentMemory" in tc).toBe(false);
  });

  test("dependency-impact selects only restricted Missing Context", () => {
    seedEdgeStore();
    const tc = compose("dependency-impact");
    if (tc.profile !== "dependency-impact") throw new Error("wrong profile");
    expect(tc.task.profile).toBe("dependency-impact");
    expect(tc.missingContext).toBeDefined();
    expect("ctx" in tc).toBe(false);
    expect(tc.related).toHaveLength(1);
    expect(tc.related[0]).not.toHaveProperty("changes");
    expect(tc.related[0]).not.toHaveProperty("deployments");
    expect(tc.related[0]?.resource).not.toHaveProperty("metadata");
    expect("subjectChanges" in tc).toBe(false);
    expect("knownFacts" in tc).toBe(false);
    expect("providerActivity" in tc).toBe(false);
    expect("timeline" in tc).toBe(false);
    expect("sharedCommitContext" in tc).toBe(false);
    expect("sharedCommitCorrespondences" in tc).toBe(false);
    expect("investigationHistory" in tc).toBe(false);
    expect("resolutionMemory" in tc).toBe(false);
    expect("incidentMemory" in tc).toBe(false);
  });

  test("response-recall selects memory arrays and excludes live sections", () => {
    seedEdgeStore();
    const tc = compose("response-recall");
    if (tc.profile !== "response-recall") throw new Error("wrong profile");
    expect(tc.task.profile).toBe("response-recall");
    expect("ctx" in tc).toBe(false);
    expect(tc.investigationHistory).toBeDefined();
    expect(tc.resolutionMemory).toBeDefined();
    expect(tc.incidentMemory).toBeDefined();
    expect("subjectChanges" in tc).toBe(false);
    expect("knownFacts" in tc).toBe(false);
    expect("missingContext" in tc).toBe(false);
    expect("providerActivity" in tc).toBe(false);
    expect("timeline" in tc).toBe(false);
    expect("sharedCommitContext" in tc).toBe(false);
  });

  test("dependency-impact Missing Context is restricted to graph/authority kinds", () => {
    seedEdgeStore();
    const dependency = compose("dependency-impact");
    const change = compose("change-review");
    if (dependency.profile !== "dependency-impact") throw new Error("wrong profile");
    if (change.profile !== "change-review") throw new Error("wrong profile");

    const dependencyKinds = new Set(
      dependency.missingContext.map((item) => item.kind),
    );
    const changeKinds = new Set(
      change.missingContext.map((item) => item.kind),
    );

    // change-review keeps the complete composer set (including the
    // never-successfully-refreshed workflow-run / issue families for the
    // un-synced GitHub repository subject).
    expect(changeKinds.has("never_successfully_refreshed")).toBe(true);
    // dependency-impact drops provider evidence-family freshness gaps.
    expect(dependencyKinds.has("never_successfully_refreshed")).toBe(false);

    for (const kind of dependencyKinds) {
      expect([
        "no_known_relationships",
        "unknown_relationship_authority",
        "unknown_provider_sync_authority",
        "not_in_last_successful_discovery",
        "code_mapping_refresh_unknown",
        "code_mapping_unmatched_repository",
      ]).toContain(kind);
    }
  });

  test("every profile leads with the current-investigation target", () => {
    seedEdgeStore();
    for (const profile of TASK_PROFILES) {
      const tc = compose(profile);
      expect(tc.onDemandTargets[0]).toEqual({
        kind: "current-investigation",
        subjectResourceId: "github:repository:repo-task",
      });
    }
  });

  test("change-review and dependency-impact emit exactly one target", () => {
    seedEdgeStore();
    expect(compose("change-review").onDemandTargets).toHaveLength(1);
    expect(compose("dependency-impact").onDemandTargets).toHaveLength(1);
  });

  test("response-recall with empty history emits exactly one target", () => {
    seedEdgeStore();
    const tc = compose("response-recall");
    if (tc.profile !== "response-recall") throw new Error("wrong profile");
    expect(tc.onDemandTargets).toHaveLength(1);
    expect(tc.onDemandTargets[0]).toEqual({
      kind: "current-investigation",
      subjectResourceId: "github:repository:repo-task",
    });
  });

  test("response-recall seeds retained targets in history order after current target", () => {
    seedEdgeStore();
    saveInvestigation({
      baseDir: dir,
      resourceRef: "github:repository:repo-task",
      composedAt: "2026-08-26T09:00:00.000Z",
    });
    saveInvestigation({
      baseDir: dir,
      resourceRef: "github:repository:repo-task",
      composedAt: "2026-08-26T09:30:00.000Z",
    });
    const rows = listInvestigations(dir, {
      subjectResourceId: "github:repository:repo-task",
    });
    expect(rows).toHaveLength(2);

    const tc = compose("response-recall");
    if (tc.profile !== "response-recall") throw new Error("wrong profile");
    expect(tc.onDemandTargets).toHaveLength(3);
    expect(tc.onDemandTargets[0]).toEqual({
      kind: "current-investigation",
      subjectResourceId: "github:repository:repo-task",
    });
    rows.forEach((row, i) => {
      expect(tc.onDemandTargets[i + 1]).toEqual({
        kind: "retained-investigation",
        investigationId: row.id,
        subjectResourceId: row.subjectResourceId,
        composedAt: row.composedAt,
      });
    });
    expect(tc.investigationHistory.map((r) => r.id)).toEqual(
      rows.map((r) => r.id),
    );
  });

  test("change-review and dependency-impact targets carry no investigationId", () => {
    seedEdgeStore();
    saveInvestigation({
      baseDir: dir,
      resourceRef: "github:repository:repo-task",
      composedAt: "2026-08-26T09:00:00.000Z",
    });
    for (const profile of ["change-review", "dependency-impact"] as const) {
      const tc = compose(profile);
      for (const target of tc.onDemandTargets) {
        expect(target).not.toHaveProperty("investigationId");
      }
    }
  });

  test("core targets carry no retrieval syntax", () => {
    seedEdgeStore();
    saveInvestigation({
      baseDir: dir,
      resourceRef: "github:repository:repo-task",
      composedAt: "2026-08-26T09:00:00.000Z",
    });
    for (const profile of TASK_PROFILES) {
      const tc = compose(profile);
      const serialized = JSON.stringify(tc.onDemandTargets);
      expect(serialized).not.toContain("combie");
      expect(serialized).not.toContain("investigate_resource");
      expect(serialized).not.toContain("argv");
      expect(serialized).not.toContain("cli");
    }
  });
});

describe("task-scoped projection", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "combie-task-project-"));
    initCombie(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function seedGraphWithChanges(): {
    repository: ReturnType<typeof createResource>;
    project: ReturnType<typeof createResource>;
  } {
    const repository = createResource({
      provider: "github",
      providerResourceId: "repo-proj",
      kind: "repository",
      name: "proj-repo",
      metadata: { fullName: "acme/proj-repo" },
    });
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj_proj",
      kind: "project",
      name: "proj-project",
      metadata: { framework: "nextjs" },
    });
    const store = new Store(dir);
    store.init();
    store.applyResource(repository, {
      id: "repo-base",
      observedAt: "2026-08-26T08:00:00.000Z",
    });
    store.applyResource(project, {
      id: "project-base",
      observedAt: "2026-08-26T08:00:00.000Z",
    });
    store.applyResource(
      { ...project, name: "proj-project-renamed" },
      { id: "project-change", observedAt: "2026-08-26T10:00:00.000Z" },
    );
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: repository.id,
        targetResourceId: project.id,
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "acme/proj-repo",
          githubRepoId: "repo-proj",
          vercelLinkType: "github",
        },
      }),
    );
    store.close();
    return { repository, project };
  }

  function projectFor(profile: TaskScopedContext["task"]["profile"]) {
    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: "github:repository:repo-proj",
    });
    const tc = composeTaskContext({
      task: profile,
      ctx,
      resolutionRows: listResolutions(dir, {
        subjectResourceId: ctx.subject.id,
      }),
      incidentRows: listIncidentsForSubject(dir, ctx.subject.id),
      investigationRows: listInvestigations(dir, {
        subjectResourceId: ctx.subject.id,
      }),
    });
    return projectTaskContext(tc);
  }

  test("envelope pins task.profile and subjectResourceId == subject.id", () => {
    seedGraphWithChanges();
    const projected = projectFor("change-review");
    expect(projected.task).toEqual({
      profile: "change-review",
      subjectResourceId: "github:repository:repo-proj",
    });
    expect((projected.task as { subjectResourceId: string }).subjectResourceId).toBe(
      (projected.subject as { id: string }).id,
    );
  });

  test("change-review keeps full related neighbors with changes", () => {
    seedGraphWithChanges();
    const projected = projectFor("change-review");
    expect(projected).toHaveProperty("subjectChanges");
    expect(projected).toHaveProperty("knownFacts");
    expect(projected).toHaveProperty("missingContext");
    expect(projected).toHaveProperty("providerActivity");
    expect(projected).toHaveProperty("timeline");
    expect(projected).toHaveProperty("sharedCommitContext");
    expect(projected).toHaveProperty("sharedCommitCorrespondences");
    expect(projected).not.toHaveProperty("investigationHistory");
    expect(projected).not.toHaveProperty("resolutionMemory");
    expect(projected).not.toHaveProperty("incidentMemory");

    const related = projected.related as Array<Record<string, unknown>>;
    expect(related.length).toBe(1);
    expect(related[0]).toHaveProperty("changes");
    expect(related[0]).toHaveProperty("deployments");
    expect(related[0]).toHaveProperty("workflowRuns");
  });

  test("dependency-impact renders thin related without changes or evidence", () => {
    seedGraphWithChanges();
    const projected = projectFor("dependency-impact");
    expect(projected).toHaveProperty("missingContext");
    expect(projected).not.toHaveProperty("subjectChanges");
    expect(projected).not.toHaveProperty("knownFacts");
    expect(projected).not.toHaveProperty("providerActivity");
    expect(projected).not.toHaveProperty("timeline");
    expect(projected).not.toHaveProperty("sharedCommitContext");

    const related = projected.related as Array<Record<string, unknown>>;
    expect(related.length).toBe(1);
    expect(related[0]).toHaveProperty("direction");
    expect(related[0]).toHaveProperty("relationship");
    expect(related[0]).toHaveProperty("resource");
    expect(related[0]).not.toHaveProperty("changes");
    expect(related[0]).not.toHaveProperty("deployments");
    expect(related[0]).not.toHaveProperty("workflowRuns");
  });

  test("response-recall arrays are always present and known-empty is []", () => {
    seedGraphWithChanges();
    const projected = projectFor("response-recall");
    expect(projected.investigationHistory).toEqual([]);
    expect(projected.resolutionMemory).toEqual([]);
    expect(projected.incidentMemory).toEqual([]);
    expect(projected).not.toHaveProperty("related");
    expect(projected).not.toHaveProperty("subjectChanges");
    expect(projected).not.toHaveProperty("knownFacts");
    expect(projected).not.toHaveProperty("missingContext");
  });

  test("response-recall projects retained Resolution and Incident records", () => {
    seedGraphWithChanges();
    const subjectId = "github:repository:repo-proj";
    const r1 = recordResolution({
      baseDir: dir,
      subjectResourceId: subjectId,
      decision: "Rollback",
      action: "Reverted deployment",
      outcome: "Errors returned to baseline",
      recordedAt: "2026-08-26T11:00:00.000Z",
    });
    const r2 = recordResolution({
      baseDir: dir,
      subjectResourceId: subjectId,
      decision: "Keep holding",
      recordedAt: "2026-08-26T11:30:00.000Z",
    });
    recordIncident({
      baseDir: dir,
      resolutionIds: [r1.id, r2.id],
      title: "API error spike",
      recordedAt: "2026-08-26T12:00:00.000Z",
    });

    const ctx = getInvestigationContext({ baseDir: dir, resourceRef: subjectId });
    const tc = composeTaskContext({
      task: "response-recall",
      ctx,
      resolutionRows: listResolutions(dir, { subjectResourceId: subjectId }),
      incidentRows: listIncidentsForSubject(dir, subjectId),
      investigationRows: listInvestigations(dir, { subjectResourceId: subjectId }),
    });
    const projected = projectTaskContext(tc);

    expect(projected.resolutionMemory).toHaveLength(2);
    const resolutions = projected.resolutionMemory as Array<Record<string, unknown>>;
    const rollback = resolutions.find((row) => row.decision === "Rollback");
    expect(rollback).toBeDefined();
    expect(rollback).toMatchObject({
      action: "Reverted deployment",
      outcome: "Errors returned to baseline",
    });
    expect(projected.incidentMemory).toHaveLength(1);
    const incident = (projected.incidentMemory as Array<Record<string, unknown>>)[0]!;
    expect(incident).toMatchObject({
      title: "API error spike",
      resolutionIds: [r1.id, r2.id],
    });
  });

  test("all profiles serialize whole-document with no Circular placeholder", () => {
    seedGraphWithChanges();
    for (const profile of TASK_PROFILES) {
      const serialized = JSON.stringify(safeJson(projectFor(profile)));
      expect(serialized).not.toContain("Circular");
    }
  });

  test("task composition is read-only (database bytes unchanged)", () => {
    seedGraphWithChanges();
    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();
    for (const profile of TASK_PROFILES) {
      projectFor(profile);
    }
    expect(digest()).toBe(before);
  });
});
