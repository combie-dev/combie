import { describe, expect, test } from "bun:test";
import { createVercelProvider } from "../../../src/providers/vercel/adapter.ts";
import userFixture from "./fixtures/user.json";
import projectsFixture from "./fixtures/projects.json";
import domainsFixture from "./fixtures/domains.json";

const EMPTY_DOMAINS = { domains: [], pagination: { count: 0, next: null } };

function mockFetch(routes: {
  user?: unknown;
  projects?: unknown;
  userStatus?: number;
  projectsStatus?: number;
  userError?: string;
  projectsError?: string;
  /** Per-project domain responses keyed by project id. */
  domains?: Record<string, unknown>;
  domainsStatus?: number;
  domainsError?: string;
}): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.includes("/v2/user")) {
      const status = routes.userStatus ?? 200;
      if (status !== 200) {
        return Response.json(
          { error: { message: routes.userError ?? "Invalid token", code: "unauthorized" } },
          { status },
        );
      }
      return Response.json(routes.user ?? userFixture);
    }

    // Domain route must be matched BEFORE the generic /v9/projects route.
    const domainMatch = url.match(/\/v9\/projects\/([^/]+)\/domains/);
    if (domainMatch) {
      const status = routes.domainsStatus ?? 200;
      if (status !== 200) {
        return Response.json(
          { error: { message: routes.domainsError ?? "Forbidden", code: "forbidden" } },
          { status },
        );
      }
      const projectId = decodeURIComponent(domainMatch[1]!);
      return Response.json(routes.domains?.[projectId] ?? EMPTY_DOMAINS);
    }

    if (url.includes("/v9/projects")) {
      const status = routes.projectsStatus ?? 200;
      if (status !== 200) {
        return Response.json(
          { error: { message: routes.projectsError ?? "Forbidden", code: "forbidden" } },
          { status },
        );
      }
      return Response.json(routes.projects ?? projectsFixture);
    }

    return Response.json({ error: { message: `unexpected ${url}` } }, { status: 404 });
  }) as typeof fetch;
}

