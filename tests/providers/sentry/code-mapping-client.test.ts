import { describe, expect, test } from "bun:test";
import { createSentryClient } from "../../../src/providers/sentry/client.ts";
import { SentryApiError } from "../../../src/providers/sentry/errors.ts";
import mappingsFixture from "./fixtures/code-mappings.json";

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

describe("SentryClient.listOrganizationCodeMappings", () => {
  test("targets GET /organizations/{slug}/code-mappings/?project={id}", async () => {
    const seen: { url: string; headers: Headers }[] = [];
    const client = createSentryClient("sntrys_test_token_abcdef", {
      fetch: fetchFor((url, init) => {
        seen.push({ url, headers: new Headers(init?.headers) });
        return Response.json(mappingsFixture);
      }),
    });
    const list = await client.listOrganizationCodeMappings("acme", "450");
    expect(list).toHaveLength(2);
    expect(seen[0]!.url).toContain("/organizations/acme/code-mappings/");
    expect(seen[0]!.url).toContain("project=450");
    expect(seen[0]!.url).toContain("per_page=100");
    expect(seen[0]!.headers.get("Authorization")).toBe(
      "Bearer sntrys_test_token_abcdef",
    );
  });

  test("default bound is a single page even when Link next exists", async () => {
    const seen: string[] = [];
    const client = createSentryClient("token", {
      fetch: fetchFor((url) => {
        seen.push(url);
        return new Response(JSON.stringify(mappingsFixture), {
          headers: {
            Link: `<https://sentry.io/api/0/organizations/acme/code-mappings/?cursor=2>; rel="next"; results="true"`,
          },
        });
      }),
    });
    const list = await client.listOrganizationCodeMappings("acme", "450");
    expect(list).toHaveLength(2);
    expect(seen).toHaveLength(1);
  });

  test("returns empty array for known-empty project", async () => {
    const client = createSentryClient("token", {
      fetch: fetchFor(() => Response.json([])),
    });
    expect(await client.listOrganizationCodeMappings("acme", "450")).toEqual([]);
  });

  test("rejects malformed non-array response", async () => {
    const client = createSentryClient("token", {
      fetch: fetchFor(() => Response.json({ id: "11" })),
    });
    await expect(
      client.listOrganizationCodeMappings("acme", "450"),
    ).rejects.toBeInstanceOf(SentryApiError);
  });

  test("throws on permission failure without leaking token", async () => {
    const secret = "sntrys_mapping_secret_token_abcdef1234567890";
    const client = createSentryClient(secret, {
      fetch: fetchFor(() =>
        Response.json({ detail: `token ${secret} denied` }, { status: 403 }),
      ),
    });
    try {
      await client.listOrganizationCodeMappings("acme", "450");
      throw new Error("expected failure");
    } catch (err) {
      expect(err).toBeInstanceOf(SentryApiError);
      expect((err as SentryApiError).message).not.toContain(secret);
    }
  });
});
