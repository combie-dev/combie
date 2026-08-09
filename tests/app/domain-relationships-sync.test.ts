import { describe, expect, test, afterEach, beforeEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initCombie } from "../../src/app/init.ts";
import { connectProvider } from "../../src/app/connect.ts";
import { syncProviders } from "../../src/app/sync.ts";
import { listRelationships } from "../../src/app/list.ts";
import { Store } from "../../src/storage/store.ts";
import { CredentialsStore } from "../../src/storage/credentials.ts";

function cfEnvelope<T>(result: T) {
  return { success: true, result, errors: [], messages: [] };
}

interface VercelDomainFixture {
  name: string;
  apexName: string;
}

function mockVercelCloudflareFetch(options?: {
  vercelFail?: boolean;
  cloudflareFail?: boolean;
  /** projectId → domains; "fail" makes that project's domain call fail (unknown). */
  domainsByProject?: Record<string, VercelDomainFixture[] | "fail">;
  zones?: Array<{ id: string; name: string }>;
}): typeof fetch {
  const domainsByProject = options?.domainsByProject ?? {};
  const zones = options?.zones ?? [{ id: "zone-1", name: "example.com" }];

  return (async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.includes("api.vercel.com")) {
      if (url.includes("/v2/user")) {
        if (options?.vercelFail) {
          return Response.json(
            { error: { message: "Invalid token", code: "unauthorized" } },
            { status: 403 },
          );
        }
        return Response.json({
          user: { id: "vercel_user_1", username: "test-vercel" },
        });
      }
      if (url.includes("/v7/deployments")) {
        if (options?.vercelFail) {
          return Response.json(
            { error: { message: "Forbidden", code: "forbidden" } },
            { status: 403 },
          );
        }
        return Response.json({
          deployments: [],
          pagination: { count: 0, next: null, prev: null },
        });
      }
      if (url.includes("/domains")) {
        const match = url.match(/\/v9\/projects\/([^/]+)\/domains/);
        const projectId = match ? decodeURIComponent(match[1]!) : "";
        if (options?.vercelFail) {
          return Response.json(
            { error: { message: "Forbidden", code: "forbidden" } },
            { status: 403 },
          );
        }
        const domains = domainsByProject[projectId];
        if (domains === "fail") {
          return Response.json(
            { error: { message: "Internal error", code: "internal_error" } },
            { status: 500 },
          );
        }
        return Response.json({
          domains: (domains ?? []).map((d) => ({
            name: d.name,
            apexName: d.apexName,
            projectId,
            verified: true,
          })),
          pagination: { count: (domains ?? []).length, next: null },
        });
      }
      if (url.includes("/v9/projects")) {
        if (options?.vercelFail) {
          return Response.json(
            { error: { message: "Forbidden", code: "forbidden" } },
            { status: 403 },
          );
        }
        const projects = Object.keys(domainsByProject).length > 0
          ? Object.keys(domainsByProject).map((id, i) => ({
              id,
              name: `web-${i}`,
              accountId: "team_1",
              createdAt: 1704067200000,
            }))
          : ["prj_web", "prj_empty", "prj_unknown"].map((id, i) => ({
              id,
              name: `web-${i}`,
              accountId: "team_1",
              createdAt: 1704067200000,
            }));
        return Response.json({
          projects,
          pagination: { count: projects.length, next: null },
        });
      }
    }

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
      return Response.json(cfEnvelope([]));
    }
    if (url.includes("/d1/database")) {
      return Response.json(cfEnvelope([]));
    }
    if (url.includes("/storage/kv/namespaces")) {
      return Response.json(cfEnvelope([]));
    }
    if (url.includes("/zones")) {
      return Response.json(
        cfEnvelope(zones.map((z) => ({ ...z, status: "active" }))),
      );
    }

    return Response.json({ message: `unexpected ${url}` }, { status: 404 });
  }) as typeof fetch;
}

const DEFAULT_DOMAINS: Record<string, VercelDomainFixture[] | "fail"> = {
  prj_web: [
    { name: "app.example.com", apexName: "example.com" },
    { name: "www.example.com", apexName: "example.com" },
    { name: "prj-web.vercel.app", apexName: "vercel.app" },
  ],
  prj_empty: [],
  prj_unknown: "fail",
};

