import { describe, expect, test } from "bun:test";
import {
  createRelationship,
  relationshipId,
  type Relationship,
} from "../../src/domain/relationship.ts";

describe("relationshipId", () => {
  test("builds stable identity from source, kind, and target", () => {
    expect(
      relationshipId(
        "github:repository:1001",
        "source_for",
        "vercel:project:prj_abc",
      ),
    ).toBe("rel:github:repository:1001:source_for:vercel:project:prj_abc");
  });

  test("is stable across repeated calls", () => {
    const a = relationshipId("a", "source_for", "b");
    const b = relationshipId("a", "source_for", "b");
    expect(a).toBe(b);
  });

  test("differs when any component differs", () => {
    const base = relationshipId("src", "source_for", "tgt");
    expect(relationshipId("other", "source_for", "tgt")).not.toBe(base);
    expect(relationshipId("src", "source_for", "other")).not.toBe(base);
  });
});

describe("createRelationship", () => {
  test("assigns stable id and preserves evidence", () => {
    const rel = createRelationship({
      sourceResourceId: "github:repository:1001",
      targetResourceId: "vercel:project:prj_abc",
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "example-user/combie",
        githubRepoId: "1001",
      },
    });

    expect(rel.id).toBe(
      "rel:github:repository:1001:source_for:vercel:project:prj_abc",
    );
    expect(rel.sourceResourceId).toBe("github:repository:1001");
    expect(rel.targetResourceId).toBe("vercel:project:prj_abc");
    expect(rel.kind).toBe("source_for");
    expect(rel.evidence.repository).toBe("example-user/combie");
    expect(rel.evidence.githubRepoId).toBe("1001");
    expect(rel.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(rel.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("uses provided timestamps when given", () => {
    const rel = createRelationship({
      sourceResourceId: "github:repository:1",
      targetResourceId: "vercel:project:p1",
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "o/r",
      },
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-06-01T12:00:00.000Z",
    });
    expect(rel.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(rel.updatedAt).toBe("2024-06-01T12:00:00.000Z");
  });

  test("same endpoints yield same id (idempotent identity)", () => {
    const input = {
      sourceResourceId: "github:repository:42",
      targetResourceId: "vercel:project:prj_x",
      kind: "source_for" as const,
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "acme/app",
      },
    };
    const a: Relationship = createRelationship(input);
    const b: Relationship = createRelationship(input);
    expect(a.id).toBe(b.id);
  });
});
