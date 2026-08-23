import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { initCombie } from "../../src/app/init";
import type { InvestigationContext } from "../../src/app/investigate";
import { composeMissingContext } from "../../src/app/missing-context";
import { Store } from "../../src/storage/store";
import { createChange, type Change } from "../../src/domain/change";
import { createResource } from "../../src/domain/resource";
import { createRelationship } from "../../src/domain/relationship";
import { projectInvestigateResourceLive } from "../../src/mcp/projections";
import { safeJson } from "../../src/mcp/serialization";
import { getCombieRoot } from "../../src/storage/paths";
import type {
  GitHubWorkflowRunEvidence,
  WorkflowRunEvidenceAuthority,
} from "../../src/providers/github/workflow-run";

const KNOWN_FACTS_OBSERVED_AT = "2026-08-09T12:00:00.000Z";

function knownFactsWorkflowRun(
  overrides: Partial<GitHubWorkflowRunEvidence> = {},
): GitHubWorkflowRunEvidence {
  return {
    provider: "github",
    runId: 9001,
    resourceId: "github:repository:101",
    repositoryId: "101",
    workflowId: 55,
    name: "ci",
    runNumber: 12,
    runAttempt: 1,
    event: "push",
    status: "completed",
    conclusion: "success",
    headBranch: "main",
    headSha: "abc123",
    createdAt: "2026-08-09T09:00:00.000Z",
    runStartedAt: null,
    updatedAt: null,
    observedAt: KNOWN_FACTS_OBSERVED_AT,
    ...overrides,
  };
}

function knownFactsContext(
  workflowRuns: WorkflowRunEvidenceAuthority,
): InvestigationContext {
  return {
    subject: createResource({
      provider: "github",
      providerResourceId: "101",
      kind: "repository",
      name: "facts-repo",
      metadata: {},
      createdAt: KNOWN_FACTS_OBSERVED_AT,
      updatedAt: KNOWN_FACTS_OBSERVED_AT,
    }),
    subjectChanges: [],
    related: [],
    subjectDeployments: { kind: "not_applicable" },
    subjectWorkflowRuns: workflowRuns,
    subjectOperations: { kind: "not_applicable" },
    subjectReleases: { kind: "not_applicable" },
    subjectIssues: { kind: "not_applicable" },
  };
}

