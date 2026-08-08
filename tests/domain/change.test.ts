import { describe, expect, test } from "bun:test";
import {
  createChange,
  diffResource,
  type Change,
} from "../../src/domain/change.ts";
import { createResource, type Resource } from "../../src/domain/resource.ts";

const observedAt = "2026-08-08T12:00:00.000Z";

function resource(
  overrides: Partial<Resource> = {},
  metadata: Record<string, unknown> = { runtime: "nodejs20.x" },
): Resource {
  return {
    ...createResource({
      provider: "vercel",
      providerResourceId: "prj_123",
      kind: "project",
      name: "combie-web",
      metadata,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
    ...overrides,
  };
}

const observation = {
  id: "chg_sync-42_vercel-project-prj-123",
  observedAt,
};

describe("createChange", () => {
  test("creates an updated Change with explicit observation identity and time", () => {
    const change: Change = createChange({
      id: observation.id,
      resourceId: "vercel:project:prj_123",
      kind: "updated",
      observedAt,
      fields: [{ path: "name", before: "old-name", after: "combie-web" }],
    });

    expect(change).toEqual({
      id: observation.id,
      resourceId: "vercel:project:prj_123",
      kind: "updated",
      observedAt,
      fields: [{ path: "name", before: "old-name", after: "combie-web" }],
    });
  });

  test("rejects an updated Change without field evidence", () => {
    expect(() =>
      createChange({
        id: observation.id,
        resourceId: "vercel:project:prj_123",
        kind: "updated",
        observedAt,
        fields: [],
      }),
    ).toThrow("at least one changed field");
  });
});

describe("diffResource", () => {
  test("requires the same stable Resource identity", () => {
    expect(() =>
      diffResource(
        resource(),
        resource({ id: "vercel:project:another" }),
        observation,
      ),
    ).toThrow("different stable identities");
  });

  test("ignores top-level Resource bookkeeping timestamps", () => {
    const before = resource();
    const after = resource({
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-08-08T12:00:00.000Z",
    });

    expect(diffResource(before, after, observation)).toBeNull();
  });

  test("records a name change as compact before/after evidence", () => {
    const change = diffResource(
      resource({ name: "old-name" }),
      resource(),
      observation,
    );

    expect(change).toEqual({
      ...observation,
      resourceId: "vercel:project:prj_123",
      kind: "updated",
      fields: [{ path: "name", before: "old-name", after: "combie-web" }],
    });
  });

  test("records only the changed metadata leaf", () => {
    const change = diffResource(
      resource({}, { framework: "nextjs", git: { branch: "main" } }),
      resource({}, { framework: "nextjs", git: { branch: "release" } }),
      observation,
    );

    expect(change?.fields).toEqual([
      { path: "metadata.git.branch", before: "main", after: "release" },
    ]);
  });

  test("sorts multiple changed fields by path in one Change", () => {
    const change = diffResource(
      resource({ name: "old-name" }, { runtime: "nodejs18.x", region: "iad1" }),
      resource({}, { runtime: "nodejs20.x", region: "sfo1" }),
      observation,
    );

    expect(change?.fields).toEqual([
      { path: "metadata.region", before: "iad1", after: "sfo1" },
      {
        path: "metadata.runtime",
        before: "nodejs18.x",
        after: "nodejs20.x",
      },
      { path: "name", before: "old-name", after: "combie-web" },
    ]);
  });

  test("treats object key ordering as insignificant", () => {
    const before = resource({}, { config: { alpha: 1, beta: 2 } });
    const after = resource({}, { config: { beta: 2, alpha: 1 } });

    expect(diffResource(before, after, observation)).toBeNull();
  });

  test("treats array ordering as meaningful by default", () => {
    const change = diffResource(
      resource({}, { regions: ["iad1", "sfo1"] }),
      resource({}, { regions: ["sfo1", "iad1"] }),
      observation,
    );

    expect(change?.fields).toEqual([
      {
        path: "metadata.regions",
        before: ["iad1", "sfo1"],
        after: ["sfo1", "iad1"],
      },
    ]);
  });

  test("detects a real domain change after provider normalization fixes order", () => {
    const beforeDomains = [
      { hostname: "api.example.com", apexName: "example.com", custom: true },
      { hostname: "www.example.com", apexName: "example.com", custom: true },
    ];
    const afterDomains = [
      { hostname: "api.example.com", apexName: "example.com", custom: true },
      { hostname: "www.example.org", apexName: "example.org", custom: true },
    ];

    const change = diffResource(
      resource({}, { domains: beforeDomains }),
      resource({}, { domains: afterDomains }),
      observation,
    );

    expect(change?.fields).toEqual([
      { path: "metadata.domains", before: beforeDomains, after: afterDomains },
    ]);
  });

  test("preserves explicit absent values without unrelated snapshot data", () => {
    const change = diffResource(
      resource({}, { framework: "nextjs", deprecated: true }),
      resource({}, { framework: "nextjs", replacement: "active" }),
      observation,
    );

    expect(change?.fields).toEqual([
      { path: "metadata.deprecated", before: true, after: undefined },
      { path: "metadata.replacement", before: undefined, after: "active" },
    ]);
  });
});
