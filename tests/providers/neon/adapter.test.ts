import { describe, expect, test } from "bun:test";
import { createNeonProvider } from "../../../src/providers/neon/adapter.ts";
import { NeonApiError } from "../../../src/providers/neon/errors.ts";
import projectsFixture from "./fixtures/projects.json";
import branchesFixture from "./fixtures/branches.json";
import databasesFixture from "./fixtures/databases.json";
import endpointsFixture from "./fixtures/endpoints.json";

function mockFetch(routes: {
  auth?: unknown;
  authStatus?: number;
  organizations?: unknown;
  organizationsStatus?: number;
  projects?: unknown;
  projectsStatus?: number;
  /** Per-project branch responses keyed by project id. */
  branches?: Record<string, unknown>;
  branchesStatus?: number;
  /** Per-branch database responses keyed by branch id. */
  databases?: Record<string, unknown>;
  databasesStatus?: number;
  /** Per-project endpoint responses keyed by project id. */
  endpoints?: Record<string, unknown>;
  endpointsStatus?: number;
}): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.endsWith("/auth")) {
      if (routes.authStatus && routes.authStatus !== 200) {
        return Response.json(
          { code: "UNAUTHENTICATED", message: "Invalid API key" },
          { status: routes.authStatus },
        );
      }
      return Response.json(
        routes.auth ?? {
          account_id: "org-acme-555",
          auth_method: "api_key_org",
        },
      );
    }

    if (url.includes("/users/me/organizations")) {
      if (routes.organizationsStatus && routes.organizationsStatus !== 200) {
        return Response.json(
          { code: "FORBIDDEN", message: "Insufficient scope" },
          { status: routes.organizationsStatus },
        );
      }
      return Response.json(
        routes.organizations ?? {
          organizations: [{ id: "org-acme-555", name: "Acme Inc" }],
        },
      );
    }

    const databaseMatch = url.match(/\/branches\/([^/?]+)\/databases/);
    if (databaseMatch) {
      if (routes.databasesStatus && routes.databasesStatus !== 200) {
        return Response.json(
          { code: "INTERNAL", message: "enrichment unavailable" },
          { status: routes.databasesStatus },
        );
      }
      const branchId = databaseMatch[1]!;
      return Response.json(
        routes.databases?.[branchId] ?? databasesFixture,
      );
    }

    const branchMatch = url.match(/\/projects\/([^/?]+)\/branches/);
    if (branchMatch) {
      if (routes.branchesStatus && routes.branchesStatus !== 200) {
        return Response.json(
          { code: "INTERNAL", message: "enrichment unavailable" },
          { status: routes.branchesStatus },
        );
      }
      const projectId = branchMatch[1]!;
      return Response.json(routes.branches?.[projectId] ?? branchesFixture);
    }

    const endpointMatch = url.match(/\/projects\/([^/?]+)\/endpoints/);
    if (endpointMatch) {
      if (routes.endpointsStatus && routes.endpointsStatus !== 200) {
        return Response.json(
          { code: "INTERNAL", message: "enrichment unavailable" },
          { status: routes.endpointsStatus },
        );
      }
      const projectId = endpointMatch[1]!;
      return Response.json(routes.endpoints?.[projectId] ?? endpointsFixture);
    }

    if (url.includes("/projects")) {
      if (routes.projectsStatus && routes.projectsStatus !== 200) {
        return Response.json(
          { code: "INTERNAL", message: "project list failed" },
          { status: routes.projectsStatus },
        );
      }
      return Response.json(
        routes.projects ?? {
          projects: projectsFixture.projects,
          pagination: { cursor: "" },
        },
      );
    }

    return Response.json(
      { code: "NOT_FOUND", message: `unexpected ${url}` },
      { status: 404 },
    );
  }) as typeof fetch;
}

