import { describe, expect, test, afterEach, beforeEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initCombie } from "../../src/app/init.ts";
import { connectProvider } from "../../src/app/connect.ts";
import { syncProviders } from "../../src/app/sync.ts";
import {
  listProviders,
  listResources,
  formatProvidersTable,
  formatResourcesTable,
} from "../../src/app/list.ts";
import { CredentialsStore } from "../../src/storage/credentials.ts";
import { Store } from "../../src/storage/store.ts";
import { createResource } from "../../src/domain/resource.ts";
import { credentialsPath } from "../../src/storage/paths.ts";

function cfEnvelope<T>(result: T) {
  return {
    success: true,
    result,
    errors: [],
    messages: [],
  };
}

function mockMultiProviderFetch(options?: {
  githubFail?: boolean;
  cloudflareFail?: boolean;
  vercelFail?: boolean;
  sentryFail?: boolean;
}): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    // Sentry
    if (url.includes("sentry.io")) {
      // Live personal tokens use GET /auth/ ( /users/me/ often returns 403 ).
      if (url.includes("/auth/") || url.endsWith("/auth")) {
        if (options?.sentryFail) {
          return Response.json(
            { detail: "Invalid token" },
            { status: 401 },
          );
        }
        return Response.json({
          id: "sentry_user_1",
          username: "sentry-tester",
          email: "sentry-tester@example.com",
          name: "Sentry Tester",
        });
      }
      if (url.includes("/organizations/") && url.includes("/projects")) {
        if (options?.sentryFail) {
          return Response.json(
            { detail: "Forbidden" },
            { status: 403 },
          );
        }
        return Response.json([
          {
            id: "450001",
            slug: "combie-app",
            name: "combie-app",
            platform: "javascript-nextjs",
            status: "active",
            dateCreated: "2024-01-01T00:00:00.000Z",
            organization: {
              id: "1",
              slug: "test-org",
              name: "Test Org",
            },
          },
          {
            id: "450002",
            slug: "api-service",
            name: "api-service",
            platform: "node",
            status: "active",
            dateCreated: "2024-02-01T00:00:00.000Z",
            organization: {
              id: "1",
              slug: "test-org",
              name: "Test Org",
            },
          },
        ]);
      }
      if (url.includes("/organizations")) {
        if (options?.sentryFail) {
          return Response.json(
            { detail: "Invalid token" },
            { status: 401 },
          );
        }
        return Response.json([
          { id: "1", slug: "test-org", name: "Test Org" },
        ]);
      }
    }

    // Vercel (check before GitHub since /v2/user overlaps with /user)
    if (url.includes("api.vercel.com")) {
      if (url.includes("/v2/user")) {
        if (options?.vercelFail) {
          return Response.json(
            { error: { message: "Invalid token", code: "unauthorized" } },
            { status: 403 },
          );
        }
        return Response.json({
          user: { id: "vercel_user_1", email: "test@example.com", username: "test-vercel-user" },
        });
      }
      if (url.includes("/v9/projects")) {
        if (options?.vercelFail) {
          return Response.json(
            { error: { message: "Forbidden", code: "forbidden" } },
            { status: 403 },
          );
        }
        return Response.json({
          projects: [
            {
              id: "prj_abc123",
              name: "combie-web",
              framework: "nextjs",
              accountId: "team_xyz",
              createdAt: 1704067200000,
              updatedAt: 1706745600000,
            },
            {
              id: "prj_def456",
              name: "docs-site",
              framework: "astro",
              accountId: "team_xyz",
              createdAt: 1698710400000,
              updatedAt: 1701388800000,
            },
          ],
          pagination: { count: 2, next: null },
        });
      }
    }

    // GitHub
    if (url.includes("api.github.com") || (url.includes("/user") && !url.includes("api.vercel.com") && !url.includes("sentry.io"))) {
      if (url.endsWith("/user") || (url.includes("/user") && !url.includes("/repos"))) {
        if (options?.githubFail) {
          return Response.json({ message: "Bad credentials" }, { status: 401 });
        }
        return Response.json({
          id: 42,
          login: "test-user",
          name: "Test User",
        });
      }
      if (url.includes("/user/repos") || url.includes("/repos")) {
        if (options?.githubFail) {
          return Response.json({ message: "Bad credentials" }, { status: 401 });
        }
        return Response.json([
          {
            id: 1001,
            name: "combie",
            full_name: "test-user/combie",
            private: true,
            html_url: "https://github.com/test-user/combie",
            default_branch: "master",
            archived: false,
            language: "TypeScript",
            visibility: "private",
            owner: { login: "test-user", id: 42 },
          },
          {
            id: 1002,
            name: "rivora",
            full_name: "test-user/rivora",
            private: false,
            html_url: "https://github.com/test-user/rivora",
            default_branch: "main",
            archived: false,
            language: "Go",
            visibility: "public",
            owner: { login: "test-user", id: 42 },
          },
        ]);
      }
    }

    // Cloudflare
    if (options?.cloudflareFail) {
      return Response.json(
        {
          success: false,
          errors: [{ code: 9109, message: "Invalid access token" }],
          result: null,
        },
        { status: 401 },
      );
    }
    if (url.endsWith("/accounts") || url.includes("/accounts?")) {
      return Response.json(
        cfEnvelope([{ id: "acc_test", name: "Test Account" }]),
      );
    }
    if (url.includes("/workers/scripts")) {
      return Response.json(
        cfEnvelope([{ id: "api", created_on: "2024-01-01T00:00:00Z" }]),
      );
    }
    if (url.includes("/d1/database")) {
      return Response.json(
        cfEnvelope([{ uuid: "d1-1", name: "production", version: "production" }]),
      );
    }
    if (url.includes("/storage/kv/namespaces")) {
      return Response.json(
        cfEnvelope([{ id: "kv-1", title: "sessions" }]),
      );
    }
    if (url.includes("/zones")) {
      return Response.json(
        cfEnvelope([{ id: "zone-1", name: "example.com", status: "active" }]),
      );
    }

    return Response.json({ message: `unexpected ${url}` }, { status: 404 });
  }) as typeof fetch;
}

