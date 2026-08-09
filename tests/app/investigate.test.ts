import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CombieError } from "../../src/app/errors.ts";
import { initCombie } from "../../src/app/init.ts";
import {
  formatInvestigationContext,
  getInvestigationContext,
} from "../../src/app/investigate.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import { CredentialStore } from "../../src/storage/credentials.ts";
import { credentialsPath, dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

const CREDENTIAL_ENV_KEYS = [
  "CLOUDFLARE_API_TOKEN",
  "GITHUB_TOKEN",
  "GH_TOKEN",
  "VERCEL_TOKEN",
  "SENTRY_AUTH_TOKEN",
  "SENTRY_TOKEN",
  "NEON_API_KEY",
  "PLANETSCALE_SERVICE_TOKEN_ID",
  "PLANETSCALE_SERVICE_TOKEN",
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

function openStore(dir: string): Store {
  const store = new Store(dir);
  store.isInitialized();
  return store;
}

function snapshotPersistence(baseDir: string): {
  resourceIds: string[];
  relationshipIds: string[];
  changeIds: string[];
  providerIds: string[];
  credentialProviders: string[];
  dbHash: string;
} {
  const store = openStore(baseDir);
  try {
    const resources = store.listResources();
    const relationships = store.listRelationships();
    const changes = store.listChanges();
    const providers = store.listProviders();
    const creds = new CredentialStore(baseDir);
    const credentialProviders = [
      "cloudflare",
      "github",
      "vercel",
      "sentry",
      "neon",
      "planetscale",
    ].filter((id) => creds.hasCredential(id));
    const dbFile = dbPath(baseDir);
    const dbHash = existsSync(dbFile)
      ? createHash("sha256").update(readFileSync(dbFile)).digest("hex")
      : "";
    return {
      resourceIds: resources.map((r) => r.id).sort(),
      relationshipIds: relationships.map((r) => r.id).sort(),
      changeIds: changes.map((c) => c.id).sort(),
      providerIds: providers.map((p) => p.id).sort(),
      credentialProviders,
      dbHash,
    };
  } finally {
    store.close();
  }
}

function seedHub(store: Store): {
  repository: ReturnType<typeof createResource>;
  project: ReturnType<typeof createResource>;
  zone: ReturnType<typeof createResource>;
  neon: ReturnType<typeof createResource>;
} {
  const repository = createResource({
    provider: "github",
    providerResourceId: "915052094",
    kind: "repository",
    name: "demo-hub",
    metadata: { fullName: "sgr0691/demo-hub" },
  });
  const project = createResource({
    provider: "vercel",
    providerResourceId: "prj_demo_hub",
    kind: "project",
    name: "demo-hub",
    metadata: { framework: "nextjs", domains: ["app.example.com"] },
  });
  const zone = createResource({
    provider: "cloudflare",
    providerResourceId: "zone_example",
    kind: "zone",
    name: "example.com",
    metadata: { status: "active" },
  });
  const neon = createResource({
    provider: "neon",
    providerResourceId: "prj_neon_unrelated",
    kind: "project",
    name: "analytics-db",
    metadata: { regionId: "aws-us-east-2" },
  });

  store.applyResource(repository, {
    id: "repo-baseline",
    observedAt: "2026-08-08T08:00:00.000Z",
  });
  store.applyResource(project, {
    id: "project-baseline",
    observedAt: "2026-08-08T08:00:00.000Z",
  });
  store.applyResource(zone, {
    id: "zone-baseline",
    observedAt: "2026-08-08T08:00:00.000Z",
  });
  store.applyResource(neon, {
    id: "neon-baseline",
    observedAt: "2026-08-08T08:00:00.000Z",
  });

  store.applyResource(
    {
      ...project,
      name: "demo-hub-renamed",
      metadata: { framework: "nextjs", domains: ["app.example.com"], region: "iad1" },
    },
    { id: "project-change-newer", observedAt: "2026-08-08T10:00:00.000Z" },
  );
  store.applyResource(
    { ...repository, metadata: { fullName: "sgr0691/demo-hub", private: true } },
    { id: "repo-change", observedAt: "2026-08-08T09:30:00.000Z" },
  );
  // zone has baseline only — zero recorded Changes after baseline

  store.upsertRelationship(
    createRelationship({
      sourceResourceId: repository.id,
      targetResourceId: project.id,
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "sgr0691/demo-hub",
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
        apexName: "example.com",
        hostnames: ["app.example.com"],
      },
    }),
  );

  return { repository, project, zone, neon };
}

describe("Investigation context composition", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "combie-investigate-"));
    initCombie(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("subject with no relationships and no changes", () => {
    const store = openStore(dir);
    const solo = createResource({
      provider: "sentry",
      providerResourceId: "solo",
      kind: "project",
      name: "lonely",
      metadata: {},
    });
    store.applyResource(solo, {
      id: "solo-baseline",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: solo.id,
    });
    expect(ctx.subject.id).toBe(solo.id);
    expect(ctx.subjectChanges).toEqual([]);
    expect(ctx.related).toEqual([]);

    const output = formatInvestigationContext(ctx);
    expect(output).toContain("SUBJECT");
    expect(output).toContain("Sentry project: lonely");
    expect(output).toContain("No relationships discovered.");
    expect(output).toContain("No changes recorded yet.");
  });

  test("subject changes only without relationships", () => {
    const store = openStore(dir);
    const resource = createResource({
      provider: "github",
      providerResourceId: "history-only",
      kind: "repository",
      name: "before",
      metadata: {},
    });
    store.applyResource(resource, {
      id: "hist-baseline",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.applyResource(
      { ...resource, name: "after" },
      { id: "hist-change", observedAt: "2026-08-08T09:00:00.000Z" },
    );
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: resource.id,
    });
    expect(ctx.related).toEqual([]);
    expect(ctx.subjectChanges.map((c) => c.id)).toEqual(["hist-change"]);
    expect(ctx.subjectChanges[0]!.fields).toEqual([
      { path: "name", before: "before", after: "after" },
    ]);
  });

  test("outbound and inbound relationships with complete evidence and histories", () => {
    const store = openStore(dir);
    const { repository, project, zone, neon } = seedHub(store);
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });

    expect(ctx.subject.id).toBe(project.id);
    expect(ctx.subject.name).toBe("demo-hub-renamed");
    expect(ctx.subjectChanges.map((c) => c.id)).toEqual([
      "project-change-newer",
    ]);

    expect(ctx.related).toHaveLength(2);
    expect(
      ctx.related.map((item) => [
        item.relationship.kind,
        item.direction,
        item.resource?.id,
      ]),
    ).toEqual([
      ["source_for", "inbound", repository.id],
      ["uses_domain_in", "outbound", zone.id],
    ]);

    // Complete evidence preserved
    expect(ctx.related[0]!.relationship.evidence).toEqual({
      source: "vercel",
      mechanism: "git_repository_reference",
      repository: "sgr0691/demo-hub",
      githubRepoId: "915052094",
      vercelLinkType: "github",
    });
    expect(ctx.related[1]!.relationship.evidence).toEqual({
      source: "vercel",
      mechanism: "custom_domain_apex",
      apexName: "example.com",
      hostnames: ["app.example.com"],
    });

    // Related histories independent
    expect(ctx.related[0]!.changes.map((c) => c.id)).toEqual(["repo-change"]);
    expect(ctx.related[1]!.changes).toEqual([]); // zone zero history

    // No Neon/PlanetScale relationship invented
    expect(
      ctx.related.some((item) => item.resource?.provider === "neon"),
    ).toBe(false);
    expect(
      ctx.related.some((item) => item.resource?.id === neon.id),
    ).toBe(false);

    // Subject history is only the subject — not related changes mixed in
    expect(
      ctx.subjectChanges.some((c) => c.resourceId === repository.id),
    ).toBe(false);

    const output = formatInvestigationContext(ctx);
    expect(output).toContain("← source_for");
    expect(output).toContain("uses_domain_in →");
    expect(output).toContain(repository.id);
    expect(output).toContain(zone.id);
    expect(output).toContain("git_repository_reference");
    expect(output).toContain('githubRepoId="915052094"');
    expect(output).toContain("custom_domain_apex");
    expect(output).toContain("SUBJECT CHANGES");
    expect(output).toContain("RELATED CONTEXT");
    expect(output).toContain("No changes recorded yet."); // zone
    expect(output).not.toContain(neon.id);
    expect(output).not.toContain("analytics-db");
  });

  test("investigating source includes target but not recursive second hop", () => {
    const store = openStore(dir);
    const { repository, project, zone } = seedHub(store);
    store.close();

    // A = repository → B = project → C = zone
    // Investigating A includes B but must NOT include C via recursion
    const fromRepo = getInvestigationContext({
      baseDir: dir,
      resourceRef: repository.id,
    });
    expect(fromRepo.related).toHaveLength(1);
    expect(fromRepo.related[0]!.direction).toBe("outbound");
    expect(fromRepo.related[0]!.resource?.id).toBe(project.id);
    expect(
      fromRepo.related.some((item) => item.resource?.id === zone.id),
    ).toBe(false);

    // Investigating C includes B (inbound) but not A
    const fromZone = getInvestigationContext({
      baseDir: dir,
      resourceRef: zone.id,
    });
    expect(fromZone.related).toHaveLength(1);
    expect(fromZone.related[0]!.direction).toBe("inbound");
    expect(fromZone.related[0]!.resource?.id).toBe(project.id);
    expect(
      fromZone.related.some((item) => item.resource?.id === repository.id),
    ).toBe(false);
  });

  test("does not infer relationships — only persisted edges", () => {
    const store = openStore(dir);
    const a = createResource({
      provider: "github",
      providerResourceId: "a",
      kind: "repository",
      name: "same-name",
      metadata: {},
    });
    const b = createResource({
      provider: "vercel",
      providerResourceId: "b",
      kind: "project",
      name: "same-name",
      metadata: {},
    });
    store.applyResource(a, {
      id: "a-base",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.applyResource(b, {
      id: "b-base",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: a.id,
    });
    expect(ctx.related).toEqual([]);
  });

  test("exact stable-ID lookup; blank and missing fail clearly", () => {
    expect(() =>
      getInvestigationContext({ baseDir: dir, resourceRef: "   " }),
    ).toThrow(CombieError);
    try {
      getInvestigationContext({ baseDir: dir, resourceRef: "   " });
    } catch (error) {
      expect((error as CombieError).code).toBe("RESOURCE_REF_REQUIRED");
      expect((error as CombieError).message).toContain(
        "Usage: combie investigate <resource-id>",
      );
    }

    expect(() =>
      getInvestigationContext({
        baseDir: dir,
        resourceRef: "vercel:project:missing",
      }),
    ).toThrow(CombieError);
    try {
      getInvestigationContext({
        baseDir: dir,
        resourceRef: "vercel:project:missing",
      });
    } catch (error) {
      expect((error as CombieError).code).toBe("RESOURCE_NOT_FOUND");
      expect((error as CombieError).message).toContain(
        "vercel:project:missing",
      );
    }
  });

  test("dangling relationship: surface edge without fabricating neighbor", () => {
    const store = openStore(dir);
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj_dangle",
      kind: "project",
      name: "dangle",
      metadata: {},
    });
    store.applyResource(project, {
      id: "dangle-base",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: "github:repository:gone",
        targetResourceId: project.id,
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
        },
      }),
    );
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });
    expect(ctx.related).toHaveLength(1);
    expect(ctx.related[0]!.direction).toBe("inbound");
    expect(ctx.related[0]!.resource).toBeNull();
    expect(ctx.related[0]!.changes).toEqual([]);
    expect(ctx.related[0]!.relationship.sourceResourceId).toBe(
      "github:repository:gone",
    );

    const output = formatInvestigationContext(ctx);
    expect(output).toContain("← source_for");
    expect(output).toContain("github:repository:gone");
    expect(output).toContain("(missing resource)");
  });

  test("change ordering is newest-first per resource with stable evidence", () => {
    const store = openStore(dir);
    const resource = createResource({
      provider: "vercel",
      providerResourceId: "order",
      kind: "project",
      name: "v1",
      metadata: {},
    });
    store.applyResource(resource, {
      id: "order-base",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.applyResource(
      { ...resource, name: "v2" },
      { id: "order-old", observedAt: "2026-08-08T09:00:00.000Z" },
    );
    store.applyResource(
      { ...resource, name: "v3" },
      { id: "order-new", observedAt: "2026-08-08T10:00:00.000Z" },
    );
    store.close();

    const ctx = getInvestigationContext({
      baseDir: dir,
      resourceRef: resource.id,
    });
    expect(ctx.subjectChanges.map((c) => c.id)).toEqual([
      "order-new",
      "order-old",
    ]);
    expect(ctx.subjectChanges[0]!.observedAt).toBe("2026-08-08T10:00:00.000Z");
    expect(ctx.subjectChanges[0]!.fields[0]!.before).toBe("v2");
    expect(ctx.subjectChanges[0]!.fields[0]!.after).toBe("v3");
  });

  test("relationship ordering follows store kind/source/target order", () => {
    const store = openStore(dir);
    const { project } = seedHub(store);
    store.close();

    const a = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });
    const b = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });
    expect(
      a.related.map((item) => item.relationship.id),
    ).toEqual(b.related.map((item) => item.relationship.id));
    expect(a.related.map((item) => item.relationship.kind)).toEqual([
      "source_for",
      "uses_domain_in",
    ]);
  });

  test("offline without credentials and read-only persistence", () => {
    const store = openStore(dir);
    const { project } = seedHub(store);
    // Plant a credential to prove investigation does not need it
    new CredentialStore(dir).setCredential("vercel", "vercel_should_not_be_used");
    store.close();

    const before = snapshotPersistence(dir);

    const first = withoutCredentialEnvironment(() =>
      getInvestigationContext({
        baseDir: dir,
        resourceRef: project.id,
      }),
    );
    const second = withoutCredentialEnvironment(() =>
      getInvestigationContext({
        baseDir: dir,
        resourceRef: project.id,
      }),
    );

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(formatInvestigationContext(first)).toBe(
      formatInvestigationContext(second),
    );

    const after = snapshotPersistence(dir);
    expect(after).toEqual(before);
    expect(existsSync(credentialsPath(dir))).toBe(true);
  });

  test("does not require network — works when fetch would throw", () => {
    const store = openStore(dir);
    const { project } = seedHub(store);
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
      expect(ctx.related).toHaveLength(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("canonical relationship is not rewritten; direction is presentation only", () => {
    const store = openStore(dir);
    const { repository, project } = seedHub(store);
    store.close();

    const fromTarget = getInvestigationContext({
      baseDir: dir,
      resourceRef: project.id,
    });
    const inbound = fromTarget.related.find(
      (item) => item.relationship.kind === "source_for",
    )!;
    expect(inbound.direction).toBe("inbound");
    expect(inbound.relationship.sourceResourceId).toBe(repository.id);
    expect(inbound.relationship.targetResourceId).toBe(project.id);
    expect(inbound.relationship.id).toBe(
      `rel:${repository.id}:source_for:${project.id}`,
    );

    const fromSource = getInvestigationContext({
      baseDir: dir,
      resourceRef: repository.id,
    });
    const outbound = fromSource.related[0]!;
    expect(outbound.direction).toBe("outbound");
    expect(outbound.relationship.id).toBe(inbound.relationship.id);
  });
});
