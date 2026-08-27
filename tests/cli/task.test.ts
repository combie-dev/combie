import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listIncidentsForSubject } from "../../src/app/incidents.ts";
import { composeIncidentPrecedentMemory } from "../../src/app/incident-precedents.ts";
import { getInvestigationContext } from "../../src/app/investigate.ts";
import { listInvestigations } from "../../src/app/investigations.ts";
import { listResolutions } from "../../src/app/resolutions.ts";
import {
  composeStructuredResponseMemory,
  recordAction,
  recordDecision,
  recordOutcome,
  recordRecommendation,
} from "../../src/app/structured-response-memory.ts";
import { composeTaskContext } from "../../src/app/task-context.ts";
import { main } from "../../src/cli/index.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import { projectTaskContext } from "../../src/mcp/projections.ts";
import { safeJson } from "../../src/mcp/serialization.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

function capture(fn: () => Promise<number>): Promise<{
  code: number;
  stdout: string;
  stderr: string;
}> {
  const logs: string[] = [];
  const errs: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  console.error = (...args: unknown[]) => {
    errs.push(args.map(String).join(" "));
  };
  return fn()
    .then((code) => ({
      code,
      stdout: logs.join("\n"),
      stderr: errs.join("\n"),
    }))
    .finally(() => {
      console.log = origLog;
      console.error = origErr;
    });
}

