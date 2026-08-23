import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getResourceContext } from "../../src/app/context.ts";
import { getInvestigationContext } from "../../src/app/investigate.ts";
import { listIncidentsForSubject } from "../../src/app/incidents.ts";
import { listInvestigations } from "../../src/app/investigations.ts";
import { listProviders, listResources } from "../../src/app/list.ts";
import { getRelatedContext } from "../../src/app/related.ts";
import { listResolutions } from "../../src/app/resolutions.ts";
import { main } from "../../src/cli/index.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import {
  projectInvestigateResourceLive,
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

  test("--json rejects unsupported commands without a JSON document", async () => {
    for (const command of [
      "history",
      "sync",
      "investigation",
      "relationships",
      "changes",
    ]) {
      const result = await capture(() =>
        main([command, "--json", "--dir", dir]),
      );
      expect(result.code).toBe(1);
      expect(result.stderr).toContain(
        "providers, resources, related, investigate, context",
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
      "providers, resources, related, investigate, context",
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
