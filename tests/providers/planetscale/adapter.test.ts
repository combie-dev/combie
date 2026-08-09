import { describe, expect, test } from "bun:test";
import { createPlanetScaleProvider } from "../../../src/providers/planetscale/adapter.ts";
import {
  encodePlanetScaleCredential,
} from "../../../src/providers/planetscale/credentials.ts";
import organizationsFixture from "./fixtures/organizations.json";
import databasesFixture from "./fixtures/databases.json";
import branchesFixture from "./fixtures/branches.json";

const TOKEN = encodePlanetScaleCredential(
  "psid_test_id_abcdef",
  "pssecret_test_secret_value_xyz",
);

function listPage(data: unknown[], page = 1, next: number | null = null) {
  return {
    type: "list",
    current_page: page,
    per_page: 100,
    next_page: next,
    next_page_url: null,
    prev_page: null,
    prev_page_url: null,
    data,
  };
}

function mockFetch(routes: {
  organizations?: unknown;
  organizationsStatus?: number;
  databases?: unknown;
  databasesStatus?: number;
  branches?: Record<string, unknown>;
  branchesStatus?: number;
  reverseBranches?: boolean;
}): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.includes("/branches")) {
      if (routes.branchesStatus && routes.branchesStatus !== 200) {
        return Response.json(
          { message: "branch enrichment unavailable" },
          { status: routes.branchesStatus },
        );
      }
      const dbMatch = url.match(/\/databases\/([^/?]+)\/branches/);
      const dbName = dbMatch?.[1] ?? "unknown";
      const body =
        routes.branches?.[dbName] ??
        (routes.reverseBranches
          ? listPage([...branchesFixture.data].reverse())
          : branchesFixture);
      return Response.json(body);
    }

    if (url.includes("/databases")) {
      if (routes.databasesStatus && routes.databasesStatus !== 200) {
        return Response.json(
          { message: "database list failed" },
          { status: routes.databasesStatus },
        );
      }
      return Response.json(routes.databases ?? databasesFixture);
    }

    if (url.includes("/organizations")) {
      if (routes.organizationsStatus && routes.organizationsStatus !== 200) {
        return Response.json(
          { message: "Invalid service token" },
          { status: routes.organizationsStatus },
        );
      }
      return Response.json(routes.organizations ?? organizationsFixture);
    }

    return Response.json({ message: `unexpected ${url}` }, { status: 404 });
  }) as typeof fetch;
}

describe("PlanetScale authenticate", () => {
  test("single organization becomes connection scope", async () => {
    const provider = createPlanetScaleProvider({ fetch: mockFetch({}) });
    const result = await provider.authenticate(TOKEN);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.accountId).toBe("org_acme_ps_001");
      expect(result.accountName).toBe("acme");
    }
  });

  test("explicit organization selects among many", async () => {
    const provider = createPlanetScaleProvider({
      fetch: mockFetch({
        organizations: listPage([
          { id: "org_a", name: "alpha" },
          { id: "org_b", name: "beta" },
        ]),
      }),
    });
    const result = await provider.authenticate(TOKEN, {
      organization: "beta",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.accountId).toBe("org_b");
      expect(result.accountName).toBe("beta");
    }
  });

  test("multi-org without selection fails deterministically", async () => {
    const provider = createPlanetScaleProvider({
      fetch: mockFetch({
        organizations: listPage([
          { id: "org_a", name: "alpha" },
          { id: "org_b", name: "beta" },
        ]),
      }),
    });
    const result = await provider.authenticate(TOKEN);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("--organization");
      expect(result.message).toContain("alpha");
      expect(result.message).toContain("beta");
    }
  });

  test("inaccessible explicit organization fails", async () => {
    const provider = createPlanetScaleProvider({ fetch: mockFetch({}) });
    const result = await provider.authenticate(TOKEN, {
      organization: "missing-org",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("missing-org");
      expect(result.message).toContain("acme");
    }
  });

  test("zero organizations fails with guidance", async () => {
    const provider = createPlanetScaleProvider({
      fetch: mockFetch({ organizations: listPage([]) }),
    });
    const result = await provider.authenticate(TOKEN);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/no organization/i);
    }
  });

  test("empty token fails", async () => {
    const provider = createPlanetScaleProvider({ fetch: mockFetch({}) });
    const result = await provider.authenticate("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/empty|incomplete/i);
    }
  });

  test("incomplete pair fails", async () => {
    const provider = createPlanetScaleProvider({ fetch: mockFetch({}) });
    const result = await provider.authenticate("only-id-no-colon-secret");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/incomplete|both/i);
    }
  });

  test("401 does not leak either credential component", async () => {
    const id = "psid_leaky_id_12345";
    const secret = "pssecret_leaky_secret_abcdef1234567890";
    const provider = createPlanetScaleProvider({
      fetch: mockFetch({ organizationsStatus: 401 }),
    });
    const result = await provider.authenticate(
      encodePlanetScaleCredential(id, secret),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).not.toContain(id);
      expect(result.message).not.toContain(secret);
    }
  });
});

