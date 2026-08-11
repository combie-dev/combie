import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../src/cli/index.ts";
import { formatRelationshipsTable } from "../../src/app/list.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import { Store } from "../../src/storage/store.ts";
import type { ResourceLabel } from "../../src/app/list.ts";

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

describe("CLI commands", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "combie-cli-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("init creates local state", async () => {
    const result = await capture(() => main(["init", "--dir", dir]));
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Initialized");
  });

  test("--dir requires an explicit path", async () => {
    const result = await capture(() => main(["init", "--dir"]));
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--dir requires a path");
  });

  test("version reports the beta package identity", async () => {
    const long = await capture(() => main(["--version"]));
    expect(long.code).toBe(0);
    expect(long.stdout).toBe("combie 0.1.0");

    const command = await capture(() => main(["version"]));
    expect(command.code).toBe(0);
    expect(command.stdout).toBe("combie 0.1.0");
  });

  test("init is idempotent", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const result = await capture(() => main(["init", "--dir", dir]));
    expect(result.code).toBe(0);
    expect(result.stdout.toLowerCase()).toMatch(/already initialized|initialized/);
  });

  test("providers fails when not initialized", async () => {
    const result = await capture(() => main(["providers", "--dir", dir]));
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("combie init");
  });

  test("resources fails when not initialized", async () => {
    const result = await capture(() => main(["resources", "--dir", dir]));
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("combie init");
  });

  test("sync fails when not initialized", async () => {
    const result = await capture(() => main(["sync", "--dir", dir]));
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("combie init");
  });

  test("connect fails when not initialized", async () => {
    const result = await capture(() =>
      main(["connect", "cloudflare", "--token", "x", "--dir", dir]),
    );
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("combie init");
  });

  test("connect rejects unknown provider", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const result = await capture(() =>
      main(["connect", "not-a-provider", "--dir", dir]),
    );
    expect(result.code).not.toBe(0);
    expect(result.stderr.toLowerCase()).toContain("unknown");
  });

  test("connect github without auth option fails with guidance", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const result = await capture(() =>
      main(["connect", "github", "--dir", dir]),
    );
    expect(result.code).not.toBe(0);
    expect(result.stderr.toLowerCase()).toMatch(/token|use-gh|use-env/);
  });

  test("help prints usage including github", async () => {
    const result = await capture(() => main(["help"]));
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("combie init");
    expect(result.stdout).toContain("connect");
    expect(result.stdout).toContain("github");
    expect(result.stdout).toContain("--use-gh");
    expect(result.stdout).toContain("vercel");
    expect(result.stdout).toContain("VERCEL_TOKEN");
    expect(result.stdout).toContain("sentry");
    expect(result.stdout).toContain("SENTRY_AUTH_TOKEN");
    expect(result.stdout).toContain("SENTRY_TOKEN");
    expect(result.stdout).toContain("neon");
    expect(result.stdout).toContain("NEON_API_KEY");
    expect(result.stdout).toContain("planetscale");
    expect(result.stdout).toContain("PLANETSCALE_SERVICE_TOKEN_ID");
    expect(result.stdout).toContain("PLANETSCALE_SERVICE_TOKEN");
    expect(result.stdout).toContain("--organization");
    expect(result.stdout).toContain("--token-id");
    expect(result.stdout).toContain("relationships");
    expect(result.stdout).toContain("history");
    expect(result.stdout).toContain("context");
    expect(result.stdout).toContain("investigate");
  });

  test("connect planetscale without auth option fails with guidance", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const result = await capture(() =>
      main(["connect", "planetscale", "--dir", dir]),
    );
    expect(result.code).not.toBe(0);
    expect(result.stderr.toLowerCase()).toMatch(
      /token|use-env|planetscale|service/,
    );
  });

  test("connect vercel without auth option fails with guidance", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const result = await capture(() =>
      main(["connect", "vercel", "--dir", dir]),
    );
    expect(result.code).not.toBe(0);
    expect(result.stderr.toLowerCase()).toMatch(/token|use-env/);
  });

  test("connect sentry without auth option fails with guidance", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const result = await capture(() =>
      main(["connect", "sentry", "--dir", dir]),
    );
    expect(result.code).not.toBe(0);
    expect(result.stderr.toLowerCase()).toMatch(/token|use-env/);
  });

  test("providers and resources empty states after init", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const providers = await capture(() => main(["providers", "--dir", dir]));
    expect(providers.code).toBe(0);
    expect(providers.stdout.toLowerCase()).toMatch(/no providers|connect/);
    for (const providerId of [
      "cloudflare",
      "github",
      "vercel",
      "sentry",
      "neon",
      "planetscale",
    ]) {
      expect(providers.stdout).toContain(providerId);
    }

    const resources = await capture(() => main(["resources", "--dir", dir]));
    expect(resources.code).toBe(0);
    expect(resources.stdout.toLowerCase()).toMatch(/no resources|sync/);
  });

  test("sync empty state enumerates every supported provider", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const result = await capture(() => main(["sync", "--dir", dir]));
    expect(result.code).not.toBe(0);
    for (const providerId of [
      "cloudflare",
      "github",
      "vercel",
      "sentry",
      "neon",
      "planetscale",
    ]) {
      expect(result.stderr).toContain(providerId);
    }
  });

  test("relationships fails when not initialized", async () => {
    const result = await capture(() => main(["relationships", "--dir", dir]));
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("combie init");
  });

  test("changes fails when not initialized", async () => {
    const result = await capture(() => main(["changes", "--dir", dir]));
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("combie init");
  });

  test("changes has an offline empty state and renders persisted Changes", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const empty = await capture(() => main(["changes", "--dir", dir]));
    expect(empty.code).toBe(0);
    expect(empty.stdout).toContain("No changes observed yet");

    const store = new Store(dir);
    store.isInitialized();
    const resource = createResource({
      provider: "vercel",
      providerResourceId: "prj_change",
      kind: "project",
      name: "before",
      metadata: { region: "iad1" },
    });
    store.applyResource(resource, {
      id: "initial",
      observedAt: "2026-08-08T10:00:00.000Z",
    });
    store.applyResource(
      { ...resource, name: "after", metadata: { region: "sfo1" } },
      { id: "rename", observedAt: "2026-08-08T11:00:00.000Z" },
    );
    const second = createResource({
      provider: "github",
      providerResourceId: "repo_change",
      kind: "repository",
      name: "repo-before",
      metadata: {},
    });
    store.applyResource(second, {
      id: "second-initial",
      observedAt: "2026-08-08T11:30:00.000Z",
    });
    store.applyResource(
      { ...second, name: "repo-after" },
      { id: "second-rename", observedAt: "2026-08-08T12:00:00.000Z" },
    );
    store.close();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("changes must not call a provider");
    }) as unknown as typeof fetch;
    try {
      const result = await capture(() => main(["changes", "--dir", dir]));
      expect(result.code).toBe(0);
      expect(result.stdout).toContain("RESOURCE");
      expect(result.stdout).toContain("vercel:project:prj_change");
      expect(result.stdout).toContain("github:repository:repo_change");
      expect(result.stdout).toContain("updated");
      expect(result.stdout).toContain("metadata.region, name");
      expect(result.stdout.match(/updated/g)).toHaveLength(2);
      expect(result.stdout.indexOf("github:repository:repo_change")).toBeLessThan(
        result.stdout.indexOf("vercel:project:prj_change"),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("history requires initialization and an exact Resource id", async () => {
    const uninitialized = await capture(() =>
      main(["history", "github:repository:1", "--dir", dir]),
    );
    expect(uninitialized.code).not.toBe(0);
    expect(uninitialized.stderr).toContain("combie init");

    await capture(() => main(["init", "--dir", dir]));
    const missingArgument = await capture(() =>
      main(["history", "--dir", dir]),
    );
    expect(missingArgument.code).not.toBe(0);
    expect(missingArgument.stderr).toContain("Usage: bun run combie history <resource-id>");

    const unknown = await capture(() =>
      main(["history", "github:repository:missing", "--dir", dir]),
    );
    expect(unknown.code).not.toBe(0);
    expect(unknown.stderr).toContain("Resource not found");
    expect(unknown.stderr).toContain("combie resources");
  });

  test("history renders the current Resource and trustworthy zero state", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.isInitialized();
    const resource = createResource({
      provider: "cloudflare",
      providerResourceId: "zone-history",
      kind: "zone",
      name: "example.com",
      metadata: {},
    });
    store.applyResource(resource, {
      id: "initial",
      observedAt: "2026-08-08T09:00:00.000Z",
    });
    store.close();

    const result = await capture(() =>
      main(["history", resource.id, "--dir", dir]),
    );
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Cloudflare zone: example.com");
    expect(result.stdout).toContain(resource.id);
    expect(result.stdout).toContain("CURRENT");
    expect(result.stdout).toContain("No changes recorded yet.");
    expect(result.stdout).toContain("trustworthy Change baseline");
  });

  test("history is offline, scoped, grouped, ordered, and read-only", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.isInitialized();
    const resource = createResource({
      provider: "vercel",
      providerResourceId: "prj_history",
      kind: "project",
      name: "before",
      metadata: { framework: "nextjs", regions: ["iad1"] },
    });
    const other = createResource({
      provider: "github",
      providerResourceId: "repo-history",
      kind: "repository",
      name: "other",
      metadata: {},
    });
    store.applyResource(resource, {
      id: "initial",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.applyResource(other, {
      id: "other-initial",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.applyResource(
      { ...resource, name: "middle", metadata: { regions: ["iad1", "sfo1"] } },
      { id: "older", observedAt: "2026-08-08T09:00:00.000Z" },
    );
    store.applyResource(
      { ...resource, name: "current", metadata: { regions: ["sfo1"] } },
      { id: "newer", observedAt: "2026-08-08T10:00:00.000Z" },
    );
    store.applyResource(
      { ...other, name: "other-new" },
      { id: "other-change", observedAt: "2026-08-08T11:00:00.000Z" },
    );
    const resourcesBefore = store.listResources();
    const changesBefore = store.listChanges();
    const relationshipsBefore = store.listRelationships();
    store.close();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("history must not call a provider");
    }) as unknown as typeof fetch;
    try {
      const result = await capture(() =>
        main(["history", resource.id, "--dir", dir]),
      );
      expect(result.code).toBe(0);
      expect(result.stdout).toContain("name  \"current\"");
      expect(result.stdout.match(/Observed:/g)).toHaveLength(2);
      expect(result.stdout.indexOf("2026-08-08T10:00:00.000Z")).toBeLessThan(
        result.stdout.indexOf("2026-08-08T09:00:00.000Z"),
      );
      expect(result.stdout).toContain('"nextjs" → (absent)');
      expect(result.stdout).toContain('["iad1"] → ["iad1","sfo1"]');
      expect(result.stdout).not.toContain("other-change");

      const globalFeed = await capture(() => main(["changes", "--dir", dir]));
      expect(globalFeed.code).toBe(0);
      expect(globalFeed.stdout.match(/updated/g)).toHaveLength(3);
    } finally {
      globalThis.fetch = originalFetch;
    }

    const reopened = new Store(dir);
    reopened.isInitialized();
    expect(reopened.listResources()).toEqual(resourcesBefore);
    expect(reopened.listChanges()).toEqual(changesBefore);
    expect(reopened.listRelationships()).toEqual(relationshipsBefore);
    reopened.close();
  });

  test("context requires initialization and an exact Resource id", async () => {
    const uninitialized = await capture(() =>
      main(["context", "github:repository:1", "--dir", dir]),
    );
    expect(uninitialized.code).not.toBe(0);
    expect(uninitialized.stderr).toContain("combie init");

    await capture(() => main(["init", "--dir", dir]));
    const missingArgument = await capture(() =>
      main(["context", "--dir", dir]),
    );
    expect(missingArgument.code).not.toBe(0);
    expect(missingArgument.stderr).toContain(
      "Usage: bun run combie context <resource-id>",
    );

    const unknown = await capture(() =>
      main(["context", "github:repository:missing", "--dir", dir]),
    );
    expect(unknown.code).not.toBe(0);
    expect(unknown.stderr).toContain("Resource not found");
    expect(unknown.stderr).toContain("combie resources");
  });

  test("investigate requires initialization and an exact Resource id", async () => {
    const uninitialized = await capture(() =>
      main(["investigate", "vercel:project:1", "--dir", dir]),
    );
    expect(uninitialized.code).not.toBe(0);
    expect(uninitialized.stderr).toContain("combie init");

    await capture(() => main(["init", "--dir", dir]));
    const missingArgument = await capture(() =>
      main(["investigate", "--dir", dir]),
    );
    expect(missingArgument.code).not.toBe(0);
    expect(missingArgument.stderr).toContain(
      "Usage: bun run combie investigate <resource-id>",
    );

    const unknown = await capture(() =>
      main(["investigate", "vercel:project:missing", "--dir", dir]),
    );
    expect(unknown.code).not.toBe(0);
    expect(unknown.stderr).toContain("Resource not found");
    expect(unknown.stderr).toContain("combie resources");
  });

  test("investigate renders subject, related histories, and evidence offline", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.isInitialized();
    const repository = createResource({
      provider: "github",
      providerResourceId: "cli_repo",
      kind: "repository",
      name: "cli-repo",
      metadata: { fullName: "user/cli-repo" },
    });
    const project = createResource({
      provider: "vercel",
      providerResourceId: "cli_prj",
      kind: "project",
      name: "cli-app",
      metadata: {},
    });
    store.applyResource(repository, {
      id: "cli-repo-base",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.applyResource(project, {
      id: "cli-prj-base",
      observedAt: "2026-08-08T08:00:00.000Z",
    });
    store.applyResource(
      { ...project, name: "cli-app-renamed" },
      { id: "cli-prj-change", observedAt: "2026-08-08T09:00:00.000Z" },
    );
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: repository.id,
        targetResourceId: project.id,
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "user/cli-repo",
        },
      }),
    );
    store.close();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("investigate must not call a provider");
    }) as unknown as typeof fetch;
    try {
      const result = await capture(() =>
        main(["investigate", project.id, "--dir", dir]),
      );
      expect(result.code).toBe(0);
      expect(result.stdout).toContain("SUBJECT");
      expect(result.stdout).toContain("cli-app-renamed");
      expect(result.stdout).toContain("KNOWN FACTS");
      expect(result.stdout.indexOf("KNOWN FACTS")).toBeLessThan(
        result.stdout.indexOf("SUBJECT CHANGES"),
      );
      expect(result.stdout).toContain(
        "Vercel deployment evidence for vercel:project:cli_prj has unknown current refresh authority",
      );
      expect(result.stdout).toContain("SUBJECT CHANGES");
      expect(result.stdout).toContain("← source_for");
      expect(result.stdout).toContain(repository.id);
      expect(result.stdout).toContain("RELATED CONTEXT");
      expect(result.stdout).toContain("git_repository_reference");
      expect(result.stdout).toContain("COMBIE OBSERVATIONS (newest first)");
      expect(result.stdout).toContain("Role: subject");
      expect(result.stdout).toContain("Observed: 2026-08-08T09:00:00.000Z");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("context renders empty, related-only, and history-only states", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.isInitialized();
    const empty = createResource({
      provider: "cloudflare",
      providerResourceId: "empty-context",
      kind: "zone",
      name: "empty.example",
      metadata: {},
    });
    const relatedOnly = createResource({
      provider: "github",
      providerResourceId: "related-context",
      kind: "repository",
      name: "related",
      metadata: { fullName: "acme/related" },
    });
    const neighbor = createResource({
      provider: "vercel",
      providerResourceId: "related-neighbor",
      kind: "project",
      name: "neighbor",
      metadata: {},
    });
    const historyOnly = createResource({
      provider: "sentry",
      providerResourceId: "history-context",
      kind: "project",
      name: "before",
      metadata: {},
    });
    for (const [resource, id] of [
      [empty, "empty-initial"],
      [relatedOnly, "related-initial"],
      [neighbor, "neighbor-initial"],
      [historyOnly, "history-initial"],
    ] as const) {
      store.applyResource(resource, {
        id,
        observedAt: "2026-08-08T08:00:00.000Z",
      });
    }
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: relatedOnly.id,
        targetResourceId: neighbor.id,
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "acme/related",
        },
      }),
    );
    store.applyResource(
      { ...historyOnly, name: "after" },
      { id: "history-change", observedAt: "2026-08-08T09:00:00.000Z" },
    );
    store.close();

    const emptyResult = await capture(() =>
      main(["context", empty.id, "--dir", dir]),
    );
    expect(emptyResult.code).toBe(0);
    expect(emptyResult.stdout).toContain("No relationships discovered yet.");
    expect(emptyResult.stdout).toContain("No changes recorded yet.");

    const relatedResult = await capture(() =>
      main(["context", relatedOnly.id, "--dir", dir]),
    );
    expect(relatedResult.code).toBe(0);
    expect(relatedResult.stdout).toContain("source_for →");
    expect(relatedResult.stdout).toContain(neighbor.id);
    expect(relatedResult.stdout).toContain("git_repository_reference");
    expect(relatedResult.stdout).toContain("No changes recorded yet.");

    const historyResult = await capture(() =>
      main(["context", historyOnly.id, "--dir", dir]),
    );
    expect(historyResult.code).toBe(0);
    expect(historyResult.stdout).toContain("No relationships discovered yet.");
    expect(historyResult.stdout).toContain("2026-08-08T09:00:00.000Z");
    expect(historyResult.stdout).toContain('"before" → "after"');
  });

  test("context composes both directions and target history offline without mutation", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.isInitialized();
    const repository = createResource({
      provider: "github",
      providerResourceId: "context-repository",
      kind: "repository",
      name: "web",
      metadata: { fullName: "acme/web" },
    });
    const project = createResource({
      provider: "vercel",
      providerResourceId: "context-project",
      kind: "project",
      name: "before",
      metadata: { domains: [], framework: "nextjs" },
    });
    const zone = createResource({
      provider: "cloudflare",
      providerResourceId: "context-zone",
      kind: "zone",
      name: "example.com",
      metadata: {},
    });
    for (const [resource, id] of [
      [repository, "repository-initial"],
      [project, "project-initial"],
      [zone, "zone-initial"],
    ] as const) {
      store.applyResource(resource, {
        id,
        observedAt: "2026-08-08T08:00:00.000Z",
      });
    }
    store.applyResource(
      { ...repository, name: "related-history-must-not-render" },
      {
        id: "related-history-sentinel",
        observedAt: "2026-08-08T11:00:00.000Z",
      },
    );
    store.applyResource(
      {
        ...project,
        name: "middle",
        metadata: { domains: ["preview.example.com"] },
      },
      { id: "older", observedAt: "2026-08-08T09:00:00.000Z" },
    );
    store.applyResource(
      {
        ...project,
        name: "current",
        metadata: { domains: ["app.example.com"], region: "iad1" },
      },
      { id: "newer", observedAt: "2026-08-08T10:00:00.000Z" },
    );
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: repository.id,
        targetResourceId: project.id,
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "acme/web",
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
    const providersBefore = store.listProviders();
    const resourcesBefore = store.listResources();
    const relationshipsBefore = store.listRelationships();
    const changesBefore = store.listChanges();
    store.close();

    const envKeys = [
      "CLOUDFLARE_API_TOKEN",
      "GITHUB_TOKEN",
      "GH_TOKEN",
      "VERCEL_TOKEN",
      "SENTRY_AUTH_TOKEN",
    ] as const;
    const previousEnv = new Map(
      envKeys.map((key) => [key, process.env[key]] as const),
    );
    for (const key of envKeys) delete process.env[key];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("context must not call a provider");
    }) as unknown as typeof fetch;
    let first;
    let second;
    try {
      first = await capture(() =>
        main(["context", project.id, "--dir", dir]),
      );
      second = await capture(() =>
        main(["context", project.id, "--dir", dir]),
      );
    } finally {
      globalThis.fetch = originalFetch;
      for (const key of envKeys) {
        const value = previousEnv.get(key);
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }

    expect(first.code).toBe(0);
    expect(second).toEqual(first);
    expect(first.stdout).toContain("Vercel project: current");
    expect(first.stdout).toContain("← source_for");
    expect(first.stdout).toContain(repository.id);
    expect(first.stdout).toContain("uses_domain_in →");
    expect(first.stdout).toContain(zone.id);
    expect(first.stdout).toContain("custom_domain_apex");
    expect(first.stdout).toContain('hostnames=["app.example.com"]');
    expect(first.stdout).toContain("2026-08-08T10:00:00.000Z");
    expect(first.stdout).toContain("2026-08-08T09:00:00.000Z");
    expect(first.stdout.match(/Observed:/g)).toHaveLength(2);
    expect(first.stdout.indexOf("2026-08-08T10:00:00.000Z")).toBeLessThan(
      first.stdout.indexOf("2026-08-08T09:00:00.000Z"),
    );
    expect(first.stdout).toContain(
      '["preview.example.com"] → ["app.example.com"]',
    );
    expect(first.stdout).toContain("(absent) → \"iad1\"");
    expect(first.stdout).not.toContain("related-history-must-not-render");
    expect(first.stdout).not.toContain("related-history-sentinel");

    const reopened = new Store(dir);
    reopened.isInitialized();
    expect(reopened.listProviders()).toEqual(providersBefore);
    expect(reopened.listResources()).toEqual(resourcesBefore);
    expect(reopened.listRelationships()).toEqual(relationshipsBefore);
    expect(reopened.listChanges()).toEqual(changesBefore);
    reopened.close();
  });

  test("relationships empty state after init", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const result = await capture(() => main(["relationships", "--dir", dir]));
    expect(result.code).toBe(0);
    expect(result.stdout.toLowerCase()).toMatch(/no relationships|sync/);
  });

  test("help lists relationships command", async () => {
    const result = await capture(() => main(["help"]));
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("relationships");
  });

  test("related fails when not initialized", async () => {
    const result = await capture(() =>
      main(["related", "github:repository:1", "--dir", dir]),
    );
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("combie init");
  });

  test("related requires resource id", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const result = await capture(() => main(["related", "--dir", dir]));
    expect(result.code).not.toBe(0);
    expect(result.stderr.toLowerCase()).toMatch(/usage|resource/);
  });

  test("related not-found state", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const result = await capture(() =>
      main(["related", "github:repository:does-not-exist", "--dir", dir]),
    );
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("Resource not found");
    expect(result.stderr).toContain("combie resources");
  });

  test("help lists related command", async () => {
    const result = await capture(() => main(["help"]));
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("related");
    expect(result.stdout).toContain("provider:kind:providerResourceId");
  });

  test("related shows source and target directions with evidence", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.isInitialized();
    const gh = createResource({
      provider: "github",
      providerResourceId: "1001",
      kind: "repository",
      name: "demo-hub",
      metadata: { fullName: "acme/demo-hub" },
    });
    const vc = createResource({
      provider: "vercel",
      providerResourceId: "prj_demo",
      kind: "project",
      name: "demo-hub",
      metadata: {},
    });
    store.upsertResource(gh);
    store.upsertResource(vc);
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: gh.id,
        targetResourceId: vc.id,
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "acme/demo-hub",
        },
      }),
    );
    store.close();

    const fromSource = await capture(() =>
      main(["related", gh.id, "--dir", dir]),
    );
    expect(fromSource.code).toBe(0);
    expect(fromSource.stdout).toContain("source_for →");
    expect(fromSource.stdout).toContain("Vercel project");
    expect(fromSource.stdout).toContain("Evidence:");
    expect(fromSource.stdout).toContain("git_repository_reference");
    expect(fromSource.stdout).not.toContain("secret");

    const fromTarget = await capture(() =>
      main(["related", vc.id, "--dir", dir]),
    );
    expect(fromTarget.code).toBe(0);
    expect(fromTarget.stdout).toContain("← source_for");
    expect(fromTarget.stdout).toContain("GitHub repository");
    expect(fromTarget.stdout).toContain("acme/demo-hub");
  });

  test("relationships and related render uses_domain_in both ways", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.isInitialized();
    const vc = createResource({
      provider: "vercel",
      providerResourceId: "prj_web",
      kind: "project",
      name: "web",
      metadata: {},
    });
    const zone = createResource({
      provider: "cloudflare",
      providerResourceId: "zone-1",
      kind: "zone",
      name: "example.com",
      metadata: {},
    });
    const gh = createResource({
      provider: "github",
      providerResourceId: "1001",
      kind: "repository",
      name: "web",
      metadata: { fullName: "acme/web" },
    });
    store.upsertResource(vc);
    store.upsertResource(zone);
    store.upsertResource(gh);
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: vc.id,
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
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: gh.id,
        targetResourceId: vc.id,
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "acme/web",
        },
      }),
    );
    store.close();

    const rels = await capture(() => main(["relationships", "--dir", dir]));
    expect(rels.code).toBe(0);
    expect(rels.stdout).toContain("uses_domain_in");
    expect(rels.stdout).toContain("source_for");
    expect(rels.stdout).toContain("Vercel web");
    expect(rels.stdout).toContain("Cloudflare example.com");
    expect(rels.stdout).toContain("example.com");

    const fromProject = await capture(() =>
      main(["related", vc.id, "--dir", dir]),
    );
    expect(fromProject.code).toBe(0);
    expect(fromProject.stdout).toContain("uses_domain_in →");
    expect(fromProject.stdout).toContain("Cloudflare zone");
    expect(fromProject.stdout).toContain("← source_for");

    const fromZone = await capture(() =>
      main(["related", zone.id, "--dir", dir]),
    );
    expect(fromZone.code).toBe(0);
    expect(fromZone.stdout).toContain("← uses_domain_in");
    expect(fromZone.stdout).toContain("Vercel project");
    expect(fromZone.stdout).toContain("custom_domain_apex");
    expect(fromZone.stdout).not.toContain("secret");
  });

  test("formatRelationshipsTable shows uses_domain_in apex evidence", () => {
    const rel = createRelationship({
      sourceResourceId: "vercel:project:prj_web",
      targetResourceId: "cloudflare:zone:zone-1",
      kind: "uses_domain_in",
      evidence: {
        source: "vercel",
        mechanism: "custom_domain_apex",
        apexName: "example.com",
        hostnames: ["app.example.com"],
      },
    });
    const labels = new Map<string, ResourceLabel>([
      [
        "vercel:project:prj_web",
        { provider: "vercel", name: "web", kind: "project", displayName: "web" },
      ],
      [
        "cloudflare:zone:zone-1",
        {
          provider: "cloudflare",
          name: "example.com",
          kind: "zone",
          displayName: "example.com",
        },
      ],
    ]);
    const table = formatRelationshipsTable([rel], labels);
    expect(table).toContain("uses_domain_in");
    expect(table).toContain("Vercel web");
    expect(table).toContain("Cloudflare example.com");
    expect(table).toContain("example.com");
  });

  test("formatRelationshipsTable shows source kind target and evidence", () => {
    const rel = createRelationship({
      sourceResourceId: "github:repository:1001",
      targetResourceId: "vercel:project:prj_abc",
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "acme/combie",
        githubRepoId: "1001",
      },
    });
    const labels = new Map<string, ResourceLabel>([
      [
        "github:repository:1001",
        {
          provider: "github",
          name: "combie",
          kind: "repository",
          displayName: "acme/combie",
        },
      ],
      [
        "vercel:project:prj_abc",
        {
          provider: "vercel",
          name: "combie-web",
          kind: "project",
          displayName: "combie-web",
        },
      ],
    ]);
    const table = formatRelationshipsTable([rel], labels);
    expect(table).toContain("FROM");
    expect(table).toContain("RELATIONSHIP");
    expect(table).toContain("TO");
    expect(table).toContain("EVIDENCE");
    expect(table).toContain("GitHub acme/combie");
    expect(table).toContain("source_for");
    expect(table).toContain("Vercel combie-web");
    expect(table).toContain("acme/combie");
    expect(table).not.toContain("ghp_");
    expect(table).not.toContain("secret");
  });

  test("connect does not leak token on auth failure", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const secret = "super-secret-token-value-xyz";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          success: false,
          errors: [{ code: 9109, message: "Invalid access token" }],
          messages: [],
          result: null,
        }),
        { status: 401 },
      );
    }) as unknown as typeof fetch;

    try {
      const result = await capture(() =>
        main(["connect", "cloudflare", "--token", secret, "--dir", dir]),
      );
      expect(result.code).not.toBe(0);
      expect(result.stderr).not.toContain(secret);
      expect(result.stdout).not.toContain(secret);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
