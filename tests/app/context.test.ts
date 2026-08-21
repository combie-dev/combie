import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  formatResourceContext,
  getResourceContext,
} from "../../src/app/context.ts";
import { CombieError } from "../../src/app/errors.ts";
import { initCombie } from "../../src/app/init.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import { CredentialStore } from "../../src/storage/credentials.ts";
import { credentialsPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

const CREDENTIAL_ENV_KEYS = [
  "CLOUDFLARE_API_TOKEN",
  "GITHUB_TOKEN",
  "GH_TOKEN",
  "VERCEL_TOKEN",
  "SENTRY_AUTH_TOKEN",
] as const;

function withoutCredentialEnvironment<T>(run: () => T): T {
  const previous = new Map<string, string | undefined>();
  for (const key of CREDENTIAL_ENV_KEYS) {
    previous.set(key, process.env[key]);
    delete process.env[key];
  }
  try {
    return run();
  } finally {
    for (const key of CREDENTIAL_ENV_KEYS) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe("Resource context composition", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "combie-context-"));
    initCombie(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("uses the exact opaque Resource id and renders both empty states", () => {
    const store = new Store(dir);
    store.isInitialized();
    const resource = createResource({
      provider: "vercel",
      providerResourceId: "prj:with:colons",
      kind: "project",
      name: "solo",
      metadata: {},
    });
    store.applyResource(resource, {
      id: "initial",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.close();

    const context = getResourceContext({
      baseDir: dir,
      resourceRef: `  ${resource.id}  `,
    });

    expect(context.resource.id).toBe(resource.id);
    expect(context.related).toEqual([]);
    expect(context.changes).toEqual([]);

    const output = formatResourceContext(context);
    expect(output).toContain("Vercel project: solo");
    expect(output).toContain(resource.id);
    expect(output).toContain("CURRENT");
    expect(output).toContain("provider  vercel");
    expect(output).toContain("kind      project");
    expect(output).toContain("name      \"solo\"");
    expect(output).toContain("RELATED");
    expect(output).toContain("No relationships discovered yet.");
    expect(output).toContain("CHANGES");
    expect(output).toContain("No changes recorded yet.");
  });

  test("composes deterministic one-hop Relationships and only the target history", () => {
    const store = new Store(dir);
    store.isInitialized();

    const repository = createResource({
      provider: "github",
      providerResourceId: "915052094",
      kind: "repository",
      name: "combie",
      metadata: { fullName: "sgr0691/combie" },
    });
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj_combie",
      kind: "project",
      name: "combie-web",
      metadata: { framework: "nextjs", domains: [] },
    });
    const zone = createResource({
      provider: "cloudflare",
      providerResourceId: "zone_combie",
      kind: "zone",
      name: "combie.dev",
      metadata: { status: "pending" },
    });

    store.applyResource(repository, {
      id: "repository-initial",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.applyResource(project, {
      id: "project-initial",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.applyResource(zone, {
      id: "zone-initial",
      observedAt: "2026-08-08T08:00:00.000Z",
    });

    store.applyResource(
      { ...repository, name: "repository-history-sentinel" },
      {
        id: "repository-change-sentinel",
        observedAt: "2026-08-08T09:30:00.000Z",
      },
    );
    store.applyResource(
      {
        ...project,
        name: "combie-preview",
        metadata: { framework: "nextjs", domains: ["preview.combie.dev"] },
      },
      { id: "project-change-older", observedAt: "2026-08-08T09:00:00.000Z" },
    );
    store.applyResource(
      {
        ...project,
        name: "combie-web",
        metadata: {
          framework: "nextjs",
          domains: ["app.combie.dev"],
          region: "iad1",
        },
      },
      { id: "project-change-newer", observedAt: "2026-08-08T10:00:00.000Z" },
    );
    store.applyResource(
      { ...zone, metadata: { status: "active" } },
      {
        id: "zone-change-sentinel",
        observedAt: "2026-08-08T10:30:00.000Z",
      },
    );

    store.upsertRelationship(
      createRelationship({
        sourceResourceId: repository.id,
        targetResourceId: project.id,
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "sgr0691/combie",
          githubRepoId: "915052094",
          vercelLinkType: "github",
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
          apexName: "combie.dev",
          hostnames: ["app.combie.dev"],
        },
      }),
    );
    store.close();

    const first = getResourceContext({ baseDir: dir, resourceRef: project.id });
    const second = getResourceContext({ baseDir: dir, resourceRef: project.id });

    expect(second).toEqual(first);
    expect(first.resource.id).toBe(project.id);
    expect(
      first.related.map((item) => [
        item.relationship.kind,
        item.direction,
        item.resource?.id,
      ]),
    ).toEqual([
      ["source_for", "inbound", repository.id],
      ["uses_domain_in", "outbound", zone.id],
    ]);
    expect(first.related[0]?.relationship.evidence).toEqual({
      source: "vercel",
      mechanism: "git_repository_reference",
      repository: "sgr0691/combie",
      githubRepoId: "915052094",
      vercelLinkType: "github",
    });
    expect(first.related[1]?.relationship.evidence).toEqual({
      source: "vercel",
      mechanism: "custom_domain_apex",
      apexName: "combie.dev",
      hostnames: ["app.combie.dev"],
    });
    expect(first.changes.map((change) => change.id)).toEqual([
      "project-change-newer",
      "project-change-older",
    ]);
    expect(first.changes[0]?.observedAt).toBe("2026-08-08T10:00:00.000Z");
    expect(first.changes[0]?.fields).toEqual([
      {
        path: "metadata.domains",
        before: ["preview.combie.dev"],
        after: ["app.combie.dev"],
      },
      { path: "metadata.region", before: undefined, after: "iad1" },
      { path: "name", before: "combie-preview", after: "combie-web" },
    ]);
    expect(first.changes.some((change) => change.id.includes("sentinel"))).toBe(
      false,
    );

    const output = formatResourceContext(first);
    expect(output).toContain("← source_for");
    expect(output).toContain("uses_domain_in →");
    expect(output).toContain(repository.id);
    expect(output).toContain(zone.id);
    expect(output).toContain("git_repository_reference");
    expect(output).toContain("githubRepoId=\"915052094\"");
    expect(output).toContain("vercelLinkType=\"github\"");
    expect(output).toContain("custom_domain_apex");
    expect(output).toContain('hostnames=["app.combie.dev"]');
    expect(output.indexOf("2026-08-08T10:00:00.000Z")).toBeLessThan(
      output.indexOf("2026-08-08T09:00:00.000Z"),
    );
    expect(output).toContain(
      '["preview.combie.dev"] → ["app.combie.dev"]',
    );
    expect(output).toContain("(absent) → \"iad1\"");
    expect(output).not.toContain("repository-history-sentinel");
    expect(output).not.toContain("zone-change-sentinel");
  });

  test("supports related-only and history-only Resource context", () => {
    const store = new Store(dir);
    store.isInitialized();
    const relatedOnly = createResource({
      provider: "github",
      providerResourceId: "related-only",
      kind: "repository",
      name: "related-only",
      metadata: {},
    });
    const neighbor = createResource({
      provider: "vercel",
      providerResourceId: "neighbor",
      kind: "project",
      name: "neighbor",
      metadata: {},
    });
    const historyOnly = createResource({
      provider: "sentry",
      providerResourceId: "history-only",
      kind: "project",
      name: "before",
      metadata: {},
    });
    store.applyResource(relatedOnly, {
      id: "related-initial",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.applyResource(neighbor, {
      id: "neighbor-initial",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.applyResource(historyOnly, {
      id: "history-initial",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.applyResource(
      { ...historyOnly, name: "after" },
      { id: "history-change", observedAt: "2026-08-08T09:00:00.000Z" },
    );
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: relatedOnly.id,
        targetResourceId: neighbor.id,
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
        },
      }),
    );
    store.close();

    const related = getResourceContext({
      baseDir: dir,
      resourceRef: relatedOnly.id,
    });
    expect(related.related).toHaveLength(1);
    expect(related.changes).toEqual([]);

    const history = getResourceContext({
      baseDir: dir,
      resourceRef: historyOnly.id,
    });
    expect(history.related).toEqual([]);
    expect(history.changes.map((change) => change.id)).toEqual([
      "history-change",
    ]);
  });

  test("uses context-specific blank usage and existing not-found behavior", () => {
    expect(() =>
      getResourceContext({ baseDir: dir, resourceRef: "   " }),
    ).toThrow(CombieError);
    try {
      getResourceContext({ baseDir: dir, resourceRef: "   " });
    } catch (error) {
      expect(error).toBeInstanceOf(CombieError);
      expect((error as CombieError).code).toBe("RESOURCE_REF_REQUIRED");
      expect((error as CombieError).message).toContain(
        "Usage: bun run combie context <resource-id>",
      );
    }

    expect(() =>
      getResourceContext({
        baseDir: dir,
        resourceRef: "github:repository:missing",
      }),
    ).toThrow(CombieError);
    try {
      getResourceContext({
        baseDir: dir,
        resourceRef: "github:repository:missing",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(CombieError);
      expect((error as CombieError).code).toBe("RESOURCE_NOT_FOUND");
      expect((error as CombieError).message).toContain(
        "Resource not found: github:repository:missing",
      );
      expect((error as CombieError).message).toContain("combie resources");
    }

    const uninitialized = mkdtempSync(join(tmpdir(), "combie-context-uninit-"));
    try {
      expect(() =>
        getResourceContext({
          baseDir: uninitialized,
          resourceRef: "github:repository:1",
        }),
      ).toThrow("Combie is not initialized");
    } finally {
      rmSync(uninitialized, { recursive: true, force: true });
    }
  });

  test("CURRENT shows observation and provider clocks when the provider has them", () => {
    const store = new Store(dir);
    store.isInitialized();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
      lastSyncAt: "2026-08-18T10:00:00.000Z",
      lastAttemptAt: "2026-08-19T09:00:00.000Z",
    });
    const resource = createResource({
      provider: "github",
      providerResourceId: "915052094",
      kind: "repository",
      name: "combie",
      metadata: {},
      createdAt: "2026-08-18T08:00:00.000Z",
      updatedAt: "2026-08-18T08:00:00.000Z",
    });
    store.applyResource(resource, {
      id: "initial",
      observedAt: "2026-08-18T08:00:00.000Z",
    });
    store.close();

    const output = formatResourceContext(
      getResourceContext({ baseDir: dir, resourceRef: resource.id }),
    );
    expect(output).toContain("observed by Combie at: 2026-08-18T08:00:00.000Z");
    expect(output).toContain(
      "last successful provider sync: 2026-08-18T10:00:00.000Z",
    );
    expect(output).toContain(
      "last provider sync attempt: 2026-08-19T09:00:00.000Z",
    );
  });

  test("CURRENT omits null provider clock lines", () => {
    const store = new Store(dir);
    store.isInitialized();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
    });
    const resource = createResource({
      provider: "github",
      providerResourceId: "915052094",
      kind: "repository",
      name: "combie",
      metadata: {},
      createdAt: "2026-08-18T08:00:00.000Z",
      updatedAt: "2026-08-18T08:00:00.000Z",
    });
    store.applyResource(resource, {
      id: "initial",
      observedAt: "2026-08-18T08:00:00.000Z",
    });
    store.close();

    const output = formatResourceContext(
      getResourceContext({ baseDir: dir, resourceRef: resource.id }),
    );
    expect(output).toContain("observed by Combie at: 2026-08-18T08:00:00.000Z");
    expect(output).not.toContain("last successful provider sync");
    expect(output).not.toContain("last provider sync attempt");
    expect(output).not.toContain("last successful discovery");
  });

  test("CURRENT last successful discovery membership (Sprint 085)", () => {
    const store = new Store(dir);
    store.isInitialized();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
      lastSyncAt: "2026-08-18T10:00:00.000Z",
      lastAttemptAt: "2026-08-19T09:00:00.000Z",
    });
    const resource = createResource({
      provider: "github",
      providerResourceId: "915052094",
      kind: "repository",
      name: "combie",
      metadata: {},
      createdAt: "2026-08-18T08:00:00.000Z",
      updatedAt: "2026-08-18T08:00:00.000Z",
    });
    store.applyResource(resource, {
      id: "initial",
      observedAt: "2026-08-18T08:00:00.000Z",
    });
    store.close();

    const context = getResourceContext({
      baseDir: dir,
      resourceRef: resource.id,
    });
    expect(context.lastSuccessfulDiscovery).toBeNull();
    const omitted = formatResourceContext(context);
    expect(omitted).not.toContain("last successful discovery");

    const included = formatResourceContext({
      ...context,
      lastSuccessfulDiscovery: "included",
    });
    expect(included).toContain("last successful discovery: included");

    const absent = formatResourceContext({
      ...context,
      lastSuccessfulDiscovery: "not_in_last_successful_discovery",
    });
    expect(absent).toContain(
      "last successful discovery: not in last successful discovery",
    );

    const persist = new Store(dir);
    persist.isInitialized();
    persist.setLastDiscoveryResourceIds("github", [resource.id]);
    persist.close();
    const includedLive = getResourceContext({
      baseDir: dir,
      resourceRef: resource.id,
    });
    expect(includedLive.lastSuccessfulDiscovery).toBe("included");
    expect(formatResourceContext(includedLive)).toContain(
      "last successful discovery: included",
    );

    const empty = new Store(dir);
    empty.isInitialized();
    empty.setLastDiscoveryResourceIds("github", []);
    empty.close();
    const emptyLive = getResourceContext({
      baseDir: dir,
      resourceRef: resource.id,
    });
    expect(emptyLive.lastSuccessfulDiscovery).toBe(
      "not_in_last_successful_discovery",
    );
    expect(formatResourceContext(emptyLive)).toContain(
      "last successful discovery: not in last successful discovery",
    );
    expect(emptyLive.resource.id).toBe(resource.id);
  });

  test("is offline, credential-independent, deterministic, and read-only", () => {
    const credentials = new CredentialStore(dir);
    credentials.setCredential("vercel", "fixture-token-never-rendered");

    const store = new Store(dir);
    store.isInitialized();
    store.upsertProvider({
      id: "vercel",
      name: "Vercel",
      status: "connected",
      lastSyncAt: "2026-08-08T07:30:00.000Z",
      config: { accountId: "team_fixture" },
    });
    const resource = createResource({
      provider: "vercel",
      providerResourceId: "offline",
      kind: "project",
      name: "offline",
      metadata: {},
    });
    store.applyResource(resource, {
      id: "offline-initial",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    const providersBefore = store.listProviders();
    const resourcesBefore = store.listResources();
    const relationshipsBefore = store.listRelationships();
    const changesBefore = store.listChanges();
    store.close();
    const credentialsBefore = readFileSync(credentialsPath(dir), "utf8");

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("context must not call a provider");
    }) as unknown as typeof fetch;
    let first;
    let second;
    try {
      [first, second] = withoutCredentialEnvironment(() => [
        getResourceContext({ baseDir: dir, resourceRef: resource.id }),
        getResourceContext({ baseDir: dir, resourceRef: resource.id }),
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(second).toEqual(first);
    expect(formatResourceContext(second!)).not.toContain(
      "fixture-token-never-rendered",
    );

    const reopened = new Store(dir);
    reopened.isInitialized();
    expect(reopened.listProviders()).toEqual(providersBefore);
    expect(reopened.listResources()).toEqual(resourcesBefore);
    expect(reopened.listRelationships()).toEqual(relationshipsBefore);
    expect(reopened.listChanges()).toEqual(changesBefore);
    reopened.close();
    expect(readFileSync(credentialsPath(dir), "utf8")).toBe(credentialsBefore);
  });
});
