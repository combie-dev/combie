import { describe, expect, test } from "bun:test";
import {
  normalizeBranches,
  normalizeDatabases,
  normalizeEndpoints,
  normalizeProject,
  NEON_PROVIDER,
} from "../../../src/providers/neon/normalize.ts";
import type {
  NeonBranch,
  NeonDatabase,
  NeonEndpoint,
  NeonProject,
} from "../../../src/providers/neon/client.ts";
import projectsFixture from "./fixtures/projects.json";
import branchesFixture from "./fixtures/branches.json";
import databasesFixture from "./fixtures/databases.json";
import endpointsFixture from "./fixtures/endpoints.json";

describe("normalizeProject", () => {
  test("maps Neon project fields into Resource model", () => {
    const project = projectsFixture.projects[0] as NeonProject;
    const resource = normalizeProject(project);

    expect(resource.provider).toBe("neon");
    expect(resource.kind).toBe("project");
    expect(resource.providerResourceId).toBe("steep-moon-132241");
    expect(resource.id).toBe("neon:project:steep-moon-132241");
    expect(resource.name).toBe("combie-app");
    expect(resource.metadata).toMatchObject({
      regionId: "aws-us-east-2",
      pgVersion: 17,
      createdAt: "2025-01-15T10:00:00Z",
    });
  });

  test("uses stable Neon project id (rename-safe identity)", () => {
    const before = normalizeProject(projectsFixture.projects[0] as NeonProject);
    const renamed: NeonProject = {
      ...(projectsFixture.projects[0] as NeonProject),
      name: "combie-app-renamed",
    };
    const after = normalizeProject(renamed);

    expect(after.id).toBe(before.id);
    expect(after.providerResourceId).toBe(before.providerResourceId);
    expect(after.name).toBe("combie-app-renamed");
  });

  test("includes org facts when present and omits when absent", () => {
    const personal = normalizeProject(projectsFixture.projects[0] as NeonProject);
    const org = normalizeProject(projectsFixture.projects[1] as NeonProject);

    expect(personal.metadata.orgId).toBeUndefined();
    expect(personal.metadata.orgName).toBeUndefined();
    expect(org.metadata.orgId).toBe("org-acme-555");
    expect(org.metadata.orgName).toBe("Acme Inc");
  });

  test("excludes volatile usage fields", () => {
    const resource = normalizeProject(projectsFixture.projects[0] as NeonProject);
    for (const key of [
      "active_time",
      "cpu_used_sec",
      "activeTime",
      "cpuUsedSec",
      "updatedAt",
      "updated_at",
      "synthetic_storage_size",
      "proxy_host",
      "proxyHost",
      "quota_reset_at",
    ]) {
      expect(resource.metadata[key]).toBeUndefined();
    }
  });

  test("never persists secret-bearing fields", () => {
    const resource = normalizeProject(projectsFixture.projects[0] as NeonProject);
    const serialized = JSON.stringify(resource);
    expect(serialized).not.toContain("postgres://");
    expect(serialized).not.toContain("postgresql://");
    expect(serialized).not.toContain("password");
    expect(resource.metadata.connectionUri).toBeUndefined();
    expect(resource.metadata.uri).toBeUndefined();
  });

  test("enrichment keys are omitted when unknown", () => {
    const resource = normalizeProject(projectsFixture.projects[0] as NeonProject);
    expect("branches" in resource.metadata).toBe(false);
    expect("databases" in resource.metadata).toBe(false);
    expect("endpoints" in resource.metadata).toBe(false);
  });

  test("enrichment keys are present (even empty) when authoritative", () => {
    const resource = normalizeProject(projectsFixture.projects[0] as NeonProject, {
      branches: [],
      databases: [],
      endpoints: [],
    });
    expect(resource.metadata.branches).toEqual([]);
    expect(resource.metadata.databases).toEqual([]);
    expect(resource.metadata.endpoints).toEqual([]);
  });
});

