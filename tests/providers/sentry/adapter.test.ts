import { describe, expect, test } from "bun:test";
import { createSentryProvider } from "../../../src/providers/sentry/adapter.ts";
import { parseSentryNextLink } from "../../../src/providers/sentry/client.ts";
import userFixture from "./fixtures/user.json";
import organizationsFixture from "./fixtures/organizations.json";
import projectsFixture from "./fixtures/projects.json";

type MockRoutes = {
  user?: unknown;
  organizations?: unknown;
  projectsByOrg?: Record<string, unknown>;
  userStatus?: number;
  orgsStatus?: number;
  projectsStatus?: number;
  userError?: string;
  orgsError?: string;
  projectsError?: string;
};

function mockFetch(routes: MockRoutes): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    // Live personal tokens use GET /auth/ ( /users/me/ often returns 403 ).
    if (url.includes("/auth/") || url.endsWith("/auth")) {
      const status = routes.userStatus ?? 200;
      if (status !== 200) {
        return Response.json(
          { detail: routes.userError ?? "Invalid token" },
          { status },
        );
      }
      return Response.json(routes.user ?? userFixture);
    }

    // Projects for a specific org: /organizations/{slug}/projects/
    const projectsMatch = url.match(
      /\/organizations\/([^/]+)\/projects\/?/,
    );
    if (projectsMatch) {
      const slug = decodeURIComponent(projectsMatch[1]!);
      const status = routes.projectsStatus ?? 200;
      if (status !== 200) {
        return Response.json(
          { detail: routes.projectsError ?? "Forbidden" },
          { status },
        );
      }
      const body =
        routes.projectsByOrg?.[slug] ??
        (slug === "acme" ? projectsFixture : []);
      return Response.json(body);
    }

    // List organizations: /organizations/ (not /organizations/{slug}/...)
    if (url.includes("/organizations/") || url.endsWith("/organizations")) {
      // Avoid matching org detail if present; list endpoint only
      const orgListOnly = /\/organizations\/?(\?|$)/.test(
        new URL(url, "https://sentry.io").pathname +
          (url.includes("?") ? "?" : ""),
      );
      // Simpler: if path has only /organizations/ without another segment after
      const path = (() => {
        try {
          return new URL(url).pathname;
        } catch {
          return url;
        }
      })();
      if (/\/organizations\/?$/.test(path) || path.includes("/organizations/?")) {
        // fall through — handled below
      } else if (!/\/organizations\/[^/]+\/projects/.test(path) &&
        /\/organizations\/[^/?]+/.test(path)) {
        // org detail — not used
      }

      if (
        path.endsWith("/organizations") ||
        path.endsWith("/organizations/") ||
        /\/organizations\/?$/.test(path)
      ) {
        const status = routes.orgsStatus ?? 200;
        if (status !== 200) {
          return Response.json(
            { detail: routes.orgsError ?? "Forbidden" },
            { status },
          );
        }
        return Response.json(routes.organizations ?? organizationsFixture);
      }
    }

    return Response.json(
      { detail: `unexpected ${url}` },
      { status: 404 },
    );
  }) as typeof fetch;
}

describe("parseSentryNextLink", () => {
  test("extracts next URL when results=true", () => {
    const link =
      '<https://sentry.io/api/0/organizations/?cursor=0:0:1>; rel="previous"; results="false"; cursor="0:0:1", ' +
      '<https://sentry.io/api/0/organizations/?cursor=100:0:0>; rel="next"; results="true"; cursor="100:0:0"';
    expect(parseSentryNextLink(link)).toBe(
      "https://sentry.io/api/0/organizations/?cursor=100:0:0",
    );
  });

  test("returns null when next has results=false", () => {
    const link =
      '<https://sentry.io/api/0/organizations/?cursor=0:0:1>; rel="previous"; results="false", ' +
      '<https://sentry.io/api/0/organizations/?cursor=100:0:0>; rel="next"; results="false"';
    expect(parseSentryNextLink(link)).toBeNull();
  });

  test("returns null for missing header", () => {
    expect(parseSentryNextLink(null)).toBeNull();
  });
});

