import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { main } from "../../src/cli/index.ts";
import { formatRelationshipsTable } from "../../src/app/list.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import { dbPath } from "../../src/storage/paths.ts";
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
      "Usage: bun run combie investigate <resource-id> [--save]",
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

  test("investigate --save lists and reopens a retained snapshot", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.init();
    const project = createResource({
      provider: "sentry",
      providerResourceId: "cli450",
      kind: "project",
      name: "cli-sentry",
      metadata: { organization_slug: "acme" },
    });
    store.applyResource(project, {
      id: "obs-cli",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const saved = await capture(() =>
      main(["investigate", project.id, "--save", "--dir", dir]),
    );
    expect(saved.code).toBe(0);
    expect(saved.stdout).toContain("SUBJECT");
    expect(saved.stdout).toContain("Saved investigation snapshot inv:");
    expect(saved.stdout).toContain("from local store state");
    const idMatch = saved.stdout.match(/Saved investigation snapshot (inv:\S+)/);
    expect(idMatch).not.toBeNull();
    const id = idMatch![1]!;

    const listed = await capture(() =>
      main(["investigations", "--dir", dir]),
    );
    expect(listed.code).toBe(0);
    expect(listed.stdout).toContain(id);
    expect(listed.stdout).toContain(project.id);

    const reopened = await capture(() =>
      main(["investigation", id, "--dir", dir]),
    );
    expect(reopened.code).toBe(0);
    expect(reopened.stdout).toContain("INVESTIGATION SNAPSHOT");
    expect(reopened.stdout).toContain("not current provider truth");
    expect(reopened.stdout).toContain("cli-sentry");
  });

  test("investigation --compare diffs the snapshot against the current compose", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.init();
    const project = createResource({
      provider: "sentry",
      providerResourceId: "cmp450",
      kind: "project",
      name: "cmp-sentry",
      metadata: { organization_slug: "acme" },
    });
    store.applyResource(project, {
      id: "obs-cmp",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const saved = await capture(() =>
      main(["investigate", project.id, "--save", "--dir", dir]),
    );
    const idMatch = saved.stdout.match(/Saved investigation snapshot (inv:\S+)/);
    expect(idMatch).not.toBeNull();
    const id = idMatch![1]!;

    const store2 = new Store(dir);
    store2.init();
    store2.applyResource(
      createResource({
        provider: "sentry",
        providerResourceId: "cmp450",
        kind: "project",
        name: "cmp-sentry-renamed",
        metadata: { organization_slug: "acme" },
      }),
      { id: "obs-cmp-2", observedAt: "2026-08-16T13:00:00.000Z" },
    );
    store2.close();

    const compared = await capture(() =>
      main(["investigation", id, "--compare", "--dir", dir]),
    );
    expect(compared.code).toBe(0);
    expect(compared.stdout).toContain("INVESTIGATION COMPARE");
    expect(compared.stdout).toContain(`Snapshot: ${id}`);
    expect(compared.stdout).toContain(`Subject: ${project.id}`);
    expect(compared.stdout).toContain("current status: available");
    expect(compared.stdout).toContain("cmp-sentry → cmp-sentry-renamed (CHANGED)");
    expect(compared.stdout).toContain("RELATIONSHIPS");
    expect(compared.stdout).toContain("AUTHORITY CLOCKS");
    expect(compared.stdout).not.toContain("subject_missing");

    const reopened = await capture(() =>
      main(["investigation", id, "--dir", dir]),
    );
    expect(reopened.code).toBe(0);
    expect(reopened.stdout).toContain("INVESTIGATION SNAPSHOT");
    expect(reopened.stdout).not.toContain("INVESTIGATION COMPARE");
  });

  test("investigation --compare reports subject_missing and still exits 0", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.init();
    const project = createResource({
      provider: "sentry",
      providerResourceId: "cmp451",
      kind: "project",
      name: "cmp-gone",
      metadata: { organization_slug: "acme" },
    });
    store.applyResource(project, {
      id: "obs-cmp-gone",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const saved = await capture(() =>
      main(["investigate", project.id, "--save", "--dir", dir]),
    );
    const idMatch = saved.stdout.match(/Saved investigation snapshot (inv:\S+)/);
    const id = idMatch![1]!;

    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resources WHERE id = '${project.id}'`);
    db.close();

    const compared = await capture(() =>
      main(["investigation", id, "--compare", "--dir", dir]),
    );
    expect(compared.code).toBe(0);
    expect(compared.stdout).toContain(`Snapshot: ${id}`);
    expect(compared.stdout).toContain("subject_missing");
    expect(compared.stdout).toContain("remains reopenable");
    expect(compared.stdout).not.toContain("RELATIONSHIPS");

    const listed = await capture(() =>
      main(["investigations", "--dir", dir]),
    );
    expect(listed.stdout).toContain(id);
  });

  test("investigations --resource lists only that subject and survives subject deletion", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.init();
    const project = createResource({
      provider: "sentry",
      providerResourceId: "cli450",
      kind: "project",
      name: "cli-sentry",
      metadata: { organization_slug: "acme" },
    });
    const repo = createResource({
      provider: "github",
      providerResourceId: "cli1001",
      kind: "repository",
      name: "cli/api",
      metadata: {},
    });
    store.applyResource(project, {
      id: "obs-cli",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.applyResource(repo, {
      id: "obs-cli-repo",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const savedA = await capture(() =>
      main(["investigate", project.id, "--save", "--dir", dir]),
    );
    const idA = savedA.stdout.match(/Saved investigation snapshot (inv:\S+)/)![1]!;
    const savedB = await capture(() =>
      main(["investigate", repo.id, "--save", "--dir", dir]),
    );
    const idB = savedB.stdout.match(/Saved investigation snapshot (inv:\S+)/)![1]!;

    const filtered = await capture(() =>
      main(["investigations", "--resource", project.id, "--dir", dir]),
    );
    expect(filtered.code).toBe(0);
    expect(filtered.stdout).toContain(idA);
    expect(filtered.stdout).not.toContain(idB);
    expect(filtered.stdout).toContain(project.id);

    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resources WHERE id = '${project.id}'`);
    db.close();

    const afterDelete = await capture(() =>
      main(["investigations", "--resource", project.id, "--dir", dir]),
    );
    expect(afterDelete.code).toBe(0);
    expect(afterDelete.stdout).toContain(idA);
    expect(afterDelete.stdout).not.toContain("Resource not found");

    const unfiltered = await capture(() =>
      main(["investigations", "--dir", dir]),
    );
    expect(unfiltered.stdout).toContain(idA);
    expect(unfiltered.stdout).toContain(idB);
  });

  test("investigations --resource with zero snapshots exits 0 with subject-empty copy", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const empty = await capture(() =>
      main(["investigations", "--resource", "sentry:project:none", "--dir", dir]),
    );
    expect(empty.code).toBe(0);
    expect(empty.stdout).toContain(
      "No investigation snapshots saved for subject sentry:project:none",
    );
    expect(empty.stdout).not.toContain("No investigation snapshots saved yet.");
    expect(empty.stdout).not.toContain("Resource not found");
  });

  test("investigations --resource requires a value and help lists the flag", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const bare = await capture(() =>
      main(["investigations", "--resource", "--dir", dir]),
    );
    expect(bare.code).toBe(1);
    expect(bare.stderr).toContain("--resource requires a resource id");

    const blank = await capture(() =>
      main(["investigations", "--resource", "", "--dir", dir]),
    );
    expect(blank.code).toBe(1);
    expect(blank.stderr).toContain("--resource requires a resource id");

    const help = await capture(() => main(["help"]));
    expect(help.code).toBe(0);
    expect(help.stdout).toContain("--resource <resource-id>");
    expect(help.stdout).toContain(
      'With "investigations": list snapshots for one subject',
    );
  });

  test("investigation requires an id and help lists --compare", async () => {
    const usage = await capture(() =>
      main(["investigation", "--dir", dir]),
    );
    expect(usage.code).toBe(1);
    expect(usage.stderr).toContain("investigation <investigation-id> [--compare]");

    const help = await capture(() => main(["help"]));
    expect(help.code).toBe(0);
    expect(help.stdout).toContain("--compare");
    expect(help.stdout).toContain(
      'With "investigation <id>": compare snapshot to current compose',
    );
  });

  test("resolution records against a saved investigation and lists by subject", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.init();
    const project = createResource({
      provider: "sentry",
      providerResourceId: "res450",
      kind: "project",
      name: "res-sentry",
      metadata: { organization_slug: "acme" },
    });
    store.applyResource(project, {
      id: "obs-res",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const saved = await capture(() =>
      main(["investigate", project.id, "--save", "--dir", dir]),
    );
    const idMatch = saved.stdout.match(/Saved investigation snapshot (inv:\S+)/);
    expect(idMatch).not.toBeNull();
    const invId = idMatch![1]!;

    const recorded = await capture(() =>
      main([
        "resolution",
        "--investigation",
        invId,
        "--decision",
        "Rollback 1.4.2",
        "--action",
        "Reverted deployment to 1.4.1",
        "--outcome",
        "Errors returned to baseline",
        "--dir",
        dir,
      ]),
    );
    expect(recorded.code).toBe(0);
    expect(recorded.stdout).toContain("Recorded resolution res:");
    expect(recorded.stdout).toContain("organizational response");
    expect(recorded.stdout).not.toMatch(/incident/i);
    const resMatch = recorded.stdout.match(/Recorded resolution (res:\S+)/);
    expect(resMatch).not.toBeNull();
    const resId = resMatch![1]!;

    const shown = await capture(() =>
      main(["resolution", resId, "--dir", dir]),
    );
    expect(shown.code).toBe(0);
    expect(shown.stdout).toContain("RESOLUTION");
    expect(shown.stdout).toContain("DECISION");
    expect(shown.stdout).toContain("Rollback 1.4.2");
    expect(shown.stdout).toContain("ACTION");
    expect(shown.stdout).toContain("OUTCOME");
    expect(shown.stdout).toContain("not current provider truth");

    const listedInv = await capture(() =>
      main(["resolutions", "--investigation", invId, "--dir", dir]),
    );
    expect(listedInv.code).toBe(0);
    expect(listedInv.stdout).toContain(resId);
    expect(listedInv.stdout).toContain(invId);

    const listedSubject = await capture(() =>
      main(["resolutions", "--resource", project.id, "--dir", dir]),
    );
    expect(listedSubject.code).toBe(0);
    expect(listedSubject.stdout).toContain(resId);

    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resources WHERE id = '${project.id}'`);
    db.close();

    const afterDelete = await capture(() =>
      main(["resolutions", "--resource", project.id, "--dir", dir]),
    );
    expect(afterDelete.code).toBe(0);
    expect(afterDelete.stdout).toContain(resId);

    const reopened = await capture(() =>
      main(["investigation", invId, "--dir", dir]),
    );
    expect(reopened.code).toBe(0);
    expect(reopened.stdout).toContain("INVESTIGATION SNAPSHOT");
    expect(reopened.stdout).toContain("RESOLUTION MEMORY");
    expect(reopened.stdout).toContain(resId);
    expect(reopened.stdout).toContain("Rollback 1.4.2");
    expect(reopened.stdout).not.toMatch(/incident/i);

    const live = await capture(() =>
      main(["investigate", project.id, "--dir", dir]),
    );
    expect(live.code).toBe(1);
    expect(live.stderr).toContain("Resource not found");
    expect(live.stdout).not.toContain("RESOLUTION MEMORY");
  });

  test("resolution requires a field and help lists capture flags", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const blank = await capture(() =>
      main(["resolution", "--investigation", "inv:x", "--dir", dir]),
    );
    expect(blank.code).toBe(1);
    expect(blank.stderr).toContain("At least one of --decision, --action, or --outcome");

    const usage = await capture(() => main(["resolution", "--dir", dir]));
    expect(usage.code).toBe(1);
    expect(usage.stderr).toContain("--investigation");

    const help = await capture(() => main(["help"]));
    expect(help.code).toBe(0);
    expect(help.stdout).toContain("resolution");
    expect(help.stdout).toContain("resolutions");
    expect(help.stdout).toContain("--decision <text>");
    expect(help.stdout).toContain("--action <text>");
    expect(help.stdout).toContain("--outcome <text>");
    expect(help.stdout).not.toContain("resolved: true");
    expect(help.stdout).toContain("Resolution memory");
    expect(help.stdout).toContain("recorded text");
    expect(help.stdout).toContain("--evidence <id>");
  });

  test("resolution --evidence attaches exact local ids shown on show, reopen, and live investigate", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.init();
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj_evidence",
      kind: "project",
      name: "ev-demo",
      metadata: { accountId: "team_1" },
    });
    store.applyResource(project, {
      id: "obs-ev",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.upsertVercelDeployment({
      provider: "vercel",
      uid: "dpl_abc",
      resourceId: project.id,
      projectId: "prj_evidence",
      readyState: "READY",
      state: "READY",
      target: "production",
      createdAtMs: 1723201000000,
      buildingAtMs: 1723201005000,
      readyAtMs: 1723201300000,
      observedAt: "2026-08-16T12:00:00.000Z",
      source: "git",
      gitCommitSha: null,
    });
    store.upsertVercelDeployment({
      provider: "vercel",
      uid: "dpl_xyz",
      resourceId: project.id,
      projectId: "prj_evidence",
      readyState: "READY",
      state: "READY",
      target: "production",
      createdAtMs: 1723202000000,
      buildingAtMs: 1723202005000,
      readyAtMs: 1723202300000,
      observedAt: "2026-08-16T13:00:00.000Z",
      source: "git",
      gitCommitSha: null,
    });
    store.close();

    const saved = await capture(() =>
      main(["investigate", project.id, "--save", "--dir", dir]),
    );
    expect(saved.code).toBe(0);
    const invMatch = saved.stdout.match(/Saved investigation snapshot (inv:\S+)/);
    expect(invMatch).not.toBeNull();
    const invId = invMatch![1]!;

    const recorded = await capture(() =>
      main([
        "resolution",
        "--investigation",
        invId,
        "--decision",
        "Rollback 1.4.2",
        "--action",
        "Reverted deploy",
        "--evidence",
        "dpl_abc",
        "--evidence",
        "dpl_xyz",
        "--dir",
        dir,
      ]),
    );
    expect(recorded.code).toBe(0);
    expect(recorded.stdout).toContain("Recorded resolution res:");
    const resMatch = recorded.stdout.match(/Recorded resolution (res:\S+)/);
    expect(resMatch).not.toBeNull();
    const resId = resMatch![1]!;

    const shown = await capture(() =>
      main(["resolution", resId, "--dir", dir]),
    );
    expect(shown.code).toBe(0);
    expect(shown.stdout).toContain("RESOLUTION");
    expect(shown.stdout).toContain("DECISION");
    expect(shown.stdout).toContain("Rollback 1.4.2");
    expect(shown.stdout.split("\n")).toContain("EVIDENCE");
    expect(shown.stdout.split("\n")).toContain("dpl_abc");
    expect(shown.stdout.split("\n")).toContain("dpl_xyz");

    const reopened = await capture(() =>
      main(["investigation", invId, "--dir", dir]),
    );
    expect(reopened.code).toBe(0);
    expect(reopened.stdout).toContain("RESOLUTION MEMORY");
    expect(reopened.stdout.split("\n")).toContain("EVIDENCE");
    expect(reopened.stdout.split("\n")).toContain("dpl_abc");
    expect(reopened.stdout.split("\n")).toContain("dpl_xyz");

    const live = await capture(() =>
      main(["investigate", project.id, "--dir", dir]),
    );
    expect(live.code).toBe(0);
    expect(live.stdout).toContain("RESOLUTION MEMORY");
    expect(live.stdout.split("\n")).toContain("EVIDENCE");
    expect(live.stdout.split("\n")).toContain("dpl_abc");
    expect(live.stdout.split("\n")).toContain("dpl_xyz");

    const listed = await capture(() =>
      main(["resolutions", "--investigation", invId, "--dir", dir]),
    );
    expect(listed.code).toBe(0);
    expect(listed.stdout).toContain(resId);
    expect(listed.stdout).not.toContain("EVIDENCE");
    expect(listed.stdout).not.toContain("dpl_abc");
  });

  test("resolution --evidence errors: no value, unknown id, evidence-only, show-with-evidence", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.init();
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj_evidence_err",
      kind: "project",
      name: "ev-err",
      metadata: { accountId: "team_1" },
    });
    store.applyResource(project, {
      id: "obs-ev-err",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.upsertVercelDeployment({
      provider: "vercel",
      uid: "dpl_abc",
      resourceId: project.id,
      projectId: "prj_evidence_err",
      readyState: "READY",
      state: "READY",
      target: "production",
      createdAtMs: 1723201000000,
      buildingAtMs: null,
      readyAtMs: null,
      observedAt: "2026-08-16T12:00:00.000Z",
      source: "git",
      gitCommitSha: null,
    });
    store.close();

    const saved = await capture(() =>
      main(["investigate", project.id, "--save", "--dir", dir]),
    );
    const invMatch = saved.stdout.match(/Saved investigation snapshot (inv:\S+)/);
    expect(invMatch).not.toBeNull();
    const invId = invMatch![1]!;

    const noValue = await capture(() =>
      main([
        "resolution",
        "--investigation",
        invId,
        "--decision",
        "Rollback",
        "--evidence",
        "--dir",
        dir,
      ]),
    );
    expect(noValue.code).toBe(1);
    expect(noValue.stderr).toMatch(/-evidence requires an evidence id/);

    const unknown = await capture(() =>
      main([
        "resolution",
        "--investigation",
        invId,
        "--decision",
        "Rollback",
        "--evidence",
        "dpl_nope",
        "--dir",
        dir,
      ]),
    );
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toContain("Evidence id not found");
    expect(unknown.stderr).toMatch(/investigate/i);

    const evidenceOnly = await capture(() =>
      main([
        "resolution",
        "--investigation",
        invId,
        "--evidence",
        "dpl_abc",
        "--dir",
        dir,
      ]),
    );
    expect(evidenceOnly.code).toBe(1);
    expect(evidenceOnly.stderr).toContain(
      "At least one of --decision, --action, or --outcome",
    );

    const showWithEvidence = await capture(() =>
      main([
        "resolution",
        "res:missing",
        "--evidence",
        "dpl_abc",
        "--dir",
        dir,
      ]),
    );
    expect(showWithEvidence.code).toBe(1);
    expect(showWithEvidence.stderr).toContain("requires --investigation");

    const listed = await capture(() =>
      main(["resolutions", "--dir", dir]),
    );
    expect(listed.code).toBe(0);
    expect(listed.stdout).toContain("No resolutions recorded yet.");
  });

  test("resolutions known-empty for a subject exits 0", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const result = await capture(() =>
      main([
        "resolutions",
        "--resource",
        "sentry:project:never-used",
        "--dir",
        dir,
      ]),
    );
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(
      "No resolutions recorded for subject sentry:project:never-used",
    );
  });

  test("resolutions --evidence lists only rows that attached that exact id", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.init();
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj_evlist",
      kind: "project",
      name: "ev-list",
      metadata: { accountId: "team_1" },
    });
    store.applyResource(project, {
      id: "obs-ev-list",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.upsertVercelDeployment({
      provider: "vercel",
      uid: "dpl_abc",
      resourceId: project.id,
      projectId: "prj_evlist",
      readyState: "READY",
      state: "READY",
      target: "production",
      createdAtMs: 1723201000000,
      buildingAtMs: 1723201005000,
      readyAtMs: 1723201300000,
      observedAt: "2026-08-16T12:00:00.000Z",
      source: "git",
      gitCommitSha: null,
    });
    store.upsertVercelDeployment({
      provider: "vercel",
      uid: "dpl_xyz",
      resourceId: project.id,
      projectId: "prj_evlist",
      readyState: "READY",
      state: "READY",
      target: "production",
      createdAtMs: 1723202000000,
      buildingAtMs: 1723202005000,
      readyAtMs: 1723202300000,
      observedAt: "2026-08-16T13:00:00.000Z",
      source: "git",
      gitCommitSha: null,
    });
    store.close();

    const savedA = await capture(() =>
      main(["investigate", project.id, "--save", "--dir", dir]),
    );
    expect(savedA.code).toBe(0);
    const invAMatch = savedA.stdout.match(/Saved investigation snapshot (inv:\S+)/);
    expect(invAMatch).not.toBeNull();
    const invA = invAMatch![1]!;

    const savedB = await capture(() =>
      main(["investigate", project.id, "--save", "--dir", dir]),
    );
    expect(savedB.code).toBe(0);
    const invBMatch = savedB.stdout.match(/Saved investigation snapshot (inv:\S+)/);
    expect(invBMatch).not.toBeNull();
    const invB = invBMatch![1]!;

    const recordedA = await capture(() =>
      main([
        "resolution",
        "--investigation",
        invA,
        "--decision",
        "Rollback 1.4.2",
        "--evidence",
        "dpl_abc",
        "--dir",
        dir,
      ]),
    );
    expect(recordedA.code).toBe(0);
    const resAMatch = recordedA.stdout.match(/Recorded resolution (res:\S+)/);
    expect(resAMatch).not.toBeNull();
    const resA = resAMatch![1]!;

    const recordedB = await capture(() =>
      main([
        "resolution",
        "--investigation",
        invB,
        "--decision",
        "Wait instead",
        "--evidence",
        "dpl_xyz",
        "--dir",
        dir,
      ]),
    );
    expect(recordedB.code).toBe(0);
    const resBMatch = recordedB.stdout.match(/Recorded resolution (res:\S+)/);
    expect(resBMatch).not.toBeNull();
    const resB = resBMatch![1]!;

    const listed = await capture(() =>
      main(["resolutions", "--evidence", "dpl_abc", "--dir", dir]),
    );
    expect(listed.code).toBe(0);
    expect(listed.stdout).toContain(resA);
    expect(listed.stdout).not.toContain(resB);
    expect(listed.stdout).not.toContain("EVIDENCE");
    expect(listed.stdout).not.toContain("dpl_abc");
  });

  test("resolutions --evidence with zero matches exits 0 with evidence-empty copy", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const result = await capture(() =>
      main(["resolutions", "--evidence", "dpl_nope", "--dir", dir]),
    );
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(
      "No resolutions recorded for evidence dpl_nope.",
    );
    expect(result.stdout).not.toContain("No resolutions recorded yet.");
    expect(result.stdout).not.toContain("EVIDENCE_ID_NOT_FOUND");
  });

  test("resolutions --evidence requires a value", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const bare = await capture(() =>
      main(["resolutions", "--evidence", "--dir", dir]),
    );
    expect(bare.code).toBe(1);
    expect(bare.stderr).toContain("--evidence requires an evidence id");

    const blank = await capture(() =>
      main(["resolutions", "--evidence", "", "--dir", dir]),
    );
    expect(blank.code).toBe(1);
    expect(blank.stderr).toContain("--evidence requires an evidence id");
  });

  test("resolutions --evidence is one exact id on the list", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const repeated = await capture(() =>
      main([
        "resolutions",
        "--evidence",
        "dpl_abc",
        "--evidence",
        "dpl_xyz",
        "--dir",
        dir,
      ]),
    );
    expect(repeated.code).toBe(1);
    expect(repeated.stderr).toContain("takes one exact id");
    expect(repeated.stdout).not.toContain("No resolutions recorded");
  });

  test("resolutions --evidence ANDs with --investigation", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.init();
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj_evand",
      kind: "project",
      name: "ev-and",
      metadata: { accountId: "team_1" },
    });
    store.applyResource(project, {
      id: "obs-ev-and",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.upsertVercelDeployment({
      provider: "vercel",
      uid: "dpl_abc",
      resourceId: project.id,
      projectId: "prj_evand",
      readyState: "READY",
      state: "READY",
      target: "production",
      createdAtMs: 1723201000000,
      buildingAtMs: 1723201005000,
      readyAtMs: 1723201300000,
      observedAt: "2026-08-16T12:00:00.000Z",
      source: "git",
      gitCommitSha: null,
    });
    store.close();

    const savedA = await capture(() =>
      main(["investigate", project.id, "--save", "--dir", dir]),
    );
    const invAMatch = savedA.stdout.match(/Saved investigation snapshot (inv:\S+)/);
    expect(invAMatch).not.toBeNull();
    const invA = invAMatch![1]!;

    const savedB = await capture(() =>
      main(["investigate", project.id, "--save", "--dir", dir]),
    );
    const invBMatch = savedB.stdout.match(/Saved investigation snapshot (inv:\S+)/);
    expect(invBMatch).not.toBeNull();
    const invB = invBMatch![1]!;

    const recordedA = await capture(() =>
      main([
        "resolution",
        "--investigation",
        invA,
        "--decision",
        "Rollback",
        "--evidence",
        "dpl_abc",
        "--dir",
        dir,
      ]),
    );
    const resAMatch = recordedA.stdout.match(/Recorded resolution (res:\S+)/);
    expect(resAMatch).not.toBeNull();
    const resA = resAMatch![1]!;

    const recordedB = await capture(() =>
      main([
        "resolution",
        "--investigation",
        invB,
        "--decision",
        "Wait",
        "--evidence",
        "dpl_abc",
        "--dir",
        dir,
      ]),
    );
    const resBMatch = recordedB.stdout.match(/Recorded resolution (res:\S+)/);
    expect(resBMatch).not.toBeNull();
    const resB = resBMatch![1]!;

    const intersection = await capture(() =>
      main([
        "resolutions",
        "--investigation",
        invB,
        "--evidence",
        "dpl_abc",
        "--dir",
        dir,
      ]),
    );
    expect(intersection.code).toBe(0);
    expect(intersection.stdout).toContain(resB);
    expect(intersection.stdout).not.toContain(resA);
  });

  test("resolutions --evidence survives subject Resource deletion", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.init();
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj_evdel",
      kind: "project",
      name: "ev-del",
      metadata: { accountId: "team_1" },
    });
    store.applyResource(project, {
      id: "obs-ev-del",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.upsertVercelDeployment({
      provider: "vercel",
      uid: "dpl_abc",
      resourceId: project.id,
      projectId: "prj_evdel",
      readyState: "READY",
      state: "READY",
      target: "production",
      createdAtMs: 1723201000000,
      buildingAtMs: 1723201005000,
      readyAtMs: 1723201300000,
      observedAt: "2026-08-16T12:00:00.000Z",
      source: "git",
      gitCommitSha: null,
    });
    store.close();

    const saved = await capture(() =>
      main(["investigate", project.id, "--save", "--dir", dir]),
    );
    const invMatch = saved.stdout.match(/Saved investigation snapshot (inv:\S+)/);
    expect(invMatch).not.toBeNull();
    const invId = invMatch![1]!;

    const recorded = await capture(() =>
      main([
        "resolution",
        "--investigation",
        invId,
        "--decision",
        "Rollback",
        "--evidence",
        "dpl_abc",
        "--dir",
        dir,
      ]),
    );
    const resMatch = recorded.stdout.match(/Recorded resolution (res:\S+)/);
    expect(resMatch).not.toBeNull();
    const resId = resMatch![1]!;

    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resources WHERE id = '${project.id}'`);
    db.close();

    const listed = await capture(() =>
      main(["resolutions", "--evidence", "dpl_abc", "--dir", dir]),
    );
    expect(listed.code).toBe(0);
    expect(listed.stdout).toContain(resId);
    expect(listed.stdout).not.toContain("Resource not found");
  });

  test("resolution --resource records without a saved investigation", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.init();
    const project = createResource({
      provider: "sentry",
      providerResourceId: "res057",
      kind: "project",
      name: "res-anchored",
      metadata: { organization_slug: "acme" },
    });
    store.applyResource(project, {
      id: "obs-res057",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const recorded = await capture(() =>
      main([
        "resolution",
        "--resource",
        project.id,
        "--decision",
        "Rollback",
        "--action",
        "Reverted deploy",
        "--outcome",
        "Errors dropped",
        "--dir",
        dir,
      ]),
    );
    expect(recorded.code).toBe(0);
    expect(recorded.stdout).toContain("Recorded resolution res:");
    expect(recorded.stdout).toContain(`subject ${project.id}`);
    expect(recorded.stdout).not.toContain("investigation ");
    expect(recorded.stdout).not.toMatch(/incident/i);
    const resMatch = recorded.stdout.match(/Recorded resolution (res:\S+)/);
    expect(resMatch).not.toBeNull();
    const resId = resMatch![1]!;

    const shown = await capture(() => main(["resolution", resId, "--dir", dir]));
    expect(shown.code).toBe(0);
    expect(shown.stdout).toContain("SUBJECT:");
    expect(shown.stdout).not.toContain("INVESTIGATION:");

    const listed = await capture(() =>
      main(["resolutions", "--resource", project.id, "--dir", dir]),
    );
    expect(listed.code).toBe(0);
    expect(listed.stdout).toContain(resId);
    expect(listed.stdout).toContain("-");

    const live = await capture(() =>
      main(["investigate", project.id, "--dir", dir]),
    );
    expect(live.code).toBe(0);
    expect(live.stdout).toContain("RESOLUTION MEMORY");
    expect(live.stdout).toContain(resId);
    expect(live.stdout).toContain("Rollback");
    const memoryLine = live.stdout
      .split("\n")
      .find((line) => line.startsWith(resId));
    expect(memoryLine).toBeDefined();
    expect(memoryLine).not.toContain("inv:");

    const both = await capture(() =>
      main([
        "resolution",
        "--investigation",
        "inv:x",
        "--resource",
        project.id,
        "--decision",
        "Nope",
        "--dir",
        dir,
      ]),
    );
    expect(both.code).toBe(1);
    expect(both.stderr).toContain("--investigation");
    expect(both.stderr).toContain("--resource");

    const missing = await capture(() =>
      main([
        "resolution",
        "--resource",
        "--decision",
        "Nope",
        "--dir",
        dir,
      ]),
    );
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain("--resource requires a resource id");

    const unknown = await capture(() =>
      main([
        "resolution",
        "--resource",
        "sentry:project:missing",
        "--decision",
        "Nope",
        "--dir",
        dir,
      ]),
    );
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toContain("Resource not found");
  });

  test("help lists resource-anchored resolution record", async () => {
    const help = await capture(() => main(["help"]));
    expect(help.code).toBe(0);
    expect(help.stdout).toContain(
      'With "resolution": resource to record against (no saved investigation)',
    );
    expect(help.stdout).toContain(
      'resolution --resource vercel:project:prj_abc --decision "Rollback"',
    );
    expect(help.stdout).toContain(
      'resolution --investigation inv:… --decision "Rollback" --action "Reverted deploy" --outcome "Errors dropped"',
    );
  });

  test("incident groups existing resolutions and help lists the command", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.init();
    const project = createResource({
      provider: "sentry",
      providerResourceId: "inc058",
      kind: "project",
      name: "inc-sentry",
      metadata: { organization_slug: "acme" },
    });
    store.applyResource(project, {
      id: "obs-inc058",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const first = await capture(() =>
      main([
        "resolution",
        "--resource",
        project.id,
        "--decision",
        "Rollback",
        "--dir",
        dir,
      ]),
    );
    expect(first.code).toBe(0);
    const resA = first.stdout.match(/res:[a-f0-9-]+/)![0];
    const second = await capture(() =>
      main([
        "resolution",
        "--resource",
        project.id,
        "--decision",
        "Hold deploys",
        "--dir",
        dir,
      ]),
    );
    expect(second.code).toBe(0);
    const resB = second.stdout.match(/res:[a-f0-9-]+/)![0];

    const grouped = await capture(() =>
      main([
        "incident",
        "--resolution",
        resA,
        "--resolution",
        resB,
        "--title",
        "API error spike",
        "--dir",
        dir,
      ]),
    );
    expect(grouped.code).toBe(0);
    expect(grouped.stdout).toMatch(/^Recorded incident inc:/);
    expect(grouped.stdout).toContain("API error spike");
    expect(grouped.stdout).toContain(resA);
    expect(grouped.stdout).toContain(resB);
    const incId = grouped.stdout.match(/inc:[a-f0-9-]+/)![0];

    const listed = await capture(() => main(["incidents", "--dir", dir]));
    expect(listed.code).toBe(0);
    expect(listed.stdout).toContain(incId);
    expect(listed.stdout).toContain("API error spike");
    expect(listed.stdout).not.toContain(resA);
    expect(listed.stdout).toContain("2");

    const shown = await capture(() => main(["incident", incId, "--dir", dir]));
    expect(shown.code).toBe(0);
    expect(shown.stdout).toContain("INCIDENT");
    expect(shown.stdout).toContain(resA);
    expect(shown.stdout).toContain(resB);
    expect(shown.stdout).not.toContain("Rollback");

    const resolutionShow = await capture(() =>
      main(["resolution", resA, "--dir", dir]),
    );
    expect(resolutionShow.code).toBe(0);
    expect(resolutionShow.stdout).not.toMatch(/INCIDENT/);

    const investigated = await capture(() =>
      main(["investigate", project.id, "--dir", dir]),
    );
    expect(investigated.code).toBe(0);
    expect(investigated.stdout).toContain("RESOLUTION MEMORY");
    expect(investigated.stdout).not.toMatch(/\nINCIDENT\n/);

    const emptyOther = await capture(() =>
      main([
        "incident",
        "--resolution",
        resA,
        "--resolution",
        resB,
        "--dir",
        dir,
      ]),
    );
    expect(emptyOther.code).toBe(1);
    expect(emptyOther.stderr).toContain("already belongs to another Incident");

    const bothAnchors = await capture(() =>
      main([
        "incident",
        "--resolution",
        resA,
        "--resolution",
        resB,
        "--investigation",
        "inv:x",
        "--dir",
        dir,
      ]),
    );
    expect(bothAnchors.code).toBe(1);
    expect(bothAnchors.stderr).toContain("--investigation");

    const viaResource = await capture(() =>
      main([
        "incident",
        "--resource",
        project.id,
        "--resolution",
        resA,
        "--resolution",
        resB,
        "--dir",
        dir,
      ]),
    );
    expect(viaResource.code).toBe(1);
    expect(viaResource.stderr).toContain("--resource");

    const one = await capture(() =>
      main(["incident", "--resolution", resA, "--dir", dir]),
    );
    expect(one.code).toBe(1);
    expect(one.stderr).toContain("at least two distinct");

    const missing = await capture(() =>
      main(["incident", "--resolution", "--dir", dir]),
    );
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain("--resolution requires a resolution id");

    const unknown = await capture(() =>
      main(["incident", "inc:missing", "--dir", dir]),
    );
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toContain("Incident not found");

    const help = await capture(() => main(["help"]));
    expect(help.code).toBe(0);
    expect(help.stdout).toContain(
      "incident                     Record or show an explicit incident grouping of resolutions",
    );
    expect(help.stdout).toContain(
      'incident --resolution res:… --resolution res:… --title "API error spike"',
    );
    expect(help.stdout).toContain(
      'resolution --investigation inv:… --decision "Rollback" --action "Reverted deploy" --outcome "Errors dropped"',
    );
    expect(help.stdout).toContain(
      'resolution --resource vercel:project:prj_abc --decision "Rollback"',
    );
  });

  test("help lists the resolutions --evidence list line and example", async () => {
    const help = await capture(() => main(["help"]));
    expect(help.code).toBe(0);
    expect(help.stdout).toContain(
      `With "resolutions": list retained resolutions that attached that exact local id (membership only; one exact id)`,
    );
    expect(help.stdout).toContain("resolutions --evidence dpl_abc");
    expect(help.stdout).toContain(
      "Attach an exact local evidence id (optional, repeatable; never inferred)",
    );
  });

  test("investigate and investigation reopen show exact-id resolution memory", async () => {
    await capture(() => main(["init", "--dir", dir]));
    const store = new Store(dir);
    store.init();
    const project = createResource({
      provider: "sentry",
      providerResourceId: "mem450",
      kind: "project",
      name: "mem-sentry",
      metadata: { organization_slug: "acme" },
    });
    const other = createResource({
      provider: "github",
      providerResourceId: "mem1001",
      kind: "repository",
      name: "acme/mem",
      metadata: {},
    });
    store.applyResource(project, {
      id: "obs-mem",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.applyResource(other, {
      id: "obs-mem-other",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const saved = await capture(() =>
      main(["investigate", project.id, "--save", "--dir", dir]),
    );
    expect(saved.stdout).not.toContain("RESOLUTION MEMORY");
    const invId = saved.stdout.match(/Saved investigation snapshot (inv:\S+)/)![1]!;

    const emptyReopen = await capture(() =>
      main(["investigation", invId, "--dir", dir]),
    );
    expect(emptyReopen.code).toBe(0);
    expect(emptyReopen.stdout).toContain("INVESTIGATION SNAPSHOT");
    expect(emptyReopen.stdout).not.toContain("RESOLUTION MEMORY");

    const recorded = await capture(() =>
      main([
        "resolution",
        "--investigation",
        invId,
        "--decision",
        "Rollback 1.4.2",
        "--dir",
        dir,
      ]),
    );
    const resId = recorded.stdout.match(/Recorded resolution (res:\S+)/)![1]!;

    const reopened = await capture(() =>
      main(["investigation", invId, "--dir", dir]),
    );
    expect(reopened.code).toBe(0);
    expect(reopened.stdout).toContain("RESOLUTION MEMORY");
    expect(reopened.stdout).toContain(resId);
    expect(reopened.stdout).toContain("DECISION");
    expect(reopened.stdout).toContain("Rollback 1.4.2");
    expect(reopened.stdout).not.toMatch(/you should/i);

    const live = await capture(() =>
      main(["investigate", project.id, "--dir", dir]),
    );
    expect(live.code).toBe(0);
    expect(live.stdout).toContain("RESOLUTION MEMORY");
    expect(live.stdout).toContain(resId);
    expect(live.stdout).toContain(invId);
    expect(live.stdout).toContain("Rollback 1.4.2");

    const otherLive = await capture(() =>
      main(["investigate", other.id, "--dir", dir]),
    );
    expect(otherLive.code).toBe(0);
    expect(otherLive.stdout).not.toContain("RESOLUTION MEMORY");
    expect(otherLive.stdout).not.toContain(resId);

    const savedAgain = await capture(() =>
      main(["investigate", project.id, "--save", "--dir", dir]),
    );
    expect(savedAgain.code).toBe(0);
    expect(savedAgain.stdout).toContain("RESOLUTION MEMORY");
    expect(savedAgain.stdout).toContain(resId);
    expect(savedAgain.stdout).toContain("Rollback 1.4.2");
    const inv2 = savedAgain.stdout.match(
      /Saved investigation snapshot (inv:\S+)/,
    )![1]!;
    const storeAfter = new Store(dir);
    storeAfter.init();
    const row = storeAfter.getInvestigationRow(inv2);
    expect(row?.snapshotJson).not.toContain("RESOLUTION MEMORY");
    expect(row?.snapshotJson).not.toContain(resId);
    expect(row?.snapshotJson).not.toContain("Rollback 1.4.2");
    storeAfter.close();

    const reopenSecond = await capture(() =>
      main(["investigation", inv2, "--dir", dir]),
    );
    expect(reopenSecond.stdout).not.toContain("RESOLUTION MEMORY");

    const compared = await capture(() =>
      main(["investigation", invId, "--compare", "--dir", dir]),
    );
    expect(compared.code).toBe(0);
    expect(compared.stdout).toContain("INVESTIGATION COMPARE");
    expect(compared.stdout).not.toContain("RESOLUTION MEMORY");
    expect(compared.stdout).not.toContain(resId);

    const missingInv = await capture(() =>
      main(["investigation", "inv:missing", "--dir", dir]),
    );
    expect(missingInv.code).toBe(1);
    expect(missingInv.stderr).toContain("Investigation not found");
    expect(missingInv.stdout).not.toContain("RESOLUTION MEMORY");

    const missingResource = await capture(() =>
      main(["investigate", "sentry:project:nope", "--dir", dir]),
    );
    expect(missingResource.code).toBe(1);
    expect(missingResource.stdout).not.toContain("RESOLUTION MEMORY");
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
