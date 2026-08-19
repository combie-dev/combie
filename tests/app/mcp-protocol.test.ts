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
import {
  appendIncidentResolutions,
  clearIncidentTitle,
  recordIncident,
  removeIncidentResolutions,
  restampIncident,
  retitleIncident,
} from "../../src/app/incidents.ts";
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
      expect(result.structuredContent).not.toHaveProperty("incidentMemory");
      expect(result.structuredContent).not.toHaveProperty("investigationHistory");
      expect(result.structuredContent).not.toHaveProperty("investigationCompare");
      expect(result.structuredContent).not.toHaveProperty(
        "investigationResolutionMemory",
      );
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

describe("MCP stdio contract (Sprint 057)", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("investigate_resource omits investigationId on resource-anchored rows and stays four tools", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-057-"));
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
    store.applyResource(subject, {
      id: "obs-1",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const recorded = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Rollback",
      action: "Reverted deployment",
      outcome: "Errors returned to baseline",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test-057", version: "1.0.0" });
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
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(result.isError).not.toBe(true);
      const content = result.structuredContent as {
        resolutionMemory?: Array<Record<string, unknown>>;
      };
      expect(content.resolutionMemory).toEqual([
        {
          id: recorded.id,
          recordedAt: "2026-08-16T13:00:00.000Z",
          decision: "Rollback",
          action: "Reverted deployment",
          outcome: "Errors returned to baseline",
        },
      ]);
      expect(content.resolutionMemory![0]).not.toHaveProperty("investigationId");
    } finally {
      await client.close();
    }
    expect(digest()).toBe(before);
  }, 15_000);
});

describe("MCP stdio contract (Sprint 058)", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("investigate_resource stays four tools with unchanged resolutionMemory after incident grouping", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-058-"));
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
    store.applyResource(subject, {
      id: "obs-1",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const first = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const second = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    recordIncident({
      baseDir: dir,
      resolutionIds: [first.id, second.id],
      title: "API error spike",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test-058", version: "1.0.0" });
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
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(result.isError).not.toBe(true);
      const content = result.structuredContent as Record<string, unknown>;
      expect(content).not.toHaveProperty("incidents");
      const memory = content.resolutionMemory as Array<Record<string, unknown>>;
      expect(memory.map((row) => row.id).sort()).toEqual(
        [first.id, second.id].sort(),
      );
      expect(JSON.stringify(memory)).not.toContain("API error spike");
    } finally {
      await client.close();
    }
    expect(digest()).toBe(before);
  }, 15_000);
});

describe("MCP stdio contract (Sprint 059)", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("investigate_resource returns additive incidentMemory for the exact subject without mutating state", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-059-"));
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
    store.close();

    const first = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Rollback",
      action: "Reverted deployment",
      outcome: "Errors returned to baseline",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const second = recordResolution({
      baseDir: dir,
      subjectResourceId: other.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: [first.id, second.id],
      title: "API error spike",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test-059", version: "1.0.0" });
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
      const investigate = listed.tools.find(
        (tool) => tool.name === "investigate_resource",
      );
      expect(investigate?.description).toMatch(/incident memory/i);
      expect(listed.tools.every((tool) => tool.name !== "list_incidents")).toBe(
        true,
      );

      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(result.isError).not.toBe(true);
      expect(result.content).toEqual([
        {
          type: "text",
          text: `Investigation context for ${subject.name}. 0 change(s), 0 related resource(s).`,
        },
      ]);
      const content = result.structuredContent as {
        incidentMemory?: Array<Record<string, unknown>>;
        resolutionMemory?: Array<Record<string, unknown>>;
        knownFacts?: Array<Record<string, unknown>>;
        missingContext?: Array<Record<string, unknown>>;
        providerActivity?: { entries?: Array<Record<string, unknown>> };
        timeline?: { entries?: Array<Record<string, unknown>> };
        sharedCommitContext?: Array<Record<string, unknown>>;
        sharedCommitCorrespondences?: Array<Record<string, unknown>>;
      };
      expect(content.incidentMemory).toEqual([
        {
          id: incident.id,
          recordedAt: "2026-08-16T14:00:00.000Z",
          title: "API error spike",
          resolutionIds: [first.id, second.id],
        },
      ]);
      expect(content.incidentMemory![0]).not.toHaveProperty("decision");
      expect(content.incidentMemory![0]).not.toHaveProperty("action");
      expect(content.incidentMemory![0]).not.toHaveProperty("outcome");
      expect(content).not.toHaveProperty("incidents");
      expect(content.resolutionMemory?.map((row) => row.id)).toEqual([first.id]);
      expect(JSON.stringify(content.knownFacts)).not.toContain(incident.id);
      expect(JSON.stringify(content.missingContext)).not.toContain(incident.id);
      expect(JSON.stringify(content.providerActivity)).not.toContain(
        incident.id,
      );
      expect(JSON.stringify(content.timeline)).not.toContain(incident.id);
      expect(JSON.stringify(content.sharedCommitContext)).not.toContain(
        incident.id,
      );
      expect(JSON.stringify(content.sharedCommitCorrespondences)).not.toContain(
        incident.id,
      );

      const otherResult = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: other.id },
      });
      expect(otherResult.isError).not.toBe(true);
      const otherContent = otherResult.structuredContent as {
        incidentMemory?: Array<Record<string, unknown>>;
      };
      expect(otherContent.incidentMemory).toEqual([
        {
          id: incident.id,
          recordedAt: "2026-08-16T14:00:00.000Z",
          title: "API error spike",
          resolutionIds: [first.id, second.id],
        },
      ]);

      const related = await client.callTool({
        name: "get_related_context",
        arguments: { resourceId: subject.id },
      });
      expect(related.isError).not.toBe(true);
      expect(related.structuredContent).not.toHaveProperty("incidentMemory");

      const unknown = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: "sentry:project:nope" },
      });
      expect(unknown.isError).toBe(true);
      const unknownText = (unknown.content as Array<{ text: string }>)
        .map((part) => part.text)
        .join("\n");
      expect(unknownText).toContain("Resource not found");
      expect(unknown.structuredContent ?? {}).not.toHaveProperty(
        "incidentMemory",
      );
    } finally {
      await client.close();
    }
    expect(digest()).toBe(before);
  }, 15_000);

  test("investigate_resource omits incidentMemory when empty and omits absent title", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-059-omit-"));
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
      provider: "github",
      providerResourceId: "1001",
      kind: "repository",
      name: "acme/other",
      metadata: {},
    });
    store.applyResource(subject, {
      id: "obs-1",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.applyResource(other, {
      id: "obs-2",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const first = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const second = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: [first.id, second.id],
      recordedAt: "2026-08-16T14:00:00.000Z",
    });

    const client = new Client({
      name: "combie-test-059-omit",
      version: "1.0.0",
    });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["run", "src/cli/index.ts", "mcp", "--dir", dir],
      cwd: process.cwd(),
      stderr: "pipe",
    });
    try {
      await client.connect(transport);
      const withIncident = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      const withContent = withIncident.structuredContent as {
        incidentMemory?: Array<Record<string, unknown>>;
      };
      expect(withContent.incidentMemory).toEqual([
        {
          id: incident.id,
          recordedAt: "2026-08-16T14:00:00.000Z",
          resolutionIds: [first.id, second.id],
        },
      ]);
      expect(withContent.incidentMemory![0]).not.toHaveProperty("title");

      const empty = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: other.id },
      });
      expect(empty.structuredContent).not.toHaveProperty("incidentMemory");
      expect(empty.structuredContent).not.toHaveProperty("resolutionMemory");
    } finally {
      await client.close();
    }
  }, 15_000);
});

