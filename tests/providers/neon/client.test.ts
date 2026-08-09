import { describe, expect, test } from "bun:test";
import { createNeonClient } from "../../../src/providers/neon/client.ts";
import { NeonApiError } from "../../../src/providers/neon/errors.ts";
import projectsFixture from "./fixtures/projects.json";
import branchesFixture from "./fixtures/branches.json";
import databasesFixture from "./fixtures/databases.json";
import endpointsFixture from "./fixtures/endpoints.json";

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

describe("NeonClient.getAuthDetails", () => {
  test("returns the authenticated credential identity and scope", async () => {
    const client = createNeonClient("key", {
      fetch: fetchFor(() =>
        Response.json({ account_id: "org-acme-555", auth_method: "api_key_org" }),
      ),
    });
    const auth = await client.getAuthDetails();
    expect(auth.accountId).toBe("org-acme-555");
    expect(auth.authMethod).toBe("api_key_org");
  });

  test("rejects a response without an account id", async () => {
    const client = createNeonClient("key", {
      fetch: fetchFor(() => Response.json({ auth_method: "api_key_org" })),
    });
    await expect(client.getAuthDetails()).rejects.toBeInstanceOf(NeonApiError);
  });

  test("rejects an unsupported or missing auth method", async () => {
    const client = createNeonClient("key", {
      fetch: fetchFor(() => Response.json({ account_id: "org-acme-555" })),
    });
    await expect(client.getAuthDetails()).rejects.toBeInstanceOf(NeonApiError);
  });

  test("401 invalid key maps to an auth error", async () => {
    const client = createNeonClient("key", {
      fetch: fetchFor(() =>
        Response.json(
          { code: "UNAUTHENTICATED", message: "Invalid API key" },
          { status: 401 },
        ),
      ),
    });
    try {
      await client.getAuthDetails();
      throw new Error("expected getAuthDetails to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(NeonApiError);
      expect((err as NeonApiError).isAuthError).toBe(true);
      expect((err as Error).message).toContain("authentication failed");
      expect((err as Error).message).toContain("Invalid API key");
    }
  });

  test("failure message does not leak the API key", async () => {
    const secret = "napi_short_secret";
    const client = createNeonClient(secret, {
      fetch: fetchFor(() =>
        Response.json(
          { code: "INTERNAL", message: `provider echoed ${secret}` },
          { status: 500 },
        ),
      ),
    });
    try {
      await client.getAuthDetails();
      throw new Error("expected getAuthDetails to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(NeonApiError);
      expect((err as Error).message).not.toContain(secret);
    }
  });

  test("targets the official API base URL by default", async () => {
    const seen: string[] = [];
    const client = createNeonClient("key", {
      fetch: fetchFor((url) => {
        seen.push(url);
        return Response.json({ account_id: "org-acme-555", auth_method: "api_key_org" });
      }),
    });
    await client.getAuthDetails();
    expect(seen[0]).toBe("https://console.neon.tech/api/v2/auth");
  });
});

describe("NeonClient.listCurrentOrganizations", () => {
  test("returns organizations visible to the credential", async () => {
    const client = createNeonClient("key", {
      fetch: fetchFor(() =>
        Response.json({
          organizations: [{ id: "org-acme-555", name: "Acme Inc" }],
        }),
      ),
    });
    expect(await client.listCurrentOrganizations()).toEqual([
      { id: "org-acme-555", name: "Acme Inc" },
    ]);
  });

  test("rejects a malformed organizations response", async () => {
    const client = createNeonClient("key", {
      fetch: fetchFor(() => Response.json({ organizations: null })),
    });
    await expect(client.listCurrentOrganizations()).rejects.toBeInstanceOf(
      NeonApiError,
    );
  });
});

describe("NeonClient.listProjects", () => {
  test("returns projects (single page, live API shape)", async () => {
    const client = createNeonClient("key", {
      fetch: fetchFor(() =>
        Response.json({
          projects: projectsFixture.projects,
          pagination: { cursor: "" },
        }),
      ),
    });
    const projects = await client.listProjects();
    expect(projects).toHaveLength(2);
    expect(projects[0]!.id).toBe("steep-moon-132241");
    expect(projects[0]!.name).toBe("combie-app");
    expect(projects[0]!.region_id).toBe("aws-us-east-2");
    expect(projects[0]!.pg_version).toBe(17);
    expect(projects[1]!.org_id).toBe("org-acme-555");
  });

  test("returns empty array for an account with zero projects", async () => {
    const client = createNeonClient("key", {
      fetch: fetchFor(() => Response.json({ projects: [] })),
    });
    expect(await client.listProjects()).toEqual([]);
  });

  test("follows cursor pagination until the cursor is absent", async () => {
    const seen: string[] = [];
    const client = createNeonClient("key", {
      fetch: fetchFor((url) => {
        seen.push(url);
        if (!url.includes("cursor=")) {
          return Response.json({
            projects: [{ id: "p-1", name: "one" }],
            pagination: { cursor: "p-1" },
          });
        }
        if (url.includes("cursor=p-1")) {
          return Response.json({
            projects: [{ id: "p-2", name: "two" }],
            pagination: { cursor: "p-2" },
          });
        }
        return Response.json({
          projects: [{ id: "p-3", name: "three" }],
        });
      }),
    });
    const projects = await client.listProjects();
    expect(projects.map((p) => p.id)).toEqual(["p-1", "p-2", "p-3"]);
    expect(seen).toHaveLength(3);
    expect(seen[1]).toContain("cursor=p-1");
    expect(seen[2]).toContain("cursor=p-2");
  });

  test("stops on an empty cursor string", async () => {
    const seen: string[] = [];
    const client = createNeonClient("key", {
      fetch: fetchFor((url) => {
        seen.push(url);
        return Response.json({
          projects: [{ id: "p-1", name: "one" }],
          pagination: { cursor: "" },
        });
      }),
    });
    const projects = await client.listProjects();
    expect(projects).toHaveLength(1);
    expect(seen).toHaveLength(1);
  });

  test("stops on an empty page even if a cursor is returned", async () => {
    const seen: string[] = [];
    const client = createNeonClient("key", {
      fetch: fetchFor((url) => {
        seen.push(url);
        return Response.json({ projects: [], pagination: { cursor: "c" } });
      }),
    });
    expect(await client.listProjects()).toEqual([]);
    expect(seen).toHaveLength(1);
  });

  test("requests the maximum supported page size", async () => {
    const seen: string[] = [];
    const client = createNeonClient("key", {
      fetch: fetchFor((url) => {
        seen.push(url);
        return Response.json({ projects: [] });
      }),
    });
    await client.listProjects();
    expect(seen[0]).toContain("/projects?limit=400");
  });

  test("rejects a malformed response with no projects array", async () => {
    const client = createNeonClient("key", {
      fetch: fetchFor(() => Response.json({ pagination: { cursor: "x" } })),
    });
    await expect(client.listProjects()).rejects.toBeInstanceOf(NeonApiError);
  });

  test("propagates API errors with redacted detail", async () => {
    const secret = "neon_super_secret_api_key_value_abcdef1234567890";
    const client = createNeonClient(secret, {
      fetch: fetchFor(() =>
        Response.json(
          { code: "INTERNAL", message: `boom ${secret}` },
          { status: 500 },
        ),
      ),
    });
    try {
      await client.listProjects();
      throw new Error("expected listProjects to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(NeonApiError);
      expect((err as Error).message).not.toContain(secret);
      expect((err as Error).message).toContain("List Neon projects");
    }
  });

  test("403 insufficient scope is actionable and 429 identifies rate limiting", async () => {
    for (const [status, expected] of [
      [403, "scope or permissions"],
      [429, "rate limit exceeded"],
    ] as const) {
      const client = createNeonClient("key", {
        fetch: fetchFor(() =>
          Response.json({ code: "ERROR", message: "safe detail" }, { status }),
        ),
      });
      try {
        await client.listProjects("org-1");
        throw new Error("expected listProjects to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(NeonApiError);
        expect((error as Error).message).toContain(expected);
      }
    }
  });

  test("rejects partial project inventory reported as unavailable", async () => {
    const client = createNeonClient("key", {
      fetch: fetchFor(() =>
        Response.json({
          projects: [{ id: "p-1", name: "one" }],
          unavailable_project_ids: ["p-2"],
        }),
      ),
    });
    await expect(client.listProjects("org-1")).rejects.toBeInstanceOf(
      NeonApiError,
    );
  });

  test("rejects projects without stable id and name", async () => {
    const client = createNeonClient("key", {
      fetch: fetchFor(() => Response.json({ projects: [{ name: "missing-id" }] })),
    });
    await expect(client.listProjects("org-1")).rejects.toBeInstanceOf(
      NeonApiError,
    );
  });
});

describe("NeonClient enrichment endpoints", () => {
  test("listProjectBranches follows cursor pagination to completion", async () => {
    const seen: string[] = [];
    const client = createNeonClient("key", {
      fetch: fetchFor((url) => {
        seen.push(url);
        if (!url.includes("cursor=")) {
          return Response.json({
            branches: [branchesFixture.branches[0]],
            pagination: {
              next: "opaque next",
              sort_by: "name",
              sort_order: "asc",
            },
          });
        }
        return Response.json({
          branches: branchesFixture.branches.slice(1),
          pagination: { sort_by: "name", sort_order: "asc" },
        });
      }),
    });
    const branches = await client.listProjectBranches("steep-moon-132241");
    expect(seen[0]).toContain("/projects/steep-moon-132241/branches");
    expect(seen[0]).toContain("limit=10000");
    expect(seen[0]).toContain("sort_by=name");
    expect(seen[0]).toContain("sort_order=asc");
    expect(seen[1]).toContain("cursor=opaque+next");
    expect(branches).toHaveLength(3);
    expect(branches[0]!.default).toBe(true);
  });

  test("listProjectBranches terminates on an empty page", async () => {
    const seen: string[] = [];
    const client = createNeonClient("key", {
      fetch: fetchFor((url) => {
        seen.push(url);
        return Response.json({
          branches: [],
          pagination: { next: "unexpected-next" },
        });
      }),
    });
    expect(await client.listProjectBranches("project-1")).toEqual([]);
    expect(seen).toHaveLength(1);
  });

  test("listBranchDatabases targets the branch databases endpoint", async () => {
    const seen: string[] = [];
    const client = createNeonClient("key", {
      fetch: fetchFor((url) => {
        seen.push(url);
        return Response.json(databasesFixture);
      }),
    });
    const databases = await client.listBranchDatabases(
      "steep-moon-132241",
      "br-wild-fog-111111",
    );
    expect(seen[0]).toContain(
      "/projects/steep-moon-132241/branches/br-wild-fog-111111/databases",
    );
    expect(databases).toHaveLength(2);
    expect(databases[0]!.name).toBe("neondb");
    expect(databases[0]!.owner_name).toBe("neondb_owner");
  });

  test("listProjectEndpoints targets the project endpoints endpoint", async () => {
    const seen: string[] = [];
    const client = createNeonClient("key", {
      fetch: fetchFor((url) => {
        seen.push(url);
        return Response.json(endpointsFixture);
      }),
    });
    const endpoints = await client.listProjectEndpoints("steep-moon-132241");
    expect(seen[0]).toContain("/projects/steep-moon-132241/endpoints");
    expect(endpoints).toHaveLength(2);
    expect(endpoints[0]!.id).toBe("ep-steep-moon-a1b2c3");
  });

  test("malformed enrichment responses are rejected", async () => {
    const client = createNeonClient("key", {
      fetch: fetchFor(() => Response.json({ wrong: true })),
    });
    await expect(
      client.listProjectBranches("p"),
    ).rejects.toBeInstanceOf(NeonApiError);
    await expect(
      client.listBranchDatabases("p", "b"),
    ).rejects.toBeInstanceOf(NeonApiError);
    await expect(
      client.listProjectEndpoints("p"),
    ).rejects.toBeInstanceOf(NeonApiError);
  });

  test("network failure becomes a typed error without leaking the key", async () => {
    const secret = "neon_super_secret_api_key_value_abcdef1234567890";
    const client = createNeonClient(secret, {
      fetch: (() => {
        throw new Error(`ECONNREFUSED while using ${secret}`);
      }) as unknown as typeof fetch,
    });
    try {
      await client.listProjectBranches("p");
      throw new Error("expected listProjectBranches to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(NeonApiError);
      expect((err as NeonApiError).status).toBe(0);
      expect((err as Error).message).not.toContain(secret);
    }
  });
});
