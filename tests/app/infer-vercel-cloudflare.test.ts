import { describe, expect, test } from "bun:test";
import { createResource, type Resource } from "../../src/domain/resource.ts";
import {
  hasAuthoritativeDomainEvidence,
  inferVercelCloudflareRelationships,
  isVercelCloudflareUsesDomainIn,
} from "../../src/app/infer-vercel-cloudflare.ts";

function vercelProject(
  id: string,
  name: string,
  domains?: Array<{ hostname: string; apexName: string; custom: true }>,
): Resource {
  const metadata: Record<string, unknown> = { accountId: "team_1" };
  if (domains !== undefined) {
    metadata.domains = domains;
  }
  return createResource({
    provider: "vercel",
    providerResourceId: id,
    kind: "project",
    name,
    metadata,
  });
}

function cloudflareZone(id: string, name: string): Resource {
  return createResource({
    provider: "cloudflare",
    providerResourceId: id,
    kind: "zone",
    name,
    metadata: {},
  });
}

function customDomain(hostname: string, apexName: string) {
  return { hostname, apexName, custom: true as const };
}

describe("inferVercelCloudflareRelationships", () => {
  test("exact custom apex match creates one uses_domain_in edge", () => {
    const project = vercelProject("prj_a", "web", [
      customDomain("example.com", "example.com"),
    ]);
    const zone = cloudflareZone("zone-1", "example.com");

    const rels = inferVercelCloudflareRelationships([project, zone]);
    expect(rels).toHaveLength(1);
    const rel = rels[0]!;
    expect(rel.kind).toBe("uses_domain_in");
    expect(rel.sourceResourceId).toBe("vercel:project:prj_a");
    expect(rel.targetResourceId).toBe("cloudflare:zone:zone-1");
    expect(rel.id).toBe(
      "rel:vercel:project:prj_a:uses_domain_in:cloudflare:zone:zone-1",
    );
    expect(rel.evidence.source).toBe("vercel");
    expect(rel.evidence.mechanism).toBe("custom_domain_apex");
    expect(rel.evidence.apexName).toBe("example.com");
    expect(rel.evidence.hostnames).toEqual(["example.com"]);
  });

  test("custom subdomain with matching apex creates one edge", () => {
    const project = vercelProject("prj_a", "web", [
      customDomain("app.example.com", "example.com"),
    ]);
    const zone = cloudflareZone("zone-1", "example.com");

    const rels = inferVercelCloudflareRelationships([project, zone]);
    expect(rels).toHaveLength(1);
    expect(rels[0]!.evidence.apexName).toBe("example.com");
    expect(rels[0]!.evidence.hostnames).toEqual(["app.example.com"]);
  });

  test("zone name case and trailing dot normalize for comparison only", () => {
    const project = vercelProject("prj_a", "web", [
      customDomain("app.example.com", "example.com"),
    ]);
    const zone = cloudflareZone("zone-1", "Example.COM.");

    const rels = inferVercelCloudflareRelationships([project, zone]);
    expect(rels).toHaveLength(1);
    // Zone Resource identity is unchanged
    expect(rels[0]!.targetResourceId).toBe("cloudflare:zone:zone-1");
  });

  test("multiple hostnames with the same apex create one canonical edge", () => {
    const project = vercelProject("prj_a", "web", [
      customDomain("app.example.com", "example.com"),
      customDomain("api.example.com", "example.com"),
      customDomain("www.example.com", "example.com"),
      customDomain("example.com", "example.com"),
    ]);
    const zone = cloudflareZone("zone-1", "example.com");

    const rels = inferVercelCloudflareRelationships([project, zone]);
    expect(rels).toHaveLength(1);
    expect(rels[0]!.evidence.hostnames).toEqual([
      "api.example.com",
      "app.example.com",
      "example.com",
      "www.example.com",
    ]);
  });

  test("relationship identity does not depend on hostnames", () => {
    const zone = cloudflareZone("zone-1", "example.com");
    const before = inferVercelCloudflareRelationships([
      vercelProject("prj_a", "web", [customDomain("app.example.com", "example.com")]),
      zone,
    ]);
    const after = inferVercelCloudflareRelationships([
      vercelProject("prj_a", "web", [customDomain("www.example.com", "example.com")]),
      zone,
    ]);
    expect(before[0]!.id).toBe(after[0]!.id);
  });

  test("multiple matching zones create distinct valid edges", () => {
    const project = vercelProject("prj_a", "web", [
      customDomain("app.example.com", "example.com"),
      customDomain("shop.example.org", "example.org"),
    ]);
    const zoneA = cloudflareZone("zone-1", "example.com");
    const zoneB = cloudflareZone("zone-2", "example.org");

    const rels = inferVercelCloudflareRelationships([project, zoneA, zoneB]);
    expect(rels).toHaveLength(2);
    const targets = rels.map((r) => r.targetResourceId).sort();
    expect(targets).toEqual([
      "cloudflare:zone:zone-1",
      "cloudflare:zone:zone-2",
    ]);
  });

  test("custom apex with no matching zone creates no edge", () => {
    const project = vercelProject("prj_a", "web", [
      customDomain("app.example.com", "example.com"),
    ]);
    const zone = cloudflareZone("zone-1", "other.com");

    expect(inferVercelCloudflareRelationships([project, zone])).toHaveLength(0);
  });

  test("known-empty domains create no edge", () => {
    const project = vercelProject("prj_a", "web", []);
    const zone = cloudflareZone("zone-1", "example.com");

    expect(inferVercelCloudflareRelationships([project, zone])).toHaveLength(0);
  });

  test("unknown domain evidence creates no speculative edge", () => {
    const project = vercelProject("prj_a", "web"); // domains key omitted
    const zone = cloudflareZone("zone-1", "example.com");

    expect(inferVercelCloudflareRelationships([project, zone])).toHaveLength(0);
  });

  test("vercel.app never creates an edge", () => {
    const project = vercelProject("prj_a", "web", [
      // fabricated evidence that Sprint 008 normalization would never emit
      customDomain("prj-a.vercel.app", "vercel.app"),
    ]);
    const zone = cloudflareZone("zone-1", "vercel.app");

    expect(inferVercelCloudflareRelationships([project, zone])).toHaveLength(0);
  });

  test("display-name similarity never creates an edge", () => {
    const project = vercelProject("prj_a", "example.com", []);
    const zone = cloudflareZone("zone-1", "example.com");

    expect(inferVercelCloudflareRelationships([project, zone])).toHaveLength(0);
  });

  test("apex is not guessed from hostname suffixes", () => {
    // Zone is a parent of the hostname but not the provider-backed apex.
    const project = vercelProject("prj_a", "web", [
      customDomain("app.shop.example.com", "shop.example.com"),
    ]);
    const zone = cloudflareZone("zone-1", "example.com");

    expect(inferVercelCloudflareRelationships([project, zone])).toHaveLength(0);
  });

  test("non-project and non-zone resources are ignored", () => {
    const worker = createResource({
      provider: "cloudflare",
      providerResourceId: "w-1",
      kind: "worker",
      name: "example.com",
      metadata: {},
    });
    const project = vercelProject("prj_a", "web", [
      customDomain("example.com", "example.com"),
    ]);

    expect(
      inferVercelCloudflareRelationships([project, worker]),
    ).toHaveLength(0);
  });

  test("malformed domain metadata is treated as no evidence", () => {
    const project = createResource({
      provider: "vercel",
      providerResourceId: "prj_a",
      kind: "project",
      name: "web",
      metadata: {
        domains: [
          { hostname: 42, apexName: null },
          "example.com",
          { hostname: "app.example.com" },
        ],
      },
    });
    const zone = cloudflareZone("zone-1", "example.com");

    expect(inferVercelCloudflareRelationships([project, zone])).toHaveLength(0);
  });
});