describe("Vercel provider adapter", () => {
  test("authenticate validates identity and returns user id/username", async () => {
    const provider = createVercelProvider({
      fetch: mockFetch({}),
    });
    const result = await provider.authenticate("vercel_test_token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.accountId).toBe("user_abc123");
      expect(result.accountName).toBe("test-user");
    }
  });

  test("authenticate maps live API shape (id, no uid) — connect→sync failure mode", async () => {
    // Live GET /v2/user returns `id`, not the historical `uid` field.
    // Regression: reading only `uid` left accountId undefined, so connect
    // showed username while sync failed with NO_ACCOUNT.
    const provider = createVercelProvider({
      fetch: mockFetch({
        user: {
          user: {
            id: "AEIIDYVk59zbFF2Sxfyxxmua",
            email: "sgr0691@example.com",
            username: "sgr0691",
            name: "Sergio",
          },
        },
      }),
    });
    const result = await provider.authenticate("vercel_live_shaped_token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.accountId).toBe("AEIIDYVk59zbFF2Sxfyxxmua");
      expect(result.accountName).toBe("sgr0691");
    }
  });

  test("authenticate accepts legacy uid when id is absent", async () => {
    const provider = createVercelProvider({
      fetch: mockFetch({
        user: {
          user: {
            uid: "legacy_uid_xyz",
            username: "legacy-user",
          },
        },
      }),
    });
    const result = await provider.authenticate("vercel_legacy_token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.accountId).toBe("legacy_uid_xyz");
      expect(result.accountName).toBe("legacy-user");
    }
  });

  test("authenticate fails when username is present but no id/uid", async () => {
    const provider = createVercelProvider({
      fetch: mockFetch({
        user: {
          user: {
            username: "name-only",
            email: "name@example.com",
          },
        },
      }),
    });
    const result = await provider.authenticate("vercel_no_id_token");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.toLowerCase()).toMatch(/identity|user id|account/);
    }
  });

  test("authenticate fails on empty token", async () => {
    const provider = createVercelProvider({ fetch: mockFetch({}) });
    const result = await provider.authenticate("  ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.toLowerCase()).toContain("empty");
    }
  });

  test("authenticate fails on invalid credentials without leaking token", async () => {
    const secret = "vercel_super_secret_token_value_abcdef";
    const provider = createVercelProvider({
      fetch: mockFetch({ userStatus: 403, userError: "Invalid token" }),
    });
    const result = await provider.authenticate(secret);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.toLowerCase()).toMatch(/auth|credential|failed/);
      expect(result.message).not.toContain(secret);
    }
  });

  test("redacts the exact credential when Vercel echoes a short token", async () => {
    const secret = "short-secret-123";
    const provider = createVercelProvider({
      fetch: mockFetch({ userStatus: 403, userError: `echo ${secret}` }),
    });
    const result = await provider.authenticate(secret);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).not.toContain(secret);
      expect(result.message).toContain("[REDACTED]");
    }
  });

  test("discoverResources normalizes projects with stable ids", async () => {
    const provider = createVercelProvider({
      fetch: mockFetch({}),
    });
    const { resources } = await provider.discoverResources("token", {
      accountId: "user_abc123",
    });
    expect(resources).toHaveLength(3);
    expect(resources.map((r) => r.kind)).toEqual([
      "project",
      "project",
      "project",
    ]);
    expect(resources.map((r) => r.id)).toEqual([
      "vercel:project:prj_abc123",
      "vercel:project:prj_def456",
      "vercel:project:prj_ghi789",
    ]);
    expect(resources.map((r) => r.name)).toEqual([
      "combie",
      "docs-site",
      "api-service",
    ]);
    expect(resources[0]!.metadata.framework).toBe("nextjs");
    expect(resources[0]!.metadata.accountId).toBe("team_xyz789");
  });

  test("discoverResources enriches projects with compact custom-domain evidence", async () => {
    const provider = createVercelProvider({
      fetch: mockFetch({
        domains: { prj_abc123: domainsFixture },
      }),
    });
    const { resources } = await provider.discoverResources("token", {
      accountId: "user_abc123",
    });

    expect(resources[0]!.metadata.domains).toEqual([
      { hostname: "app.example.com", apexName: "example.com", custom: true },
      { hostname: "example.com", apexName: "example.com", custom: true },
    ]);
    expect(resources[0]!.metadata.git).toEqual({
      provider: "github",
      org: "example-user",
      repo: "combie",
      fullName: "example-user/combie",
      linkType: "github",
      repoId: "1001",
    });
    expect(resources[1]!.metadata.domains).toEqual([]);
  });

  test("only vercel.app domains produce an authoritative empty custom-domain list", async () => {
    const provider = createVercelProvider({
      fetch: mockFetch({
        domains: {
          prj_abc123: {
            domains: [
              {
                name: "combie.vercel.app",
                apexName: "vercel.app",
                projectId: "prj_abc123",
                verified: true,
              },
            ],
            pagination: { count: 1, next: null },
          },
        },
      }),
    });
    const { resources } = await provider.discoverResources("token", {
      accountId: "user_abc123",
    });

    expect(resources[0]!.metadata.domains).toEqual([]);
  });

  test("domain enrichment failure preserves projects and represents domains as unknown", async () => {
    const provider = createVercelProvider({
      fetch: mockFetch({ domainsStatus: 503, domainsError: "Try again" }),
    });
    const { resources } = await provider.discoverResources("token", {
      accountId: "user_abc123",
    });

    expect(resources).toHaveLength(3);
    expect(resources.map((resource) => resource.id)).toEqual([
      "vercel:project:prj_abc123",
      "vercel:project:prj_def456",
      "vercel:project:prj_ghi789",
    ]);
    expect(resources.every((resource) => !("domains" in resource.metadata))).toBe(
      true,
    );
  });

  test("repeated discovery keeps domain metadata and project identity stable", async () => {
    const provider = createVercelProvider({
      fetch: mockFetch({ domains: { prj_abc123: domainsFixture } }),
    });
    const first = await provider.discoverResources("token", {
      accountId: "user_abc123",
    });
    const second = await provider.discoverResources("token", {
      accountId: "user_abc123",
    });

    expect(second.resources.map((resource) => resource.id)).toEqual(
      first.resources.map((resource) => resource.id),
    );
    expect(second.resources.map((resource) => resource.metadata)).toEqual(
      first.resources.map((resource) => resource.metadata),
    );
  });

  test("discoverResources returns empty list when user has no projects", async () => {
    const provider = createVercelProvider({
      fetch: mockFetch({ projects: { projects: [], pagination: { count: 0, next: null } } }),
    });
    const { resources } = await provider.discoverResources("token", {
      accountId: "user_abc123",
    });
    expect(resources).toEqual([]);
  });

  test("discoverResources fails on API error without leaking token", async () => {
    const secret = "vercel_leak_check_token_xyz";
    const provider = createVercelProvider({
      fetch: mockFetch({ projectsStatus: 403, projectsError: "Forbidden" }),
    });
    await expect(
      provider.discoverResources(secret, { accountId: "user_abc123" }),
    ).rejects.toThrow(/Vercel project discovery failed/);
    try {
      await provider.discoverResources(secret, { accountId: "user_abc123" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).not.toContain(secret);
    }
  });

  test("discoverResources handles pagination", async () => {
    let callCount = 0;
    const paginatedFetch = (async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      if (url.includes("/v2/user")) {
        return Response.json(userFixture);
      }

      if (/\/v9\/projects\/[^/]+\/domains/.test(url)) {
        return Response.json(EMPTY_DOMAINS);
      }

      if (url.includes("/v9/projects")) {
        callCount++;
        if (callCount === 1) {
          return Response.json({
            projects: [projectsFixture.projects[0]],
            pagination: { count: 1, next: "1704067200000" },
          });
        }
        return Response.json({
          projects: [projectsFixture.projects[1]],
          pagination: { count: 1, next: null },
        });
      }

      return Response.json({ error: { message: `unexpected ${url}` } }, { status: 404 });
    }) as typeof fetch;

    const provider = createVercelProvider({ fetch: paginatedFetch });
    const { resources } = await provider.discoverResources("token", {
      accountId: "user_abc123",
    });
    expect(resources).toHaveLength(2);
    expect(resources.map((r) => r.name)).toEqual(["combie", "docs-site"]);
    expect(callCount).toBe(2);
  });
});
