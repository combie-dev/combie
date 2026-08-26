import { describe, expect, test } from "bun:test";
import { createGitHubClient } from "../../../src/providers/github/client.ts";
import { GitHubApiError } from "../../../src/providers/github/errors.ts";
import issuesFixture from "./fixtures/issues.json";

function fetchFor(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    return handler(url, init);
  }) as unknown as typeof fetch;
}

describe("GitHubClient.listIssues", () => {
  test("targets GET /repos/{owner}/{repo}/issues with state=all&sort=updated", async () => {
    const seen: { url: string; headers: Headers }[] = [];
    const client = createGitHubClient("ghp_test_token_abcdef", {
      fetch: fetchFor((url, init) => {
        seen.push({ url, headers: new Headers(init?.headers) });
        return Response.json(issuesFixture);
      }),
    });
    const list = await client.listIssues("acme", "demo");
    expect(list).toHaveLength(4);
    expect(seen[0]!.url).toContain("/repos/acme/demo/issues");
    expect(seen[0]!.url).toContain("state=all");
    expect(seen[0]!.url).toContain("sort=updated");
    expect(seen[0]!.url).toContain("direction=desc");
    expect(seen[0]!.url).toContain("per_page=100");
    expect(seen[0]!.url).toContain("page=1");
    expect(seen[0]!.headers.get("Authorization")).toBe(
      "Bearer ghp_test_token_abcdef",
    );
    expect(seen[0]!.headers.get("Accept")).toBe("application/vnd.github+json");
    expect(seen[0]!.headers.get("X-GitHub-Api-Version")).toBe("2022-11-28");
    expect(list[0]!.id).toBe(180000001);
    expect(list[2]!.pull_request).toBeDefined();
  });

  test("default bound is a single page", async () => {
    const seen: string[] = [];
    const client = createGitHubClient("token", {
      fetch: fetchFor((url) => {
        seen.push(url);
        return Response.json(
          Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            number: i + 1,
            state: "open",
            created_at: "2026-08-20T10:00:00Z",
          })),
        );
      }),
    });
    const list = await client.listIssues("o", "r");
    expect(list).toHaveLength(100);
    expect(seen).toHaveLength(1);
  });

  test("returns empty array for known-empty repository", async () => {
    const client = createGitHubClient("token", {
      fetch: fetchFor(() => Response.json([])),
    });
    expect(await client.listIssues("o", "empty")).toEqual([]);
  });

  test("rejects non-array response", async () => {
    const client = createGitHubClient("token", {
      fetch: fetchFor(() => Response.json({ total_count: 0 })),
    });
    await expect(client.listIssues("o", "r")).rejects.toBeInstanceOf(
      GitHubApiError,
    );
  });

  test("throws on permission failure without leaking token", async () => {
    const secret = "ghp_issue_secret_token_abcdef1234567890";
    const client = createGitHubClient(secret, {
      fetch: fetchFor(() =>
        Response.json(
          { message: "Resource not accessible by integration" },
          { status: 403 },
        ),
      ),
    });
    try {
      await client.listIssues("o", "private");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(GitHubApiError);
      expect((err as Error).message).not.toContain(secret);
      expect((err as GitHubApiError).status).toBe(403);
    }
  });
});