describe("mcp unit tests", () => {
  test("in-memory serialization of Resource preserves identity", () => {
    const resource = createResource({
      provider: "github",
      providerResourceId: "123",
      kind: "repository",
      name: "test-repo",
      metadata: { fullName: "test/repo" },
    });

    const serialized = JSON.parse(JSON.stringify(resource));
    expect(serialized.id).toBe("github:repository:123");
    expect(serialized.provider).toBe("github");
    expect(serialized.kind).toBe("repository");
    expect(serialized.providerResourceId).toBe("123");
    expect(serialized.name).toBe("test-repo");
    expect(typeof serialized.createdAt).toBe("string");
  });

  test("input validation: invalid resource ID errors", () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-"));
    initCombie(dir);
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(createResource({
      provider: "github", providerResourceId: "123", kind: "repository",
      name: "repo", metadata: {},
    }));
    store.close();

    const { getRelatedContext } = require("../../src/app/related") as typeof import("../../src/app/related");
    const { CombieError } = require("../../src/app/errors") as typeof import("../../src/app/errors");

    expect(() => getRelatedContext({ baseDir: dir, resourceRef: "   " })).toThrow(CombieError);

    rmSync(dir, { recursive: true, force: true });
  });

  test("list_resources via app layer returns expected data", () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-2-"));
    initCombie(dir);
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(createResource({
      provider: "github", providerResourceId: "123", kind: "repository",
      name: "repo", metadata: {},
    }));
    store.close();

    const { listResources } = require("../../src/app/list") as typeof import("../../src/app/list");
    const result = listResources({ baseDir: dir });
    expect(result.resources).toHaveLength(1);
    const r = result.resources[0]!;
    expect(r.id).toBe("github:repository:123");
    expect(r.provider).toBe("github");
    expect(r.kind).toBe("repository");
    expect(r.name).toBe("repo");

    rmSync(dir, { recursive: true, force: true });
  });

  test("listProviders via app layer returns expected data", () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-3-"));
    initCombie(dir);
    const store = new Store(dir);
    store.isInitialized();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
      config: { accountId: "12345" },
    });
    store.close();

    const { listProviders } = require("../../src/app/list") as typeof import("../../src/app/list");
    const result = listProviders(dir);
    expect(result.providers).toHaveLength(1);
    expect(result.providers[0]!.id).toBe("github");
    expect(result.providers[0]!.config).toBeDefined();
    expect((result.providers[0]!.config as Record<string, unknown>).accountId).toBe("12345");

    rmSync(dir, { recursive: true, force: true });
  });

  test("listProviders exposes lastAttemptAt when set", () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-3b-"));
    initCombie(dir);
    const store = new Store(dir);
    store.isInitialized();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
      lastSyncAt: "2026-08-18T10:00:00.000Z",
      lastAttemptAt: "2026-08-19T09:00:00.000Z",
      config: { accountId: "12345" },
    });
    store.upsertProvider({
      id: "vercel",
      name: "Vercel",
      status: "connected",
      config: { accountId: "team_1" },
    });
    store.close();

    const { listProviders } = require("../../src/app/list") as typeof import("../../src/app/list");
    const result = listProviders(dir);
    const github = result.providers.find((p) => p.id === "github");
    const vercel = result.providers.find((p) => p.id === "vercel");
    expect(github!.lastAttemptAt).toBe("2026-08-19T09:00:00.000Z");
    expect(vercel!.lastAttemptAt).toBeNull();

    rmSync(dir, { recursive: true, force: true });
  });

  test("getInvestigationContext via app layer returns expected data", () => {
    const dir = mkdtempSync(join(tmpdir(), "combie-mcp-4-"));
    initCombie(dir);
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(createResource({
      provider: "github", providerResourceId: "123", kind: "repository",
      name: "repo", metadata: {},
    }));
    store.close();

    const { getInvestigationContext } = require("../../src/app/investigate") as typeof import("../../src/app/investigate");
    const ctx = getInvestigationContext({ baseDir: dir, resourceRef: "github:repository:123" });
    expect(ctx.subject.id).toBe("github:repository:123");
    expect(Array.isArray(ctx.subjectChanges)).toBe(true);
    expect(Array.isArray(ctx.related)).toBe(true);
    expect(ctx.subjectDeployments).toBeDefined();
    expect(ctx.subjectWorkflowRuns).toBeDefined();

    rmSync(dir, { recursive: true, force: true });
  });

  test("not-initialized error code is consistent", () => {
    const { notInitialized, CombieError } = require("../../src/app/errors") as typeof import("../../src/app/errors");
    const err = notInitialized();
    expect(err).toBeInstanceOf(CombieError);
    expect(err.code).toBe("NOT_INITIALIZED");
    expect(err.message).toContain("combie init");
  });

  test("secrets excluded from error messages", () => {
    const errMsg = "Resource not found: github:repository:999\nList known resources: combie resources";
    expect(errMsg).not.toContain("ghp_");
    expect(errMsg).not.toContain("Bearer");
    expect(errMsg).not.toContain("token");
    expect(errMsg).not.toContain("CLOUDFLARE_API_TOKEN");
    expect(errMsg).not.toContain("GITHUB_TOKEN");
  });

  test("offline reads work without provider credentials", () => {
    for (const key of ["CLOUDFLARE_API_TOKEN", "GITHUB_TOKEN", "GH_TOKEN", "VERCEL_TOKEN", "NEON_API_KEY"]) {
      const prev = process.env[key];
      delete process.env[key];
      try {
        const dir = mkdtempSync(join(tmpdir(), "combie-mcp-off-"));
        initCombie(dir);
        const store = new Store(dir);
        store.isInitialized();
        store.upsertResource(createResource({
          provider: "github", providerResourceId: "123", kind: "repository",
          name: "repo", metadata: {},
        }));
        store.close();

        const { listResources } = require("../../src/app/list") as typeof import("../../src/app/list");
        const result = listResources({ baseDir: dir });
        expect(result.resources).toHaveLength(1);

        rmSync(dir, { recursive: true, force: true });
        break;
      } finally {
        if (prev !== undefined) process.env[key] = prev;
        else delete process.env[key];
      }
    }
  });

  test("serialization handles circular references without crashing", () => {
    const obj: Record<string, unknown> = { name: "test" };
    obj.self = obj;
    const result = safeJson(obj);
    expect(result).toBeDefined();
    const r = result as Record<string, unknown>;
    expect(r.name).toBe("test");
    expect(r.self).toBe("[Circular]");
  });

  test("serialization handles deep nesting without crashing", () => {
    let deep: Record<string, unknown> = { value: "bottom" };
    for (let i = 0; i < 200; i++) {
      deep = { child: deep };
    }
    const result = safeJson(deep);
    expect(result).toBeDefined();
    const serialized = JSON.stringify(result);
    expect(serialized).toContain("[max depth]");
  });

  test("serialization handles BigInt as string", () => {
    const obj = { big: 9007199254740993n };
    const result = safeJson(obj) as Record<string, unknown>;
    expect(result.big).toBe("9007199254740993");
  });

  test("serialization handles Date objects", () => {
    const d = new Date("2024-01-15T12:00:00Z");
    const result = safeJson({ when: d }) as Record<string, unknown>;
    expect(result.when).toBe("2024-01-15T12:00:00.000Z");
  });

  test("investigate knownFacts projection serializes shared authority without Circular placeholders", () => {
    const projected = projectInvestigateResourceLive({
      ctx: knownFactsContext({
        kind: "populated",
        observedAt: KNOWN_FACTS_OBSERVED_AT,
        resultCount: 2,
        runs: [
          knownFactsWorkflowRun({
            runId: 9002,
            conclusion: "failure",
            createdAt: "2026-08-09T09:30:00.000Z",
          }),
          knownFactsWorkflowRun({ runId: 9001, conclusion: "success" }),
        ],
      }),
      resolutionRows: [],
      incidentRows: [],
      investigationRows: [],
    });

    const serialized = JSON.stringify(safeJson(projected.knownFacts));
    expect(serialized).not.toContain("Circular");

    const stateFact = projected.knownFacts.find(
      (fact) => fact.kind === "provider_state_summary",
    );
    expect(stateFact).toBeDefined();
    if (!stateFact || stateFact.kind !== "provider_state_summary") return;
    const groupedRows = [
      ...stateFact.evidence,
      ...stateFact.groups.flatMap((group) => group.evidence),
    ];
    expect(groupedRows.length).toBeGreaterThanOrEqual(2);
    expect(
      groupedRows.every(
        (row) =>
          typeof row.authority === "object" &&
          row.authority !== null &&
          !Array.isArray(row.authority) &&
          row.authority.kind === "populated" &&
          typeof row.authority.refreshObservedAt === "string",
      ),
    ).toBe(true);
  });

  test("minimal investigate context projects empty knownFacts", () => {
    const projected = projectInvestigateResourceLive({
      ctx: knownFactsContext({ kind: "not_applicable" }),
      resolutionRows: [],
      incidentRows: [],
      investigationRows: [],
    });
    expect(projected.knownFacts).toEqual([]);
  });

  test("investigate missingContext projection serializes shared subject scope without Circular placeholders", () => {
    const ctx: InvestigationContext = {
      subject: createResource({
        provider: "github",
        providerResourceId: "missing-ctx-unit",
        kind: "repository",
        name: "missing-ctx-unit",
        metadata: {},
        createdAt: "2026-08-09T12:00:00.000Z",
        updatedAt: "2026-08-09T12:00:00.000Z",
      }),
      subjectChanges: [],
      related: [],
      subjectDeployments: {
        kind: "unknown",
        deployments: [],
        latestAttemptObservedAt: null,
        lastSuccessAt: null,
        resultCount: null,
        message: null,
      },
      subjectWorkflowRuns: {
        kind: "unknown",
        runs: [],
        latestAttemptObservedAt: null,
        lastSuccessAt: null,
        resultCount: null,
        message: null,
      },
      subjectOperations: { kind: "not_applicable" },
      subjectReleases: { kind: "not_applicable" },
      subjectIssues: { kind: "not_applicable" },
    };

    const projected = projectInvestigateResourceLive({
      ctx,
      resolutionRows: [],
      incidentRows: [],
      investigationRows: [],
    });
    const serialized = JSON.stringify(safeJson(projected.missingContext));
    expect(serialized).not.toContain("Circular");

    expect(projected.missingContext.length).toBeGreaterThanOrEqual(2);
    const refreshed = projected.missingContext.filter(
      (item) => item.kind === "never_successfully_refreshed",
    );
    expect(refreshed.length).toBeGreaterThanOrEqual(2);
    for (const item of refreshed) {
      expect(
        typeof item.scope === "object" &&
          item.scope !== null &&
          !Array.isArray(item.scope),
      ).toBe(true);
      expect(item.scope.resourceId).toBe(ctx.subject.id);
      expect(item.scope.role).toBe("subject");
      expect(Array.isArray(item.scope.relationships)).toBe(true);
    }
    const scopes = refreshed.map((item) => item.scope);
    expect(scopes[0]).toEqual(scopes[1]);
    expect(scopes[0]).not.toBe(scopes[1]);

    expect(projected.missingContext).toEqual(composeMissingContext(ctx));
  });

  test("minimal investigate context projects empty missingContext", () => {
    const subject = createResource({
      provider: "vercel",
      providerResourceId: "missing-ctx-empty",
      kind: "project",
      name: "missing-ctx-empty",
      metadata: {},
      createdAt: "2026-08-09T12:00:00.000Z",
      updatedAt: "2026-08-09T12:00:00.000Z",
    });
    const neighbor = createResource({
      provider: "github",
      providerResourceId: "missing-ctx-empty-repo",
      kind: "repository",
      name: "missing-ctx-empty-repo",
      metadata: {},
      createdAt: "2026-08-09T12:00:00.000Z",
      updatedAt: "2026-08-09T12:00:00.000Z",
    });
    const ctx: InvestigationContext = {
      subject,
      subjectChanges: [],
      related: [
        {
          relationship: createRelationship({
            sourceResourceId: subject.id,
            targetResourceId: neighbor.id,
            kind: "source_for",
            evidence: {
              source: "vercel",
              mechanism: "git_repository_reference",
            },
          }),
          direction: "outbound",
          resource: null,
          changes: [],
          deployments: { kind: "not_applicable" },
          workflowRuns: { kind: "not_applicable" },
          operations: { kind: "not_applicable" },
          releases: { kind: "not_applicable" },
          issues: { kind: "not_applicable" },
        },
      ],
      subjectDeployments: { kind: "not_applicable" },
      subjectWorkflowRuns: { kind: "not_applicable" },
      subjectOperations: { kind: "not_applicable" },
      subjectReleases: { kind: "not_applicable" },
      subjectIssues: { kind: "not_applicable" },
    };

    const projected = projectInvestigateResourceLive({
      ctx,
      resolutionRows: [],
      incidentRows: [],
      investigationRows: [],
    });
    expect(projected.missingContext).toEqual([]);
    expect(
      JSON.stringify(safeJson(projected.missingContext)),
    ).not.toContain("Circular");
  });

  test("getCombieRoot normalizes relative paths", () => {
    const result = getCombieRoot("./sub/../.combie");
    expect(result).toBe(resolve(process.cwd(), ".combie"));
  });

  test("getCombieRoot resolves absolute paths", () => {
    const result = getCombieRoot("/tmp/combie-test");
    expect(result).toBe("/tmp/combie-test");
  });

  test("default getCombieRoot returns cwd/.combie", () => {
    const result = getCombieRoot();
    expect(result).toBe(resolve(process.cwd(), ".combie"));
  });
});

