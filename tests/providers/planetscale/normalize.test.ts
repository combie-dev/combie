import { describe, expect, test } from "bun:test";
import {
  normalizeBranches,
  normalizeDatabase,
  PLANETSCALE_PROVIDER,
} from "../../../src/providers/planetscale/normalize.ts";
import type {
  PlanetScaleBranch,
  PlanetScaleDatabase,
} from "../../../src/providers/planetscale/client.ts";
import databasesFixture from "./fixtures/databases.json";
import branchesFixture from "./fixtures/branches.json";

const databases = databasesFixture.data as PlanetScaleDatabase[];
const branches = branchesFixture.data as PlanetScaleBranch[];

describe("PlanetScale normalizeDatabase", () => {
  test("uses generic database kind and stable native id", () => {
    const resource = normalizeDatabase(databases[0]!);
    expect(resource.provider).toBe("planetscale");
    expect(resource.kind).toBe("database");
    expect(resource.providerResourceId).toBe("db_combie_app_001");
    expect(resource.id).toBe("planetscale:database:db_combie_app_001");
    expect(resource.name).toBe("combie-app");
  });

  test("rename preserves identity", () => {
    const renamed = normalizeDatabase({
      ...databases[0]!,
      name: "combie-app-renamed",
    });
    expect(renamed.id).toBe("planetscale:database:db_combie_app_001");
    expect(renamed.name).toBe("combie-app-renamed");
  });

  test("engine is provider-backed metadata from kind", () => {
    const mysql = normalizeDatabase(databases[0]!);
    const postgres = normalizeDatabase(databases[1]!);
    expect(mysql.metadata.engine).toBe("mysql");
    expect(postgres.metadata.engine).toBe("postgresql");
  });

  test("retains compact non-secret database facts", () => {
    const resource = normalizeDatabase(databases[0]!);
    expect(resource.metadata.region).toBe("us-east");
    expect(resource.metadata.ready).toBe(true);
    expect(resource.metadata.defaultBranch).toBe("main");
    expect(resource.metadata.productionBranchesCount).toBe(1);
    expect(resource.metadata.developmentBranchesCount).toBe(1);
  });

  test("excludes volatile noise and secret-adjacent fields", () => {
    const resource = normalizeDatabase(databases[0]!);
    const raw = JSON.stringify(resource);
    expect(raw).not.toContain("open_schema_recommendations");
    expect(raw).not.toContain("insights_raw_queries");
    expect(raw).not.toContain("resizing");
    expect(raw).not.toContain("billing");
    expect(raw).not.toContain("1.2.3.4");
    expect(resource.metadata.state).toBeUndefined();
    expect(resource.metadata.plan).toBeUndefined();
  });

  test("omitted branches means unknown; empty array is authoritative empty", () => {
    const unknown = normalizeDatabase(databases[0]!);
    expect(unknown.metadata.branches).toBeUndefined();

    const empty = normalizeDatabase(databases[0]!, { branches: [] });
    expect(empty.metadata.branches).toEqual([]);
  });

  test("includes branch enrichment when provided", () => {
    const resource = normalizeDatabase(databases[0]!, {
      branches: normalizeBranches(branches),
    });
    expect(Array.isArray(resource.metadata.branches)).toBe(true);
    expect((resource.metadata.branches as unknown[]).length).toBe(2);
  });
});

describe("PlanetScale normalizeBranches", () => {
  test("sorts deterministically by name regardless of provider order", () => {
    const reversed = [...branches].reverse();
    const a = normalizeBranches(branches);
    const b = normalizeBranches(reversed);
    expect(a.map((x) => x.name)).toEqual(b.map((x) => x.name));
    expect(a.map((x) => x.name)).toEqual(["feature-xyz", "main"]);
  });

  test("keeps compact non-secret branch facts", () => {
    const normalized = normalizeBranches(branches);
    const main = normalized.find((b) => b.name === "main")!;
    expect(main.id).toBe("br_main_prod_001");
    expect(main.production).toBe(true);
    expect(main.ready).toBe(true);
    expect(main.schemaReady).toBe(true);
    expect(main.region).toBe("us-east");
    expect(main.engine).toBe("mysql");
    expect(main.parentBranch).toBeUndefined();

    const feature = normalized.find((b) => b.name === "feature-xyz")!;
    expect(feature.production).toBe(false);
    expect(feature.parentBranch).toBe("main");
  });

  test("never persists hosts or connection endpoints", () => {
    const normalized = normalizeBranches(branches);
    const raw = JSON.stringify(normalized);
    expect(raw).not.toContain("psdb.cloud");
    expect(raw).not.toContain("mysql_address");
    expect(raw).not.toContain("password");
  });

  test("skips incomplete branch rows", () => {
    const normalized = normalizeBranches([
      { id: "only-id" },
      { name: "only-name" },
      { id: "ok", name: "ok-branch", production: false, ready: true },
    ] as PlanetScaleBranch[]);
    expect(normalized).toEqual([
      {
        id: "ok",
        name: "ok-branch",
        production: false,
        ready: true,
      },
    ]);
  });
});

describe("PlanetScale provider constant", () => {
  test("provider id is planetscale", () => {
    expect(PLANETSCALE_PROVIDER).toBe("planetscale");
  });
});
