import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { saveInvestigation } from "../../src/app/investigations.ts";
import { recordResolution } from "../../src/app/resolutions.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

describe("MCP stdio contract", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("discovers exactly four read-only tools and returns full investigation context without mutating state", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-"));
    dirs.push(dir);
    const store = new Store(dir);
    store.init();
    store.upsertResource(
      createResource({
        provider: "github",
        providerResourceId: "123",
        kind: "repository",
        name: "example/repo",
        metadata: { fullName: "example/repo" },
      }),
    );
    store.close();

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test", version: "1.0.0" });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["run", "src/cli/index.ts", "mcp", "--dir", dir],
      cwd: process.cwd(),
      stderr: "pipe",
    });

    try {
      await client.connect(transport);
      const listed = await client.listTools();
      expect(listed.tools.map((tool) => tool.name).sort()).toEqual([
        "get_related_context",
        "investigate_resource",
        "list_providers",
        "list_resources",
      ]);
      for (const tool of listed.tools) {
        expect(tool.annotations).toMatchObject({
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        });
      }

      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: "github:repository:123" },
      });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        subject: { id: "github:repository:123" },
      });
      for (const key of [
        "knownFacts",
        "missingContext",
        "providerActivity",
        "timeline",
        "subjectReleases",
        "subjectIssues",
        "sharedCommitContext",
        "sharedCommitCorrespondences",
      ]) {
        expect(result.structuredContent).toHaveProperty(key);
      }
      expect(result.structuredContent).not.toHaveProperty("resolutions");
      expect(result.structuredContent).not.toHaveProperty("resolutionMemory");
    } finally {
      await client.close();
    }

    expect(digest()).toBe(before);
  }, 15_000);

  test("investigate_resource returns code_mapped_to shared commit context without mutating state", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-046-"));
    dirs.push(dir);
    const sha = "abc123def4567890abc123def4567890abc123de";
    const store = new Store(dir);
    store.init();
    const repository = createResource({
      provider: "github",
      providerResourceId: "456",
      kind: "repository",
      name: "example/demo",
      metadata: { fullName: "example/demo" },
    });
    const project = createResource({
      provider: "sentry",
      providerResourceId: "450",
      kind: "project",
      name: "demo",
      metadata: { organizationSlug: "example" },
    });
    store.applyResource(repository, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.applyResource(project, {
      id: "b2",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: repository.id,
        targetResourceId: project.id,
        kind: "code_mapped_to",
        evidence: {
          source: "sentry",
          mechanism: "code_mapping",
          repository: "example/demo",
        },
      }),
    );
    store.upsertGitHubWorkflowRun({
      provider: "github",
      runId: 9001,
      resourceId: repository.id,
      repositoryId: "456",
      workflowId: 1,
      name: "CI",
      runNumber: 12,
      runAttempt: 1,
      event: "push",
      status: "completed",
      conclusion: "failure",
      headBranch: "main",
      headSha: sha,
      createdAt: "2026-08-09T10:00:00.000Z",
      runStartedAt: null,
      updatedAt: null,
      observedAt: "2026-08-09T12:00:00.000Z",
    });
    store.upsertSentryRelease({
      provider: "sentry",
      version: "frontend@1.2.0",
      resourceId: project.id,
      projectId: "450",
      shortVersion: "1.2.0",
      status: "open",
      dateCreated: "2026-08-09T12:00:00.000Z",
      dateReleased: null,
      observedAt: "2026-08-09T12:00:00.000Z",
      gitCommitSha: sha,
    });
    store.close();

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test-046", version: "1.0.0" });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["run", "src/cli/index.ts", "mcp", "--dir", dir],
      cwd: process.cwd(),
      stderr: "pipe",
    });

    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: project.id },
      });
      expect(result.isError).not.toBe(true);
      const groups = (result.structuredContent as {
        sharedCommitContext?: Array<Record<string, unknown>>;
      })?.sharedCommitContext;
      expect(groups).toBeDefined();
      expect(groups).toHaveLength(1);
      expect(groups![0]).toMatchObject({
        relationshipKind: "code_mapped_to",
        commitSha: sha,
        sourceResourceId: repository.id,
        targetResourceId: project.id,
      });
    } finally {
      await client.close();
    }

    expect(digest()).toBe(before);
  }, 15_000);
});

