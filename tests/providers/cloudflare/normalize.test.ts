import { describe, expect, test } from "bun:test";
import { resourceId } from "../../../src/domain/resource.ts";
import {
  normalizeD1,
  normalizeKvNamespace,
  normalizeWorker,
  normalizeZone,
  CLOUDFLARE_PROVIDER,
} from "../../../src/providers/cloudflare/normalize.ts";
import workersFixture from "./fixtures/workers.json";
import d1Fixture from "./fixtures/d1.json";
import kvFixture from "./fixtures/kv.json";
import zonesFixture from "./fixtures/zones.json";

const ACCOUNT_ID = "acct-001";

describe("normalizeWorker", () => {
  test("maps worker script to Resource kind worker", () => {
    const script = workersFixture.result[0]!;
    const resource = normalizeWorker(script, ACCOUNT_ID);

    expect(resource.provider).toBe(CLOUDFLARE_PROVIDER);
    expect(resource.kind).toBe("worker");
    expect(resource.providerResourceId).toBe("api-gateway");
    expect(resource.name).toBe("api-gateway");
    expect(resource.id).toBe(
      resourceId(CLOUDFLARE_PROVIDER, "worker", "api-gateway"),
    );
    expect(resource.metadata.accountId).toBe(ACCOUNT_ID);
    expect(resource.metadata.usageModel).toBe("standard");
    expect(resource.metadata.handlers).toEqual(["fetch"]);
  });

  test("uses id as name when name is absent", () => {
    const script = workersFixture.result[1]!;
    const resource = normalizeWorker(script, ACCOUNT_ID);
    expect(resource.name).toBe("cron-cleanup");
    expect(resource.providerResourceId).toBe("cron-cleanup");
  });

  test("sorts set-like handler evidence", () => {
    const resource = normalizeWorker(
      { id: "worker", handlers: ["scheduled", "fetch", "fetch"] },
      ACCOUNT_ID,
    );
    expect(resource.metadata.handlers).toEqual(["fetch", "scheduled"]);
    const permuted = normalizeWorker(
      { id: "worker", handlers: ["fetch", "scheduled"] },
      ACCOUNT_ID,
    );
    expect(permuted.metadata.handlers).toEqual(resource.metadata.handlers);
  });
});

describe("normalizeD1", () => {
  test("maps D1 database to kind database with engine d1", () => {
    const db = d1Fixture.result[0]!;
    const resource = normalizeD1(db, ACCOUNT_ID);

    expect(resource.provider).toBe(CLOUDFLARE_PROVIDER);
    expect(resource.kind).toBe("database");
    expect(resource.providerResourceId).toBe("d1-uuid-001");
    expect(resource.name).toBe("app-production");
    expect(resource.id).toBe(
      resourceId(CLOUDFLARE_PROVIDER, "database", "d1-uuid-001"),
    );
    expect(resource.metadata).toMatchObject({
      accountId: ACCOUNT_ID,
      engine: "d1",
      version: "production",
      numTables: 12,
    });
  });
});

describe("normalizeKvNamespace", () => {
  test("maps KV namespace to kind kv_namespace", () => {
    const ns = kvFixture.result[0]!;
    const resource = normalizeKvNamespace(ns, ACCOUNT_ID);

    expect(resource.provider).toBe(CLOUDFLARE_PROVIDER);
    expect(resource.kind).toBe("kv_namespace");
    expect(resource.providerResourceId).toBe("kv-ns-aaa");
    expect(resource.name).toBe("SESSION_STORE");
    expect(resource.id).toBe(
      resourceId(CLOUDFLARE_PROVIDER, "kv_namespace", "kv-ns-aaa"),
    );
    expect(resource.metadata.accountId).toBe(ACCOUNT_ID);
    expect(resource.metadata.supportsUrlEncoding).toBe(true);
  });
});

describe("normalizeZone", () => {
  test("maps zone to kind zone", () => {
    const zone = zonesFixture.result[0]!;
    const resource = normalizeZone(zone);

    expect(resource.provider).toBe(CLOUDFLARE_PROVIDER);
    expect(resource.kind).toBe("zone");
    expect(resource.providerResourceId).toBe("zone-id-example");
    expect(resource.name).toBe("example.com");
    expect(resource.id).toBe(
      resourceId(CLOUDFLARE_PROVIDER, "zone", "zone-id-example"),
    );
    expect(resource.metadata).toMatchObject({
      status: "active",
      paused: false,
      type: "full",
      accountId: "acct-001",
    });
    expect(resource.metadata.nameServers).toEqual([
      "ada.ns.cloudflare.com",
      "bob.ns.cloudflare.com",
    ]);
  });

  test("sorts set-like name server evidence", () => {
    const resource = normalizeZone({
      id: "zone",
      name: "example.com",
      name_servers: [
        "z.ns.cloudflare.com",
        "a.ns.cloudflare.com",
        "a.ns.cloudflare.com",
      ],
    });
    expect(resource.metadata.nameServers).toEqual([
      "a.ns.cloudflare.com",
      "z.ns.cloudflare.com",
    ]);
    const permuted = normalizeZone({
      id: "zone",
      name: "example.com",
      name_servers: ["a.ns.cloudflare.com", "z.ns.cloudflare.com"],
    });
    expect(permuted.metadata.nameServers).toEqual(
      resource.metadata.nameServers,
    );
  });
});

describe("stable identity", () => {
  test("same provider + providerResourceId yields same id", () => {
    const a = normalizeWorker(workersFixture.result[0]!, ACCOUNT_ID);
    const b = normalizeWorker(workersFixture.result[0]!, ACCOUNT_ID);
    expect(a.id).toBe(b.id);
  });
});

describe("live API shape compatibility", () => {
  test("normalizes a real Cloudflare zone payload shape", () => {
    // Non-secret fields sampled from a live GET /zones response via MCP.
    const liveZone = {
      id: "78585893066d32991f2a74a1543c5b58",
      name: "usecmd.dev",
      status: "active",
      paused: false,
      type: "full",
      account: {
        id: "3e2742bacdabcada586f921ad89bac77",
        name: "example-account",
      },
      name_servers: ["alaric.ns.cloudflare.com", "josephine.ns.cloudflare.com"],
    };
    const resource = normalizeZone(liveZone);
    expect(resource.kind).toBe("zone");
    expect(resource.name).toBe("usecmd.dev");
    expect(resource.providerResourceId).toBe(liveZone.id);
    expect(resource.id).toBe(
      resourceId(CLOUDFLARE_PROVIDER, "zone", liveZone.id),
    );
    expect(resource.metadata.accountId).toBe(liveZone.account.id);
  });
});
