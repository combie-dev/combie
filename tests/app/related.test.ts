import { describe, expect, test, afterEach, beforeEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initCombie } from "../../src/app/init.ts";
import {
  getRelatedContext,
  formatRelatedContext,
} from "../../src/app/related.ts";
import { Store } from "../../src/storage/store.ts";
import { createResource } from "../../src/domain/resource.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { CombieError } from "../../src/app/errors.ts";

function seedGraph(dir: string) {
  const store = new Store(dir);
  store.isInitialized();

  const gh = createResource({
    provider: "github",
    providerResourceId: "1001",
    kind: "repository",
    name: "demo-hub",
    metadata: { fullName: "acme/demo-hub", owner: "acme" },
  });
  const vercel = createResource({
    provider: "vercel",
    providerResourceId: "prj_demo",
    kind: "project",
    name: "demo-hub",
    metadata: { accountId: "team_1" },
  });
  const lonely = createResource({
    provider: "cloudflare",
    providerResourceId: "zone-1",
    kind: "zone",
    name: "example.com",
    metadata: {},
  });
  const sentry = createResource({
    provider: "sentry",
    providerResourceId: "450001",
    kind: "project",
    name: "demo-hub",
    metadata: {},
  });

  store.upsertResource(gh);
  store.upsertResource(vercel);
  store.upsertResource(lonely);
  store.upsertResource(sentry);

  store.upsertRelationship(
    createRelationship({
      sourceResourceId: gh.id,
      targetResourceId: vercel.id,
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "acme/demo-hub",
        githubRepoId: "1001",
      },
    }),
  );

  store.close();
  return { gh, vercel, lonely, sentry };
}

