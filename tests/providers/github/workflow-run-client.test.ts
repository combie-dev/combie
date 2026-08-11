import { describe, expect, test } from "bun:test";
import { createGitHubClient } from "../../../src/providers/github/client.ts";
import { GitHubApiError } from "../../../src/providers/github/errors.ts";
import workflowRunsFixture from "./fixtures/workflow-runs.json";

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

describe("GitHubClient.listWorkflowRuns", () => {
  test("targets GET /repos/{owner}/{repo}/actions/runs with API version headers", async () => {
    const seen: { url: string; headers: Headers }[] = [];
    const client = createGitHubClient("ghp_test_token_abcdef", {
      fetch: fetchFor((url, init) => {
        seen.push({ url, headers: new Headers(init?.headers) });
        return Response.json(workflowRunsFixture);
      }),
    });
    const list = await client.listWorkflowRuns("acme", "demo");
    expect(list).toHaveLength(2);
    expect(seen[0]!.url).toContain("/repos/acme/demo/actions/runs");
    expect(seen[0]!.url).toContain("per_page=100");
    expect(seen[0]!.url).toContain("page=1");
    expect(seen[0]!.headers.get("Authorization")).toBe(
      "Bearer ghp_test_token_abcdef",
    );
    expect(seen[0]!.headers.get("Accept")).toBe("application/vnd.github+json");
    expect(seen[0]!.headers.get("X-GitHub-Api-Version")).toBe("2022-11-28");
    expect(list[0]!.id).toBe(9001);
    expect(list[0]!.repository?.id).toBe(915052094);
  });

  test("default bound is a single page", async () => {
    const seen: string[] = [];
    const client = createGitHubClient("token", {
      fetch: fetchFor((url) => {
        seen.push(url);
        return Response.json({
          total_count: 200,
          workflow_runs: Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            created_at: "2026-08-09T10:00:00Z",
            repository: { id: 1 },
          })),
        });
      }),
    });
    const list = await client.listWorkflowRuns("o", "r");
    expect(list).toHaveLength(100);
    expect(seen).toHaveLength(1);
  });

  test("returns empty array for known-empty repository", async () => {
    const client = createGitHubClient("token", {
      fetch: fetchFor(() =>
        Response.json({ total_count: 0, workflow_runs: [] }),
      ),
    });
    expect(await client.listWorkflowRuns("o", "empty")).toEqual([]);
  });

  test("rejects malformed response without workflow_runs array", async () => {
    const client = createGitHubClient("token", {
      fetch: fetchFor(() => Response.json({ total_count: 0 })),
    });
    await expect(client.listWorkflowRuns("o", "r")).rejects.toBeInstanceOf(
      GitHubApiError,
    );
  });

  test("throws on permission failure without leaking token", async () => {
    const secret = "ghp_workflow_secret_token_abcdef1234567890";
    const client = createGitHubClient(secret, {
      fetch: fetchFor(() =>
        Response.json(
          { message: "Resource not accessible by integration" },
          { status: 403 },
        ),
      ),
    });
    try {
      await client.listWorkflowRuns("o", "private");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(GitHubApiError);
      expect((err as Error).message).not.toContain(secret);
      expect((err as GitHubApiError).status).toBe(403);
    }
  });

  test("preserves status/conclusion/attempt/timestamp shapes", async () => {
    const client = createGitHubClient("token", {
      fetch: fetchFor(() => Response.json(workflowRunsFixture)),
    });
    const list = await client.listWorkflowRuns("acme", "demo");
    expect(list[1]!.status).toBe("completed");
    expect(list[1]!.conclusion).toBe("failure");
    expect(list[1]!.run_attempt).toBe(2);
    expect(list[0]!.created_at).toBe("2026-08-09T10:00:00Z");
    expect(list[0]!.run_started_at).toBe("2026-08-09T10:00:05Z");
  });
});
