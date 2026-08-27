import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { saveInvestigation } from "../../src/app/investigations.ts";
import {
  recordAction,
  recordDecision,
  recordOutcome,
  recordRecommendation,
} from "../../src/app/structured-response-memory.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

function spawnClient(dir: string) {
  const client = new Client({ name: "combie-task-test", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["run", "src/cli/index.ts", "mcp", "--dir", dir],
    cwd: process.cwd(),
    stderr: "pipe",
  });
  return { client, transport };
}

function seedTaskStore(dir: string): string {
  const repository = createResource({
    provider: "github",
    providerResourceId: "mcp-task-repo",
    kind: "repository",
    name: "mcp-task-repo",
    metadata: { fullName: "acme/mcp-task-repo" },
  });
  const project = createResource({
    provider: "vercel",
    providerResourceId: "prj_mcp_task",
    kind: "project",
    name: "mcp-task-project",
    metadata: { framework: "nextjs" },
  });
  const store = new Store(dir);
  store.init();
  store.upsertResource(repository);
  store.upsertResource(project);
  store.upsertRelationship(
    createRelationship({
      sourceResourceId: repository.id,
      targetResourceId: project.id,
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "acme/mcp-task-repo",
        githubRepoId: "mcp-task-repo",
        vercelLinkType: "github",
      },
    }),
  );
  store.close();
  return repository.id;
}