describe("getRelatedContext", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "combie-related-"));
    initCombie(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("source-side context lookup (outbound)", () => {
    const { gh, vercel } = seedGraph(dir);
    const ctx = getRelatedContext({
      baseDir: dir,
      resourceRef: gh.id,
    });

    expect(ctx.resource.id).toBe(gh.id);
    expect(ctx.related).toHaveLength(1);
    expect(ctx.related[0]!.direction).toBe("outbound");
    expect(ctx.related[0]!.relationship.kind).toBe("source_for");
    expect(ctx.related[0]!.resource?.id).toBe(vercel.id);
    expect(ctx.related[0]!.relationship.evidence.repository).toBe(
      "acme/demo-hub",
    );
  });

  test("target-side context lookup (inbound) without inverse row", () => {
    const { gh, vercel } = seedGraph(dir);
    const ctx = getRelatedContext({
      baseDir: dir,
      resourceRef: vercel.id,
    });

    expect(ctx.resource.id).toBe(vercel.id);
    expect(ctx.related).toHaveLength(1);
    expect(ctx.related[0]!.direction).toBe("inbound");
    expect(ctx.related[0]!.relationship.kind).toBe("source_for");
    expect(ctx.related[0]!.resource?.id).toBe(gh.id);

    // Canonical storage: still one relationship row
    const store = new Store(dir);
    store.isInitialized();
    expect(store.listRelationships()).toHaveLength(1);
    store.close();
  });

  test("empty state for resource with no relationships", () => {
    const { lonely } = seedGraph(dir);
    const ctx = getRelatedContext({
      baseDir: dir,
      resourceRef: lonely.id,
    });
    expect(ctx.related).toHaveLength(0);
    const text = formatRelatedContext(ctx);
    expect(text.toLowerCase()).toContain("no related resources");
  });

  test("missing resource fails clearly", () => {
    seedGraph(dir);
    expect(() =>
      getRelatedContext({
        baseDir: dir,
        resourceRef: "github:repository:missing",
      }),
    ).toThrow(CombieError);

    try {
      getRelatedContext({
        baseDir: dir,
        resourceRef: "github:repository:missing",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(CombieError);
      expect((err as CombieError).code).toBe("RESOURCE_NOT_FOUND");
      expect((err as CombieError).message).toContain("Resource not found");
      expect((err as CombieError).message).toContain("combie resources");
    }
  });

  test("empty resource ref fails", () => {
    seedGraph(dir);
    expect(() =>
      getRelatedContext({ baseDir: dir, resourceRef: "   " }),
    ).toThrow(CombieError);
  });

  test("evidence is preserved without reinterpretation", () => {
    const { gh } = seedGraph(dir);
    const ctx = getRelatedContext({ baseDir: dir, resourceRef: gh.id });
    expect(ctx.related[0]!.relationship.evidence).toEqual({
      source: "vercel",
      mechanism: "git_repository_reference",
      repository: "acme/demo-hub",
      githubRepoId: "1001",
    });
  });

  test("provider-independent: works for any resource ids", () => {
    const { sentry } = seedGraph(dir);
    // Sentry project with no relationships still resolves
    const ctx = getRelatedContext({
      baseDir: dir,
      resourceRef: sentry.id,
    });
    expect(ctx.resource.provider).toBe("sentry");
    expect(ctx.related).toHaveLength(0);
  });

  test("multiple direct relationships", () => {
    const store = new Store(dir);
    store.isInitialized();
    const repo = createResource({
      provider: "github",
      providerResourceId: "2002",
      kind: "repository",
      name: "multi",
      metadata: { fullName: "acme/multi" },
    });
    const p1 = createResource({
      provider: "vercel",
      providerResourceId: "prj_a",
      kind: "project",
      name: "a",
      metadata: {},
    });
    const p2 = createResource({
      provider: "vercel",
      providerResourceId: "prj_b",
      kind: "project",
      name: "b",
      metadata: {},
    });
    store.upsertResource(repo);
    store.upsertResource(p1);
    store.upsertResource(p2);
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: repo.id,
        targetResourceId: p1.id,
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "acme/multi",
        },
      }),
    );
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: repo.id,
        targetResourceId: p2.id,
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "acme/multi",
        },
      }),
    );
    store.close();

    const ctx = getRelatedContext({ baseDir: dir, resourceRef: repo.id });
    expect(ctx.related).toHaveLength(2);
    expect(ctx.related.every((r) => r.direction === "outbound")).toBe(true);
  });

  test("dangling neighbor when target resource missing", () => {
    const store = new Store(dir);
    store.isInitialized();
    const repo = createResource({
      provider: "github",
      providerResourceId: "3003",
      kind: "repository",
      name: "ghost",
      metadata: { fullName: "acme/ghost" },
    });
    store.upsertResource(repo);
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: repo.id,
        targetResourceId: "vercel:project:deleted",
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "acme/ghost",
        },
      }),
    );
    store.close();

    const ctx = getRelatedContext({ baseDir: dir, resourceRef: repo.id });
    expect(ctx.related).toHaveLength(1);
    expect(ctx.related[0]!.resource).toBeNull();
  });

  test("formatRelatedContext shows direction and evidence", () => {
    const { gh, vercel } = seedGraph(dir);
    const fromGh = formatRelatedContext(
      getRelatedContext({ baseDir: dir, resourceRef: gh.id }),
    );
    expect(fromGh).toContain("GitHub repository");
    expect(fromGh).toContain("acme/demo-hub");
    expect(fromGh).toContain("source_for →");
    expect(fromGh).toContain("Vercel project");
    expect(fromGh).toContain("demo-hub");
    expect(fromGh).toContain("Evidence:");
    expect(fromGh).toContain("git_repository_reference");
    expect(fromGh).not.toContain("ghp_");
    expect(fromGh).not.toContain("secret");

    const fromVercel = formatRelatedContext(
      getRelatedContext({ baseDir: dir, resourceRef: vercel.id }),
    );
    expect(fromVercel).toContain("Vercel project");
    expect(fromVercel).toContain("← source_for");
    expect(fromVercel).toContain("GitHub repository");
    expect(fromVercel).toContain("acme/demo-hub");
  });

  test("read does not mutate relationship count", () => {
    const { gh } = seedGraph(dir);
    getRelatedContext({ baseDir: dir, resourceRef: gh.id });
    getRelatedContext({ baseDir: dir, resourceRef: gh.id });
    const store = new Store(dir);
    store.isInitialized();
    expect(store.listRelationships()).toHaveLength(1);
    store.close();
  });

  test("survives process restart", () => {
    const { gh } = seedGraph(dir);
    const first = getRelatedContext({ baseDir: dir, resourceRef: gh.id });
    const second = getRelatedContext({ baseDir: dir, resourceRef: gh.id });
    expect(second.related).toHaveLength(first.related.length);
    expect(second.related[0]!.relationship.id).toBe(
      first.related[0]!.relationship.id,
    );
  });
});