describe("MCP stdio contract (Sprint 047)", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("investigate_resource returns additive sharedCommitCorrespondences for a GitHub hub without mutating state", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-047-"));
    dirs.push(dir);
    const sha = "abc123def4567890abc123def4567890abc123de";
    const store = new Store(dir);
    store.init();
    const repository = createResource({
      provider: "github",
      providerResourceId: "789",
      kind: "repository",
      name: "example/hub",
      metadata: { fullName: "example/hub" },
    });
    const vercelProject = createResource({
      provider: "vercel",
      providerResourceId: "prj_hub",
      kind: "project",
      name: "hub",
      metadata: { accountId: "team_1" },
    });
    const sentryProject = createResource({
      provider: "sentry",
      providerResourceId: "450",
      kind: "project",
      name: "demo",
      metadata: { organizationSlug: "example" },
    });
    store.applyResource(repository, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.applyResource(vercelProject, {
      id: "b2",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.applyResource(sentryProject, {
      id: "b3",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: repository.id,
        targetResourceId: vercelProject.id,
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "example/hub",
          githubRepoId: "789",
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
          repository: "example/hub",
        },
      }),
    );
    store.upsertGitHubWorkflowRun({
      provider: "github",
      runId: 9001,
      resourceId: repository.id,
      repositoryId: "789",
      workflowId: 1,
      name: "CI",
      runNumber: 12,
      runAttempt: 1,
      event: "push",
      status: "completed",
      conclusion: "failure",
      headBranch: "main",
      headSha: sha,
      createdAt: "2026-08-09T10:00:00.000Z",
      runStartedAt: null,
      updatedAt: null,
      observedAt: "2026-08-09T12:00:00.000Z",
    });
    store.upsertVercelDeployment({
      provider: "vercel",
      uid: "dpl_1",
      resourceId: vercelProject.id,
      projectId: "prj_hub",
      readyState: "READY",
      state: "READY",
      target: "production",
      createdAtMs: 1723201000000,
      buildingAtMs: null,
      readyAtMs: null,
      observedAt: "2026-08-09T12:00:00.000Z",
      source: "git",
      gitCommitSha: sha,
    });
    store.upsertSentryRelease({
      provider: "sentry",
      version: "frontend@1.2.0",
      resourceId: sentryProject.id,
      projectId: "450",
      shortVersion: "1.2.0",
      status: "open",
      dateCreated: "2026-08-09T12:00:00.000Z",
      dateReleased: null,
      observedAt: "2026-08-09T12:00:00.000Z",
      gitCommitSha: sha,
    });
    store.close();

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test-047", version: "1.0.0" });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["run", "src/cli/index.ts", "mcp", "--dir", dir],
      cwd: process.cwd(),
      stderr: "pipe",
    });

    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: repository.id },
      });
      expect(result.isError).not.toBe(true);
      const content = result.structuredContent as {
        sharedCommitContext?: Array<Record<string, unknown>>;
        sharedCommitCorrespondences?: Array<Record<string, unknown>>;
      };
      expect(content.sharedCommitContext).toHaveLength(2);
      expect(content.sharedCommitCorrespondences).toEqual([
        {
          commitSha: sha,
          sourceForRelationshipId: `rel:${repository.id}:source_for:${vercelProject.id}`,
          codeMappedToRelationshipId: `rel:${repository.id}:code_mapped_to:${sentryProject.id}`,
          githubRepositoryId: repository.id,
        },
      ]);
    } finally {
      await client.close();
    }

    expect(digest()).toBe(before);
  }, 15_000);
});