describe("CLI investigate --task", () => {
  let dir: string;
  let subjectId: string;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "combie-cli-task-"));
    await capture(() => main(["init", "--dir", dir]));

    const repository = createResource({
      provider: "github",
      providerResourceId: "cli-task-repo",
      kind: "repository",
      name: "cli-task-repo",
      metadata: { fullName: "acme/cli-task-repo" },
    });
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj_cli_task",
      kind: "project",
      name: "cli-task-project",
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
          repository: "acme/cli-task-repo",
          githubRepoId: "cli-task-repo",
          vercelLinkType: "github",
        },
      }),
    );
    store.close();
    subjectId = repository.id;
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function expectedTaskProjection(profile: "change-review" | "dependency-impact" | "response-recall") {
    const ctx = getInvestigationContext({ baseDir: dir, resourceRef: subjectId });
    const incidentRows = listIncidentsForSubject(dir, subjectId);
    return safeJson(
      projectTaskContext(
        composeTaskContext({
          task: profile,
          ctx,
          resolutionRows: listResolutions(dir, { subjectResourceId: subjectId }),
          incidentRows,
          investigationRows: listInvestigations(dir, {
            subjectResourceId: subjectId,
          }),
          structuredResponseChains: composeStructuredResponseMemory(
            dir,
            ctx.subject.id,
          ),
          incidentPrecedentSets:
            profile === "response-recall"
              ? composeIncidentPrecedentMemory(
                  dir,
                  incidentRows.map((row) => row.id),
                )
              : [],
        }),
      ),
    );
  }

  test("change-review emits the shared task projection", async () => {
    const result = await capture(() =>
      main(["investigate", subjectId, "--task", "change-review", "--json", "--dir", dir]),
    );
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toEqual(expectedTaskProjection("change-review"));
    expect(parsed.task.profile).toBe("change-review");
    expect(parsed.subject.id).toBe(subjectId);
    expect(JSON.stringify(parsed)).not.toContain("Circular");
    expect(parsed).not.toHaveProperty("resolutionMemory");
  });

  test("dependency-impact emits the shared task projection", async () => {
    const result = await capture(() =>
      main(["investigate", subjectId, "--task", "dependency-impact", "--json", "--dir", dir]),
    );
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toEqual(expectedTaskProjection("dependency-impact"));
    expect(parsed.task.profile).toBe("dependency-impact");
    expect(parsed.related[0]).not.toHaveProperty("changes");
    expect(parsed).not.toHaveProperty("knownFacts");
  });

  test("response-recall emits the shared task projection with memory arrays", async () => {
    const result = await capture(() =>
      main(["investigate", subjectId, "--task", "response-recall", "--json", "--dir", dir]),
    );
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toEqual(expectedTaskProjection("response-recall"));
    expect(parsed.investigationHistory).toEqual([]);
    expect(parsed.resolutionMemory).toEqual([]);
    expect(parsed.incidentMemory).toEqual([]);
    expect(parsed.structuredResponseMemory).toEqual([]);
    expect(parsed.incidentPrecedentMemory).toEqual([]);
    expect(parsed.incidentResponseExperienceMemory).toEqual([]);
  });

  test("response-recall CLI JSON includes nested structuredResponseMemory for a seeded chain", async () => {
    const rec = recordRecommendation({
      baseDir: dir,
      subjectResourceId: subjectId,
      actionKey: "rollback-deployment",
      proposal: "Rollback the latest deployment",
      recordedAt: "2026-08-26T12:00:00.000Z",
    });
    const dec = recordDecision({
      baseDir: dir,
      recommendationId: rec.id,
      disposition: "approved",
      recordedAt: "2026-08-26T12:05:00.000Z",
    });
    const act = recordAction({
      baseDir: dir,
      decisionId: dec.id,
      actionKey: "rollback-deployment",
      summary: "Rolled back deployment dpl_abc",
      recordedAt: "2026-08-26T12:10:00.000Z",
    });
    recordOutcome({
      baseDir: dir,
      actionId: act.id,
      assessment: "positive",
      summary: "Error rate returned toward baseline",
      measurement: {
        metric: "error-rate",
        before: 12.4,
        after: 1.1,
        unit: "percent",
      },
      recordedAt: "2026-08-26T12:25:00.000Z",
    });

    const result = await capture(() =>
      main(["investigate", subjectId, "--task", "response-recall", "--json", "--dir", dir]),
    );
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toEqual(expectedTaskProjection("response-recall"));
    expect(parsed.structuredResponseMemory).toHaveLength(1);
    expect(parsed.structuredResponseMemory[0].recommendation.id).toBe(rec.id);
    expect(parsed.structuredResponseMemory[0].recommendation.actionKey).toBe(
      "rollback-deployment",
    );
    expect(parsed.structuredResponseMemory[0].recommendation.proposal).toBe(
      "Rollback the latest deployment",
    );
    expect(
      parsed.structuredResponseMemory[0].decisions[0].decision.disposition,
    ).toBe("approved");
    expect(
      parsed.structuredResponseMemory[0].decisions[0].actions[0].action.summary,
    ).toBe("Rolled back deployment dpl_abc");
    expect(
      parsed.structuredResponseMemory[0].decisions[0].actions[0].outcomes[0]
        .assessment,
    ).toBe("positive");
    expect(
      parsed.structuredResponseMemory[0].decisions[0].actions[0].outcomes[0]
        .measurement,
    ).toEqual({
      metric: "error-rate",
      before: 12.4,
      after: 1.1,
      unit: "percent",
    });
  });

  test("unknown profile fails with the accepted-profile list", async () => {
    const result = await capture(() =>
      main(["investigate", subjectId, "--task", "deploy-review", "--json", "--dir", dir]),
    );
    expect(result.code).toBe(1);
    expect(result.stderr).toContain(
      "change-review, dependency-impact, response-recall",
    );
  });

  test("--task requires --json", async () => {
    const result = await capture(() =>
      main(["investigate", subjectId, "--task", "change-review", "--dir", dir]),
    );
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--task requires --json");
  });

  test("--task cannot be combined with --save and writes nothing", async () => {
    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();
    const result = await capture(() =>
      main(["investigate", subjectId, "--task", "change-review", "--save", "--dir", dir]),
    );
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--task is read-only and cannot be combined with --save");
    expect(digest()).toBe(before);
  });

  test("--task without a value fails", async () => {
    const result = await capture(() =>
      main(["investigate", subjectId, "--task", "--dir", dir]),
    );
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--task requires a profile");
  });

  test("--task is rejected on commands other than investigate", async () => {
    const result = await capture(() =>
      main(["resources", "--task", "change-review", "--json", "--dir", dir]),
    );
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("--task is only available with investigate");
  });

  test("omitted --task keeps full investigate --json unchanged (no task key)", async () => {
    const result = await capture(() =>
      main(["investigate", subjectId, "--json", "--dir", dir]),
    );
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).not.toHaveProperty("task");
    expect(parsed).not.toHaveProperty("availableOnDemand");
    expect(parsed).toHaveProperty("knownFacts");
    expect(parsed).toHaveProperty("missingContext");
  });

  test("availableOnDemand is present for every profile and never contains Circular", async () => {
    for (const profile of [
      "change-review",
      "dependency-impact",
      "response-recall",
    ] as const) {
      const result = await capture(() =>
        main(["investigate", subjectId, "--task", profile, "--json", "--dir", dir]),
      );
      expect(result.code).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.availableOnDemand).toBeDefined();
      expect(Array.isArray(parsed.availableOnDemand)).toBe(true);
      expect(parsed.availableOnDemand.length).toBeGreaterThanOrEqual(1);
      expect(parsed.availableOnDemand[0]).toMatchObject({
        kind: "current-investigation",
        subjectResourceId: subjectId,
        mcp: {
          tool: "investigate_resource",
          arguments: { resourceId: subjectId },
        },
      });
      expect(JSON.stringify(parsed)).not.toContain("Circular");
    }
  });

  test("metacharacter resource id stays one inert argv element", async () => {
    const weird = createResource({
      provider: "github",
      providerResourceId: "repo$with;and\\`spaces",
      kind: "repository",
      name: "weird-repo",
      metadata: { fullName: "acme/weird-repo" },
    });
    const store = new Store(dir);
    store.init();
    store.applyResource(weird, {
      id: "weird-base",
      observedAt: "2026-08-26T08:00:00.000Z",
    });
    store.close();
    const weirdSubjectId = weird.id;

    const result = await capture(() =>
      main([
        "investigate",
        weirdSubjectId,
        "--task",
        "change-review",
        "--json",
        "--dir",
        dir,
      ]),
    );
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    const target = parsed.availableOnDemand[0];
    const argv = target.cli.argv;
    expect(Array.isArray(argv)).toBe(true);
    expect(argv.length).toBe(4);
    expect(argv[0]).toBe("combie");
    expect(argv[1]).toBe("investigate");
    expect(argv[2]).toBe(weirdSubjectId);
    expect(argv[3]).toBe("--json");
    expect(argv).toEqual(["combie", "investigate", weirdSubjectId, "--json"]);
    expect(JSON.stringify(parsed)).not.toContain("combie investigate");
    expect(target.mcp).toEqual({
      tool: "investigate_resource",
      arguments: { resourceId: weirdSubjectId },
    });
  });
});
