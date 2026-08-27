import { describe, expect, test } from "bun:test";
import { createSentryClient } from "../../../src/providers/sentry/client.ts";
import { SentryApiError } from "../../../src/providers/sentry/errors.ts";
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

describe("SentryClient.listOrganizationIssues", () => {
  test("targets GET /organizations/{slug}/issues/?project={id} with empty query", async () => {
    const seen: { url: string; headers: Headers }[] = [];
    const client = createSentryClient("sntrys_test_token_abcdef", {
      fetch: fetchFor((url, init) => {
        seen.push({ url, headers: new Headers(init?.headers) });
        return Response.json(issuesFixture);
      }),
    });
    const list = await client.listOrganizationIssues("acme", "450");
    expect(list).toHaveLength(2);
    expect(seen[0]!.url).toContain("/organizations/acme/issues/");
    expect(seen[0]!.url).toContain("project=450");
    expect(seen[0]!.url).toContain("query=&");
    expect(seen[0]!.url).toContain("sort=date");
    expect(seen[0]!.url).toContain("limit=100");
    expect(seen[0]!.headers.get("Authorization")).toBe(
      "Bearer sntrys_test_token_abcdef",
    );
  });

  test("default bound is a single page even when Link next exists", async () => {
    const seen: string[] = [];
    const client = createSentryClient("token", {
      fetch: fetchFor((url) => {
        seen.push(url);
        return new Response(JSON.stringify(issuesFixture), {
          headers: {
            Link: `<https://sentry.io/api/0/organizations/acme/issues/?cursor=2>; rel="next"; results="true"`,
          },
        });
      }),
    });
    const list = await client.listOrganizationIssues("acme", "450");
    expect(list).toHaveLength(2);
    expect(seen).toHaveLength(1);
  });

  test("follows Link next when maxPages allows", async () => {
    const seen: string[] = [];
    const client = createSentryClient("token", {
      fetch: fetchFor((url) => {
        seen.push(url);
        if (url.includes("cursor=2")) {
          return Response.json([issuesFixture[1]]);
        }
        return new Response(JSON.stringify([issuesFixture[0]]), {
          headers: {
            Link: `<https://sentry.io/api/0/organizations/acme/issues/?cursor=2>; rel="next"; results="true"`,
          },
        });
      }),
    });
    const list = await client.listOrganizationIssues("acme", "450", {
      maxPages: 2,
    });
    expect(list).toHaveLength(2);
    expect(seen).toHaveLength(2);
  });

  test("does not fetch off-origin Link next and does not send Authorization there", async () => {
    const token = "sntrys_ssrf_test_token_abcdef";
    const seen: string[] = [];
    const client = createSentryClient(token, {
      fetch: fetchFor((url) => {
        seen.push(url);
        return new Response(JSON.stringify([issuesFixture[0]]), {
          headers: {
            Link: `<http://169.254.169.254/latest/meta-data/>; rel="next"; results="true"`,
          },
        });
      }),
    });
    try {
      await client.listOrganizationIssues("acme", "450", { maxPages: 2 });
      throw new Error("expected failure");
    } catch (err) {
      expect(err).toBeInstanceOf(SentryApiError);
      expect(seen).toHaveLength(1);
      expect(seen.some((url) => url.includes("169.254"))).toBe(false);
      expect((err as SentryApiError).message).toBe(
        "List Sentry issues for organization acme project 450: refused to follow a Sentry Link URL that is not the same origin as the configured Sentry API.",
      );
      expect((err as SentryApiError).message).not.toContain(token);
    }
  });

  test("returns empty array for known-empty project", async () => {
    const client = createSentryClient("token", {
      fetch: fetchFor(() => Response.json([])),
    });
    expect(await client.listOrganizationIssues("acme", "450")).toEqual([]);
  });

  test("rejects malformed non-array response", async () => {
    const client = createSentryClient("token", {
      fetch: fetchFor(() => Response.json({ id: "1001" })),
    });
    await expect(client.listOrganizationIssues("acme", "450")).rejects.toBeInstanceOf(
      SentryApiError,
    );
  });

  test("redacts token on API error", async () => {
    const client = createSentryClient("sntrys_secret_token", {
      fetch: fetchFor(() =>
        new Response(JSON.stringify({ detail: "sntrys_secret_token" }), {
          status: 403,
        }),
      ),
    });
    try {
      await client.listOrganizationIssues("acme", "450");
      throw new Error("expected failure");
    } catch (err) {
      expect(err).toBeInstanceOf(SentryApiError);
      expect((err as SentryApiError).message).not.toContain("sntrys_secret_token");
    }
  });
});
