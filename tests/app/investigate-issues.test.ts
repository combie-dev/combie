import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import {
  formatInvestigationContext,
  getInvestigationContext,
} from "../../src/app/investigate.ts";
import { composeInvestigationTimeline } from "../../src/app/timeline.ts";
import { composeMissingContext } from "../../src/app/missing-context.ts";
import { initCombie } from "../../src/app/init.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import type { SentryIssueEvidence } from "../../src/providers/sentry/issue.ts";
import type { SentryReleaseEvidence } from "../../src/providers/sentry/release.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-inv-iss-"));
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

function seedProject(store: Store) {
  const project = createResource({
    provider: "sentry",
    providerResourceId: "450",
    kind: "project",
    name: "combie",
    metadata: { slug: "combie", organization_slug: "acme" },
  });
  store.applyResource(project, {
    id: "proj-baseline",
    observedAt: "2026-08-15T08:00:00.000Z",
  });
  return project;
}

function issue(
  overrides: Partial<SentryIssueEvidence> = {},
): SentryIssueEvidence {
  return {
    provider: "sentry",
    issueId: "1001",
    resourceId: "sentry:project:450",
    projectId: "450",
    shortId: "COMBIE-1",
    status: "unresolved",
    level: "error",
    count: 42,
    userCount: 7,
    issueCategory: "error",
    firstSeen: "2026-08-15T14:37:00.000Z",
    lastSeen: "2026-08-15T15:08:00.000Z",
    observedAt: "2026-08-15T16:00:00.000Z",
    ...overrides,
  };
}

function release(
  overrides: Partial<SentryReleaseEvidence> = {},
): SentryReleaseEvidence {
  return {
    provider: "sentry",
    version: "1.4.2",
    resourceId: "sentry:project:450",
    projectId: "450",
    shortVersion: null,
    status: "open",
    dateCreated: "2026-08-15T14:31:00.000Z",
    dateReleased: null,
    observedAt: "2026-08-15T16:00:00.000Z",
    gitCommitSha: null,
    ...overrides,
  };
}