describe("MCP stdio contract (Sprint 061)", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("investigate_resource recalls an incident-anchored resolution with no schema change", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-061-"));
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
    store.applyResource(subject, {
      id: "obs-1",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const first = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const second = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: [first.id, second.id],
      title: "API error spike",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    const anchored = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      decision: "Keep holding",
      recordedAt: "2026-08-18T10:00:00.000Z",
    });

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test-061", version: "1.0.0" });
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
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(result.isError).not.toBe(true);
      const content = result.structuredContent as {
        resolutionMemory?: Array<Record<string, unknown>>;
        incidentMemory?: Array<Record<string, unknown>>;
      };
      expect(content.resolutionMemory!.map((row) => row.id)).toEqual([
        anchored.id,
        second.id,
        first.id,
      ]);
      expect(content.resolutionMemory![0]).not.toHaveProperty("investigationId");
      expect(content.incidentMemory).toEqual([
        {
          id: incident.id,
          recordedAt: "2026-08-16T14:00:00.000Z",
          title: "API error spike",
          resolutionIds: [first.id, second.id, anchored.id],
        },
      ]);
      expect(content).not.toHaveProperty("incidents");
    } finally {
      await client.close();
    }
    expect(digest()).toBe(before);
  }, 15_000);
});

describe("MCP stdio contract (Sprint 062)", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("investigate_resource observes appended members with no schema change", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-062-"));
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
    store.applyResource(subject, {
      id: "obs-1",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const first = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const second = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    const later = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Scale up",
      recordedAt: "2026-08-16T13:02:00.000Z",
    });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: [first.id, second.id],
      title: "API error spike",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    appendIncidentResolutions({
      baseDir: dir,
      incidentId: incident.id,
      resolutionIds: [later.id],
    });

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test-062", version: "1.0.0" });
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
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(result.isError).not.toBe(true);
      const content = result.structuredContent as {
        incidentMemory?: Array<Record<string, unknown>>;
      };
      expect(content.incidentMemory).toEqual([
        {
          id: incident.id,
          recordedAt: "2026-08-16T14:00:00.000Z",
          title: "API error spike",
          resolutionIds: [first.id, second.id, later.id],
        },
      ]);
      expect(content).not.toHaveProperty("incidents");
    } finally {
      await client.close();
    }
    expect(digest()).toBe(before);
  }, 15_000);
});