describe("Sentry provider adapter", () => {
  test("authenticate validates identity and returns user id/username", async () => {
    const provider = createSentryProvider({
      fetch: mockFetch({}),
    });
    const result = await provider.authenticate("sentry_test_token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.accountId).toBe("123456");
      expect(result.accountName).toBe("test-user");
    }
  });

  test("authenticate prefers username then name then email", async () => {
    const provider = createSentryProvider({
      fetch: mockFetch({
        user: {
          id: "99",
          name: "Only Name",
          email: "only@example.com",
        },
      }),
    });
    const result = await provider.authenticate("token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.accountId).toBe("99");
      expect(result.accountName).toBe("Only Name");
    }
  });

  test("authenticate fails on empty token without network", async () => {
    let called = false;
    const provider = createSentryProvider({
      fetch: ((async () => {
        called = true;
        return Response.json({});
      }) as unknown) as typeof fetch,
    });
    const result = await provider.authenticate("  ");
    expect(result.ok).toBe(false);
    expect(called).toBe(false);
    if (!result.ok) {
      expect(result.message.toLowerCase()).toContain("empty");
    }
  });

  test("authenticate fails on invalid credentials without leaking token", async () => {
    const secret = "sentry_super_secret_token_value_abcdef";
    const provider = createSentryProvider({
      fetch: mockFetch({ userStatus: 401, userError: "Invalid token" }),
    });
    const result = await provider.authenticate(secret);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.toLowerCase()).toMatch(/auth|credential|failed/);
      expect(result.message).not.toContain(secret);
    }
  });

  test("redacts the exact credential when Sentry echoes a short token", async () => {
    const secret = "short-secret-123";
    const provider = createSentryProvider({
      fetch: mockFetch({ userStatus: 401, userError: `echo ${secret}` }),
    });
    const result = await provider.authenticate(secret);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).not.toContain(secret);
      expect(result.message).toContain("[REDACTED]");
    }
  });

  test("authenticate fails when user id is missing", async () => {
    const provider = createSentryProvider({
      fetch: mockFetch({
        user: {
          username: "name-only",
          email: "name@example.com",
        },
      }),
    });
    const result = await provider.authenticate("sentry_no_id_token");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.toLowerCase()).toMatch(/identity|user id|account/);
    }
  });

  test("discoverResources normalizes projects with stable ids", async () => {
    const provider = createSentryProvider({
      fetch: mockFetch({
        // Only first org has projects in default fixture routing
        organizations: [organizationsFixture[0]],
      }),
    });
    const { resources } = await provider.discoverResources("token", {
      accountId: "123456",
    });
    expect(resources).toHaveLength(3);
    expect(resources.map((r) => r.kind)).toEqual([
      "project",
      "project",
      "project",
    ]);
    expect(resources.map((r) => r.id)).toEqual([
      "sentry:project:450",
      "sentry:project:451",
      "sentry:project:452",
    ]);
    expect(resources.map((r) => r.name)).toEqual([
      "combie",
      "docs-site",
      "api-service",
    ]);
    expect(resources[0]!.metadata.platform).toBe("javascript-nextjs");
    expect(resources[0]!.metadata.organization_slug).toBe("acme");
  });

  test("discoverResources returns empty list when no projects", async () => {
    const provider = createSentryProvider({
      fetch: mockFetch({
        organizations: [organizationsFixture[0]],
        projectsByOrg: { acme: [] },
      }),
    });
    const { resources } = await provider.discoverResources("token", {
      accountId: "123456",
    });
    expect(resources).toEqual([]);
  });

  test("discoverResources returns empty when user has no organizations", async () => {
    const provider = createSentryProvider({
      fetch: mockFetch({
        organizations: [],
      }),
    });
    const { resources } = await provider.discoverResources("token", {
      accountId: "123456",
    });
    expect(resources).toEqual([]);
  });

  test("discoverResources aggregates projects across multiple organizations", async () => {
    const provider = createSentryProvider({
      fetch: mockFetch({
        organizations: organizationsFixture,
        projectsByOrg: {
          acme: [projectsFixture[0]],
          "beta-org": [
            {
              id: "900",
              slug: "beta-app",
              name: "beta-app",
              platform: "python",
              status: "active",
              organization: {
                id: "2",
                slug: "beta-org",
                name: "Beta Org",
              },
            },
          ],
        },
      }),
    });
    const { resources } = await provider.discoverResources("token", {
      accountId: "123456",
    });
    expect(resources).toHaveLength(2);
    expect(resources.map((r) => r.id).sort()).toEqual([
      "sentry:project:450",
      "sentry:project:900",
    ]);
    expect(resources.map((r) => r.metadata.organization_slug).sort()).toEqual([
      "acme",
      "beta-org",
    ]);
  });

  test("discoverResources fails on API error without leaking token", async () => {
    const secret = "sentry_leak_check_token_xyz";
    const provider = createSentryProvider({
      fetch: mockFetch({
        orgsStatus: 403,
        orgsError: "Forbidden",
      }),
    });
    await expect(
      provider.discoverResources(secret, { accountId: "123456" }),
    ).rejects.toThrow(/Sentry project discovery failed/);
    try {
      await provider.discoverResources(secret, { accountId: "123456" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).not.toContain(secret);
    }
  });

  test("discoverResources handles Link-header pagination for organizations", async () => {
    let orgCalls = 0;
    const paginatedFetch = (async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      if (url.includes("/auth/") || url.endsWith("/auth")) {
        return Response.json(userFixture);
      }

      if (url.includes("/projects/")) {
        const projectsMatch = url.match(/\/organizations\/([^/]+)\/projects/);
        const slug = projectsMatch
          ? decodeURIComponent(projectsMatch[1]!)
          : "";
        if (slug === "acme") {
          return Response.json([projectsFixture[0]]);
        }
        if (slug === "beta-org") {
          return Response.json([
            {
              id: "900",
              slug: "beta-app",
              name: "beta-app",
              organization: { id: "2", slug: "beta-org" },
            },
          ]);
        }
        return Response.json([]);
      }

      if (url.includes("/organizations")) {
        orgCalls++;
        if (url.includes("cursor=page2") || orgCalls > 1) {
          return Response.json([organizationsFixture[1]], {
            headers: {
              Link: '<https://sentry.io/api/0/organizations/?cursor=page2>; rel="previous"; results="true", <https://sentry.io/api/0/organizations/?cursor=done>; rel="next"; results="false"',
            },
          });
        }
        return Response.json([organizationsFixture[0]], {
          headers: {
            Link: '<https://sentry.io/api/0/organizations/?cursor=0>; rel="previous"; results="false", <https://sentry.io/api/0/organizations/?cursor=page2>; rel="next"; results="true"',
          },
        });
      }

      return Response.json({ detail: `unexpected ${url}` }, { status: 404 });
    }) as typeof fetch;

    const provider = createSentryProvider({ fetch: paginatedFetch });
    const { resources } = await provider.discoverResources("token", {
      accountId: "123456",
    });
    expect(orgCalls).toBeGreaterThanOrEqual(2);
    expect(resources).toHaveLength(2);
    expect(resources.map((r) => r.name).sort()).toEqual([
      "beta-app",
      "combie",
    ]);
  });
});