describe("investigate Sentry issues (Sprint 044)", () => {
  test("Sentry subject with issues shows ISSUES ordered by lastSeen", () => {
    const store = openStore();
    const project = seedProject(store);
    store.upsertSentryIssue(
      issue({ issueId: "old", lastSeen: "2026-08-15T12:00:00.000Z" }),
    );
    store.upsertSentryIssue(
      issue({ issueId: "new", lastSeen: "2026-08-15T15:08:00.000Z" }),
    );
    store.setSentryIssueRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-15T16:00:00.000Z",
      message: null,
      resultCount: 2,
      lastSuccessfulObservedAt: "2026-08-15T16:00:00.000Z",
    });
    store.close();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("network must not be used");
    }) as unknown as typeof fetch;
    try {
      const ctx = getInvestigationContext({
        baseDir: dir,
        resourceRef: project.id,
      });
      expect(ctx.subjectIssues.kind).toBe("populated");
      if (ctx.subjectIssues.kind === "populated") {
        expect(ctx.subjectIssues.issues.map((item) => item.issueId)).toEqual([
          "new",
          "old",
        ]);
      }
      const output = formatInvestigationContext(ctx);
      expect(output).toContain("ISSUES (most-recently-active first)");
      expect(output).toContain("issue id: new");
      expect(output).toContain("first seen at: ");
      expect(output).toContain("last seen at: ");
      expect(output).toContain("observed by Combie at: ");
      expect(output).toContain("KNOWN PROVIDER ACTIVITY (newest first; incomplete)");
      expect(output).toContain("Sentry issue");
      expect(output).not.toContain("this issue was caused");
      expect(output).not.toContain("triggered");
      expect(output.indexOf("ISSUES (most-recently-active first)")).toBeLessThan(
        output.indexOf("COMBIE OBSERVATIONS (newest first)"),
      );
      expect(output.indexOf("issue id: new")).toBeLessThan(
        output.indexOf("issue id: old"),
      );
      expect(composeInvestigationTimeline(ctx).entries).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("known-empty and unknown render differently", () => {
    const store = openStore();
    const project = seedProject(store);
    store.setSentryIssueRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-15T12:00:00.000Z",
      message: null,
      resultCount: 0,
      lastSuccessfulObservedAt: "2026-08-15T12:00:00.000Z",
    });
    store.close();

    let ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });
    expect(ctx.subjectIssues.kind).toBe("empty");
    expect(formatInvestigationContext(ctx)).toContain(
      "authority: empty · latest successful response returned 0 · last successful refresh observed by Combie at 2026-08-15T12:00:00.000Z",
    );

    const store2 = openStore();
    store2.setSentryIssueRefresh({
      resourceId: project.id,
      status: "failure",
      observedAt: "2026-08-15T13:00:00.000Z",
      message: "403 forbidden",
      resultCount: 0,
      lastSuccessfulObservedAt: "2026-08-15T12:00:00.000Z",
    });
    store2.upsertSentryIssue(issue({ issueId: "stale" }));
    store2.close();

    ctx = getInvestigationContext({ baseDir: dir, resourceRef: project.id });
    expect(ctx.subjectIssues.kind).toBe("unknown");
    const out = formatInvestigationContext(ctx);
    expect(out).toContain("authority: unknown · retained history may be stale");
    expect(out).toContain("Prior recorded issues (may be stale)");
    expect(out).toContain("issue id: stale");
  });

  test("releases and issues together refuse causal linkage", () => {
    const store = openStore();
    const project = seedProject(store);
    store.upsertSentryRelease(release());
    store.setSentryReleaseRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-15T16:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-15T16:00:00.000Z",
    });
    store.upsertSentryIssue(issue());
    store.setSentryIssueRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-15T16:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-15T16:00:00.000Z",
    });
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });
    const missing = composeMissingContext(ctx);
    expect(
      missing.some((item) => item.kind === "no_deterministic_release_issue_linkage"),
    ).toBe(true);
    const output = formatInvestigationContext(ctx);
    expect(output).toContain("RELEASES (newest first)");
    expect(output).toContain("ISSUES (most-recently-active first)");
    expect(output).toContain(
      "No deterministic evidence currently proves a Sentry release caused a Sentry issue",
    );
  });

  test("offline investigate does not mutate the database", () => {
    const store = openStore();
    const project = seedProject(store);
    store.upsertSentryIssue(issue());
    store.setSentryIssueRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-15T16:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-15T16:00:00.000Z",
    });
    store.close();
    const before = dbHash();
    getInvestigationContext({ baseDir: dir, resourceRef: project.id });
    expect(dbHash()).toBe(before);
  });

  test("one-hop neighbor ISSUES appear under DETAILED EVIDENCE", () => {
    const store = openStore();
    const project = seedProject(store);
    const vercel = createResource({
      provider: "vercel",
      providerResourceId: "prj_demo",
      kind: "project",
      name: "demo",
      metadata: {},
    });
    store.applyResource(vercel, {
      id: "p1",
      observedAt: "2026-08-15T08:00:00.000Z",
    });
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: vercel.id,
        targetResourceId: project.id,
        kind: "uses_domain_in",
        evidence: {
          source: "fixture",
          mechanism: "test_neighbor",
          apexName: "example.com",
        },
        createdAt: "2026-08-15T08:00:00.000Z",
        updatedAt: "2026-08-15T08:00:00.000Z",
      }),
    );
    store.upsertSentryIssue(issue());
    store.setSentryIssueRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-15T16:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-15T16:00:00.000Z",
    });
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: vercel.id,
    });
    expect(ctx.subjectIssues.kind).toBe("not_applicable");
    expect(ctx.related[0]!.issues.kind).toBe("populated");
    const output = formatInvestigationContext(ctx);
    expect(output).toContain("DETAILED EVIDENCE");
    expect(output).toContain("ISSUES (most-recently-active first)");
    expect(output).toContain("issue id: 1001");
  });

  test("unrelated Sentry issue evidence does not cross an existing one-hop relationship", () => {
    const store = openStore();
    const project = seedProject(store);
    const other = createResource({
      provider: "sentry",
      providerResourceId: "451",
      kind: "project",
      name: "other",
      metadata: { organization_slug: "acme" },
    });
    store.applyResource(other, {
      id: "p2",
      observedAt: "2026-08-15T08:00:00.000Z",
    });
    store.upsertSentryIssue(
      issue({
        issueId: "secret-other",
        resourceId: other.id,
        projectId: "451",
      }),
    );
    store.setSentryIssueRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-15T16:00:00.000Z",
      message: null,
      resultCount: 0,
      lastSuccessfulObservedAt: "2026-08-15T16:00:00.000Z",
    });
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });
    expect(formatInvestigationContext(ctx)).not.toContain("secret-other");
  });

  test("MCP investigate_resource returns populated subjectIssues without mutating state", async () => {
    const store = openStore();
    const project = seedProject(store);
    store.upsertSentryIssue(issue());
    store.setSentryIssueRefresh({
      resourceId: project.id,
      status: "success",
      observedAt: "2026-08-15T16:00:00.000Z",
      message: null,
      resultCount: 1,
      lastSuccessfulObservedAt: "2026-08-15T16:00:00.000Z",
    });
    store.close();
    const before = dbHash();

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
        "list_investigations",
        "list_providers",
        "list_resources",
      ]);

      const result = await client.callTool({
        name: "investigate_resource",
        arguments: { resourceId: project.id },
      });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        subjectIssues: {
          kind: "populated",
          issues: [{ issueId: "1001" }],
        },
      });
      const serialized = JSON.stringify(result.structuredContent);
      expect(serialized).not.toContain("title");
      expect(serialized).not.toContain("culprit");
      expect(serialized).not.toContain("stack");
    } finally {
      await client.close();
    }

    expect(dbHash()).toBe(before);
  }, 15_000);
});