describe("hasAuthoritativeDomainEvidence", () => {
  test("requires an array rather than mere domains-key presence", () => {
    const project = vercelProject("prj_a", "web");
    expect(
      hasAuthoritativeDomainEvidence({
        ...project,
        metadata: { domains: null },
      }),
    ).toBe(false);
    expect(
      hasAuthoritativeDomainEvidence({
        ...project,
        metadata: { domains: undefined },
      }),
    ).toBe(false);
    expect(
      hasAuthoritativeDomainEvidence({ ...project, metadata: { domains: [] } }),
    ).toBe(true);
  });
});

describe("isVercelCloudflareUsesDomainIn", () => {
  test("matches only uses_domain_in vercel project → cloudflare zone edges", () => {
    expect(
      isVercelCloudflareUsesDomainIn({
        kind: "uses_domain_in",
        sourceResourceId: "vercel:project:prj_a",
        targetResourceId: "cloudflare:zone:zone-1",
      }),
    ).toBe(true);

    expect(
      isVercelCloudflareUsesDomainIn({
        kind: "source_for",
        sourceResourceId: "vercel:project:prj_a",
        targetResourceId: "cloudflare:zone:zone-1",
      }),
    ).toBe(false);

    expect(
      isVercelCloudflareUsesDomainIn({
        kind: "uses_domain_in",
        sourceResourceId: "github:repository:1001",
        targetResourceId: "cloudflare:zone:zone-1",
      }),
    ).toBe(false);

    expect(
      isVercelCloudflareUsesDomainIn({
        kind: "uses_domain_in",
        sourceResourceId: "vercel:project:prj_a",
        targetResourceId: "vercel:project:prj_b",
      }),
    ).toBe(false);
  });
});