describe("MCP stdio contract (Sprint 065)", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("investigate_resource observes remaining members with no schema change", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-065-"));
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
    store.applyResource(subject, {
      id: "obs-1",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const first = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const second = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    const later = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Scale up",
      recordedAt: "2026-08-16T13:02:00.000Z",
    });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: [first.id, second.id, later.id],
      title: "API error spike",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    removeIncidentResolutions({
      baseDir: dir,
      incidentId: incident.id,
      resolutionIds: [later.id],
    });

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test-065", version: "1.0.0" });
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
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(result.isError).not.toBe(true);
      const content = result.structuredContent as {
        incidentMemory?: Array<Record<string, unknown>>;
        resolutionMemory?: Array<{ id: string }>;
      };
      expect(content.incidentMemory).toEqual([
        {
          id: incident.id,
          recordedAt: "2026-08-16T14:00:00.000Z",
          title: "API error spike",
          resolutionIds: [first.id, second.id],
        },
      ]);
      expect(content.resolutionMemory?.map((row) => row.id).sort()).toEqual(
        [first.id, later.id, second.id].sort(),
      );
      expect(content).not.toHaveProperty("incidents");
    } finally {
      await client.close();
    }
    expect(digest()).toBe(before);
  }, 15_000);
});

describe("MCP stdio contract (Sprint 066)", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("investigate_resource observes the new title with no schema change", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-066-"));
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
    store.applyResource(subject, {
      id: "obs-1",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const first = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const second = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: [first.id, second.id],
      title: "API error spike",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    retitleIncident({
      baseDir: dir,
      incidentId: incident.id,
      title: "Better name",
    });

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test-066", version: "1.0.0" });
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
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(result.isError).not.toBe(true);
      const content = result.structuredContent as {
        incidentMemory?: Array<Record<string, unknown>>;
      };
      expect(content.incidentMemory).toEqual([
        {
          id: incident.id,
          recordedAt: "2026-08-16T14:00:00.000Z",
          title: "Better name",
          resolutionIds: [first.id, second.id],
        },
      ]);
      expect(content).not.toHaveProperty("incidents");
    } finally {
      await client.close();
    }
    expect(digest()).toBe(before);
  }, 15_000);
});

describe("MCP stdio contract (Sprint 067)", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("investigate_resource omits title after clear with no schema change", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-067-"));
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
    store.applyResource(subject, {
      id: "obs-1",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const first = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const second = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: [first.id, second.id],
      title: "API error spike",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    clearIncidentTitle({
      baseDir: dir,
      incidentId: incident.id,
    });

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test-067", version: "1.0.0" });
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
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(result.isError).not.toBe(true);
      const content = result.structuredContent as {
        incidentMemory?: Array<Record<string, unknown>>;
      };
      expect(content.incidentMemory).toEqual([
        {
          id: incident.id,
          recordedAt: "2026-08-16T14:00:00.000Z",
          resolutionIds: [first.id, second.id],
        },
      ]);
      expect(content.incidentMemory?.[0]).not.toHaveProperty("title");
      expect(content).not.toHaveProperty("incidents");
    } finally {
      await client.close();
    }
    expect(digest()).toBe(before);
  }, 15_000);
});

describe("MCP stdio contract (Sprint 068)", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("investigate_resource observes restamped recordedAt with no schema change", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-068-"));
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
    store.applyResource(subject, {
      id: "obs-1",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const first = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const second = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: [first.id, second.id],
      title: "API error spike",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    restampIncident({
      baseDir: dir,
      incidentId: incident.id,
      recordedAt: "2026-08-17T20:00:00.000Z",
    });

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test-068", version: "1.0.0" });
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
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(result.isError).not.toBe(true);
      const content = result.structuredContent as {
        incidentMemory?: Array<Record<string, unknown>>;
      };
      expect(content.incidentMemory).toEqual([
        {
          id: incident.id,
          recordedAt: "2026-08-17T20:00:00.000Z",
          title: "API error spike",
          resolutionIds: [first.id, second.id],
        },
      ]);
      expect(content.incidentMemory?.[0]).not.toHaveProperty("occurredAt");
      expect(content).not.toHaveProperty("incidents");
    } finally {
      await client.close();
    }
    expect(digest()).toBe(before);
  }, 15_000);
});

