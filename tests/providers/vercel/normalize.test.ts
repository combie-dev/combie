import { describe, expect, test } from "bun:test";
import {
  normalizeDomains,
  normalizeProject,
  VERCEL_PROVIDER,
} from "../../../src/providers/vercel/normalize.ts";
import { resourceId } from "../../../src/domain/resource.ts";
import type {
  VercelProject,
  VercelProjectDomain,
} from "../../../src/providers/vercel/client.ts";
import projectsFixture from "./fixtures/projects.json";

describe("normalizeProject", () => {
  test("maps Vercel project fields into Resource model", () => {
    const project = projectsFixture.projects[0] as VercelProject;
    const resource = normalizeProject(project);

    expect(resource.provider).toBe("vercel");
    expect(resource.kind).toBe("project");
    expect(resource.providerResourceId).toBe("prj_abc123");
    expect(resource.id).toBe("vercel:project:prj_abc123");
    expect(resource.name).toBe("combie");
    expect(resource.metadata).toMatchObject({
      accountId: "team_xyz789",
      framework: "nextjs",
    });
    expect(resource.metadata.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(resource.metadata.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(resource.metadata.git).toEqual({
      provider: "github",
      org: "example-user",
      repo: "combie",
      fullName: "example-user/combie",
      linkType: "github",
      repoId: "1001",
    });
  });

  test("preserves GitHub git link and omits when unlinked", () => {
    const linked = normalizeProject(projectsFixture.projects[0] as VercelProject);
    const unlinked = normalizeProject(projectsFixture.projects[2] as VercelProject);
    expect(linked.metadata.git).toBeDefined();
    expect((linked.metadata.git as { repoId: string }).repoId).toBe("1001");
    expect(unlinked.metadata.git).toBeUndefined();
  });

  test("ignores non-github link types", () => {
    const project: VercelProject = {
      id: "prj_gl",
      name: "gitlab-app",
      accountId: "acct-1",
      link: {
        type: "gitlab",
        org: "acme",
        repo: "app",
        repoId: 42,
      },
    };
    const resource = normalizeProject(project);
    expect(resource.metadata.git).toBeUndefined();
  });

  test("uses stable Vercel project id (rename-safe identity)", () => {
    const before = normalizeProject(projectsFixture.projects[0] as VercelProject);
    const renamed: VercelProject = {
      ...(projectsFixture.projects[0] as VercelProject),
      name: "combie-renamed",
    };
    const after = normalizeProject(renamed);

    expect(after.id).toBe(before.id);
    expect(after.providerResourceId).toBe(before.providerResourceId);
    expect(after.name).toBe("combie-renamed");
  });

  test("omits framework when null/missing", () => {
    const project = projectsFixture.projects[2] as VercelProject;
    const resource = normalizeProject(project);
    expect(resource.metadata.framework).toBeUndefined();
    expect(resource.name).toBe("api-service");
  });

  test("handles project without timestamps", () => {
    const project: VercelProject = {
      id: "prj_minimal",
      name: "minimal",
      accountId: "acct-1",
    };
    const resource = normalizeProject(project);
    expect(resource.id).toBe("vercel:project:prj_minimal");
    expect(resource.metadata.createdAt).toBeUndefined();
    expect(resource.metadata.updatedAt).toBeUndefined();
  });

  test("cross-provider identity does not collide", () => {
    const vercelId = resourceId(VERCEL_PROVIDER, "project", "prj_abc123");
    const cfId = resourceId("cloudflare", "worker", "prj_abc123");
    const ghId = resourceId("github", "repository", "prj_abc123");
    expect(vercelId).not.toBe(cfId);
    expect(vercelId).not.toBe(ghId);
  });
});

describe("normalizeProject domain evidence", () => {
  test("attaches normalized custom domains when provided", () => {
    const project = projectsFixture.projects[0] as VercelProject;
    const domains = normalizeDomains([
      { name: "app.example.com", apexName: "example.com", verified: true },
    ] as VercelProjectDomain[]);
    const resource = normalizeProject(project, domains);
    expect(resource.metadata.domains).toEqual([
      { hostname: "app.example.com", apexName: "example.com", custom: true },
    ]);
  });

  test("zero custom domains is an explicit empty array", () => {
    const project = projectsFixture.projects[0] as VercelProject;
    const resource = normalizeProject(project, []);
    expect(resource.metadata.domains).toEqual([]);
  });

  test("unknown enrichment omits the domains key entirely", () => {
    const project = projectsFixture.projects[0] as VercelProject;
    const resource = normalizeProject(project);
    expect(resource.metadata.domains).toBeUndefined();
    expect("domains" in resource.metadata).toBe(false);
  });

  test("domain enrichment does not alter identity or git metadata", () => {
    const project = projectsFixture.projects[0] as VercelProject;
    const before = normalizeProject(project);
    const after = normalizeProject(
      project,
      normalizeDomains([
        { name: "example.com", apexName: "example.com" },
      ] as VercelProjectDomain[]),
    );
    expect(after.id).toBe(before.id);
    expect(after.providerResourceId).toBe(before.providerResourceId);
    expect(after.name).toBe(before.name);
    expect(after.metadata.git).toEqual(before.metadata.git);
  });
});

describe("normalizeDomains", () => {
  function dom(name: string, apexName?: string): VercelProjectDomain {
    return { name, apexName, verified: true } as VercelProjectDomain;
  }

  test("preserves custom apex domain with provider-backed apexName", () => {
    const facts = normalizeDomains([dom("example.com", "example.com")]);
    expect(facts).toEqual([
      { hostname: "example.com", apexName: "example.com", custom: true },
    ]);
  });

  test("preserves custom subdomain with provider-backed apexName", () => {
    const facts = normalizeDomains([dom("api.example.com", "example.com")]);
    expect(facts).toEqual([
      { hostname: "api.example.com", apexName: "example.com", custom: true },
    ]);
  });

  test("preserves multiple custom domains in order", () => {
    const facts = normalizeDomains([
      dom("example.com", "example.com"),
      dom("www.example.com", "example.com"),
      dom("other.dev", "other.dev"),
    ]);
    expect(facts.map((f) => f.hostname)).toEqual([
      "example.com",
      "www.example.com",
      "other.dev",
    ]);
  });

  test("excludes vercel.app defaults", () => {
    const facts = normalizeDomains([
      dom("project.vercel.app", "vercel.app"),
      dom("project-git-main-user.vercel.app", "vercel.app"),
    ]);
    expect(facts).toEqual([]);
  });

  test("mixes custom and default, keeping only custom", () => {
    const facts = normalizeDomains([
      dom("combie.vercel.app", "vercel.app"),
      dom("app.example.com", "example.com"),
    ]);
    expect(facts.map((f) => f.hostname)).toEqual(["app.example.com"]);
  });

  test("normalizes hostname case and trailing dot", () => {
    const facts = normalizeDomains([dom("Example.COM.", "Example.COM")]);
    expect(facts).toEqual([
      { hostname: "example.com", apexName: "example.com", custom: true },
    ]);
  });

  test("normalizes wildcard hostname while preserving provider apex", () => {
    const facts = normalizeDomains([dom("*.Example.com", "example.com")]);
    expect(facts).toEqual([
      { hostname: "*.example.com", apexName: "example.com", custom: true },
    ]);
  });

  test("preserves provider-backed apexes for multi-label public suffixes", () => {
    const facts = normalizeDomains([
      dom("app.example.co.uk", "example.co.uk"),
    ]);
    expect(facts).toEqual([
      {
        hostname: "app.example.co.uk",
        apexName: "example.co.uk",
        custom: true,
      },
    ]);
  });

  test("canonicalizes internationalized names without deriving their apex", () => {
    const facts = normalizeDomains([dom("WWW.BÜCHER.DE.", "BÜCHER.DE.")]);
    expect(facts).toEqual([
      {
        hostname: "www.xn--bcher-kva.de",
        apexName: "xn--bcher-kva.de",
        custom: true,
      },
    ]);
  });

  test("skips custom domain missing a provider-backed apexName", () => {
    // Naive last-two-label derivation is forbidden; without apexName there is
    // no defensible apex, so the fact is omitted rather than guessed.
    const facts = normalizeDomains([dom("example.com")]);
    expect(facts).toEqual([]);
  });

  test("skips empty or non-string hostnames", () => {
    const facts = normalizeDomains([
      dom("", "example.com"),
      { name: 42, apexName: "example.com" } as unknown as VercelProjectDomain,
      null as unknown as VercelProjectDomain,
    ]);
    expect(facts).toEqual([]);
  });

  test("skips malformed hostnames and wildcard apex values", () => {
    const facts = normalizeDomains([
      dom("bad domain", "example.com"),
      dom("app.example.com", "*.example.com"),
      dom("-bad.example.com", "example.com"),
    ]);
    expect(facts).toEqual([]);
  });

  test("deduplicates identical hostnames deterministically", () => {
    const facts = normalizeDomains([
      dom("example.com", "example.com"),
      dom("example.com", "example.com"),
    ]);
    expect(facts).toHaveLength(1);
  });
});