describe("normalizeBranches", () => {
  test("keeps compact deterministic facts and sorts by name", () => {
    const reversed = [...branchesFixture.branches].reverse() as NeonBranch[];
    const normalized = normalizeBranches(reversed);

    expect(normalized.map((b) => b.name)).toEqual(["dev", "main", "preview-pr-42"]);
    expect(normalized.map((b) => b.id)).toEqual([
      "br-calm-dawn-222222",
      "br-wild-fog-111111",
      "br-preview-333333",
    ]);
    expect(normalized[1]).toEqual({
      id: "br-wild-fog-111111",
      name: "main",
      default: true,
      protected: true,
    });
    expect(normalized[0]).toEqual({
      id: "br-calm-dawn-222222",
      name: "dev",
      default: false,
      protected: false,
    });
  });

  test("excludes volatile branch state fields", () => {
    const normalized = normalizeBranches(branchesFixture.branches as NeonBranch[]);
    const serialized = JSON.stringify(normalized);
    expect(serialized).not.toContain("current_state");
    expect(serialized).not.toContain("cpu_used_sec");
    expect(serialized).not.toContain("updated_at");
    expect(serialized).toContain("br-wild-fog-111111");
  });

  test("skips entries without a usable name", () => {
    const normalized = normalizeBranches([
      { id: "br-a", name: "main", default: true },
      { id: "br-b", name: "", default: false },
      { id: "br-c", name: "  ", default: false },
      null as unknown as NeonBranch,
    ]);
    expect(normalized.map((b) => b.name)).toEqual(["main"]);
  });

  test("identical branch sets in different provider order normalize identically", () => {
    const branches = branchesFixture.branches as NeonBranch[];
    const a = JSON.stringify(normalizeBranches(branches));
    const b = JSON.stringify(normalizeBranches([...branches].reverse()));
    expect(a).toBe(b);
  });
});

describe("normalizeDatabases", () => {
  test("keeps name and owner, sorts by name", () => {
    const reversed = [...databasesFixture.databases].reverse() as NeonDatabase[];
    const normalized = normalizeDatabases(reversed);

    expect(normalized).toEqual([
      { name: "appdb", ownerName: "app_owner" },
      { name: "neondb", ownerName: "neondb_owner" },
    ]);
  });

  test("skips entries without a usable name and never includes numeric ids", () => {
    const normalized = normalizeDatabases([
      { id: 1, branch_id: "br-x", name: "db1", owner_name: "o1" },
      { id: 2, branch_id: "br-x", name: "", owner_name: "o2" },
    ] as NeonDatabase[]);
    expect(normalized).toEqual([{ name: "db1", ownerName: "o1" }]);
    expect(JSON.stringify(normalized)).not.toContain("branch_id");
  });

  test("omits ownerName when absent", () => {
    const normalized = normalizeDatabases([
      { id: 1, branch_id: "br-x", name: "db1" },
    ] as NeonDatabase[]);
    expect(normalized).toEqual([{ name: "db1" }]);
  });
});

describe("normalizeEndpoints", () => {
  test("keeps stable id, type, and branch while excluding sensitive host", () => {
    const reversed = [...endpointsFixture.endpoints].reverse() as NeonEndpoint[];
    const normalized = normalizeEndpoints(reversed);

    expect(normalized.map((e) => e.id)).toEqual([
      "ep-steep-moon-a1b2c3",
      "ep-steep-moon-d4e5f6",
    ]);
    expect(normalized[0]).toEqual({
      id: "ep-steep-moon-a1b2c3",
      type: "read_write",
      branchId: "br-wild-fog-111111",
    });
    expect(JSON.stringify(normalized)).not.toContain("neon.tech");
  });

  test("excludes volatile endpoint state fields", () => {
    const normalized = normalizeEndpoints(endpointsFixture.endpoints as NeonEndpoint[]);
    const serialized = JSON.stringify(normalized);
    expect(serialized).not.toContain("current_state");
    expect(serialized).not.toContain("last_active");
    expect(serialized).not.toContain("autoscaling");
    expect(serialized).not.toContain("updated_at");
  });

  test("skips entries without a stable id", () => {
    const normalized = normalizeEndpoints([
      { id: "ep-1", type: "read_write" },
      { id: "", type: "read_only" },
    ] as NeonEndpoint[]);
    expect(normalized.map((e) => e.id)).toEqual(["ep-1"]);
  });

  test("omits optional fields when absent", () => {
    const normalized = normalizeEndpoints([
      { id: "ep-1" },
    ] as NeonEndpoint[]);
    expect(normalized).toEqual([{ id: "ep-1" }]);
  });
});

describe("NEON_PROVIDER", () => {
  test("provider id is neon", () => {
    expect(NEON_PROVIDER).toBe("neon");
  });
});