describe("MCP stdio contract (Sprint 069)", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("investigate_resource observes snapshot summaries without a fifth tool", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-069-"));
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
    store.applyResource(subject, {
      id: "obs-1",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test-069", version: "1.0.0" });
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
      expect(
        listed.tools.every((tool) => tool.name !== "list_investigations"),
      ).toBe(true);
      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(result.isError).not.toBe(true);
      const content = result.structuredContent as Record<string, unknown>;
      expect(content.investigationHistory).toEqual([
        { id: saved.record.id, composedAt: "2026-08-16T12:00:00.000Z" },
      ]);
      expect(
        (content.investigationHistory as Array<Record<string, unknown>>)[0],
      ).not.toHaveProperty("subjectResourceId");
      expect(
        (content.investigationHistory as Array<Record<string, unknown>>)[0],
      ).not.toHaveProperty("occurredAt");
      expect(content).not.toHaveProperty("savedInvestigations");
      expect(content).not.toHaveProperty("investigationSnapshots");
      expect(content).not.toHaveProperty("incidents");
    } finally {
      await client.close();
    }
    expect(digest()).toBe(before);
  }, 15_000);
});

describe("MCP stdio contract (Sprint 070)", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("investigate_resource omits investigationHistory when empty and isolates subjects", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-070-"));
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
      provider: "github",
      providerResourceId: "1001",
      kind: "repository",
      name: "acme/api",
      metadata: {},
    });
    store.applyResource(subject, {
      id: "obs-1",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.applyResource(other, {
      id: "obs-2",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");

    const clientEmpty = new Client({
      name: "combie-test-070-empty",
      version: "1.0.0",
    });
    const transportEmpty = new StdioClientTransport({
      command: process.execPath,
      args: ["run", "src/cli/index.ts", "mcp", "--dir", dir],
      cwd: process.cwd(),
      stderr: "pipe",
    });
    try {
      await clientEmpty.connect(transportEmpty);
      const emptyResult = await clientEmpty.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(emptyResult.isError).not.toBe(true);
      expect(emptyResult.structuredContent).not.toHaveProperty(
        "investigationHistory",
      );
      const emptyMissing = JSON.stringify(
        (emptyResult.structuredContent as { missingContext?: unknown })
          .missingContext,
      );
      expect(emptyMissing).not.toMatch(/investigation history|no snapshots/i);
    } finally {
      await clientEmpty.close();
    }

    const older = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T10:00:00.000Z",
    });
    const newer = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const otherSaved = saveInvestigation({
      baseDir: dir,
      resourceRef: other.id,
      composedAt: "2026-08-16T11:00:00.000Z",
    });
    const before = digest();

    const client = new Client({ name: "combie-test-070", version: "1.0.0" });
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
      const investigate = listed.tools.find(
        (tool) => tool.name === "investigate_resource",
      );
      expect(investigate?.description).toMatch(/investigation history/i);
      expect(investigate?.description).toMatch(/retained composition/i);
      expect(
        listed.tools.every((tool) => tool.name !== "list_investigations"),
      ).toBe(true);

      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(result.isError).not.toBe(true);
      expect(result.content).toEqual([
        {
          type: "text",
          text: `Investigation context for ${subject.name}. 0 change(s), 0 related resource(s).`,
        },
      ]);
      const content = result.structuredContent as Record<string, unknown>;
      expect(content.investigationHistory).toEqual([
        { id: newer.record.id, composedAt: "2026-08-16T12:00:00.000Z" },
        { id: older.record.id, composedAt: "2026-08-16T10:00:00.000Z" },
      ]);
      expect(JSON.stringify(content.investigationHistory)).not.toContain(
        otherSaved.record.id,
      );
      expect(JSON.stringify(content.investigationHistory)).not.toContain(
        "github:repository:1001",
      );
      for (const key of [
        "knownFacts",
        "missingContext",
        "providerActivity",
        "timeline",
        "sharedCommitContext",
        "sharedCommitCorrespondences",
      ]) {
        const serialized = JSON.stringify(content[key]);
        expect(serialized).not.toContain(newer.record.id);
        expect(serialized).not.toContain(older.record.id);
      }
      expect(content).not.toHaveProperty("resolutionMemory");
      expect(content).not.toHaveProperty("incidentMemory");
      expect(content).not.toHaveProperty("savedInvestigations");
      expect(content).not.toHaveProperty("investigationSnapshots");

      const otherResult = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: other.id },
      });
      expect(otherResult.isError).not.toBe(true);
      const otherContent = otherResult.structuredContent as Record<
        string,
        unknown
      >;
      expect(otherContent.investigationHistory).toEqual([
        { id: otherSaved.record.id, composedAt: "2026-08-16T11:00:00.000Z" },
      ]);
      expect(JSON.stringify(otherContent.investigationHistory)).not.toContain(
        newer.record.id,
      );

      const related = await client.callTool({
        name: "get_related_context",
        arguments: { resourceId: subject.id },
      });
      expect(related.isError).not.toBe(true);
      expect(related.structuredContent).not.toHaveProperty(
        "investigationHistory",
      );

      const missing = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: "sentry:project:missing" },
      });
      expect(missing.isError).toBe(true);
      expect(JSON.stringify(missing.structuredContent ?? {})).not.toContain(
        newer.record.id,
      );
    } finally {
      await client.close();
    }
    expect(digest()).toBe(before);

    const storeAfter = new Store(dir);
    storeAfter.init();
    const row = storeAfter.getInvestigationRow(newer.record.id);
    storeAfter.close();
    expect(row?.snapshotJson).not.toContain("investigationHistory");
    expect(row?.snapshotJson).not.toContain("INVESTIGATION HISTORY");
    expect(JSON.parse(row!.snapshotJson)).not.toHaveProperty(
      "investigationHistory",
    );
  }, 15_000);
});

