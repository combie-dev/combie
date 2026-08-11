import { describe, expect, test } from "bun:test";
import { createGitHubProvider } from "../../../src/providers/github/adapter.ts";
import userFixture from "./fixtures/user.json";
import reposFixture from "./fixtures/repos.json";

function mockFetch(routes: {
  user?: unknown;
  repos?: unknown;
  userStatus?: number;
  reposStatus?: number;
  userError?: string;
  reposError?: string;
}): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.endsWith("/user") || url.includes("/user?")) {
      const status = routes.userStatus ?? 200;
      if (status !== 200) {
        return Response.json(
          { message: routes.userError ?? "Bad credentials" },
          { status },
        );
      }
      return Response.json(routes.user ?? userFixture);
    }

    if (url.includes("/user/repos")) {
      const status = routes.reposStatus ?? 200;
      if (status !== 200) {
        return Response.json(
          { message: routes.reposError ?? "Not Found" },
          { status },
        );
      }
      return Response.json(routes.repos ?? reposFixture);
    }

    return Response.json({ message: `unexpected ${url}` }, { status: 404 });
  }) as typeof fetch;
}

describe("GitHub provider adapter", () => {
  test("authenticate validates identity and returns user id/login", async () => {
    const provider = createGitHubProvider({
      fetch: mockFetch({}),
    });
    const result = await provider.authenticate("ghp_test_token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.accountId).toBe("123456");
      expect(result.accountName).toBe("example-user");
    }
  });

  test("authenticate fails on empty token", async () => {
    const provider = createGitHubProvider({ fetch: mockFetch({}) });
    const result = await provider.authenticate("  ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.toLowerCase()).toContain("empty");
      expect(result.message).not.toContain("ghp_");
    }
  });

  test("authenticate fails on invalid credentials without leaking token", async () => {
    const secret = "ghp_super_secret_token_value_abcdef";
    const provider = createGitHubProvider({
      fetch: mockFetch({ userStatus: 401, userError: "Bad credentials" }),
    });
    const result = await provider.authenticate(secret);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.toLowerCase()).toMatch(/auth|credential|failed/);
      expect(result.message).not.toContain(secret);
    }
  });

  test("redacts the exact credential when GitHub echoes a short token", async () => {
    const secret = "short-secret-123";
    const provider = createGitHubProvider({
      fetch: mockFetch({ userStatus: 401, userError: `echo ${secret}` }),
    });
    const result = await provider.authenticate(secret);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).not.toContain(secret);
      expect(result.message).toContain("[REDACTED]");
    }
  });

  test("discoverResources normalizes repositories with stable ids", async () => {
    const provider = createGitHubProvider({
      fetch: mockFetch({}),
    });
    const { resources } = await provider.discoverResources("token", {
      accountId: "123456",
    });
    expect(resources).toHaveLength(3);
    expect(resources.map((r) => r.kind)).toEqual([
      "repository",
      "repository",
      "repository",
    ]);
    expect(resources.map((r) => r.id)).toEqual([
      "github:repository:1001",
      "github:repository:1002",
      "github:repository:1003",
    ]);
    expect(resources.map((r) => r.name)).toEqual([
      "combie",
      "rivora",
      "legacy-app",
    ]);
    expect(resources[0]!.metadata.fullName).toBe("example-user/combie");
  });

  test("discoverResources returns empty list when user has no repos", async () => {
    const provider = createGitHubProvider({
      fetch: mockFetch({ repos: [] }),
    });
    const { resources } = await provider.discoverResources("token", {
      accountId: "123456",
    });
    expect(resources).toEqual([]);
  });

  test("discoverResources fails on API error without leaking token", async () => {
    const secret = "ghp_leak_check_token_xyz";
    const provider = createGitHubProvider({
      fetch: mockFetch({ reposStatus: 403, reposError: "API rate limit exceeded" }),
    });
    await expect(
      provider.discoverResources(secret, { accountId: "123456" }),
    ).rejects.toThrow(/GitHub repository discovery failed/);
    try {
      await provider.discoverResources(secret, { accountId: "123456" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).not.toContain(secret);
    }
  });
});