describe("MCP stdio contract (Sprint 056)", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  function spawnClient(dir: string) {
    const client = new Client({ name: "combie-test-056", version: "1.0.0" });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["run", "src/cli/index.ts", "mcp", "--dir", dir],
      cwd: process.cwd(),
      stderr: "pipe",
    });
    return { client, transport };
  }

  test("investigate_resource returns additive resolutionMemory for the exact subject without mutating state", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-056-"));
    dirs.push(dir);
    const store = new Store(dir);
    store.init();
    const subject = createResource({
      provider: "sentry",
      providerResourceId: "450",
      kind: "project",
      name: "combie",
      metadata: { slug: "combie", organizationSlug: "acme" },
    });
    const other = createResource({
      provider: "vercel",
      providerResourceId: "prj_other",
      kind: "project",
      name: "other",
      metadata: { accountId: "team_1" },
    });
    store.applyResource(subject, {
      id: "obs-1",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.applyResource(other, {
      id: "obs-2",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.upsertSentryRelease({
      provider: "sentry",
      version: "frontend@1.2.0",
      resourceId: subject.id,
      projectId: "450",
      shortVersion: "1.2.0",
      status: "open",
      dateCreated: "2026-08-16T10:00:00.000Z",
      dateReleased: null,
      observedAt: "2026-08-16T10:00:00.000Z",
      gitCommitSha: null,
    });
    store.close();

    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const r1 = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      action: "Reverted deployment",
      outcome: "Errors returned to baseline",
      evidenceIds: ["frontend@1.2.0"],
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const r2 = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Keep rollback",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const { client, transport } = spawnClient(dir);
    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(result.isError).not.toBe(true);
      const content = result.structuredContent as {
        resolutionMemory?: Array<Record<string, unknown>>;
        knownFacts?: Array<Record<string, unknown>>;
        missingContext?: Array<Record<string, unknown>>;
        providerActivity?: { entries?: Array<Record<string, unknown>> };
        timeline?: { entries?: Array<Record<string, unknown>> };
        sharedCommitContext?: Array<Record<string, unknown>>;
        sharedCommitCorrespondences?: Array<Record<string, unknown>>;
      };
      expect(content.resolutionMemory).toEqual([
        {
          id: r2.id,
          investigationId: saved.record.id,
          recordedAt: "2026-08-16T14:00:00.000Z",
          decision: "Keep rollback",
        },
        {
          id: r1.id,
          investigationId: saved.record.id,
          recordedAt: "2026-08-16T13:00:00.000Z",
          decision: "Rollback",
          action: "Reverted deployment",
          outcome: "Errors returned to baseline",
          evidenceIds: ["frontend@1.2.0"],
        },
      ]);
      expect(result.structuredContent).not.toHaveProperty("resolutions");
      for (const key of [
        "knownFacts",
        "missingContext",
        "providerActivity",
        "timeline",
        "sharedCommitContext",
        "sharedCommitCorrespondences",
      ]) {
        const serialized = JSON.stringify(content[key as keyof typeof content]);
        expect(serialized).not.toContain(r1.id);
        expect(serialized).not.toContain(r2.id);
      }
      const oneLiner = (
        result.content as Array<{ type: string; text: string }>
      )[0]?.text;
      expect(oneLiner).toBe(
        `Investigation context for combie. 0 change(s), 0 related resource(s).`,
      );
      expect(oneLiner).not.toContain("Rollback");

      const otherResult = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: other.id },
      });
      expect(otherResult.isError).not.toBe(true);
      expect(otherResult.structuredContent).not.toHaveProperty(
        "resolutionMemory",
      );

      const missing = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: "sentry:project:missing" },
      });
      expect(missing.isError).toBe(true);
      const missingText = (
        missing.content as Array<{ type: string; text: string }>
      )[0]?.text;
      expect(missingText).toContain("Resource not found");
      expect(
        (missing.structuredContent as Record<string, unknown> | undefined)
          ?.resolutionMemory,
      ).toBeUndefined();
    } finally {
      await client.close();
    }

    expect(digest()).toBe(before);
  }, 15_000);

  test("resolutionMemory survives corrupt and pre-054 evidence JSON without invented ids", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-056-evidence-"));
    dirs.push(dir);
    const store = new Store(dir);
    store.init();
    const subject = createResource({
      provider: "sentry",
      providerResourceId: "451",
      kind: "project",
      name: "combie",
      metadata: { slug: "combie", organizationSlug: "acme" },
    });
    store.applyResource(subject, {
      id: "obs-1",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.upsertSentryRelease({
      provider: "sentry",
      version: "frontend@1.3.0",
      resourceId: subject.id,
      projectId: "451",
      shortVersion: "1.3.0",
      status: "open",
      dateCreated: "2026-08-16T10:00:00.000Z",
      dateReleased: null,
      observedAt: "2026-08-16T10:00:00.000Z",
      gitCommitSha: null,
    });
    store.close();

    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      evidenceIds: ["frontend@1.3.0"],
      recordedAt: "2026-08-16T13:00:00.000Z",
    });

    const db = new Database(dbPath(dir));
    db.query(`UPDATE resolutions SET evidence_ids = ? WHERE id = ?`).run(
      `{"not": "json"`,
      recorded.id,
    );
    db.close();

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const expectedRow = {
      id: recorded.id,
      investigationId: saved.record.id,
      recordedAt: "2026-08-16T13:00:00.000Z",
      decision: "Rollback",
    };

    const { client, transport } = spawnClient(dir);
    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(result.isError).not.toBe(true);
      const memory = (
        result.structuredContent as { resolutionMemory?: Array<Record<string, unknown>> }
      ).resolutionMemory;
      expect(memory).toEqual([expectedRow]);
    } finally {
      await client.close();
    }
    expect(digest()).toBe(before);

    const db2 = new Database(dbPath(dir));
    db2.exec(`ALTER TABLE resolutions DROP COLUMN evidence_ids`);
    db2.close();

    const second = spawnClient(dir);
    try {
      await second.client.connect(second.transport);
      const result = await second.client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(result.isError).not.toBe(true);
      const memory = (
        result.structuredContent as { resolutionMemory?: Array<Record<string, unknown>> }
      ).resolutionMemory;
      expect(memory).toEqual([expectedRow]);
    } finally {
      await second.client.close();
    }
    expect(digest()).toBe(before);
  }, 15_000);
});