describe("multi-provider connection", () => {
  let dir: string;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "combie-multi-"));
    originalFetch = globalThis.fetch;
    globalThis.fetch = mockMultiProviderFetch();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    rmSync(dir, { recursive: true, force: true });
  });

  test("connect GitHub via --token and list providers", async () => {
    initCombie(dir);
    const secret = "ghp_test_must_not_leak";
    const result = await connectProvider({
      baseDir: dir,
      providerId: "github",
      token: secret,
    });
    expect(result.provider).toBe("GitHub");
    expect(result.accountName).toBe("test-user");
    expect(result.message).toContain("Connected");
    expect(result.message).not.toContain(secret);

    const { providers } = listProviders(dir);
    expect(providers).toHaveLength(1);
    expect(providers[0]!.id).toBe("github");
    expect(providers[0]!.config.accountName).toBe("test-user");
  });

  test("connect GitHub via --use-env (GITHUB_TOKEN)", async () => {
    initCombie(dir);
    const result = await connectProvider({
      baseDir: dir,
      providerId: "github",
      useEnvToken: true,
      env: { GITHUB_TOKEN: "env-github-token" } as NodeJS.ProcessEnv,
    });
    expect(result.provider).toBe("GitHub");
  });

  test("connect GitHub via --use-gh resolver", async () => {
    initCombie(dir);
    const result = await connectProvider({
      baseDir: dir,
      providerId: "github",
      useGh: true,
      ghTokenResolver: () => "gh-cli-token-value",
    });
    expect(result.provider).toBe("GitHub");
    expect(result.accountName).toBe("test-user");
  });

  test("Cloudflare + GitHub coexist after dual connect and sync", async () => {
    initCombie(dir);
    const cfSecret = "cf-token-secret";
    const ghSecret = "gh-token-secret";

    await connectProvider({
      baseDir: dir,
      providerId: "cloudflare",
      token: cfSecret,
    });
    await connectProvider({
      baseDir: dir,
      providerId: "github",
      token: ghSecret,
    });

    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(sync.results).toHaveLength(2);
    expect(sync.results.every((r) => r.ok)).toBe(true);

    // Cloudflare: worker + d1 + kv + zone = 4
    // GitHub: 2 repositories
    expect(sync.totalResources).toBe(6);

    const { resources } = listResources({ baseDir: dir });
    expect(resources).toHaveLength(6);

    const byProvider = {
      cloudflare: resources.filter((r) => r.provider === "cloudflare"),
      github: resources.filter((r) => r.provider === "github"),
    };
    expect(byProvider.cloudflare).toHaveLength(4);
    expect(byProvider.github).toHaveLength(2);
    expect(byProvider.github.every((r) => r.kind === "repository")).toBe(true);

    // repeated sync does not duplicate
    const sync2 = await syncProviders({ baseDir: dir });
    expect(sync2.ok).toBe(true);
    const { resources: again } = listResources({ baseDir: dir });
    expect(again).toHaveLength(6);
    expect(new Set(again.map((r) => r.id)).size).toBe(6);

    // credentials separate and not in output
    expect(existsSync(credentialsPath(dir))).toBe(true);
    const credRaw = readFileSync(credentialsPath(dir), "utf8");
    expect(credRaw).toContain(cfSecret);
    expect(credRaw).toContain(ghSecret);
    expect(sync.message).not.toContain(cfSecret);
    expect(sync.message).not.toContain(ghSecret);

    const { providers } = listProviders(dir);
    const table = formatProvidersTable(providers);
    expect(table).toContain("Cloudflare");
    expect(table).toContain("GitHub");
    expect(table).toContain("Connected");

    const rTable = formatResourcesTable(resources);
    expect(rTable).toContain("repository");
    expect(rTable).toContain("combie");
    expect(rTable).toContain("github");
    expect(rTable).toContain("worker");
    expect(rTable).toContain("cloudflare");
  });

  test("partial failure: Cloudflare succeeds, GitHub fails", async () => {
    initCombie(dir);
    await connectProvider({
      baseDir: dir,
      providerId: "cloudflare",
      token: "cf-ok",
    });
    await connectProvider({
      baseDir: dir,
      providerId: "github",
      token: "gh-will-fail",
    });

    // Break GitHub credentials by replacing with a token that will fail discovery
    // and switch fetch to fail GitHub only
    globalThis.fetch = mockMultiProviderFetch({ githubFail: true });

    // Re-store a token so connect state remains; sync will fail on GitHub API
    new CredentialsStore(dir).setCredential("github", "bad-gh-token");

    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(false);

    const cfResult = sync.results.find((r) => r.providerId === "cloudflare");
    const ghResult = sync.results.find((r) => r.providerId === "github");
    expect(cfResult?.ok).toBe(true);
    expect(cfResult!.total).toBe(4);
    expect(ghResult?.ok).toBe(false);
    expect(ghResult?.error).toBeTruthy();
    expect(ghResult!.error).not.toContain("bad-gh-token");

    // Cloudflare resources still persisted
    const { resources } = listResources({ baseDir: dir });
    expect(resources.some((r) => r.provider === "cloudflare")).toBe(true);
  });

  test("persistence: both providers survive process restart (new Store)", async () => {
    initCombie(dir);
    await connectProvider({
      baseDir: dir,
      providerId: "cloudflare",
      token: "cf-tok",
    });
    await connectProvider({
      baseDir: dir,
      providerId: "github",
      token: "gh-tok",
    });
    await syncProviders({ baseDir: dir });

    // Simulate restart: open a fresh Store on the same dir
    const store = new Store(dir);
    expect(store.isInitialized()).toBe(true);
    const providers = store.listProviders();
    expect(providers.map((p) => p.id).sort()).toEqual(["cloudflare", "github"]);
    const resources = store.listResources();
    expect(resources.length).toBe(6);
    store.close();
  });

  test("repository rename keeps stable identity on upsert", async () => {
    initCombie(dir);
    const store = new Store(dir);
    store.init();

    const original = createResource({
      provider: "github",
      providerResourceId: "1001",
      kind: "repository",
      name: "combie",
      metadata: { fullName: "user/combie" },
    });
    store.upsertResource(original);

    const renamed = createResource({
      provider: "github",
      providerResourceId: "1001",
      kind: "repository",
      name: "combie-renamed",
      metadata: { fullName: "user/combie-renamed" },
    });
    store.upsertResource(renamed);

    const all = store.listResources({ provider: "github" });
    expect(all).toHaveLength(1);
    expect(all[0]!.id).toBe("github:repository:1001");
    expect(all[0]!.name).toBe("combie-renamed");
    expect(all[0]!.createdAt).toBe(original.createdAt);
    store.close();
  });

  test("connect Vercel via --token and list providers", async () => {
    initCombie(dir);
    const secret = "vercel_test_must_not_leak";
    const result = await connectProvider({
      baseDir: dir,
      providerId: "vercel",
      token: secret,
    });
    expect(result.provider).toBe("Vercel");
    expect(result.accountId).toBe("vercel_user_1");
    expect(result.accountName).toBe("test-vercel-user");
    expect(result.message).toContain("Connected");
    expect(result.message).not.toContain(secret);

    const { providers } = listProviders(dir);
    expect(providers).toHaveLength(1);
    expect(providers[0]!.id).toBe("vercel");
    expect(providers[0]!.config.accountId).toBe("vercel_user_1");
    expect(providers[0]!.config.accountName).toBe("test-vercel-user");
  });

  test("connect Vercel via --use-env (VERCEL_TOKEN)", async () => {
    initCombie(dir);
    const result = await connectProvider({
      baseDir: dir,
      providerId: "vercel",
      useEnvToken: true,
      env: { VERCEL_TOKEN: "env-vercel-token" } as NodeJS.ProcessEnv,
    });
    expect(result.provider).toBe("Vercel");
    expect(result.accountId).toBe("vercel_user_1");
  });

  test("Vercel connect→sync with live API user shape (id, no uid)", async () => {
    // Live verification failure mode: /v2/user returns `id` + `username`,
    // not historical `uid`. Identity must persist so sync does not throw
    // "authentication succeeded but no account identity was returned."
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      if (url.includes("api.vercel.com") && url.includes("/v2/user")) {
        return Response.json({
          user: {
            id: "AEIIDYVk59zbFF2Sxfyxxmua",
            email: "sgr0691@example.com",
            username: "sgr0691",
            name: "Sergio",
          },
        });
      }
      if (url.includes("api.vercel.com") && url.includes("/v9/projects")) {
        return Response.json({
          projects: [
            {
              id: "prj_live_1",
              name: "combie",
              framework: "nextjs",
              accountId: "team_live",
              createdAt: 1704067200000,
              updatedAt: 1706745600000,
            },
          ],
          pagination: { count: 1, next: null },
        });
      }
      return Response.json({ error: { message: `unexpected ${url}` } }, { status: 404 });
    }) as typeof fetch;

    initCombie(dir);
    const secret = "vercel_live_shape_token";
    const connected = await connectProvider({
      baseDir: dir,
      providerId: "vercel",
      token: secret,
    });
    expect(connected.accountId).toBe("AEIIDYVk59zbFF2Sxfyxxmua");
    expect(connected.accountName).toBe("sgr0691");
    expect(connected.message).toContain("sgr0691");
    expect(connected.message).not.toContain(secret);

    const store = new Store(dir);
    store.isInitialized();
    const providerRow = store.getProvider("vercel");
    expect(providerRow!.config.accountId).toBe("AEIIDYVk59zbFF2Sxfyxxmua");
    expect(providerRow!.config.accountName).toBe("sgr0691");
    store.close();

    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(sync.results).toHaveLength(1);
    expect(sync.results[0]!.ok).toBe(true);
    expect(sync.results[0]!.total).toBe(1);
    expect(sync.message).not.toContain("no account identity");
    expect(sync.message).not.toContain(secret);

    const { resources } = listResources({ baseDir: dir });
    expect(resources).toHaveLength(1);
    expect(resources[0]!.id).toBe("vercel:project:prj_live_1");
    expect(resources[0]!.kind).toBe("project");
  });

  test("Vercel connect fails when auth has username but no account id", async () => {
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.includes("/v2/user")) {
        return Response.json({
          user: { username: "name-only", email: "x@example.com" },
        });
      }
      return Response.json({ error: { message: `unexpected ${url}` } }, { status: 404 });
    }) as typeof fetch;

    initCombie(dir);
    await expect(
      connectProvider({
        baseDir: dir,
        providerId: "vercel",
        token: "vercel_no_id",
      }),
    ).rejects.toThrow(/account identity|user id|authentication failed/i);

    const { providers } = listProviders(dir);
    expect(providers).toHaveLength(0);
  });

  test("Cloudflare + GitHub + Vercel coexist after triple connect and sync", async () => {
    initCombie(dir);
    const cfSecret = "cf-token-secret";
    const ghSecret = "gh-token-secret";
    const vcSecret = "vc-token-secret";

    await connectProvider({ baseDir: dir, providerId: "cloudflare", token: cfSecret });
    await connectProvider({ baseDir: dir, providerId: "github", token: ghSecret });
    await connectProvider({ baseDir: dir, providerId: "vercel", token: vcSecret });

    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(sync.results).toHaveLength(3);
    expect(sync.results.every((r) => r.ok)).toBe(true);

    // Cloudflare: worker + d1 + kv + zone = 4
    // GitHub: 2 repositories
    // Vercel: 2 projects
    expect(sync.totalResources).toBe(8);

    const { resources } = listResources({ baseDir: dir });
    expect(resources).toHaveLength(8);

    const byProvider = {
      cloudflare: resources.filter((r) => r.provider === "cloudflare"),
      github: resources.filter((r) => r.provider === "github"),
      vercel: resources.filter((r) => r.provider === "vercel"),
    };
    expect(byProvider.cloudflare).toHaveLength(4);
    expect(byProvider.github).toHaveLength(2);
    expect(byProvider.vercel).toHaveLength(2);
    expect(byProvider.vercel.every((r) => r.kind === "project")).toBe(true);

    // repeated sync does not duplicate
    const sync2 = await syncProviders({ baseDir: dir });
    expect(sync2.ok).toBe(true);
    const { resources: again } = listResources({ baseDir: dir });
    expect(again).toHaveLength(8);
    expect(new Set(again.map((r) => r.id)).size).toBe(8);

    // credentials separate and not in output
    expect(existsSync(credentialsPath(dir))).toBe(true);
    const credRaw = readFileSync(credentialsPath(dir), "utf8");
    expect(credRaw).toContain(cfSecret);
    expect(credRaw).toContain(ghSecret);
    expect(credRaw).toContain(vcSecret);
    expect(sync.message).not.toContain(cfSecret);
    expect(sync.message).not.toContain(ghSecret);
    expect(sync.message).not.toContain(vcSecret);

    const { providers } = listProviders(dir);
    const table = formatProvidersTable(providers);
    expect(table).toContain("Cloudflare");
    expect(table).toContain("GitHub");
    expect(table).toContain("Vercel");
    expect(table).toContain("Connected");

    const rTable = formatResourcesTable(resources);
    expect(rTable).toContain("repository");
    expect(rTable).toContain("github");
    expect(rTable).toContain("worker");
    expect(rTable).toContain("cloudflare");
    expect(rTable).toContain("project");
    expect(rTable).toContain("vercel");
    expect(rTable).toContain("combie-web");
  });

  test("three-provider partial failure: Cloudflare + Vercel succeed, GitHub fails", async () => {
    initCombie(dir);
    await connectProvider({ baseDir: dir, providerId: "cloudflare", token: "cf-ok" });
    await connectProvider({ baseDir: dir, providerId: "github", token: "gh-ok" });
    await connectProvider({ baseDir: dir, providerId: "vercel", token: "vc-ok" });

    globalThis.fetch = mockMultiProviderFetch({ githubFail: true });
    new CredentialsStore(dir).setCredential("github", "bad-gh-token");

    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(false);

    const cfResult = sync.results.find((r) => r.providerId === "cloudflare");
    const ghResult = sync.results.find((r) => r.providerId === "github");
    const vcResult = sync.results.find((r) => r.providerId === "vercel");
    expect(cfResult?.ok).toBe(true);
    expect(ghResult?.ok).toBe(false);
    expect(vcResult?.ok).toBe(true);
    expect(ghResult?.error).toBeTruthy();
    expect(ghResult!.error).not.toContain("bad-gh-token");

    const { resources } = listResources({ baseDir: dir });
    expect(resources.some((r) => r.provider === "cloudflare")).toBe(true);
    expect(resources.some((r) => r.provider === "vercel")).toBe(true);
  });

  test("three-provider persistence: all survive process restart", async () => {
    initCombie(dir);
    await connectProvider({ baseDir: dir, providerId: "cloudflare", token: "cf-tok" });
    await connectProvider({ baseDir: dir, providerId: "github", token: "gh-tok" });
    await connectProvider({ baseDir: dir, providerId: "vercel", token: "vc-tok" });
    await syncProviders({ baseDir: dir });

    const store = new Store(dir);
    expect(store.isInitialized()).toBe(true);
    const providers = store.listProviders();
    expect(providers.map((p) => p.id).sort()).toEqual(["cloudflare", "github", "vercel"]);
    const resources = store.listResources();
    expect(resources.length).toBe(8);
    store.close();
  });

  test("Vercel project rename keeps stable identity on upsert", async () => {
    initCombie(dir);
    const store = new Store(dir);
    store.init();

    const original = createResource({
      provider: "vercel",
      providerResourceId: "prj_abc123",
      kind: "project",
      name: "combie-web",
      metadata: { framework: "nextjs" },
    });
    store.upsertResource(original);

    const renamed = createResource({
      provider: "vercel",
      providerResourceId: "prj_abc123",
      kind: "project",
      name: "combie-web-v2",
      metadata: { framework: "nextjs" },
    });
    store.upsertResource(renamed);

    const all = store.listResources({ provider: "vercel" });
    expect(all).toHaveLength(1);
    expect(all[0]!.id).toBe("vercel:project:prj_abc123");
    expect(all[0]!.name).toBe("combie-web-v2");
    expect(all[0]!.createdAt).toBe(original.createdAt);
    store.close();
  });

  test("connect Sentry via --token and list providers", async () => {
    initCombie(dir);
    const secret = "sentry_test_must_not_leak";
    const result = await connectProvider({
      baseDir: dir,
      providerId: "sentry",
      token: secret,
    });
    expect(result.provider).toBe("Sentry");
    expect(result.accountId).toBe("sentry_user_1");
    expect(result.accountName).toBe("sentry-tester");
    expect(result.message).toContain("Connected");
    expect(result.message).not.toContain(secret);

    const { providers } = listProviders(dir);
    expect(providers).toHaveLength(1);
    expect(providers[0]!.id).toBe("sentry");
    expect(providers[0]!.config.accountId).toBe("sentry_user_1");
    expect(providers[0]!.config.accountName).toBe("sentry-tester");
  });

  test("connect Sentry via --use-env (SENTRY_AUTH_TOKEN)", async () => {
    initCombie(dir);
    const result = await connectProvider({
      baseDir: dir,
      providerId: "sentry",
      useEnvToken: true,
      env: { SENTRY_AUTH_TOKEN: "env-sentry-token" } as NodeJS.ProcessEnv,
    });
    expect(result.provider).toBe("Sentry");
    expect(result.accountId).toBe("sentry_user_1");
  });

  test("Cloudflare + GitHub + Vercel + Sentry coexist after quadruple connect and sync", async () => {
    initCombie(dir);
    const cfSecret = "cf-token-secret";
    const ghSecret = "gh-token-secret";
    const vcSecret = "vc-token-secret";
    const snSecret = "sn-token-secret";

    await connectProvider({ baseDir: dir, providerId: "cloudflare", token: cfSecret });
    await connectProvider({ baseDir: dir, providerId: "github", token: ghSecret });
    await connectProvider({ baseDir: dir, providerId: "vercel", token: vcSecret });
    await connectProvider({ baseDir: dir, providerId: "sentry", token: snSecret });

    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(sync.results).toHaveLength(4);
    expect(sync.results.every((r) => r.ok)).toBe(true);

    // Cloudflare: 4 + GitHub: 2 + Vercel: 2 + Sentry: 2 = 10
    expect(sync.totalResources).toBe(10);

    const { resources } = listResources({ baseDir: dir });
    expect(resources).toHaveLength(10);

    const byProvider = {
      cloudflare: resources.filter((r) => r.provider === "cloudflare"),
      github: resources.filter((r) => r.provider === "github"),
      vercel: resources.filter((r) => r.provider === "vercel"),
      sentry: resources.filter((r) => r.provider === "sentry"),
    };
    expect(byProvider.cloudflare).toHaveLength(4);
    expect(byProvider.github).toHaveLength(2);
    expect(byProvider.vercel).toHaveLength(2);
    expect(byProvider.sentry).toHaveLength(2);
    expect(byProvider.sentry.every((r) => r.kind === "project")).toBe(true);

    // repeated sync does not duplicate
    const sync2 = await syncProviders({ baseDir: dir });
    expect(sync2.ok).toBe(true);
    const { resources: again } = listResources({ baseDir: dir });
    expect(again).toHaveLength(10);
    expect(new Set(again.map((r) => r.id)).size).toBe(10);

    // credentials separate and not in output
    expect(existsSync(credentialsPath(dir))).toBe(true);
    const credRaw = readFileSync(credentialsPath(dir), "utf8");
    expect(credRaw).toContain(cfSecret);
    expect(credRaw).toContain(ghSecret);
    expect(credRaw).toContain(vcSecret);
    expect(credRaw).toContain(snSecret);
    expect(sync.message).not.toContain(cfSecret);
    expect(sync.message).not.toContain(ghSecret);
    expect(sync.message).not.toContain(vcSecret);
    expect(sync.message).not.toContain(snSecret);

    const { providers } = listProviders(dir);
    const table = formatProvidersTable(providers);
    expect(table).toContain("Cloudflare");
    expect(table).toContain("GitHub");
    expect(table).toContain("Vercel");
    expect(table).toContain("Sentry");
    expect(table).toContain("Connected");

    const rTable = formatResourcesTable(resources);
    expect(rTable).toContain("repository");
    expect(rTable).toContain("github");
    expect(rTable).toContain("worker");
    expect(rTable).toContain("cloudflare");
    expect(rTable).toContain("project");
    expect(rTable).toContain("vercel");
    expect(rTable).toContain("sentry");
    expect(rTable).toContain("combie-web");
    expect(rTable).toContain("combie-app");
  });

  test("four-provider partial failure: others succeed, Sentry fails", async () => {
    initCombie(dir);
    await connectProvider({ baseDir: dir, providerId: "cloudflare", token: "cf-ok" });
    await connectProvider({ baseDir: dir, providerId: "github", token: "gh-ok" });
    await connectProvider({ baseDir: dir, providerId: "vercel", token: "vc-ok" });
    await connectProvider({ baseDir: dir, providerId: "sentry", token: "sn-ok" });

    globalThis.fetch = mockMultiProviderFetch({ sentryFail: true });
    new CredentialsStore(dir).setCredential("sentry", "bad-sentry-token");

    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(false);

    const cfResult = sync.results.find((r) => r.providerId === "cloudflare");
    const ghResult = sync.results.find((r) => r.providerId === "github");
    const vcResult = sync.results.find((r) => r.providerId === "vercel");
    const snResult = sync.results.find((r) => r.providerId === "sentry");
    expect(cfResult?.ok).toBe(true);
    expect(ghResult?.ok).toBe(true);
    expect(vcResult?.ok).toBe(true);
    expect(snResult?.ok).toBe(false);
    expect(snResult?.error).toBeTruthy();
    expect(snResult!.error).not.toContain("bad-sentry-token");

    const { resources } = listResources({ baseDir: dir });
    expect(resources.some((r) => r.provider === "cloudflare")).toBe(true);
    expect(resources.some((r) => r.provider === "github")).toBe(true);
    expect(resources.some((r) => r.provider === "vercel")).toBe(true);
    // Sentry resources should not appear from the failed sync
    expect(resources.some((r) => r.provider === "sentry")).toBe(false);
  });

  test("four-provider persistence: all survive process restart", async () => {
    initCombie(dir);
    await connectProvider({ baseDir: dir, providerId: "cloudflare", token: "cf-tok" });
    await connectProvider({ baseDir: dir, providerId: "github", token: "gh-tok" });
    await connectProvider({ baseDir: dir, providerId: "vercel", token: "vc-tok" });
    await connectProvider({ baseDir: dir, providerId: "sentry", token: "sn-tok" });
    await syncProviders({ baseDir: dir });

    const store = new Store(dir);
    expect(store.isInitialized()).toBe(true);
    const providers = store.listProviders();
    expect(providers.map((p) => p.id).sort()).toEqual([
      "cloudflare",
      "github",
      "sentry",
      "vercel",
    ]);
    const resources = store.listResources();
    expect(resources.length).toBe(10);
    store.close();
  });

  test("explicit identity: vercel and sentry projects with same providerResourceId coexist", async () => {
    initCombie(dir);
    const store = new Store(dir);
    store.init();

    const vercelProject = createResource({
      provider: "vercel",
      providerResourceId: "shared_id",
      kind: "project",
      name: "vercel-app",
      metadata: { framework: "nextjs" },
    });
    const sentryProject = createResource({
      provider: "sentry",
      providerResourceId: "shared_id",
      kind: "project",
      name: "sentry-app",
      metadata: { platform: "javascript" },
    });

    store.upsertResource(vercelProject);
    store.upsertResource(sentryProject);

    const all = store.listResources();
    expect(all).toHaveLength(2);
    const ids = all.map((r) => r.id).sort();
    expect(ids).toEqual(["sentry:project:shared_id", "vercel:project:shared_id"]);
    expect(all.find((r) => r.provider === "vercel")!.name).toBe("vercel-app");
    expect(all.find((r) => r.provider === "sentry")!.name).toBe("sentry-app");
    store.close();
  });
});