describe("cycle-free providerActivity / timeline projection", () => {
  const ACTIVITY_OBSERVED_AT = KNOWN_FACTS_OBSERVED_AT;

  function activityChange(id: string, observedAt: string): Change {
    return createChange({
      id,
      resourceId: "github:repository:101",
      kind: "updated",
      observedAt,
      fields: [{ path: "name", before: "old", after: "new" }],
    });
  }

  test("rich provider activity with ≥2 subject entries serializes without Circular", () => {
    const projected = projectInvestigateResourceLive({
      ctx: knownFactsContext({
        kind: "populated",
        observedAt: ACTIVITY_OBSERVED_AT,
        resultCount: 2,
        runs: [
          knownFactsWorkflowRun({
            runId: 9002,
            createdAt: "2026-08-09T09:30:00.000Z",
          }),
          knownFactsWorkflowRun({ runId: 9001 }),
        ],
      }),
      resolutionRows: [],
      incidentRows: [],
      investigationRows: [],
    });

    const serialized = JSON.stringify(safeJson(projected.providerActivity));
    expect(serialized).not.toContain("Circular");
    expect(projected.providerActivity.entries.length).toBeGreaterThanOrEqual(2);
    for (const entry of projected.providerActivity.entries) {
      expect(Array.isArray(entry.relationships)).toBe(true);
      expect(
        typeof entry.evidence === "object" &&
          entry.evidence !== null &&
          !Array.isArray(entry.evidence),
      ).toBe(true);
      expect(entry.evidence).not.toBe("[Circular]");
    }
  });

  test("related multi-entry shared relationships serialize without Circular", () => {
    const subject = createResource({
      provider: "vercel",
      providerResourceId: "prj_abc",
      kind: "project",
      name: "site",
      metadata: {},
      createdAt: ACTIVITY_OBSERVED_AT,
      updatedAt: ACTIVITY_OBSERVED_AT,
    });
    const neighbor = createResource({
      provider: "github",
      providerResourceId: "202",
      kind: "repository",
      name: "site-repo",
      metadata: {},
      createdAt: ACTIVITY_OBSERVED_AT,
      updatedAt: ACTIVITY_OBSERVED_AT,
    });
    const relationship = createRelationship({
      sourceResourceId: neighbor.id,
      targetResourceId: subject.id,
      kind: "source_for",
      evidence: { source: "vercel", mechanism: "git_repository_reference" },
      createdAt: ACTIVITY_OBSERVED_AT,
      updatedAt: ACTIVITY_OBSERVED_AT,
    });
    const ctx: InvestigationContext = {
      subject,
      subjectChanges: [],
      related: [
        {
          relationship,
          direction: "inbound",
          resource: neighbor,
          changes: [],
          deployments: { kind: "not_applicable" },
          workflowRuns: {
            kind: "populated",
            observedAt: ACTIVITY_OBSERVED_AT,
            resultCount: 2,
            runs: [
              knownFactsWorkflowRun({
                resourceId: neighbor.id,
                repositoryId: "202",
                runId: 9004,
                createdAt: "2026-08-09T09:45:00.000Z",
              }),
              knownFactsWorkflowRun({
                resourceId: neighbor.id,
                repositoryId: "202",
                runId: 9003,
                createdAt: "2026-08-09T09:15:00.000Z",
              }),
            ],
          },
          operations: { kind: "not_applicable" },
          releases: { kind: "not_applicable" },
          issues: { kind: "not_applicable" },
        },
      ],
      subjectDeployments: { kind: "not_applicable" },
      subjectWorkflowRuns: { kind: "not_applicable" },
      subjectOperations: { kind: "not_applicable" },
      subjectReleases: { kind: "not_applicable" },
      subjectIssues: { kind: "not_applicable" },
    };

    const projected = projectInvestigateResourceLive({
      ctx,
      resolutionRows: [],
      incidentRows: [],
      investigationRows: [],
    });

    const serialized = JSON.stringify(safeJson(projected.providerActivity));
    expect(serialized).not.toContain("Circular");

    const relatedEntries = projected.providerActivity.entries.filter(
      (entry) => entry.role === "related",
    );
    expect(relatedEntries.length).toBeGreaterThanOrEqual(2);
    for (const entry of relatedEntries) {
      expect(Array.isArray(entry.relationships)).toBe(true);
      expect(entry.relationships.length).toBeGreaterThanOrEqual(1);
      const rel = entry.relationships[0]!;
      expect(rel.direction).toBe("inbound");
      expect(
        typeof rel.relationship === "object" &&
          rel.relationship !== null &&
          !Array.isArray(rel.relationship),
      ).toBe(true);
    }
  });

  test("rich timeline with ≥2 subject changes serializes without Circular", () => {
    const ctx = knownFactsContext({ kind: "not_applicable" });
    ctx.subjectChanges = [
      activityChange("chg-1", "2026-08-09T08:00:00.000Z"),
      activityChange("chg-2", "2026-08-09T09:00:00.000Z"),
    ];

    const projected = projectInvestigateResourceLive({
      ctx,
      resolutionRows: [],
      incidentRows: [],
      investigationRows: [],
    });

    const serialized = JSON.stringify(safeJson(projected.timeline));
    expect(serialized).not.toContain("Circular");
    expect(projected.timeline.entries.length).toBeGreaterThanOrEqual(2);
    for (const entry of projected.timeline.entries) {
      expect(
        typeof entry.resource === "object" &&
          entry.resource !== null &&
          !Array.isArray(entry.resource),
      ).toBe(true);
      expect(entry.resource.id).toBe(ctx.subject.id);
      expect(Array.isArray(entry.change.fields)).toBe(true);
    }
  });

  test("related multi-change timeline serializes shared relationships without Circular", () => {
    const subject = createResource({
      provider: "github",
      providerResourceId: "101",
      kind: "repository",
      name: "repo",
      metadata: {},
      createdAt: ACTIVITY_OBSERVED_AT,
      updatedAt: ACTIVITY_OBSERVED_AT,
    });
    const neighbor = createResource({
      provider: "vercel",
      providerResourceId: "prj_xyz",
      kind: "project",
      name: "site",
      metadata: {},
      createdAt: ACTIVITY_OBSERVED_AT,
      updatedAt: ACTIVITY_OBSERVED_AT,
    });
    const relationship = createRelationship({
      sourceResourceId: subject.id,
      targetResourceId: neighbor.id,
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "org/repo",
      },
      createdAt: ACTIVITY_OBSERVED_AT,
      updatedAt: ACTIVITY_OBSERVED_AT,
    });
    const ctx: InvestigationContext = {
      subject,
      subjectChanges: [],
      related: [
        {
          relationship,
          direction: "outbound",
          resource: neighbor,
          changes: [
            createChange({
              id: "chg-r1",
              resourceId: neighbor.id,
              kind: "updated",
              observedAt: "2026-08-09T08:30:00.000Z",
              fields: [{ path: "name", before: "a", after: "b" }],
            }),
            createChange({
              id: "chg-r2",
              resourceId: neighbor.id,
              kind: "updated",
              observedAt: "2026-08-09T08:45:00.000Z",
              fields: [{ path: "name", before: "b", after: "c" }],
            }),
          ],
          deployments: { kind: "not_applicable" },
          workflowRuns: { kind: "not_applicable" },
          operations: { kind: "not_applicable" },
          releases: { kind: "not_applicable" },
          issues: { kind: "not_applicable" },
        },
      ],
      subjectDeployments: { kind: "not_applicable" },
      subjectWorkflowRuns: { kind: "not_applicable" },
      subjectOperations: { kind: "not_applicable" },
      subjectReleases: { kind: "not_applicable" },
      subjectIssues: { kind: "not_applicable" },
    };

    const projected = projectInvestigateResourceLive({
      ctx,
      resolutionRows: [],
      incidentRows: [],
      investigationRows: [],
    });

    const serialized = JSON.stringify(safeJson(projected.timeline));
    expect(serialized).not.toContain("Circular");

    const relatedEntries = projected.timeline.entries.filter(
      (entry) => entry.role === "related",
    );
    expect(relatedEntries.length).toBeGreaterThanOrEqual(2);
    for (const entry of relatedEntries) {
      expect(Array.isArray(entry.relationships)).toBe(true);
      expect(entry.relationships.length).toBeGreaterThanOrEqual(1);
      const rel = entry.relationships[0]!;
      expect(
        typeof rel.relationship === "object" &&
          rel.relationship !== null &&
          !Array.isArray(rel.relationship),
      ).toBe(true);
      expect(
        typeof rel.relationship.evidence === "object" &&
          rel.relationship.evidence !== null &&
          !Array.isArray(rel.relationship.evidence),
      ).toBe(true);
    }
  });

  test("minimal context projects empty providerActivity and timeline entries", () => {
    const projected = projectInvestigateResourceLive({
      ctx: knownFactsContext({ kind: "not_applicable" }),
      resolutionRows: [],
      incidentRows: [],
      investigationRows: [],
    });
    expect(projected.providerActivity.entries).toEqual([]);
    expect(projected.timeline.entries).toEqual([]);
    expect(
      JSON.stringify(safeJson(projected.providerActivity)),
    ).not.toContain("Circular");
    expect(
      JSON.stringify(safeJson(projected.timeline)),
    ).not.toContain("Circular");
  });
});
