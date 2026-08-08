import { describe, expect, test } from "bun:test";
import {
  createVercelClient,
} from "../../../src/providers/vercel/client.ts";
import { VercelApiError } from "../../../src/providers/vercel/errors.ts";
import domainsFixture from "./fixtures/domains.json";

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

describe("VercelClient.listProjectDomains", () => {
  test("returns domains for a project (success)", async () => {
    const client = createVercelClient("token", {
      fetch: fetchFor(() => Response.json(domainsFixture)),
    });
    const domains = await client.listProjectDomains("prj_abc123");
    expect(domains).toHaveLength(3);
    expect(domains[0]!.name).toBe("example.com");
    expect(domains[0]!.apexName).toBe("example.com");
    expect(domains[0]!.verified).toBe(true);
  });

  test("returns empty array when project has zero domains", async () => {
    const client = createVercelClient("token", {
      fetch: fetchFor(() =>
        Response.json({ domains: [], pagination: { count: 0, next: null } }),
      ),
    });
    const domains = await client.listProjectDomains("prj_empty");
    expect(domains).toEqual([]);
  });

  test("rejects a malformed response with no domains array", async () => {
    const client = createVercelClient("token", {
      fetch: fetchFor(() => Response.json({ pagination: { count: 0 } })),
    });
    await expect(client.listProjectDomains("prj_nodoms")).rejects.toBeInstanceOf(
      VercelApiError,
    );
  });

  test("follows pagination via the until cursor", async () => {
    const seen: string[] = [];
    const client = createVercelClient("token", {
      fetch: fetchFor((url) => {
        seen.push(url);
        if (!url.includes("until=")) {
          return Response.json({
            domains: [
              { name: "a.example.com", apexName: "example.com", verified: true },
            ],
            pagination: { count: 1, next: "cursor-1" },
          });
        }
        return Response.json({
          domains: [
            { name: "b.example.com", apexName: "example.com", verified: true },
          ],
          pagination: { count: 1, next: null },
        });
      }),
    });
    const domains = await client.listProjectDomains("prj_page");
    expect(domains.map((d) => d.name)).toEqual(["a.example.com", "b.example.com"]);
    expect(seen).toHaveLength(2);
    expect(seen[1]).toContain("until=cursor-1");
  });

  test("targets the per-project domains endpoint", async () => {
    const seen: string[] = [];
    const client = createVercelClient("token", {
      fetch: fetchFor((url) => {
        seen.push(url);
        return Response.json({ domains: [], pagination: { count: 0, next: null } });
      }),
    });
    await client.listProjectDomains("prj_target");
    expect(seen[0]).toContain("/v9/projects/prj_target/domains");
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
    await expect(client.listProjectDomains("prj_x")).rejects.toBeInstanceOf(
      VercelApiError,
    );
  });

  test("failure message does not leak the token", async () => {
    const secret = "vercel_domain_secret_token_abcdef123456";
    const client = createVercelClient(secret, {
      fetch: fetchFor(() =>
        Response.json({ error: { message: "nope" } }, { status: 500 }),
      ),
    });
    try {
      await client.listProjectDomains("prj_x");
      throw new Error("expected listProjectDomains to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(VercelApiError);
      expect((err as Error).message).not.toContain(secret);
    }
  });
});