describe("Neon authenticate", () => {
  test("organization key returns its trustworthy owning organization", async () => {
    const provider = createNeonProvider({ fetch: mockFetch({}) });
    const result = await provider.authenticate("neon-key");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.accountId).toBe("org-acme-555");
      expect(result.accountName).toBe("Acme Inc");
    }
  });

  test("personal key resolves one unambiguous discovery organization", async () => {
    const provider = createNeonProvider({
      fetch: mockFetch({
        auth: { account_id: "user-2", auth_method: "api_key_user" },
        organizations: {
          organizations: [{ id: "org-personal-1", name: "Personal" }],
        },
      }),
    });
    const result = await provider.authenticate("neon-key");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.accountId).toBe("org-personal-1");
      expect(result.accountName).toBe("Personal");
    }
  });

  test("personal key with multiple organizations fails instead of guessing scope", async () => {
    const provider = createNeonProvider({
      fetch: mockFetch({
        auth: { account_id: "user-2", auth_method: "api_key_user" },
        organizations: {
          organizations: [
            { id: "org-1", name: "One" },
            { id: "org-2", name: "Two" },
          ],
        },
      }),
    });
    const result = await provider.authenticate("neon-key");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("organization-scoped");
      expect(result.message).toContain("multiple organizations");
    }
  });

  test("empty token fails with guidance", async () => {
    const provider = createNeonProvider({ fetch: mockFetch({}) });
    const result = await provider.authenticate("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("--use-env");
    }
  });

  test("invalid key (401) fails without leaking the key", async () => {
    const secret = "neon_super_secret_api_key_value_abcdef1234567890";
    const provider = createNeonProvider({
      fetch: mockFetch({ authStatus: 401 }),
    });
    const result = await provider.authenticate(secret);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("authentication failed");
      expect(result.message).not.toContain(secret);
    }
  });

  test("identity response without account id fails", async () => {
    const provider = createNeonProvider({
      fetch: mockFetch({ auth: { auth_method: "api_key_org" } }),
    });
    const result = await provider.authenticate("neon-key");
    expect(result.ok).toBe(false);
  });

  test("network failure fails cleanly", async () => {
    const provider = createNeonProvider({
      fetch: (() => {
        throw new Error("ECONNREFUSED");
      }) as unknown as typeof fetch,
    });
    const result = await provider.authenticate("neon-key");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("could not reach Neon API");
    }
  });
});