describe("MCP stdio contract (Sprint 071)", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("investigate_resource returns named investigationCompare without inferring latest", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-071-"));
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
      provider: "github",
      providerResourceId: "1001",
      kind: "repository",
      name: "acme/api",
      metadata: {},
    });
    store.applyResource(subject, {
      id: "obs-1",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.applyResource(other, {
      id: "obs-2",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const older = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T10:00:00.000Z",
    });
    const newer = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const otherSaved = saveInvestigation({
      baseDir: dir,
      resourceRef: other.id,
      composedAt: "2026-08-16T11:00:00.000Z",
    });

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test-071", version: "1.0.0" });
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
      expect(
        listed.tools.every(
          (tool) =>
            tool.name !== "list_investigations" &&
            tool.name !== "compare_investigation" &&
            tool.name !== "get_investigation",
        ),
      ).toBe(true);
      const investigate = listed.tools.find(
        (tool) => tool.name === "investigate_resource",
      );
      expect(investigate?.description).toMatch(/investigationId/i);
      expect(investigate?.description).toMatch(/snapshot-versus-current/i);
      expect(investigate?.description).toMatch(/investigationSnapshot/i);

      const omitted = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(omitted.isError).not.toBe(true);
      expect(omitted.content).toEqual([
        {
          type: "text",
          text: `Investigation context for ${subject.name}. 0 change(s), 0 related resource(s).`,
        },
      ]);
      const omittedContent = omitted.structuredContent as Record<
        string,
        unknown
      >;
      expect(omittedContent).not.toHaveProperty("investigationCompare");
      expect(omittedContent.investigationHistory).toEqual([
        { id: newer.record.id, composedAt: "2026-08-16T12:00:00.000Z" },
        { id: older.record.id, composedAt: "2026-08-16T10:00:00.000Z" },
      ]);
      expect(JSON.stringify(omittedContent.knownFacts)).not.toContain(
        newer.record.id,
      );

      const named = await client.callTool({
        name: "investigate_resource",
        arguments: {
          resourceId: subject.id,
          investigationId: older.record.id,
        },
      });
      expect(named.isError).not.toBe(true);
      expect(named.content).toEqual(omitted.content);
      const namedContent = named.structuredContent as Record<string, unknown>;
      const compare = namedContent.investigationCompare as Record<
        string,
        unknown
      >;
      expect(compare.snapshotId).toBe(older.record.id);
      expect(compare.snapshotId).not.toBe(newer.record.id);
      expect(compare.subjectResourceId).toBe(subject.id);
      expect(compare.snapshotComposedAt).toBe("2026-08-16T10:00:00.000Z");
      expect(compare.currentStatus).toBe("available");
      expect(typeof compare.comparedAt).toBe("string");
      expect(compare.comparedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(Array.isArray(compare.sections)).toBe(true);
      expect((compare.sections as unknown[]).length).toBeGreaterThan(0);
      expect(compare).not.toHaveProperty("occurredAt");
      expect(namedContent.investigationHistory).toEqual(
        omittedContent.investigationHistory,
      );
      expect(JSON.stringify(namedContent.knownFacts)).not.toContain(
        "INVESTIGATION COMPARE",
      );
      expect(JSON.stringify(namedContent.missingContext)).not.toMatch(
        /investigation compare/i,
      );
      expect(JSON.stringify(namedContent)).not.toContain("INVESTIGATION COMPARE");

      const mismatch = await client.callTool({
        name: "investigate_resource",
        arguments: {
          resourceId: subject.id,
          investigationId: otherSaved.record.id,
        },
      });
      expect(mismatch.isError).toBe(true);
      const mismatchText = (
        mismatch.content as Array<{ type: string; text: string }>
      )[0]?.text;
      expect(mismatchText).toContain(otherSaved.record.id);
      expect(mismatchText).toContain(other.id);
      expect(mismatchText).toContain(`not ${subject.id}`);
      expect(JSON.stringify(mismatch.structuredContent ?? {})).not.toContain(
        "investigationCompare",
      );

      const unknown = await client.callTool({
        name: "investigate_resource",
        arguments: {
          resourceId: subject.id,
          investigationId: "inv:missing",
        },
      });
      expect(unknown.isError).toBe(true);
      const unknownText = (
        unknown.content as Array<{ type: string; text: string }>
      )[0]?.text;
      expect(unknownText).toContain("Investigation not found");
      expect(JSON.stringify(unknown.structuredContent ?? {})).not.toContain(
        "investigationCompare",
      );

      const blank = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id, investigationId: "" },
      });
      expect(blank.isError).toBe(true);
      const blankText = (
        blank.content as Array<{ type: string; text: string }>
      )[0]?.text;
      expect(blankText).toContain("Investigation id is required");
      expect(JSON.stringify(blank.structuredContent ?? {})).not.toContain(
        "investigationCompare",
      );

      const whitespace = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id, investigationId: "   " },
      });
      expect(whitespace.isError).toBe(true);
      expect(
        (whitespace.content as Array<{ type: string; text: string }>)[0]?.text,
      ).toContain("Investigation id is required");

      const related = await client.callTool({
        name: "get_related_context",
        arguments: { resourceId: subject.id },
      });
      expect(related.isError).not.toBe(true);
      expect(related.structuredContent).not.toHaveProperty(
        "investigationCompare",
      );
    } finally {
      await client.close();
    }
    expect(digest()).toBe(before);

    const storeAfter = new Store(dir);
    storeAfter.init();
    const row = storeAfter.getInvestigationRow(older.record.id);
    storeAfter.close();
    expect(row?.snapshotJson).not.toContain("investigationCompare");
    expect(row?.snapshotJson).not.toContain("INVESTIGATION COMPARE");
    expect(JSON.parse(row!.snapshotJson)).not.toHaveProperty(
      "investigationCompare",
    );
  }, 15_000);
});

