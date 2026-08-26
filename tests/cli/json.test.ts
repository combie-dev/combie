import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getResourceContext } from "../../src/app/context.ts";
import { getInvestigationContext } from "../../src/app/investigate.ts";
import { listIncidentsForSubject } from "../../src/app/incidents.ts";
import {
  getInvestigationArtifact,
  getSavedInvestigation,
  listInvestigations,
  saveInvestigation,
} from "../../src/app/investigations.ts";
import { listProviders, listResources } from "../../src/app/list.ts";
import { getRelatedContext } from "../../src/app/related.ts";
import { listResolutions } from "../../src/app/resolutions.ts";
import { main } from "../../src/cli/index.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import {
  projectInvestigateResourceLive,
  projectInvestigationRetrieve,
  projectListInvestigations,
  projectListProviders,
  projectListResources,
  projectRelatedContext,
  projectResourceContext,
} from "../../src/mcp/projections.ts";
import { safeJson } from "../../src/mcp/serialization.ts";
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

describe("CLI MCP-parity --json", () => {
  let dir: string;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "combie-cli-json-"));
    await capture(() => main(["init", "--dir", dir]));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("providers emits a valid known-empty JSON document", async () => {
    const result = await capture(() =>
      main(["providers", "--json", "--dir", dir]),
    );

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toEqual({ providers: [] });
  });

  test("providers shares the MCP projection and omits a null attempt clock", async () => {
    const store = new Store(dir);
    store.isInitialized();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
      lastSyncAt: "2026-08-19T12:00:00.000Z",
      config: { accountId: "123", accountName: "acme" },
    });
    store.close();

    const result = await capture(() =>
      main(["providers", "--json", "--dir", dir]),
    );
    const expected = safeJson(
      projectListProviders(listProviders(dir).providers),
    );

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(expected);
    expect(JSON.parse(result.stdout).providers[0]).not.toHaveProperty(
      "lastAttemptAt",
    );
  });

  test("resources shares identity projection and preserves filters", async () => {
    const github = createResource({
      provider: "github",
      providerResourceId: "repo-json",
      kind: "repository",
      name: "repo-json",
      metadata: { private: true },
    });
    const vercel = createResource({
      provider: "vercel",
      providerResourceId: "project-json",
      kind: "project",
      name: "project-json",
      metadata: {},
    });
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(github);
    store.upsertResource(vercel);
    store.close();

    const result = await capture(() =>
      main([
        "resources",
        "--provider",
        "github",
        "--kind",
        "repository",
        "--json",
        "--dir",
        dir,
      ]),
    );
    const expectedResources = listResources({
      baseDir: dir,
      provider: "github",
      kind: "repository",
    }).resources;

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(
      safeJson(projectListResources(expectedResources)),
    );
    expect(JSON.parse(result.stdout).resources).toEqual([
      {
        id: github.id,
        provider: "github",
        kind: "repository",
        providerResourceId: "repo-json",
        name: "repo-json",
      },
    ]);
  });

  test("related shares the MCP subject and relationship projection", async () => {
    const repository = createResource({
      provider: "github",
      providerResourceId: "related-repo",
      kind: "repository",
      name: "related-repo",
      metadata: {},
    });
    const project = createResource({
      provider: "vercel",
      providerResourceId: "related-project",
      kind: "project",
      name: "related-project",
      metadata: {},
    });
    const store = new Store(dir);
    store.isInitialized();
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
          repository: "acme/related-repo",
        },
      }),
    );
    store.close();

    const result = await capture(() =>
      main(["related", repository.id, "--json", "--dir", dir]),
    );
    const expected = safeJson(
      projectRelatedContext(
        getRelatedContext({ baseDir: dir, resourceRef: repository.id }),
      ),
    );

    const parsed = JSON.parse(result.stdout);
    expect(result.code).toBe(0);
    expect(parsed).toEqual(expected);
    expect(parsed.related[0].relationship.lastVerifiedAt).toBeDefined();
    expect(parsed.related[0].relationship).not.toHaveProperty(
      "lastRequiredProviderAttemptAt",
    );
    expect(parsed.related[0].relationship).not.toHaveProperty("updatedAt");
    expect(parsed).not.toHaveProperty("missingContext");
    expect(parsed).not.toHaveProperty("paths");
  });

  test("related --json names no_known_relationships when related is empty", async () => {
    const repository = createResource({
      provider: "github",
      providerResourceId: "empty-related",
      kind: "repository",
      name: "empty-related",
      metadata: {},
    });
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(repository);
    store.close();

    const result = await capture(() =>
      main(["related", repository.id, "--json", "--dir", dir]),
    );
    const parsed = JSON.parse(result.stdout);

    expect(result.code).toBe(0);
    expect(parsed.related).toEqual([]);
    expect(parsed.missingContext).toEqual([
      {
        kind: "no_known_relationships",
        scope: {
          resourceId: repository.id,
          role: "subject",
          relationships: [],
        },
      },
    ]);
    expect(parsed).toEqual(
      safeJson(
        projectRelatedContext(
          getRelatedContext({ baseDir: dir, resourceRef: repository.id }),
        ),
      ),
    );
  });

  test("related --json includes two-hop paths; context --json omits them", async () => {
    const repository = createResource({
      provider: "github",
      providerResourceId: "path-repo",
      kind: "repository",
      name: "path-repo",
      metadata: {},
    });
    const project = createResource({
      provider: "vercel",
      providerResourceId: "path-project",
      kind: "project",
      name: "path-project",
      metadata: {},
    });
    const zone = createResource({
      provider: "cloudflare",
      providerResourceId: "path-zone",
      kind: "zone",
      name: "example.com",
      metadata: {},
    });
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(repository);
    store.upsertResource(project);
    store.upsertResource(zone);
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: repository.id,
        targetResourceId: project.id,
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "acme/path-repo",
        },
      }),
    );
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: project.id,
        targetResourceId: zone.id,
        kind: "uses_domain_in",
        evidence: {
          source: "vercel",
          mechanism: "custom_domain_apex",
          apexName: "example.com",
        },
      }),
    );
    store.close();

    const relatedResult = await capture(() =>
      main(["related", repository.id, "--json", "--dir", dir]),
    );
    const contextResult = await capture(() =>
      main(["context", repository.id, "--json", "--dir", dir]),
    );
    const investigateResult = await capture(() =>
      main(["investigate", repository.id, "--json", "--dir", dir]),
    );
    const relatedParsed = JSON.parse(relatedResult.stdout);
    const contextParsed = JSON.parse(contextResult.stdout);
    const investigateParsed = JSON.parse(investigateResult.stdout);

    expect(relatedResult.code).toBe(0);
    expect(relatedParsed.related).toHaveLength(1);
    expect(relatedParsed.paths).toHaveLength(1);
    expect(relatedParsed.paths[0].viaResourceId).toBe(project.id);
    expect(relatedParsed.paths[0].farResourceId).toBe(zone.id);
    expect(relatedParsed.paths[0].hops).toHaveLength(2);
    expect(relatedParsed.paths[0].hops[0].relationship.kind).toBe("source_for");
    expect(relatedParsed.paths[0].hops[1].relationship.kind).toBe(
      "uses_domain_in",
    );
    expect(contextParsed).not.toHaveProperty("paths");
    expect(investigateParsed.related).toHaveLength(1);
    expect(investigateParsed.paths).toHaveLength(1);
    expect(investigateParsed.paths[0].farResourceId).toBe(zone.id);
  });

  test("context shares the MCP-parity projection and omits null clocks", async () => {
    const repository = createResource({
      provider: "github",
      providerResourceId: "context-repo",
      kind: "repository",
      name: "context-repo",
      metadata: { fullName: "acme/context-repo" },
    });
    const project = createResource({
      provider: "vercel",
      providerResourceId: "context-project",
      kind: "project",
      name: "context-project",
      metadata: {},
    });
    const store = new Store(dir);
    store.isInitialized();
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
          repository: "acme/context-repo",
        },
      }),
    );
    store.close();

    const result = await capture(() =>
      main(["context", repository.id, "--json", "--dir", dir]),
    );
    const expected = safeJson(
      projectResourceContext(
        getResourceContext({ baseDir: dir, resourceRef: repository.id }),
      ),
    );
    const parsed = JSON.parse(result.stdout);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(parsed).toEqual(expected);
    expect(parsed.subject.updatedAt).toBeDefined();
    expect(parsed.subject).not.toHaveProperty("lastSuccessfulProviderSyncAt");
    expect(parsed.subject).not.toHaveProperty("lastProviderSyncAttemptAt");
    expect(parsed.subject).not.toHaveProperty("lastSuccessfulDiscovery");
    expect(parsed.subject).not.toHaveProperty("lastDiscoveryResourceIds");
    expect(parsed.subject).not.toHaveProperty("metadata");
    expect(parsed.subject).not.toHaveProperty("createdAt");
    expect(parsed).not.toHaveProperty("missingContext");
    expect(parsed).not.toHaveProperty("knownFacts");
    expect(parsed.related[0].relationship.lastVerifiedAt).toBeDefined();
    expect(parsed.changes).toEqual([]);
  });

  test("context --json includes clocks and membership when recorded and matches related --json neighbors", async () => {
    const syncedAt = "2026-08-21T10:00:00.000Z";
    const attemptedAt = "2026-08-21T10:30:00.000Z";
    const repository = createResource({
      provider: "github",
      providerResourceId: "context-clocks",
      kind: "repository",
      name: "context-clocks",
      metadata: {},
    });
    const project = createResource({
      provider: "vercel",
      providerResourceId: "context-clocks-prj",
      kind: "project",
      name: "context-clocks-prj",
      metadata: {},
    });
    const store = new Store(dir);
    store.isInitialized();
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
          repository: "acme/context-clocks",
        },
      }),
    );
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
      lastSyncAt: syncedAt,
      lastAttemptAt: attemptedAt,
      config: { accountId: "123", accountName: "acme" },
    });
    store.setLastDiscoveryResourceIds("github", [repository.id]);
    store.close();

    const result = await capture(() =>
      main(["context", repository.id, "--json", "--dir", dir]),
    );
    const parsed = JSON.parse(result.stdout);
    const relatedResult = await capture(() =>
      main(["related", repository.id, "--json", "--dir", dir]),
    );
    const relatedParsed = JSON.parse(relatedResult.stdout);

    expect(result.code).toBe(0);
    expect(parsed.subject.lastSuccessfulProviderSyncAt).toBe(syncedAt);
    expect(parsed.subject.lastProviderSyncAttemptAt).toBe(attemptedAt);
    expect(parsed.subject.lastSuccessfulDiscovery).toBe("included");
    expect(parsed.subject).not.toHaveProperty("lastDiscoveryResourceIds");
    expect(parsed.related).toEqual(relatedParsed.related);
  });

  test("context --json omits missingContext even when related is empty", async () => {
    const repository = createResource({
      provider: "github",
      providerResourceId: "context-empty",
      kind: "repository",
      name: "context-empty",
      metadata: {},
    });
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(repository);
    store.close();

    const contextResult = await capture(() =>
      main(["context", repository.id, "--json", "--dir", dir]),
    );
    const relatedResult = await capture(() =>
      main(["related", repository.id, "--json", "--dir", dir]),
    );
    const contextParsed = JSON.parse(contextResult.stdout);
    const relatedParsed = JSON.parse(relatedResult.stdout);

    expect(contextResult.code).toBe(0);
    expect(contextParsed.related).toEqual([]);
    expect(contextParsed).not.toHaveProperty("missingContext");
    expect(relatedParsed.related).toEqual([]);
    expect(relatedParsed.missingContext[0].kind).toBe("no_known_relationships");
    expect(relatedParsed).not.toHaveProperty("paths");
    expect(contextParsed).not.toHaveProperty("paths");
  });

  test("omitting --json keeps human context output", async () => {
    const resource = createResource({
      provider: "github",
      providerResourceId: "human-context",
      kind: "repository",
      name: "human-context",
      metadata: {},
    });
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(resource);
    store.close();

    const result = await capture(() =>
      main(["context", resource.id, "--dir", dir]),
    );
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("CURRENT");
    expect(result.stdout).toContain("RELATED");
    expect(result.stdout).toContain("CHANGES");
  });

  test("investigate live projection includes lastRequiredProviderAttemptAt when context supplies attempts", async () => {
    const verifiedAt = "2026-08-19T12:00:00.000Z";
    const attemptAt = "2026-08-19T12:30:00.000Z";
    const repository = createResource({
      provider: "github",
      providerResourceId: "investigate-clocks",
      kind: "repository",
      name: "investigate-clocks",
      metadata: {},
    });
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj-clocks",
      kind: "project",
      name: "prj-clocks",
      metadata: {},
    });
    const store = new Store(dir);
    store.isInitialized();
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
          repository: "acme/investigate-clocks",
        },
        createdAt: verifiedAt,
        updatedAt: verifiedAt,
      }),
    );
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: repository.id,
    });
    const projected = projectInvestigateResourceLive({
      ctx: {
        ...ctx,
        providerLastAttemptAt: { github: attemptAt, vercel: null },
      } as typeof ctx,
      resolutionRows: [],
      incidentRows: [],
      investigationRows: [],
    });
    const relationship = projected.related[0]?.relationship as {
      lastVerifiedAt?: string;
      lastRequiredProviderAttemptAt?: string;
      createdAt?: string;
      updatedAt?: string;
    };
    expect(relationship.lastVerifiedAt).toBe(verifiedAt);
    expect(relationship.lastRequiredProviderAttemptAt).toBe(attemptAt);
    expect(relationship).not.toHaveProperty("createdAt");
    expect(relationship).not.toHaveProperty("updatedAt");
  });

  test("investigate shares the live MCP projection and omits empty memory", async () => {
    const resource = createResource({
      provider: "github",
      providerResourceId: "investigate-json",
      kind: "repository",
      name: "investigate-json",
      metadata: { fullName: "acme/investigate-json" },
    });
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(resource);
    store.close();

    const result = await capture(() =>
      main(["investigate", resource.id, "--json", "--dir", dir]),
    );
    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: resource.id,
    });
    const expected = safeJson(
      projectInvestigateResourceLive({
        ctx,
        resolutionRows: listResolutions(dir, {
          subjectResourceId: resource.id,
        }),
        incidentRows: listIncidentsForSubject(dir, resource.id),
        investigationRows: listInvestigations(dir, {
          subjectResourceId: resource.id,
        }),
      }),
    );
    const parsed = JSON.parse(result.stdout);

    expect(result.code).toBe(0);
    expect(parsed).toEqual(expected);
    expect(JSON.stringify(parsed.knownFacts)).not.toContain("Circular");
    expect(JSON.stringify(parsed.providerActivity)).not.toContain("Circular");
    expect(JSON.stringify(parsed.timeline)).not.toContain("Circular");
    expect(parsed).not.toHaveProperty("resolutionMemory");
    expect(parsed).not.toHaveProperty("incidentMemory");
    expect(parsed).not.toHaveProperty("investigationHistory");
    expect(parsed.subject).not.toHaveProperty("lastSuccessfulDiscovery");
  });

  test("investigate --json projects empty knownFacts when no activity family applies", async () => {
    const resource = createResource({
      provider: "cloudflare",
      providerResourceId: "worker-facts-empty",
      kind: "worker",
      name: "worker-facts-empty",
      metadata: {},
    });
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(resource);
    store.close();

    const result = await capture(() =>
      main(["investigate", resource.id, "--json", "--dir", dir]),
    );
    const parsed = JSON.parse(result.stdout);

    expect(result.code).toBe(0);
    expect(parsed.knownFacts).toEqual([]);
  });

  test("investigate --json serializes rich knownFacts without Circular placeholders", async () => {
    const repository = createResource({
      provider: "github",
      providerResourceId: "facts-json",
      kind: "repository",
      name: "acme/facts-json",
      metadata: { fullName: "acme/facts-json" },
    });
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(repository);
    for (const run of [
      {
        provider: "github" as const,
        runId: 9001,
        resourceId: repository.id,
        repositoryId: "facts-json",
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
        observedAt: "2026-08-09T12:00:00.000Z",
      },
      {
        provider: "github" as const,
        runId: 9002,
        resourceId: repository.id,
        repositoryId: "facts-json",
        workflowId: 55,
        name: "ci",
        runNumber: 13,
        runAttempt: 1,
        event: "push",
        status: "completed",
        conclusion: "failure",
        headBranch: "main",
        headSha: "def456",
        createdAt: "2026-08-09T09:30:00.000Z",
        runStartedAt: null,
        updatedAt: null,
        observedAt: "2026-08-09T12:00:00.000Z",
      },
    ]) {
      store.upsertGitHubWorkflowRun(run);
    }
    store.setGitHubWorkflowRunRefresh({
      resourceId: repository.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 2,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.close();

    const result = await capture(() =>
      main(["investigate", repository.id, "--json", "--dir", dir]),
    );
    const parsed = JSON.parse(result.stdout);

    expect(result.code).toBe(0);
    expect(parsed.knownFacts.length).toBeGreaterThan(0);
    expect(JSON.stringify(parsed.knownFacts)).not.toContain("Circular");

    const stateFact = parsed.knownFacts.find(
      (fact: { kind: string }) => fact.kind === "provider_state_summary",
    );
    expect(stateFact).toBeDefined();
    const groupedRows = [
      ...stateFact.evidence,
      ...stateFact.groups.flatMap((group: { evidence: unknown[] }) => group.evidence),
    ];
    expect(groupedRows.length).toBeGreaterThanOrEqual(2);
    expect(
      groupedRows.every(
        (row: { authority: { kind: string } }) =>
          typeof row.authority === "object" &&
          row.authority.kind === "populated",
      ),
    ).toBe(true);

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: repository.id,
    });
    const expected = safeJson(
      projectInvestigateResourceLive({
        ctx,
        resolutionRows: listResolutions(dir, {
          subjectResourceId: repository.id,
        }),
        incidentRows: listIncidentsForSubject(dir, repository.id),
        investigationRows: listInvestigations(dir, {
          subjectResourceId: repository.id,
        }),
      }),
    );
    expect(parsed).toEqual(expected);
  });

  test("investigate --json serializes rich providerActivity and timeline without Circular placeholders", async () => {
    const repository = createResource({
      provider: "github",
      providerResourceId: "activity-json",
      kind: "repository",
      name: "acme/activity-json",
      metadata: { fullName: "acme/activity-json" },
    });
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj-activity-json",
      kind: "project",
      name: "activity-json",
      metadata: {},
    });
    const store = new Store(dir);
    store.isInitialized();
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
          repository: "acme/activity-json",
          githubRepoId: "activity-json",
        },
      }),
    );
    for (const run of [
      {
        provider: "github" as const,
        runId: 9101,
        resourceId: repository.id,
        repositoryId: "activity-json",
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
        observedAt: "2026-08-09T12:00:00.000Z",
      },
      {
        provider: "github" as const,
        runId: 9102,
        resourceId: repository.id,
        repositoryId: "activity-json",
        workflowId: 55,
        name: "ci",
        runNumber: 13,
        runAttempt: 1,
        event: "push",
        status: "completed",
        conclusion: "failure",
        headBranch: "main",
        headSha: "def456",
        createdAt: "2026-08-09T09:30:00.000Z",
        runStartedAt: null,
        updatedAt: null,
        observedAt: "2026-08-09T12:00:00.000Z",
      },
    ]) {
      store.upsertGitHubWorkflowRun(run);
    }
    store.setGitHubWorkflowRunRefresh({
      resourceId: repository.id,
      status: "success",
      observedAt: "2026-08-09T12:00:00.000Z",
      message: null,
      resultCount: 2,
      lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
    });
    store.applyResource(repository, {
      id: "repo-baseline",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.applyResource(
      {
        ...repository,
        name: "acme/activity-json-renamed",
        metadata: { fullName: "acme/activity-json", private: true },
      },
      { id: "repo-change-1", observedAt: "2026-08-08T09:00:00.000Z" },
    );
    store.applyResource(
      {
        ...repository,
        metadata: {
          fullName: "acme/activity-json",
          private: true,
          archived: false,
        },
      },
      { id: "repo-change-2", observedAt: "2026-08-08T10:00:00.000Z" },
    );
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: repository.id,
    });
    expect(ctx.subjectChanges.length).toBeGreaterThanOrEqual(2);

    const result = await capture(() =>
      main(["investigate", repository.id, "--json", "--dir", dir]),
    );
    const parsed = JSON.parse(result.stdout);

    expect(result.code).toBe(0);
    expect(JSON.stringify(parsed.providerActivity)).not.toContain("Circular");
    expect(parsed.providerActivity.entries.length).toBeGreaterThanOrEqual(2);
    expect(
      parsed.providerActivity.entries.every(
        (entry: { relationships: unknown; evidence: unknown }) =>
          Array.isArray(entry.relationships) &&
          typeof entry.evidence === "object" &&
          entry.evidence !== null,
      ),
    ).toBe(true);

    expect(JSON.stringify(parsed.timeline)).not.toContain("Circular");
    expect(parsed.timeline.entries.length).toBeGreaterThanOrEqual(2);
    expect(
      parsed.timeline.entries.every(
        (entry: { resource: { id: string }; change: { fields: unknown } }) =>
          typeof entry.resource === "object" &&
          entry.resource !== null &&
          entry.resource.id === repository.id &&
          typeof entry.change === "object" &&
          entry.change !== null &&
          Array.isArray(entry.change.fields),
      ),
    ).toBe(true);

    const expected = safeJson(
      projectInvestigateResourceLive({
        ctx,
        resolutionRows: listResolutions(dir, {
          subjectResourceId: repository.id,
        }),
        incidentRows: listIncidentsForSubject(dir, repository.id),
        investigationRows: listInvestigations(dir, {
          subjectResourceId: repository.id,
        }),
      }),
    );
    expect(parsed).toEqual(expected);
  });

  test("investigate --json serializes cycle-free missingContext without Circular placeholders", async () => {
    const project = createResource({
      provider: "sentry",
      providerResourceId: "missing-ctx-cli",
      kind: "project",
      name: "missing-ctx-cli",
      metadata: {},
    });
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(project);
    store.close();

    const result = await capture(() =>
      main(["investigate", project.id, "--json", "--dir", dir]),
    );
    const parsed = JSON.parse(result.stdout);

    expect(result.code).toBe(0);
    expect(JSON.stringify(parsed.missingContext)).not.toContain("Circular");
    const refreshed = parsed.missingContext.filter(
      (item: { kind: string }) => item.kind === "never_successfully_refreshed",
    );
    expect(refreshed.length).toBeGreaterThanOrEqual(2);
    for (const item of refreshed) {
      expect(typeof item.scope === "object" && item.scope !== null).toBe(true);
      expect(item.scope.resourceId).toBe(project.id);
      expect(item.scope.role).toBe("subject");
      expect(Array.isArray(item.scope.relationships)).toBe(true);
    }
    const scopes = refreshed.map(
      (item: { scope: unknown }) => item.scope as Record<string, unknown>,
    );
    expect(scopes[0]).toEqual(scopes[1]);
    expect(scopes[0]).not.toBe(scopes[1]);

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });
    const expected = safeJson(
      projectInvestigateResourceLive({
        ctx,
        resolutionRows: listResolutions(dir, {
          subjectResourceId: project.id,
        }),
        incidentRows: listIncidentsForSubject(dir, project.id),
        investigationRows: listInvestigations(dir, {
          subjectResourceId: project.id,
        }),
      }),
    );
    expect(parsed).toEqual(expected);
  });

  test("investigate --json omits lastSuccessfulDiscovery when unset and includes it when context supplies it", async () => {
    const resource = createResource({
      provider: "github",
      providerResourceId: "investigate-membership",
      kind: "repository",
      name: "investigate-membership",
      metadata: {},
    });
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(resource);
    store.close();

    const result = await capture(() =>
      main(["investigate", resource.id, "--json", "--dir", dir]),
    );
    const parsed = JSON.parse(result.stdout);
    expect(result.code).toBe(0);
    expect(parsed.subject).not.toHaveProperty("lastSuccessfulDiscovery");
    expect(parsed.subject).not.toHaveProperty("lastDiscoveryResourceIds");

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: resource.id,
    });
    const included = projectInvestigateResourceLive({
      ctx: {
        ...ctx,
        lastSuccessfulDiscovery: "included",
      } as typeof ctx,
      resolutionRows: [],
      incidentRows: [],
      investigationRows: [],
    });
    expect(included.subject.lastSuccessfulDiscovery).toBe("included");
    expect(included.subject).not.toHaveProperty("lastDiscoveryResourceIds");

    const absent = projectInvestigateResourceLive({
      ctx: {
        ...ctx,
        lastSuccessfulDiscovery: "not_in_last_successful_discovery",
      } as typeof ctx,
      resolutionRows: [],
      incidentRows: [],
      investigationRows: [],
    });
    expect(absent.subject.lastSuccessfulDiscovery).toBe(
      "not_in_last_successful_discovery",
    );
    expect(absent.subject).not.toHaveProperty("lastDiscoveryResourceIds");
  });

  test("omitting --json preserves human output", async () => {
    const providers = await capture(() => main(["providers", "--dir", dir]));
    expect(providers.code).toBe(0);
    expect(providers.stdout).toContain("No providers connected");

    const resource = createResource({
      provider: "github",
      providerResourceId: "human",
      kind: "repository",
      name: "human",
      metadata: {},
    });
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(resource);
    store.close();
    const investigate = await capture(() =>
      main(["investigate", resource.id, "--dir", dir]),
    );
    expect(investigate.code).toBe(0);
    expect(investigate.stdout).toContain("SUBJECT");
  });

  test("investigations --json is known-empty and shares the MCP list projection", async () => {
    const empty = await capture(() =>
      main(["investigations", "--json", "--dir", dir]),
    );
    expect(empty.code).toBe(0);
    expect(JSON.parse(empty.stdout)).toEqual({ investigations: [] });

    const github = createResource({
      provider: "github",
      providerResourceId: "inv-json",
      kind: "repository",
      name: "inv-json",
      metadata: {},
    });
    const sentry = createResource({
      provider: "sentry",
      providerResourceId: "450",
      kind: "project",
      name: "sentry-json",
      metadata: {},
    });
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(github);
    store.upsertResource(sentry);
    store.close();
    const first = saveInvestigation({
      baseDir: dir,
      resourceRef: github.id,
      composedAt: "2026-08-16T10:00:00.000Z",
    });
    const second = saveInvestigation({
      baseDir: dir,
      resourceRef: sentry.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });

    const listed = await capture(() =>
      main(["investigations", "--json", "--dir", dir]),
    );
    const expected = safeJson(projectListInvestigations(listInvestigations(dir)));
    expect(listed.code).toBe(0);
    expect(JSON.parse(listed.stdout)).toEqual(expected);
    expect(JSON.parse(listed.stdout).investigations).toEqual([
      {
        id: second.record.id,
        subjectResourceId: sentry.id,
        composedAt: "2026-08-16T12:00:00.000Z",
      },
      {
        id: first.record.id,
        subjectResourceId: github.id,
        composedAt: "2026-08-16T10:00:00.000Z",
      },
    ]);
    expect(JSON.stringify(listed.stdout)).not.toContain("snapshot");

    const filtered = await capture(() =>
      main([
        "investigations",
        "--resource",
        github.id,
        "--json",
        "--dir",
        dir,
      ]),
    );
    expect(filtered.code).toBe(0);
    expect(JSON.parse(filtered.stdout)).toEqual(
      safeJson(
        projectListInvestigations(
          listInvestigations(dir, { subjectResourceId: github.id }),
        ),
      ),
    );
    expect(JSON.parse(filtered.stdout).investigations).toEqual([
      {
        id: first.record.id,
        subjectResourceId: github.id,
        composedAt: "2026-08-16T10:00:00.000Z",
      },
    ]);

    const unknown = await capture(() =>
      main([
        "investigations",
        "--resource",
        "github:repository:missing",
        "--json",
        "--dir",
        dir,
      ]),
    );
    expect(unknown.code).toBe(0);
    expect(JSON.parse(unknown.stdout)).toEqual({ investigations: [] });
  });

  test("investigation --json is the compact 082 handle, not the 048 body", async () => {
    const resource = createResource({
      provider: "github",
      providerResourceId: "handle-json",
      kind: "repository",
      name: "handle-json",
      metadata: { fullName: "acme/handle-json" },
    });
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(resource);
    store.close();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: resource.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const expected = safeJson(
      projectInvestigationRetrieve(
        getSavedInvestigation(dir, saved.record.id),
        getInvestigationArtifact(dir, saved.record.id),
      ),
    ) as Record<string, unknown>;

    const result = await capture(() =>
      main(["investigation", saved.record.id, "--json", "--dir", dir]),
    );
    const parsed = JSON.parse(result.stdout);

    expect(result.code).toBe(0);
    expect(parsed).toEqual(expected);
    expect(parsed).toEqual({
      id: saved.record.id,
      subjectResourceId: resource.id,
      composedAt: "2026-08-16T12:00:00.000Z",
      subjectPreview: {
        id: resource.id,
        provider: "github",
        kind: "repository",
        name: "handle-json",
      },
      investigationArtifact: expected.investigationArtifact,
    });
    expect(parsed).not.toHaveProperty("snapshot");
    expect(parsed).not.toHaveProperty("knownFacts");
    expect(parsed).not.toHaveProperty("missingContext");
    expect(JSON.stringify(parsed)).not.toContain("INVESTIGATION SNAPSHOT");

    const compareJson = await capture(() =>
      main([
        "investigation",
        saved.record.id,
        "--compare",
        "--json",
        "--dir",
        dir,
      ]),
    );
    expect(compareJson.code).toBe(1);
    expect(compareJson.stderr).toContain("--json is read-only observe");
    expect(compareJson.stdout).toBe("");
  });

  test("--json rejects unsupported commands without a JSON document", async () => {
    for (const command of [
      "history",
      "sync",
      "relationships",
      "changes",
    ]) {
      const result = await capture(() =>
        main([command, "--json", "--dir", dir]),
      );
      expect(result.code).toBe(1);
      expect(result.stderr).toContain(
        "providers, resources, related, investigate, context, investigations, investigation",
      );
      expect(result.stdout).toBe("");
    }
  });

  test("investigate refuses --json with --save before writing", async () => {
    const resource = createResource({
      provider: "github",
      providerResourceId: "no-save",
      kind: "repository",
      name: "no-save",
      metadata: {},
    });
    const store = new Store(dir);
    store.isInitialized();
    store.upsertResource(resource);
    store.close();

    const result = await capture(() =>
      main([
        "investigate",
        resource.id,
        "--json",
        "--save",
        "--dir",
        dir,
      ]),
    );

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--json is read-only observe");
    expect(result.stdout).toBe("");
    expect(listInvestigations(dir)).toEqual([]);
  });

  test("--json rejects a value", async () => {
    const result = await capture(() =>
      main(["providers", "--json", "foo", "--dir", dir]),
    );
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--json does not take a value");
    expect(result.stderr).toContain(
      "providers, resources, related, investigate, context, investigations, investigation",
    );
    expect(result.stdout).toBe("");
  });

  test("provider credential material never appears in JSON stdout", async () => {
    const fakeToken = "ghp_fake_secret_json_token";
    const store = new Store(dir);
    store.isInitialized();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
      config: {
        accountId: "123",
        accountName: "acme",
        token: fakeToken,
      },
    });
    store.close();

    const result = await capture(() =>
      main(["providers", "--json", "--dir", dir]),
    );
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain(fakeToken);
    expect(result.stdout).not.toContain("token");
  });
});
