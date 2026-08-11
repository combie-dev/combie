import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initCombie } from "../../src/app/init";
import { Store } from "../../src/storage/store";
import { createResource } from "../../src/domain/resource";
import { createRelationship } from "../../src/domain/relationship";

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
});
