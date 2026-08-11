import { describe, expect, test } from "bun:test";
import { createPlanetScaleClient } from "../../../src/providers/planetscale/client.ts";
import { PlanetScaleApiError } from "../../../src/providers/planetscale/errors.ts";
import organizationsFixture from "./fixtures/organizations.json";
import databasesFixture from "./fixtures/databases.json";
import branchesFixture from "./fixtures/branches.json";

const COMPOSITE = "psid_test_id_abcdef:pssecret_test_secret_value_xyz";

function listEnvelope(data: unknown[], page = 1, nextPage: number | null = null) {
  return {
    type: "list",
    current_page: page,
    per_page: 100,
    next_page: nextPage,
    next_page_url: nextPage ? `?page=${nextPage}` : null,
    prev_page: page > 1 ? page - 1 : null,
    prev_page_url: null,
    total_count: data.length,
    total_pages: nextPage ? 2 : 1,
    data,
  };
}

describe("PlanetScale client auth encoding", () => {
  test("sends Authorization as id:secret without Bearer scheme", async () => {
    const seen: { auth?: string; url?: string } = {};
    const client = createPlanetScaleClient(COMPOSITE, {
      fetch: (async (input, init) => {
        seen.url = String(input);
        seen.auth = (init?.headers as Record<string, string>)?.Authorization;
        return Response.json(organizationsFixture);
      }) as typeof fetch,
    });
    await client.listOrganizations();
    expect(seen.auth).toBe("psid_test_id_abcdef:pssecret_test_secret_value_xyz");
    expect(seen.url).toContain("https://api.planetscale.com/v1/organizations");
    expect(seen.url).toContain("page=1");
    expect(seen.url).toContain("per_page=100");
  });

  test("rejects incomplete composite credentials", () => {
    expect(() => createPlanetScaleClient("only-id-no-secret")).toThrow(
      PlanetScaleApiError,
    );
  });
});

describe("PlanetScale client pagination", () => {
  test("follows next_page until null for organizations", async () => {
    let calls = 0;
    const client = createPlanetScaleClient(COMPOSITE, {
      fetch: (async (input) => {
        calls += 1;
        const url = new URL(String(input));
        const page = url.searchParams.get("page");
        if (page === "1") {
          return Response.json(
            listEnvelope(
              [{ id: "org1", name: "one" }],
              1,
              2,
            ),
          );
        }
        if (page === "2") {
          return Response.json(
            listEnvelope([{ id: "org2", name: "two" }], 2, null),
          );
        }
        return Response.json({ error: "unexpected" }, { status: 500 });
      }) as typeof fetch,
    });
    const orgs = await client.listOrganizations();
    expect(calls).toBe(2);
    expect(orgs.map((o) => o.name)).toEqual(["one", "two"]);
  });

  test("paginates databases and branches", async () => {
    const client = createPlanetScaleClient(COMPOSITE, {
      fetch: (async (input) => {
        const url = new URL(String(input));
        const page = url.searchParams.get("page");
        if (url.pathname.includes("/databases/combie-app/branches")) {
          if (page === "1") {
            return Response.json(
              listEnvelope([branchesFixture.data[0]], 1, 2),
            );
          }
          return Response.json(
            listEnvelope([branchesFixture.data[1]], 2, null),
          );
        }
        if (url.pathname.endsWith("/databases")) {
          if (page === "1") {
            return Response.json(
              listEnvelope([databasesFixture.data[0]], 1, 2),
            );
          }
          return Response.json(
            listEnvelope([databasesFixture.data[1]], 2, null),
          );
        }
        return Response.json({ error: url.href }, { status: 404 });
      }) as typeof fetch,
    });
    const dbs = await client.listDatabases("acme");
    expect(dbs).toHaveLength(2);
    const branches = await client.listBranches("acme", "combie-app");
    expect(branches).toHaveLength(2);
  });

  test("empty data terminates without duplicates", async () => {
    const client = createPlanetScaleClient(COMPOSITE, {
      fetch: (async () =>
        Response.json(listEnvelope([], 1, null))) as unknown as typeof fetch,
    });
    expect(await client.listOrganizations()).toEqual([]);
  });

  test("non-advancing next_page throws", async () => {
    const client = createPlanetScaleClient(COMPOSITE, {
      fetch: (async () =>
        Response.json(
          listEnvelope([{ id: "org1", name: "one" }], 1, 1),
        )) as unknown as typeof fetch,
    });
    await expect(client.listOrganizations()).rejects.toThrow(/pagination/);
  });
});

describe("PlanetScale client errors", () => {
  test("maps 401 without leaking secrets", async () => {
    const secret = "pssecret_super_secret_value_abcdef1234567890";
    const token = `psid_visible:${secret}`;
    const client = createPlanetScaleClient(token, {
      fetch: (async () =>
        Response.json(
          { code: "unauthorized", message: `bad token ${secret}` },
          { status: 401 },
        )) as unknown as typeof fetch,
    });
    try {
      await client.listOrganizations();
      expect.unreachable("should throw");
    } catch (err) {
      expect(err).toBeInstanceOf(PlanetScaleApiError);
      const message = (err as Error).message;
      expect(message).toContain("authentication failed");
      expect(message).not.toContain(secret);
      expect(message).not.toContain("psid_visible");
    }
  });

  test("maps 403 with permission guidance", async () => {
    const client = createPlanetScaleClient(COMPOSITE, {
      fetch: (async () =>
        Response.json(
          { message: "forbidden" },
          { status: 403 },
        )) as unknown as typeof fetch,
    });
    await expect(client.listDatabases("acme")).rejects.toThrow(/permissions/);
  });

  test("maps rate limit", async () => {
    const client = createPlanetScaleClient(COMPOSITE, {
      fetch: (async () =>
        Response.json(
          { message: "slow down" },
          { status: 429 },
        )) as unknown as typeof fetch,
    });
    await expect(client.listOrganizations()).rejects.toThrow(/rate limit/);
  });

  test("rejects malformed list payload", async () => {
    const client = createPlanetScaleClient(COMPOSITE, {
      fetch: (async () =>
        Response.json({ type: "list" })) as unknown as typeof fetch,
    });
    await expect(client.listOrganizations()).rejects.toThrow(/data array/);
  });

  test("network failure is redacted", async () => {
    const secret = "pssecret_network_fail_abcdef1234567890";
    const client = createPlanetScaleClient(`psid_net:${secret}`, {
      fetch: (async () => {
        throw new Error(`socket failed carrying ${secret}`);
      }) as unknown as typeof fetch,
    });
    try {
      await client.listOrganizations();
      expect.unreachable("should throw");
    } catch (err) {
      expect((err as Error).message).not.toContain(secret);
      expect((err as Error).message).toContain("could not reach PlanetScale");
    }
  });
});