describe("Neon discoverResources", () => {
  test("scopes project discovery to the connected organization", async () => {
    const seen: string[] = [];
    const recording = mockFetch({ projects: { projects: [] } });
    const provider = createNeonProvider({
      fetch: (async (input: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        seen.push(url);
        return recording(input, init);
      }) as typeof fetch,
    });
    await provider.discoverResources("neon-key", {
      accountId: "org-acme-555",
    });
    const projectRequest = seen.find((url) => url.includes("/projects?"));
    expect(projectRequest).toContain("org_id=org-acme-555");
  });

  test("fully enriches projects with branches, default-branch databases, endpoints", async () => {
    const provider = createNeonProvider({ fetch: mockFetch({}) });
    const { resources } = await provider.discoverResources("neon-key", {
      accountId: "user-uuid-1234",
    });

    expect(resources).toHaveLength(2);
    const project = resources.find(
      (r) => r.id === "neon:project:steep-moon-132241",
    )!;
    expect(project.kind).toBe("project");
    expect(project.provider).toBe("neon");
    expect(project.name).toBe("combie-app");
    expect(project.metadata.regionId).toBe("aws-us-east-2");
    expect(project.metadata.pgVersion).toBe(17);
    expect(project.metadata.branches).toEqual([
      { id: "br-calm-dawn-222222", name: "dev", default: false, protected: false },
      { id: "br-wild-fog-111111", name: "main", default: true, protected: true },
      {
        id: "br-preview-333333",
        name: "preview-pr-42",
        default: false,
        protected: false,
      },
    ]);
    expect(project.metadata.databases).toEqual([
      { name: "appdb", ownerName: "app_owner" },
      { name: "neondb", ownerName: "neondb_owner" },
    ]);
    expect(project.metadata.endpoints).toEqual([
      {
        id: "ep-steep-moon-a1b2c3",
        type: "read_write",
        branchId: "br-wild-fog-111111",
      },
      {
        id: "ep-steep-moon-d4e5f6",
        type: "read_only",
        branchId: "br-calm-dawn-222222",
      },
    ]);
  });

  test("databases are requested for the default branch only", async () => {
    const seen: string[] = [];
    const recording = mockFetch({});
    const provider = createNeonProvider({
      fetch: (async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        seen.push(url);
        return recording(input, init);
      }) as typeof fetch,
    });
    await provider.discoverResources("neon-key", { accountId: "user-uuid-1234" });

    const databaseCalls = seen.filter((u) => u.includes("/databases"));
    expect(databaseCalls).toHaveLength(2);
    for (const url of databaseCalls) {
      expect(url).toContain("/branches/br-wild-fog-111111/databases");
    }
  });

  test("zero projects produces zero resources", async () => {
    const provider = createNeonProvider({
      fetch: mockFetch({ projects: { projects: [] } }),
    });
    const { resources } = await provider.discoverResources("neon-key", {
      accountId: "user-uuid-1234",
    });
    expect(resources).toEqual([]);
  });

  test("stable identity survives project rename", async () => {
    const provider = createNeonProvider({ fetch: mockFetch({}) });
    const before = await provider.discoverResources("neon-key", {
      accountId: "user-uuid-1234",
    });

    const renamed = {
      projects: projectsFixture.projects.map((p, i) =>
        i === 0 ? { ...p, name: "combie-app-v2" } : p,
      ),
      pagination: { cursor: "" },
    };
    const after = await createNeonProvider({
      fetch: mockFetch({ projects: renamed }),
    }).discoverResources("neon-key", { accountId: "user-uuid-1234" });

    expect(after.resources.map((r) => r.id).sort()).toEqual(
      before.resources.map((r) => r.id).sort(),
    );
    expect(after.resources.find((r) => r.providerResourceId === "steep-moon-132241")!.name).toBe(
      "combie-app-v2",
    );
  });

  test("branch enrichment failure keeps project with branches/databases unknown", async () => {
    const provider = createNeonProvider({
      fetch: mockFetch({ branchesStatus: 503 }),
    });
    const { resources } = await provider.discoverResources("neon-key", {
      accountId: "user-uuid-1234",
    });

    expect(resources).toHaveLength(2);
    for (const resource of resources) {
      expect("branches" in resource.metadata).toBe(false);
      // Databases depend on default-branch identity; unknown branches make
      // them unknown too.
      expect("databases" in resource.metadata).toBe(false);
      // Endpoints enrichment is independent and still authoritative.
      expect(Array.isArray(resource.metadata.endpoints)).toBe(true);
      expect(resource.name).toBeTruthy();
    }
  });

  test("database enrichment failure keeps branches and marks databases unknown", async () => {
    const provider = createNeonProvider({
      fetch: mockFetch({ databasesStatus: 503 }),
    });
    const { resources } = await provider.discoverResources("neon-key", {
      accountId: "user-uuid-1234",
    });

    expect(resources).toHaveLength(2);
    for (const resource of resources) {
      expect(Array.isArray(resource.metadata.branches)).toBe(true);
      expect("databases" in resource.metadata).toBe(false);
      expect(Array.isArray(resource.metadata.endpoints)).toBe(true);
    }
  });

  test("endpoint enrichment failure keeps branches and databases", async () => {
    const provider = createNeonProvider({
      fetch: mockFetch({ endpointsStatus: 503 }),
    });
    const { resources } = await provider.discoverResources("neon-key", {
      accountId: "user-uuid-1234",
    });

    expect(resources).toHaveLength(2);
    for (const resource of resources) {
      expect(Array.isArray(resource.metadata.branches)).toBe(true);
      expect(Array.isArray(resource.metadata.databases)).toBe(true);
      expect("endpoints" in resource.metadata).toBe(false);
    }
  });

  test("project without a default branch has known-empty databases", async () => {
    const provider = createNeonProvider({
      fetch: mockFetch({
        branches: {
          "steep-moon-132241": {
            branches: [
              {
                id: "br-x",
                name: "feature",
                default: false,
                primary: false,
                protected: false,
              },
            ],
          },
        },
      }),
    });
    const { resources } = await provider.discoverResources("neon-key", {
      accountId: "user-uuid-1234",
    });
    const project = resources.find(
      (r) => r.id === "neon:project:steep-moon-132241",
    )!;
    expect(project.metadata.branches).toEqual([
      { id: "br-x", name: "feature", default: false, protected: false },
    ]);
    expect(project.metadata.databases).toEqual([]);
  });

  test("project list failure throws a wrapped provider error without leaking the key", async () => {
    const secret = "neon_super_secret_api_key_value_abcdef1234567890";
    const provider = createNeonProvider({
      fetch: mockFetch({ projectsStatus: 500 }),
    });
    try {
      await provider.discoverResources(secret, { accountId: "user-uuid-1234" });
      throw new Error("expected discoverResources to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(NeonApiError);
      expect((err as Error).message).toContain("Neon project discovery failed");
      expect((err as Error).message).not.toContain(secret);
    }
  });

  test("persisted facts contain no secrets or credential-bearing URIs", async () => {
    const secret = "neon_super_secret_api_key_value_abcdef1234567890";
    const provider = createNeonProvider({ fetch: mockFetch({}) });
    const { resources } = await provider.discoverResources(secret, {
      accountId: "user-uuid-1234",
    });
    const serialized = JSON.stringify(resources);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("postgres://");
    expect(serialized).not.toContain("postgresql://");
    expect(serialized.toLowerCase()).not.toContain("password");
    expect(serialized).not.toContain("Bearer");
  });
});