describe("MCP investigate_resource task mode", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  function oneLiner(result: { content: unknown }): string {
    return ((result.content as Array<{ type: string; text: string }>)[0]?.text) ?? "";
  }

  test("optional task enum returns a task-scoped structured result without mutating state", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-task-"));
    dirs.push(dir);
    const subjectId = seedTaskStore(dir);

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const { client, transport } = spawnClient(dir);
    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subjectId, task: "dependency-impact" },
      });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        task: { profile: "dependency-impact", subjectResourceId: subjectId },
        subject: { id: subjectId },
      });
      expect(oneLiner(result)).toContain("dependency-impact");
      const related = (result.structuredContent as { related: Array<Record<string, unknown>> }).related;
      expect(related.length).toBe(1);
      expect(related[0]).toHaveProperty("relationship");
      expect(related[0]).toHaveProperty("resource");
      expect(related[0]).not.toHaveProperty("changes");
      expect(result.structuredContent).toHaveProperty("missingContext");
      expect(result.structuredContent).not.toHaveProperty("knownFacts");
      expect(result.structuredContent).not.toHaveProperty("providerActivity");
      expect(result.structuredContent).not.toHaveProperty("timeline");
      expect(result.structuredContent).not.toHaveProperty("resolutionMemory");
      expect(result.structuredContent).not.toHaveProperty("structuredResponseMemory");
    } finally {
      await client.close();
    }

    expect(digest()).toBe(before);
  }, 15_000);

  test("response-recall returns always-present memory arrays", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-task-recall-"));
    dirs.push(dir);
    const subjectId = seedTaskStore(dir);

    const { client, transport } = spawnClient(dir);
    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subjectId, task: "response-recall" },
      });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        task: { profile: "response-recall" },
        investigationHistory: [],
        resolutionMemory: [],
        incidentMemory: [],
        structuredResponseMemory: [],
      });
      expect(result.structuredContent).not.toHaveProperty("related");
      expect(result.structuredContent).not.toHaveProperty("knownFacts");
    } finally {
      await client.close();
    }
  }, 15_000);

  test("task cannot be combined with investigationId", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-task-conflict-"));
    dirs.push(dir);
    const subjectId = seedTaskStore(dir);

    const { client, transport } = spawnClient(dir);
    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subjectId, task: "change-review", investigationId: "inv:any" },
      });
      expect(result.isError).toBe(true);
      expect(oneLiner(result)).toContain("task cannot be combined with investigationId");
    } finally {
      await client.close();
    }
  }, 15_000);

  test("task requires resourceId", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-task-noid-"));
    dirs.push(dir);
    seedTaskStore(dir);

    const { client, transport } = spawnClient(dir);
    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { task: "change-review" },
      });
      expect(result.isError).toBe(true);
      expect(oneLiner(result)).toContain("resourceId is required when task is set");
    } finally {
      await client.close();
    }
  }, 15_000);

  test("omitted task keeps the full investigation context", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-task-omit-"));
    dirs.push(dir);
    const subjectId = seedTaskStore(dir);

    const { client, transport } = spawnClient(dir);
    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subjectId },
      });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).not.toHaveProperty("task");
      expect(result.structuredContent).not.toHaveProperty("availableOnDemand");
      expect(result.structuredContent).toHaveProperty("knownFacts");
    } finally {
      await client.close();
    }
  }, 15_000);

  test("dependency-impact exposes a single current on-demand target", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-task-ondemand-"));
    dirs.push(dir);
    const subjectId = seedTaskStore(dir);

    const { client, transport } = spawnClient(dir);
    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subjectId, task: "dependency-impact" },
      });
      expect(result.isError).not.toBe(true);
      const targets = (
        result.structuredContent as {
          availableOnDemand: Array<Record<string, unknown>>;
        }
      ).availableOnDemand;
      expect(targets).toHaveLength(1);
      expect(targets[0]?.kind).toBe("current-investigation");
      const mcp = targets[0]?.mcp as {
        tool: string;
        arguments: Record<string, unknown>;
      };
      expect(mcp.tool).toBe("investigate_resource");
      expect(Object.keys(mcp.arguments)).toEqual(["resourceId"]);
      expect(mcp.arguments.resourceId).toBe(subjectId);
    } finally {
      await client.close();
    }
  }, 15_000);

  test("response-recall retained target carries the seeded investigation handle", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-task-retained-"));
    dirs.push(dir);
    const subjectId = seedTaskStore(dir);
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectId,
      composedAt: "2026-08-26T09:00:00.000Z",
    });

    const { client, transport } = spawnClient(dir);
    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subjectId, task: "response-recall" },
      });
      expect(result.isError).not.toBe(true);
      const targets = (
        result.structuredContent as {
          availableOnDemand: Array<Record<string, unknown>>;
        }
      ).availableOnDemand;
      expect(targets).toHaveLength(2);
      expect(targets[0]?.kind).toBe("current-investigation");

      const retained = targets[1] as Record<string, unknown>;
      expect(retained.kind).toBe("retained-investigation");
      const mcp = retained.mcp as {
        tool: string;
        arguments: Record<string, unknown>;
        returns: string;
      };
      expect(mcp.tool).toBe("investigate_resource");
      expect(mcp.arguments.investigationId).toBe(saved.record.id);
      expect(mcp.returns).toBe("retained-snapshot-handle");
      const cli = retained.cli as { argv: string[] };
      expect(cli.argv).toEqual(["combie", "investigation", saved.record.id]);
    } finally {
      await client.close();
    }
  }, 15_000);

  test("response-recall returns nested structuredResponseMemory for a seeded chain", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-task-srm-"));
    dirs.push(dir);
    const subjectId = seedTaskStore(dir);
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

    const { client, transport } = spawnClient(dir);
    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subjectId, task: "response-recall" },
      });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        task: { profile: "response-recall", subjectResourceId: subjectId },
      });
      const memory = (
        result.structuredContent as {
          structuredResponseMemory: Array<{
            recommendation: {
              id: string;
              actionKey: string;
              proposal: string;
            };
            decisions: Array<{
              decision: { disposition: string };
              actions: Array<{
                action: { summary: string };
                outcomes: Array<{
                  assessment: string;
                  measurement: Record<string, unknown>;
                }>;
              }>;
            }>;
          }>;
        }
      ).structuredResponseMemory;
      expect(memory).toHaveLength(1);
      expect(memory[0]!.recommendation.id.startsWith("rec:")).toBe(true);
      expect(memory[0]!.recommendation.id).toBe(rec.id);
      expect(memory[0]!.recommendation.actionKey).toBe("rollback-deployment");
      expect(memory[0]!.recommendation.proposal).toBe(
        "Rollback the latest deployment",
      );
      expect(memory[0]!.decisions[0]!.decision.disposition).toBe("approved");
      expect(memory[0]!.decisions[0]!.actions[0]!.action.summary).toBe(
        "Rolled back deployment dpl_abc",
      );
      expect(memory[0]!.decisions[0]!.actions[0]!.outcomes[0]!.assessment).toBe(
        "positive",
      );
      expect(memory[0]!.decisions[0]!.actions[0]!.outcomes[0]!.measurement).toEqual(
        {
          metric: "error-rate",
          before: 12.4,
          after: 1.1,
          unit: "percent",
        },
      );

      const change = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subjectId, task: "change-review" },
      });
      expect(change.isError).not.toBe(true);
      expect(change.structuredContent).not.toHaveProperty(
        "structuredResponseMemory",
      );
    } finally {
      await client.close();
    }
  }, 15_000);
});