describe("MCP stdio contract (Sprint 072)", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("investigate_resource returns named investigationSnapshot without inferring latest", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-072-"));
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
      provider: "github",
      providerResourceId: "1001",
      kind: "repository",
      name: "acme/api",
      metadata: {},
    });
    store.applyResource(subject, {
      id: "obs-1",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.applyResource(other, {
      id: "obs-2",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const older = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T10:00:00.000Z",
    });
    const newer = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const otherSaved = saveInvestigation({
      baseDir: dir,
      resourceRef: other.id,
      composedAt: "2026-08-16T11:00:00.000Z",
    });

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test-072", version: "1.0.0" });
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
      expect(
        listed.tools.every(
          (tool) =>
            tool.name !== "list_investigations" &&
            tool.name !== "compare_investigation" &&
            tool.name !== "get_investigation",
        ),
      ).toBe(true);
      const investigate = listed.tools.find(
        (tool) => tool.name === "investigate_resource",
      );
      expect(investigate?.description).toMatch(/investigationSnapshot/i);
      expect(investigate?.description).toMatch(/retained composition/i);

      const omitted = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(omitted.isError).not.toBe(true);
      expect(omitted.content).toEqual([
        {
          type: "text",
          text: `Investigation context for ${subject.name}. 0 change(s), 0 related resource(s).`,
        },
      ]);
      const omittedContent = omitted.structuredContent as Record<
        string,
        unknown
      >;
      expect(omittedContent).not.toHaveProperty("investigationSnapshot");
      expect(omittedContent).not.toHaveProperty("investigationCompare");
      expect(omittedContent.investigationHistory).toEqual([
        { id: newer.record.id, composedAt: "2026-08-16T12:00:00.000Z" },
        { id: older.record.id, composedAt: "2026-08-16T10:00:00.000Z" },
      ]);
      expect(JSON.stringify(omittedContent.knownFacts)).not.toContain(
        older.record.id,
      );

      const named = await client.callTool({
        name: "investigate_resource",
        arguments: {
          resourceId: subject.id,
          investigationId: older.record.id,
        },
      });
      expect(named.isError).not.toBe(true);
      expect(named.content).toEqual(omitted.content);
      const namedContent = named.structuredContent as Record<string, unknown>;
      const snapshot = namedContent.investigationSnapshot as Record<
        string,
        unknown
      >;
      expect(snapshot.id).toBe(older.record.id);
      expect(snapshot.id).not.toBe(newer.record.id);
      expect(snapshot.subjectResourceId).toBe(subject.id);
      expect(snapshot.composedAt).toBe("2026-08-16T10:00:00.000Z");
      const snapshotBody = snapshot.snapshot as Record<string, unknown>;
      const snapshotSubject = snapshotBody.subject as Record<string, unknown>;
      expect(snapshotSubject.id).toBe(subject.id);
      expect(snapshotBody).not.toHaveProperty("knownFacts");
      expect(snapshot).not.toHaveProperty("occurredAt");
      expect(JSON.stringify(namedContent.investigationSnapshot)).not.toMatch(
        /INVESTIGATION SNAPSHOT|Investigation context for/,
      );

      const compare = namedContent.investigationCompare as Record<
        string,
        unknown
      >;
      expect(compare.snapshotId).toBe(older.record.id);
      expect(compare.subjectResourceId).toBe(subject.id);
      expect(compare.currentStatus).toBe("available");
      expect(namedContent.investigationHistory).toEqual(
        omittedContent.investigationHistory,
      );
      expect(JSON.stringify(namedContent.knownFacts)).toBe(
        JSON.stringify(omittedContent.knownFacts),
      );
      expect(JSON.stringify(namedContent.knownFacts)).not.toContain(
        older.record.id,
      );
      expect(JSON.stringify(namedContent.knownFacts)).not.toContain(
        "2026-08-16T10:00:00.000Z",
      );
      expect(JSON.stringify(namedContent.missingContext)).not.toContain(
        "2026-08-16T10:00:00.000Z",
      );
      expect(JSON.stringify(compare)).not.toContain("investigationSnapshot");
      expect(JSON.stringify(snapshot)).not.toContain("investigationCompare");
      expect(JSON.stringify(namedContent)).not.toContain(
        "INVESTIGATION COMPARE",
      );

      const mismatch = await client.callTool({
        name: "investigate_resource",
        arguments: {
          resourceId: subject.id,
          investigationId: otherSaved.record.id,
        },
      });
      expect(mismatch.isError).toBe(true);
      const mismatchText = (
        mismatch.content as Array<{ type: string; text: string }>
      )[0]?.text;
      expect(mismatchText).toContain(otherSaved.record.id);
      expect(mismatchText).toContain(other.id);
      expect(mismatchText).toContain(`not ${subject.id}`);
      expect(JSON.stringify(mismatch.structuredContent ?? {})).not.toContain(
        "investigationSnapshot",
      );

      const unknown = await client.callTool({
        name: "investigate_resource",
        arguments: {
          resourceId: subject.id,
          investigationId: "inv:missing",
        },
      });
      expect(unknown.isError).toBe(true);
      const unknownText = (
        unknown.content as Array<{ type: string; text: string }>
      )[0]?.text;
      expect(unknownText).toContain("Investigation not found");
      expect(JSON.stringify(unknown.structuredContent ?? {})).not.toContain(
        "investigationSnapshot",
      );

      const blank = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id, investigationId: "" },
      });
      expect(blank.isError).toBe(true);
      const blankText = (
        blank.content as Array<{ type: string; text: string }>
      )[0]?.text;
      expect(blankText).toContain("Investigation id is required");
      expect(JSON.stringify(blank.structuredContent ?? {})).not.toContain(
        "investigationSnapshot",
      );

      const whitespace = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id, investigationId: "   " },
      });
      expect(whitespace.isError).toBe(true);
      expect(
        (whitespace.content as Array<{ type: string; text: string }>)[0]?.text,
      ).toContain("Investigation id is required");

      const related = await client.callTool({
        name: "get_related_context",
        arguments: { resourceId: subject.id },
      });
      expect(related.isError).not.toBe(true);
      expect(related.structuredContent).not.toHaveProperty(
        "investigationSnapshot",
      );
    } finally {
      await client.close();
    }
    expect(digest()).toBe(before);

    const storeAfter = new Store(dir);
    storeAfter.init();
    const row = storeAfter.getInvestigationRow(older.record.id);
    storeAfter.close();
    expect(row?.snapshotJson).not.toContain("investigationSnapshot");
    expect(JSON.parse(row!.snapshotJson)).not.toHaveProperty(
      "investigationSnapshot",
    );
  }, 15_000);
});