describe("Vercel↔Cloudflare uses_domain_in sync", () => {
  let dir: string;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "combie-domain-rel-"));
    originalFetch = globalThis.fetch;
    globalThis.fetch = mockVercelCloudflareFetch({
      domainsByProject: DEFAULT_DOMAINS,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    rmSync(dir, { recursive: true, force: true });
  });

  async function connectBoth() {
    initCombie(dir);
    await connectProvider({
      baseDir: dir,
      providerId: "vercel",
      token: "vercel-secret-token",
    });
    await connectProvider({
      baseDir: dir,
      providerId: "cloudflare",
      token: "cf-secret-token",
    });
  }

  function usesDomainIn() {
    return listRelationships(dir).relationships.filter(
      (r) => r.kind === "uses_domain_in",
    );
  }

  test("successful sync infers deterministic uses_domain_in edge", async () => {
    await connectBoth();
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(sync.domainRelationships?.refreshed).toBe(true);
    expect(sync.domainRelationships?.inferred).toBe(1);
    expect(sync.message).toContain("uses_domain_in");
    expect(sync.message).not.toContain("vercel-secret-token");
    expect(sync.message).not.toContain("cf-secret-token");

    const rels = usesDomainIn();
    expect(rels).toHaveLength(1);
    const rel = rels[0]!;
    expect(rel.sourceResourceId).toBe("vercel:project:prj_web");
    expect(rel.targetResourceId).toBe("cloudflare:zone:zone-1");
    expect(rel.evidence.source).toBe("vercel");
    expect(rel.evidence.mechanism).toBe("custom_domain_apex");
    expect(rel.evidence.apexName).toBe("example.com");
    expect(rel.evidence.hostnames).toEqual([
      "app.example.com",
      "www.example.com",
    ]);
  });

  test("vercel.app never creates an edge even when a zone matches it", async () => {
    globalThis.fetch = mockVercelCloudflareFetch({
      domainsByProject: {
        prj_default: [
          { name: "prj-default.vercel.app", apexName: "vercel.app" },
        ],
      },
      zones: [{ id: "zone-va", name: "vercel.app" }],
    });
    await connectBoth();
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(usesDomainIn()).toHaveLength(0);
  });

  test("repeated sync is idempotent", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });
    await syncProviders({ baseDir: dir });
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(usesDomainIn()).toHaveLength(1);

    const store = new Store(dir);
    store.isInitialized();
    expect(
      store
        .listRelationships()
        .filter((r) => r.kind === "uses_domain_in"),
    ).toHaveLength(1);
    expect(store.listChanges()).toHaveLength(0);
    store.close();
  });

  test("edges survive process restart", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });

    const store1 = new Store(dir);
    expect(store1.isInitialized()).toBe(true);
    const id = store1
      .listRelationships()
      .find((r) => r.kind === "uses_domain_in")!.id;
    store1.close();

    const store2 = new Store(dir);
    expect(store2.isInitialized()).toBe(true);
    const again = store2
      .listRelationships()
      .filter((r) => r.kind === "uses_domain_in");
    expect(again).toHaveLength(1);
    expect(again[0]!.id).toBe(id);
    store2.close();
  });

  test("authoritative custom-domain removal deletes stale edge", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });
    expect(usesDomainIn()).toHaveLength(1);

    globalThis.fetch = mockVercelCloudflareFetch({
      domainsByProject: {
        prj_web: [],
        prj_empty: [],
        prj_unknown: "fail",
      },
    });
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(sync.domainRelationships?.refreshed).toBe(true);
    expect(sync.domainRelationships?.inferred).toBe(0);
    expect(sync.domainRelationships?.removed).toBe(1);
    expect(usesDomainIn()).toHaveLength(0);

    const store = new Store(dir);
    store.isInitialized();
    expect(store.listChanges()).toHaveLength(1);
    expect(store.listChanges()[0]?.fields).toEqual([
      {
        path: "metadata.domains",
        before: [
          {
            hostname: "app.example.com",
            apexName: "example.com",
            custom: true,
          },
          {
            hostname: "www.example.com",
            apexName: "example.com",
            custom: true,
          },
        ],
        after: [],
      },
    ]);
    store.close();
  });

  test("authoritative zone removal deletes stale edge after complete sync", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });
    expect(usesDomainIn()).toHaveLength(1);

    globalThis.fetch = mockVercelCloudflareFetch({
      domainsByProject: DEFAULT_DOMAINS,
      zones: [],
    });
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(sync.domainRelationships?.removed).toBe(1);
    expect(usesDomainIn()).toHaveLength(0);
  });

  test("unknown domain enrichment preserves prior affected edge", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });
    expect(usesDomainIn()).toHaveLength(1);

    // prj_web domain enrichment now fails → unknown; edge must survive.
    globalThis.fetch = mockVercelCloudflareFetch({
      domainsByProject: {
        prj_web: "fail",
        prj_empty: [],
        prj_unknown: "fail",
      },
    });
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(sync.domainRelationships?.refreshed).toBe(true);
    expect(sync.domainRelationships?.removed).toBe(0);
    expect(usesDomainIn()).toHaveLength(1);

    const store = new Store(dir);
    store.isInitialized();
    expect(store.listChanges()).toHaveLength(0);
    expect(
      store.getResource("vercel:project:prj_web")?.metadata.domains,
    ).toBeArrayOfSize(2);
    store.close();
  });

  test("unknown domain enrichment cannot create an edge from prior evidence", async () => {
    globalThis.fetch = mockVercelCloudflareFetch({
      domainsByProject: DEFAULT_DOMAINS,
      zones: [],
    });
    await connectBoth();
    await syncProviders({ baseDir: dir });
    expect(usesDomainIn()).toHaveLength(0);

    globalThis.fetch = mockVercelCloudflareFetch({
      domainsByProject: {
        prj_web: "fail",
        prj_empty: [],
        prj_unknown: "fail",
      },
      zones: [{ id: "zone-1", name: "example.com" }],
    });
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(sync.domainRelationships?.inferred).toBe(0);
    expect(usesDomainIn()).toHaveLength(0);
  });

  test("Vercel provider failure prevents destructive refresh", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });
    expect(usesDomainIn()).toHaveLength(1);

    globalThis.fetch = mockVercelCloudflareFetch({
      vercelFail: true,
      domainsByProject: DEFAULT_DOMAINS,
    });
    new CredentialsStore(dir).setCredential("vercel", "bad-vercel-token");

    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(false);
    expect(sync.domainRelationships?.refreshed).toBe(false);
    expect(usesDomainIn()).toHaveLength(1);
    const store = new Store(dir);
    store.isInitialized();
    expect(store.listChanges()).toHaveLength(0);
    store.close();
  });

  test("Cloudflare provider failure prevents destructive refresh", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });
    expect(usesDomainIn()).toHaveLength(1);

    globalThis.fetch = mockVercelCloudflareFetch({
      cloudflareFail: true,
      domainsByProject: DEFAULT_DOMAINS,
    });
    new CredentialsStore(dir).setCredential("cloudflare", "bad-cf-token");

    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(false);
    expect(sync.domainRelationships?.refreshed).toBe(false);
    expect(usesDomainIn()).toHaveLength(1);
    const store = new Store(dir);
    store.isInitialized();
    expect(store.listChanges()).toHaveLength(0);
    store.close();
  });

  test("successful provider Changes persist during partial multi-provider failure", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });

    globalThis.fetch = mockVercelCloudflareFetch({
      cloudflareFail: true,
      domainsByProject: {
        prj_web: [],
        prj_empty: [],
        prj_unknown: "fail",
      },
    });
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(false);
    expect(sync.results.find((result) => result.providerId === "vercel")?.ok).toBe(
      true,
    );
    expect(sync.results.find((result) => result.providerId === "cloudflare")?.ok).toBe(
      false,
    );

    const store = new Store(dir);
    store.isInitialized();
    expect(store.listChanges()).toHaveLength(1);
    expect(store.listChanges()[0]?.resourceId).toBe(
      "vercel:project:prj_web",
    );
    store.close();
  });

  test("single-provider sync does not refresh uses_domain_in", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });
    expect(usesDomainIn()).toHaveLength(1);

    const syncCf = await syncProviders({ baseDir: dir, providerId: "cloudflare" });
    expect(syncCf.domainRelationships?.refreshed).toBe(false);
    expect(usesDomainIn()).toHaveLength(1);

    const syncVc = await syncProviders({ baseDir: dir, providerId: "vercel" });
    expect(syncVc.domainRelationships?.refreshed).toBe(false);
    expect(usesDomainIn()).toHaveLength(1);
  });

  test("multiple matching zones create distinct edges through sync", async () => {
    globalThis.fetch = mockVercelCloudflareFetch({
      domainsByProject: {
        prj_web: [
          { name: "app.example.com", apexName: "example.com" },
          { name: "shop.example.org", apexName: "example.org" },
        ],
      },
      zones: [
        { id: "zone-1", name: "example.com" },
        { id: "zone-2", name: "example.org" },
      ],
    });
    await connectBoth();
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(sync.domainRelationships?.inferred).toBe(2);

    const rels = usesDomainIn();
    expect(rels).toHaveLength(2);
    expect(rels.map((r) => r.targetResourceId).sort()).toEqual([
      "cloudflare:zone:zone-1",
      "cloudflare:zone:zone-2",
    ]);
  });

  test("hostname churn keeps stable edge identity and updates evidence", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });
    const before = usesDomainIn()[0]!;

    globalThis.fetch = mockVercelCloudflareFetch({
      domainsByProject: {
        prj_web: [{ name: "api.example.com", apexName: "example.com" }],
        prj_empty: [],
        prj_unknown: "fail",
      },
    });
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(sync.domainRelationships?.removed).toBe(0);

    const after = usesDomainIn();
    expect(after).toHaveLength(1);
    expect(after[0]!.id).toBe(before.id);
    expect(after[0]!.evidence.hostnames).toEqual(["api.example.com"]);
  });

  test("coexists with source_for; stale cleanup never touches source_for", async () => {
    const domainsByProject: Record<string, VercelDomainFixture[] | "fail"> = {
      prj_linked: [{ name: "app.example.com", apexName: "example.com" }],
    };
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      if (url.includes("api.github.com")) {
        if (url.includes("/user/repos") || url.includes("/repos")) {
          return Response.json([
            {
              id: 1001,
              name: "web",
              full_name: "test-user/web",
              private: true,
              html_url: "https://github.com/test-user/web",
              default_branch: "main",
              archived: false,
              language: "TypeScript",
              visibility: "private",
              owner: { login: "test-user", id: 42 },
            },
          ]);
        }
        return Response.json({ id: 42, login: "test-user", name: "Test User" });
      }

      if (url.includes("api.vercel.com") && url.includes("/v9/projects") && !url.includes("/domains")) {
        return Response.json({
          projects: [
            {
              id: "prj_linked",
              name: "web",
              accountId: "team_1",
              createdAt: 1704067200000,
              link: {
                type: "github",
                org: "test-user",
                repo: "web",
                repoId: 1001,
              },
            },
          ],
          pagination: { count: 1, next: null },
        });
      }

      const fallback = mockVercelCloudflareFetch({ domainsByProject });
      return fallback(input as never);
    }) as typeof fetch;

    initCombie(dir);
    await connectProvider({ baseDir: dir, providerId: "github", token: "gh-secret" });
    await connectProvider({ baseDir: dir, providerId: "vercel", token: "vc-secret" });
    await connectProvider({ baseDir: dir, providerId: "cloudflare", token: "cf-secret" });

    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(sync.relationships?.inferred).toBe(1);
    expect(sync.domainRelationships?.inferred).toBe(1);

    const all = listRelationships(dir).relationships;
    expect(all).toHaveLength(2);
    expect(all.map((r) => r.kind).sort()).toEqual([
      "source_for",
      "uses_domain_in",
    ]);

    // Authoritative custom-domain removal: uses_domain_in goes, source_for stays.
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      if (url.includes("api.github.com")) {
        if (url.includes("/repos")) {
          return Response.json([
            {
              id: 1001,
              name: "web",
              full_name: "test-user/web",
              private: true,
              html_url: "https://github.com/test-user/web",
              default_branch: "main",
              archived: false,
              language: "TypeScript",
              visibility: "private",
              owner: { login: "test-user", id: 42 },
            },
          ]);
        }
        return Response.json({ id: 42, login: "test-user", name: "Test User" });
      }

      if (url.includes("api.vercel.com") && url.includes("/v9/projects") && !url.includes("/domains")) {
        return Response.json({
          projects: [
            {
              id: "prj_linked",
              name: "web",
              accountId: "team_1",
              createdAt: 1704067200000,
              link: {
                type: "github",
                org: "test-user",
                repo: "web",
                repoId: 1001,
              },
            },
          ],
          pagination: { count: 1, next: null },
        });
      }

      const fallback = mockVercelCloudflareFetch({
        domainsByProject: { prj_linked: [] },
      });
      return fallback(input as never);
    }) as typeof fetch;

    const sync2 = await syncProviders({ baseDir: dir });
    expect(sync2.ok).toBe(true);
    expect(sync2.domainRelationships?.removed).toBe(1);

    const after = listRelationships(dir).relationships;
    expect(after).toHaveLength(1);
    expect(after[0]!.kind).toBe("source_for");
    expect(after[0]!.sourceResourceId).toBe("github:repository:1001");
    expect(after[0]!.targetResourceId).toBe("vercel:project:prj_linked");
  });
});
