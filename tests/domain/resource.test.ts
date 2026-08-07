import { describe, expect, test } from "bun:test";
import {
  createResource,
  resourceId,
  type Resource,
} from "../../src/domain/resource.ts";

describe("resourceId", () => {
  test("builds stable identity from provider, kind, and providerResourceId", () => {
    expect(resourceId("cloudflare", "worker", "abc-123")).toBe(
      "cloudflare:worker:abc-123",
    );
    expect(resourceId("cloudflare", "database", "d1-xyz")).toBe(
      "cloudflare:database:d1-xyz",
    );
    expect(resourceId("cloudflare", "kv_namespace", "kv-1")).toBe(
      "cloudflare:kv_namespace:kv-1",
    );
    expect(resourceId("cloudflare", "zone", "zone-9")).toBe(
      "cloudflare:zone:zone-9",
    );
  });

  test("is stable across repeated calls", () => {
    const a = resourceId("cloudflare", "worker", "same-id");
    const b = resourceId("cloudflare", "worker", "same-id");
    expect(a).toBe(b);
  });

  test("differs when any component differs", () => {
    const base = resourceId("cloudflare", "worker", "id-1");
    expect(resourceId("other", "worker", "id-1")).not.toBe(base);
    expect(resourceId("cloudflare", "zone", "id-1")).not.toBe(base);
    expect(resourceId("cloudflare", "worker", "id-2")).not.toBe(base);
  });
});

describe("createResource", () => {
  test("assigns stable id from identity components", () => {
    const resource = createResource({
      provider: "cloudflare",
      providerResourceId: "w-1",
      kind: "worker",
      name: "api",
      metadata: { script: "api" },
    });

    expect(resource.id).toBe("cloudflare:worker:w-1");
    expect(resource.provider).toBe("cloudflare");
    expect(resource.providerResourceId).toBe("w-1");
    expect(resource.kind).toBe("worker");
    expect(resource.name).toBe("api");
    expect(resource.metadata).toEqual({ script: "api" });
    expect(resource.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(resource.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("uses provided timestamps when given", () => {
    const resource = createResource({
      provider: "cloudflare",
      providerResourceId: "kv-1",
      kind: "kv_namespace",
      name: "sessions",
      metadata: {},
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-06-01T12:00:00.000Z",
    });

    expect(resource.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(resource.updatedAt).toBe("2024-06-01T12:00:00.000Z");
  });

  test("same input yields same id (identity stability)", () => {
    const input = {
      provider: "cloudflare" as const,
      providerResourceId: "zone-42",
      kind: "zone" as const,
      name: "example.com",
      metadata: { plan: "free" },
    };
    const a: Resource = createResource(input);
    const b: Resource = createResource(input);
    expect(a.id).toBe(b.id);
    expect(a.id).toBe(resourceId("cloudflare", "zone", "zone-42"));
  });
});
