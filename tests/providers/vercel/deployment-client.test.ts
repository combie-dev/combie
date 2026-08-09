import { describe, expect, test } from "bun:test";
import { createVercelClient } from "../../../src/providers/vercel/client.ts";
import { VercelApiError } from "../../../src/providers/vercel/errors.ts";
import deploymentsFixture from "./fixtures/deployments.json";

function fetchFor(
  handler: (url: string) => Response | Promise<Response>,
): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    return handler(url);
  }) as typeof fetch;
}

describe("VercelClient.listDeploymentsForProject", () => {
  test("targets GET /v7/deployments with exact projectId and bearer auth", async () => {
    const seen: { url: string; auth?: string | null }[] = [];
    const client = createVercelClient("vercel_test_token_abcdef", {
      fetch: fetchFor((url) => {
        seen.push({ url, auth: null });
        return Response.json(deploymentsFixture);
      }),
    });
    // Capture auth via a richer fetch
    const client2 = createVercelClient("vercel_test_token_abcdef", {
      fetch: (async (input: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        const headers = new Headers(init?.headers);
        seen.push({ url, auth: headers.get("Authorization") });
        return Response.json(deploymentsFixture);
      }) as typeof fetch,
    });
    const list = await client2.listDeploymentsForProject("prj_demo_hub");
    expect(list).toHaveLength(2);
    expect(seen[0]!.url).toContain("/v7/deployments");
    expect(seen[0]!.url).toContain("projectId=prj_demo_hub");
    expect(seen[0]!.auth).toBe("Bearer vercel_test_token_abcdef");
    expect(list[0]!.uid).toBe("dpl_ready_001");
    expect(list[0]!.projectId).toBe("prj_demo_hub");
  });

  test("follows pagination via until cursor", async () => {
    const seen: string[] = [];
    const client = createVercelClient("token", {
      fetch: fetchFor((url) => {
        seen.push(url);
        if (!url.includes("until=")) {
          return Response.json({
            deployments: [
              {
                uid: "dpl_page1",
                projectId: "prj_x",
                created: 2000,
                readyState: "READY",
              },
            ],
            pagination: { count: 1, next: 1500, prev: null },
          });
        }
        return Response.json({
          deployments: [
            {
              uid: "dpl_page2",
              projectId: "prj_x",
              created: 1000,
              readyState: "ERROR",
            },
          ],
          pagination: { count: 1, next: null, prev: 1500 },
        });
      }),
    });
    const list = await client.listDeploymentsForProject("prj_x");
    expect(list.map((d) => d.uid)).toEqual(["dpl_page1", "dpl_page2"]);
    expect(seen).toHaveLength(2);
    expect(seen[1]).toContain("until=1500");
  });

  test("returns empty array for known-empty project", async () => {
    const client = createVercelClient("token", {
      fetch: fetchFor(() =>
        Response.json({
          deployments: [],
          pagination: { count: 0, next: null, prev: null },
        }),
      ),
    });
    expect(await client.listDeploymentsForProject("prj_empty")).toEqual([]);
  });

  test("rejects malformed response without deployments array", async () => {
    const client = createVercelClient("token", {
      fetch: fetchFor(() =>
        Response.json({ pagination: { count: 0, next: null } }),
      ),
    });
    await expect(
      client.listDeploymentsForProject("prj_bad"),
    ).rejects.toBeInstanceOf(VercelApiError);
  });

  test("throws VercelApiError on API failure", async () => {
    const client = createVercelClient("token", {
      fetch: fetchFor(() =>
        Response.json(
          { error: { message: "Forbidden", code: "forbidden" } },
          { status: 403 },
        ),
      ),
    });
    await expect(
      client.listDeploymentsForProject("prj_x"),
    ).rejects.toBeInstanceOf(VercelApiError);
  });

  test("failure message does not leak the token", async () => {
    const secret = "vercel_deploy_secret_token_abcdef1234567890";
    const client = createVercelClient(secret, {
      fetch: fetchFor(() =>
        Response.json({ error: { message: "nope" } }, { status: 500 }),
      ),
    });
    try {
      await client.listDeploymentsForProject("prj_x");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(VercelApiError);
      expect((err as Error).message).not.toContain(secret);
    }
  });

  test("preserves timestamp variants in raw list items", async () => {
    const client = createVercelClient("token", {
      fetch: fetchFor(() =>
        Response.json({
          deployments: [
            {
              uid: "dpl_ts",
              projectId: "prj_x",
              created: 111,
              createdAt: 111,
              buildingAt: 222,
              ready: 333,
              readyState: "READY",
            },
          ],
          pagination: { count: 1, next: null },
        }),
      ),
    });
    const list = await client.listDeploymentsForProject("prj_x");
    expect(list[0]!.created).toBe(111);
    expect(list[0]!.buildingAt).toBe(222);
    expect(list[0]!.ready).toBe(333);
  });
});