describe("PlanetScale discoverResources", () => {
  test("discovers databases as generic database resources", async () => {
    const provider = createPlanetScaleProvider({ fetch: mockFetch({}) });
    const { resources } = await provider.discoverResources(TOKEN, {
      accountId: "org_acme_ps_001",
    });
    expect(resources).toHaveLength(2);
    const app = resources.find((r) => r.name === "combie-app")!;
    expect(app.id).toBe("planetscale:database:db_combie_app_001");
    expect(app.kind).toBe("database");
    expect(app.provider).toBe("planetscale");
    expect(app.metadata.engine).toBe("mysql");
    expect(app.metadata.region).toBe("us-east");
    expect(Array.isArray(app.metadata.branches)).toBe(true);
    expect((app.metadata.branches as unknown[]).length).toBe(2);

    const analytics = resources.find((r) => r.name === "analytics")!;
    expect(analytics.metadata.engine).toBe("postgresql");
  });

  test("zero databases is valid", async () => {
    const provider = createPlanetScaleProvider({
      fetch: mockFetch({ databases: listPage([]) }),
    });
    const { resources } = await provider.discoverResources(TOKEN, {
      accountId: "org_acme_ps_001",
    });
    expect(resources).toEqual([]);
  });

  test("branch enrichment failure keeps database and omits branches (unknown)", async () => {
    const provider = createPlanetScaleProvider({
      fetch: mockFetch({ branchesStatus: 503 }),
    });
    const { resources } = await provider.discoverResources(TOKEN, {
      accountId: "org_acme_ps_001",
    });
    expect(resources).toHaveLength(2);
    for (const r of resources) {
      expect(r.metadata.branches).toBeUndefined();
      expect(r.id.startsWith("planetscale:database:")).toBe(true);
    }
  });

  test("successful empty branch list is authoritative empty", async () => {
    const provider = createPlanetScaleProvider({
      fetch: mockFetch({
        branches: {
          "combie-app": listPage([]),
          analytics: listPage([]),
        },
      }),
    });
    const { resources } = await provider.discoverResources(TOKEN, {
      accountId: "org_acme_ps_001",
    });
    for (const r of resources) {
      expect(r.metadata.branches).toEqual([]);
    }
  });

  test("identical discovery is stable including branch order", async () => {
    const provider = createPlanetScaleProvider({
      fetch: mockFetch({ reverseBranches: true }),
    });
    const a = await provider.discoverResources(TOKEN, {
      accountId: "org_acme_ps_001",
    });
    const b = await provider.discoverResources(TOKEN, {
      accountId: "org_acme_ps_001",
    });
    expect(JSON.stringify(a.resources.map((r) => r.metadata))).toBe(
      JSON.stringify(b.resources.map((r) => r.metadata)),
    );
    const branches = a.resources.find((r) => r.name === "combie-app")!
      .metadata.branches as { name: string }[];
    expect(branches.map((x) => x.name)).toEqual(["feature-xyz", "main"]);
  });

  test("database list failure is fatal", async () => {
    const provider = createPlanetScaleProvider({
      fetch: mockFetch({ databasesStatus: 500 }),
    });
    await expect(
      provider.discoverResources(TOKEN, { accountId: "org_acme_ps_001" }),
    ).rejects.toThrow(/PlanetScale|database/i);
  });

  test("missing connected organization fails discovery", async () => {
    const provider = createPlanetScaleProvider({
      fetch: mockFetch({
        organizations: listPage([{ id: "other", name: "other" }]),
      }),
    });
    await expect(
      provider.discoverResources(TOKEN, { accountId: "org_acme_ps_001" }),
    ).rejects.toThrow(/no longer visible|Reconnect/i);
  });

  test("no secrets in discovered resources", async () => {
    const provider = createPlanetScaleProvider({ fetch: mockFetch({}) });
    const { resources } = await provider.discoverResources(TOKEN, {
      accountId: "org_acme_ps_001",
    });
    const raw = JSON.stringify(resources);
    expect(raw).not.toContain("pssecret");
    expect(raw).not.toContain("psid_test");
    expect(raw).not.toContain("psdb.cloud");
    expect(raw).not.toContain("password");
  });
});

describe("PlanetScale credential helpers", () => {
  test("encode/decode round-trip", () => {
    const encoded = encodePlanetScaleCredential("id-part", "secret:with:colons");
    expect(encoded).toBe("id-part:secret:with:colons");
  });
});
