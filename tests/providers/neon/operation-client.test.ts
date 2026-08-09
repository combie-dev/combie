import { describe, expect, test } from "bun:test";
import { createNeonClient } from "../../../src/providers/neon/client.ts";
import { NeonApiError } from "../../../src/providers/neon/errors.ts";
import operationsFixture from "./fixtures/operations.json";

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

describe("NeonClient.listProjectOperations", () => {
  test("uses the official project-scoped endpoint and maximum page size", async () => {
    const seen: Array<{ url: string; headers: Headers }> = [];
    const client = createNeonClient("napi_test_token_abcdef", {
      fetch: fetchFor((url, init) => {
        seen.push({ url, headers: new Headers(init?.headers) });
        return Response.json({ operations: [], pagination: {} });
      }),
    });

    expect(await client.listProjectOperations("steep-moon-132241")).toEqual([]);
    expect(seen[0]!.url).toContain(
      "/api/v2/projects/steep-moon-132241/operations?limit=1000",
    );
    expect(seen[0]!.headers.get("Authorization")).toBe(
      "Bearer napi_test_token_abcdef",
    );
  });

  test("walks the opaque cursor until pagination is absent", async () => {
    const seen: string[] = [];
    const client = createNeonClient("key", {
      fetch: fetchFor((url) => {
        seen.push(url);
        if (!url.includes("cursor=")) return Response.json(operationsFixture);
        return Response.json({ operations: [], pagination: {} });
      }),
    });

    const operations = await client.listProjectOperations("steep-moon-132241");
    expect(operations).toHaveLength(2);
    expect(seen).toHaveLength(2);
    expect(seen[1]).toContain(
      "cursor=2026-08-09T08%3A47%3A52.20417Z",
    );
  });

  test("rejects a repeated cursor and malformed pages", async () => {
    const operation = operationsFixture.operations[0]!;
    const repeated = createNeonClient("key", {
      fetch: fetchFor(() =>
        Response.json({ operations: [operation], pagination: { cursor: "same" } }),
      ),
    });
    await expect(
      repeated.listProjectOperations("steep-moon-132241"),
    ).rejects.toBeInstanceOf(NeonApiError);

    for (const body of [
      { pagination: {} },
      { operations: [{ ...operation, id: null }] },
      { operations: [{ ...operation, id: "not-a-uuid" }] },
      { operations: [{ ...operation, project_id: "wrong project" }] },
      { operations: [{ ...operation, action: "start\ncompute" }] },
      { operations: [{ ...operation, status: "finished\u001b[2J" }] },
      { operations: [{ ...operation, branch_id: "br-bad\nline" }] },
      { operations: [{ ...operation, branch_id: "br_bad" }] },
      { operations: [{ ...operation, created_at: "2026-08-09" }] },
      { operations: [{ ...operation, total_duration_ms: "secret" }] },
      { operations: [], pagination: { cursor: 123 } },
    ]) {
      const malformed = createNeonClient("key", {
        fetch: fetchFor(() => Response.json(body)),
      });
      await expect(
        malformed.listProjectOperations("steep-moon-132241"),
      ).rejects.toBeInstanceOf(NeonApiError);
    }
  });

  test("permission and transient failures remain errors and redact credentials", async () => {
    const secret = "neon_operation_secret_abcdef1234567890";
    for (const status of [403, 429, 503]) {
      const client = createNeonClient(secret, {
        fetch: fetchFor(() =>
          Response.json(
            { message: `operation list failed ${secret}` },
            { status },
          ),
        ),
      });
      try {
        await client.listProjectOperations("steep-moon-132241");
        throw new Error("expected failure");
      } catch (error) {
        expect(error).toBeInstanceOf(NeonApiError);
        expect((error as Error).message).not.toContain(secret);
      }
    }
  });
});
