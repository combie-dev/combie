import { describe, expect, test } from "bun:test";
import { createCloudflareProvider } from "../../../src/providers/cloudflare/adapter.ts";
import { CloudflareApiError } from "../../../src/providers/cloudflare/errors.ts";
import accountsFixture from "./fixtures/accounts.json";
import workersFixture from "./fixtures/workers.json";
import d1Fixture from "./fixtures/d1.json";
import kvFixture from "./fixtures/kv.json";
import zonesFixture from "./fixtures/zones.json";

const TOKEN = "cf_test_token_do_not_use_in_production_abcdefghijklmnop";
const ACCOUNT_ID = "acct-001";

type RouteHandler = (url: URL, headers: Headers) => Response | Promise<Response>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createMockFetch(routes: Record<string, RouteHandler>): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? new URL(input)
        : input instanceof URL
          ? input
          : new URL(input.url);
    const headers = new Headers(init?.headers);
    const path = url.pathname.replace(/^\/client\/v4/, "") || url.pathname;

    // Match by path suffix for flexibility
    for (const [pattern, handler] of Object.entries(routes)) {
      if (path === pattern || path.endsWith(pattern) || url.pathname.endsWith(pattern)) {
        return handler(url, headers);
      }
    }

    // Also try full pathname without base
    const relative = url.pathname.includes("/client/v4")
      ? url.pathname.split("/client/v4")[1] ?? url.pathname
      : url.pathname;

    for (const [pattern, handler] of Object.entries(routes)) {
      if (relative === pattern || relative.startsWith(pattern + "?")) {
        return handler(url, headers);
      }
    }

    return jsonResponse(
      {
        success: false,
        errors: [{ code: 7003, message: `No mock for ${url.pathname}` }],
        result: null,
      },
      404,
    );
  }) as typeof fetch;
}

function successRoutes(): Record<string, RouteHandler> {
  return {
    "/accounts": () => jsonResponse(accountsFixture),
    [`/accounts/${ACCOUNT_ID}/workers/scripts`]: () => jsonResponse(workersFixture),
    [`/accounts/${ACCOUNT_ID}/d1/database`]: () => jsonResponse(d1Fixture),
    [`/accounts/${ACCOUNT_ID}/storage/kv/namespaces`]: () => jsonResponse(kvFixture),
    "/zones": () => jsonResponse(zonesFixture),
  };
}

describe("Cloudflare adapter authenticate", () => {
  test("successful auth returns primary account", async () => {
    const provider = createCloudflareProvider({
      fetch: createMockFetch(successRoutes()),
    });

    const result = await provider.authenticate(TOKEN);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.accountId).toBe(ACCOUNT_ID);
      expect(result.accountName).toBe("Example Corp");
    }
  });

  test("invalid token returns ok:false without leaking token", async () => {
    const provider = createCloudflareProvider({
      fetch: createMockFetch({
        "/accounts": () =>
          jsonResponse(
            {
              success: false,
              errors: [
                {
                  code: 10000,
                  message: "Authentication error",
                },
              ],
              result: null,
            },
            401,
          ),
      }),
    });

    const result = await provider.authenticate(TOKEN);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.toLowerCase()).toMatch(/auth/);
      expect(result.message).not.toContain(TOKEN);
      expect(result.message).not.toMatch(/Bearer\s+cf_/i);
    }
  });

  test("empty token fails without network call semantics", async () => {
    const provider = createCloudflareProvider({
      fetch: createMockFetch({}),
    });
    const result = await provider.authenticate("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/empty/i);
    }
  });
});

describe("Cloudflare adapter discoverResources", () => {
  test("discover maps all four resource types", async () => {
    const provider = createCloudflareProvider({
      fetch: createMockFetch(successRoutes()),
    });

    const { resources } = await provider.discoverResources(TOKEN, {
      accountId: ACCOUNT_ID,
    });

    const byKind = Object.groupBy(resources, (r) => r.kind);

    expect(byKind.worker?.length).toBe(2);
    expect(byKind.database?.length).toBe(1);
    expect(byKind.kv_namespace?.length).toBe(2);
    expect(byKind.zone?.length).toBe(1);
    expect(resources.length).toBe(6);

    const worker = byKind.worker![0]!;
    expect(worker.provider).toBe("cloudflare");
    expect(worker.name).toBe("api-gateway");

    const db = byKind.database![0]!;
    expect(db.metadata.engine).toBe("d1");
    expect(db.name).toBe("app-production");

    const zone = byKind.zone![0]!;
    expect(zone.name).toBe("example.com");

    // No secrets in metadata
    for (const r of resources) {
      expect(JSON.stringify(r)).not.toContain(TOKEN);
    }
  });

  test("permission error message is understandable and does not contain token", async () => {
    const provider = createCloudflareProvider({
      fetch: createMockFetch({
        ...successRoutes(),
        [`/accounts/${ACCOUNT_ID}/workers/scripts`]: () =>
          jsonResponse(
            {
              success: false,
              errors: [
                {
                  code: 10000,
                  message: "Authentication error — insufficient permissions",
                },
              ],
              result: null,
            },
            403,
          ),
      }),
    });

    let caught: unknown;
    try {
      await provider.discoverResources(TOKEN, { accountId: ACCOUNT_ID });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(CloudflareApiError);
    const message = (caught as Error).message;
    expect(message).toMatch(/permission|discover|Worker/i);
    expect(message).not.toContain(TOKEN);
    expect(message).not.toMatch(new RegExp(TOKEN.slice(0, 20)));
  });
});

describe("provider identity", () => {
  test("id and name are cloudflare", () => {
    const provider = createCloudflareProvider();
    expect(provider.id).toBe("cloudflare");
    expect(provider.name).toBe("Cloudflare");
  });
});