describe("MCP stdio contract (Sprint 073)", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  test("investigate_resource returns investigation-scoped resolution memory without replacing 056", async () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-protocol-073-"));
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
      provider: "github",
      providerResourceId: "1001",
      kind: "repository",
      name: "acme/api",
      metadata: {},
    });
    store.applyResource(subject, {
      id: "obs-1",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.applyResource(other, {
      id: "obs-2",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const invA = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T10:00:00.000Z",
    });
    const invB = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const otherSaved = saveInvestigation({
      baseDir: dir,
      resourceRef: other.id,
      composedAt: "2026-08-16T11:00:00.000Z",
    });
    const viaInv = recordResolution({
      baseDir: dir,
      investigationId: invA.record.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const viaResource = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Watch",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    const viaOtherInv = recordResolution({
      baseDir: dir,
      investigationId: invB.record.id,
      decision: "Keep",
      recordedAt: "2026-08-16T15:00:00.000Z",
    });

    const digest = () =>
      createHash("sha256").update(readFileSync(dbPath(dir))).digest("hex");
    const before = digest();

    const client = new Client({ name: "combie-test-073", version: "1.0.0" });
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
      expect(
        listed.tools.every(
          (tool) =>
            tool.name !== "list_investigations" &&
            tool.name !== "compare_investigation" &&
            tool.name !== "get_investigation",
        ),
      ).toBe(true);
      const investigate = listed.tools.find(
        (tool) => tool.name === "investigate_resource",
      );
      expect(investigate?.description).toMatch(
        /investigationResolutionMemory|recorded against that exact Investigation/i,
      );

      const omitted = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id },
      });
      expect(omitted.isError).not.toBe(true);
      expect(omitted.content).toEqual([
        {
          type: "text",
          text: `Investigation context for ${subject.name}. 0 change(s), 0 related resource(s).`,
        },
      ]);
      const omittedContent = omitted.structuredContent as Record<
        string,
        unknown
      >;
      expect(omittedContent).not.toHaveProperty(
        "investigationResolutionMemory",
      );
      expect(omittedContent).not.toHaveProperty("investigationIncidentMemory");
      const omittedResolution = omittedContent.resolutionMemory as Array<
        Record<string, unknown>
      >;
      expect(omittedResolution.map((row) => row.id).sort()).toEqual(
        [viaInv.id, viaResource.id, viaOtherInv.id].sort(),
      );

      const named = await client.callTool({
        name: "investigate_resource",
        arguments: {
          resourceId: subject.id,
          investigationId: invA.record.id,
        },
      });
      expect(named.isError).not.toBe(true);
      expect(named.content).toEqual(omitted.content);
      const namedContent = named.structuredContent as Record<string, unknown>;
      expect(namedContent.investigationResolutionMemory).toEqual([
        {
          id: viaInv.id,
          investigationId: invA.record.id,
          recordedAt: "2026-08-16T13:00:00.000Z",
          decision: "Rollback",
        },
      ]);
      const namedResolution = namedContent.resolutionMemory as Array<
        Record<string, unknown>
      >;
      expect(namedResolution.map((row) => row.id).sort()).toEqual(
        [viaInv.id, viaResource.id, viaOtherInv.id].sort(),
      );
      expect(
        (namedContent.investigationResolutionMemory as Array<Record<string, unknown>>)
          .map((row) => row.id),
      ).not.toContain(viaResource.id);
      expect(
        (namedContent.investigationResolutionMemory as Array<Record<string, unknown>>)
          .map((row) => row.id),
      ).not.toContain(viaOtherInv.id);
      const snapshot = namedContent.investigationSnapshot as Record<
        string,
        unknown
      >;
      expect(Object.keys(snapshot).sort()).toEqual([
        "composedAt",
        "id",
        "snapshot",
        "subjectResourceId",
      ]);
      expect(snapshot).not.toHaveProperty("resolutionMemory");
      expect(snapshot).not.toHaveProperty("investigationResolutionMemory");
      expect(snapshot).not.toHaveProperty("occurredAt");
      expect(namedContent).not.toHaveProperty("investigationIncidentMemory");
      expect(JSON.stringify(namedContent.knownFacts)).not.toContain(viaInv.id);
      expect(JSON.stringify(namedContent.missingContext)).not.toContain(
        viaInv.id,
      );
      expect(JSON.stringify(namedContent.investigationCompare)).not.toContain(
        viaInv.id,
      );
      expect(JSON.stringify(namedContent.investigationSnapshot)).not.toContain(
        viaInv.id,
      );

      const emptyNamed = await client.callTool({
        name: "investigate_resource",
        arguments: {
          resourceId: other.id,
          investigationId: otherSaved.record.id,
        },
      });
      expect(emptyNamed.isError).not.toBe(true);
      expect(emptyNamed.structuredContent).not.toHaveProperty(
        "investigationResolutionMemory",
      );
      expect(emptyNamed.structuredContent).toHaveProperty(
        "investigationSnapshot",
      );

      const mismatch = await client.callTool({
        name: "investigate_resource",
        arguments: {
          resourceId: subject.id,
          investigationId: otherSaved.record.id,
        },
      });
      expect(mismatch.isError).toBe(true);
      expect(JSON.stringify(mismatch.structuredContent ?? {})).not.toContain(
        "investigationResolutionMemory",
      );
      expect(JSON.stringify(mismatch.structuredContent ?? {})).not.toContain(
        viaInv.id,
      );

      const unknown = await client.callTool({
        name: "investigate_resource",
        arguments: {
          resourceId: subject.id,
          investigationId: "inv:missing",
        },
      });
      expect(unknown.isError).toBe(true);
      expect(JSON.stringify(unknown.structuredContent ?? {})).not.toContain(
        "investigationResolutionMemory",
      );

      const blank = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: subject.id, investigationId: "" },
      });
      expect(blank.isError).toBe(true);
      expect(JSON.stringify(blank.structuredContent ?? {})).not.toContain(
        "investigationResolutionMemory",
      );

      const related = await client.callTool({
        name: "get_related_context",
        arguments: { resourceId: subject.id },
      });
      expect(related.isError).not.toBe(true);
      expect(related.structuredContent).not.toHaveProperty(
        "investigationResolutionMemory",
      );
    } finally {
      await client.close();
    }
    expect(digest()).toBe(before);

    const storeAfter = new Store(dir);
    storeAfter.init();
    const row = storeAfter.getInvestigationRow(invA.record.id);
    storeAfter.close();
    expect(row?.snapshotJson).not.toContain("investigationResolutionMemory");
    expect(JSON.parse(row!.snapshotJson)).not.toHaveProperty(
      "investigationResolutionMemory",
    );
  }, 15_000);
});
