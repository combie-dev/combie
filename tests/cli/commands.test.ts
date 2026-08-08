import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../src/cli/index.ts";
import { formatRelationshipsTable } from "../../src/app/list.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
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
    expect(result.stdout).toContain("relationships");
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

    const resources = await capture(() => main(["resources", "--dir", dir]));
    expect(resources.code).toBe(0);
    expect(resources.stdout.toLowerCase()).toMatch(/no resources|sync/);
  });

  test("relationships fails when not initialized", async () => {
    const result = await capture(() => main(["relationships", "--dir", dir]));
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("combie init");
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
