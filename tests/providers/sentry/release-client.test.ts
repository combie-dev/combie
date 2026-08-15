import { describe, expect, test } from "bun:test";
import { createSentryClient } from "../../../src/providers/sentry/client.ts";
import { SentryApiError } from "../../../src/providers/sentry/errors.ts";
import releasesFixture from "./fixtures/releases.json";

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

describe("SentryClient.listOrganizationReleases", () => {
  test("targets GET /organizations/{slug}/releases/?project={id} with Bearer auth", async () => {
    const seen: { url: string; headers: Headers }[] = [];
    const client = createSentryClient("sntrys_test_token_abcdef", {
      fetch: fetchFor((url, init) => {
        seen.push({ url, headers: new Headers(init?.headers) });
        return Response.json(releasesFixture);
      }),
    });
    const list = await client.listOrganizationReleases("acme", "450");
    expect(list).toHaveLength(2);
    expect(seen[0]!.url).toContain("/organizations/acme/releases/");
    expect(seen[0]!.url).toContain("project=450");
    expect(seen[0]!.url).toContain("per_page=100");
    expect(seen[0]!.headers.get("Authorization")).toBe(
      "Bearer sntrys_test_token_abcdef",
    );
    expect((list[0] as { version: string }).version).toBe("frontend@1.2.0");
  });

  test("default bound is a single page even when Link next exists", async () => {
    const seen: string[] = [];
    const client = createSentryClient("token", {
      fetch: fetchFor((url) => {
        seen.push(url);
        return new Response(JSON.stringify(releasesFixture), {
          headers: {
            Link: `<https://sentry.io/api/0/organizations/acme/releases/?cursor=2>; rel="next"; results="true"`,
          },
        });
      }),
    });
    const list = await client.listOrganizationReleases("acme", "450");
    expect(list).toHaveLength(2);
    expect(seen).toHaveLength(1);
  });

  test("follows Link next when maxPages allows", async () => {
    const seen: string[] = [];
    const client = createSentryClient("token", {
      fetch: fetchFor((url) => {
        seen.push(url);
        if (url.includes("cursor=2")) {
          return Response.json([releasesFixture[1]]);
        }
        return new Response(JSON.stringify([releasesFixture[0]]), {
          headers: {
            Link: `<https://sentry.io/api/0/organizations/acme/releases/?cursor=2>; rel="next"; results="true"`,
          },
        });
      }),
    });
    const list = await client.listOrganizationReleases("acme", "450", {
      maxPages: 2,
    });
    expect(list).toHaveLength(2);
    expect(seen).toHaveLength(2);
  });

  test("returns empty array for known-empty project", async () => {
    const client = createSentryClient("token", {
      fetch: fetchFor(() => Response.json([])),
    });
    expect(await client.listOrganizationReleases("acme", "450")).toEqual([]);
  });

  test("rejects malformed non-array response", async () => {
    const client = createSentryClient("token", {
      fetch: fetchFor(() => Response.json({ version: "1.0.0" })),
    });
    await expect(client.listOrganizationReleases("acme", "450")).rejects.toBeInstanceOf(
      SentryApiError,
    );
  });

  test("throws on permission failure without leaking token", async () => {
    const secret = "sntrys_release_secret_token_abcdef1234567890";
    const client = createSentryClient(secret, {
      fetch: fetchFor(() =>
        Response.json({ detail: `token ${secret} denied` }, { status: 403 }),
      ),
    });
    try {
      await client.listOrganizationReleases("acme", "450");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(SentryApiError);
      expect((err as Error).message).not.toContain(secret);
      expect((err as SentryApiError).status).toBe(403);
    }
  });

  test("preserves dateCreated, dateReleased, and multi-project payload", async () => {
    const client = createSentryClient("token", {
      fetch: fetchFor(() => Response.json(releasesFixture)),
    });
    const list = await client.listOrganizationReleases("acme", "450");
    expect((list[0] as { dateCreated: string }).dateCreated).toBe(
      "2026-08-09T12:00:00Z",
    );
    expect((list[0] as { dateReleased: string }).dateReleased).toBe(
      "2026-08-09T12:05:00Z",
    );
    expect((list[1] as { dateReleased: null }).dateReleased).toBeNull();
    expect(
      ((list[1] as { projects: Array<{ id: unknown }> }).projects).map((p) => p.id),
    ).toEqual(["450", 451]);
  });
});
