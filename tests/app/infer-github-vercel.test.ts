import { describe, expect, test } from "bun:test";
import { createResource } from "../../src/domain/resource.ts";
import {
  inferGitHubVercelRelationships,
  isGitHubVercelSourceFor,
  matchGitHubRepository,
} from "../../src/app/infer-github-vercel.ts";

function githubRepo(opts: {
  id: string;
  name: string;
  fullName: string;
  owner?: string;
}) {
  return createResource({
    provider: "github",
    providerResourceId: opts.id,
    kind: "repository",
    name: opts.name,
    metadata: {
      owner: opts.owner ?? opts.fullName.split("/")[0],
      fullName: opts.fullName,
    },
  });
}

function vercelProject(opts: {
  id: string;
  name: string;
  git?: {
    provider: string;
    org: string;
    repo: string;
    fullName: string;
    repoId?: string;
    linkType?: string;
  };
}) {
  const metadata: Record<string, unknown> = {
    accountId: "team_1",
  };
  if (opts.git) {
    metadata.git = opts.git;
  }
  return createResource({
    provider: "vercel",
    providerResourceId: opts.id,
    kind: "project",
    name: opts.name,
    metadata,
  });
}

describe("matchGitHubRepository", () => {
  const repos = [
    githubRepo({ id: "1001", name: "combie", fullName: "acme/combie" }),
    githubRepo({ id: "1002", name: "other", fullName: "acme/other" }),
  ];

  test("matches by GitHub repoId (primary, deterministic)", () => {
    const match = matchGitHubRepository(
      {
        provider: "github",
        org: "acme",
        repo: "combie",
        fullName: "acme/combie",
        repoId: "1001",
      },
      repos,
    );
    expect(match?.id).toBe("github:repository:1001");
  });

  test("does not match when repoId points elsewhere even if fullName matches", () => {
    const match = matchGitHubRepository(
      {
        provider: "github",
        org: "acme",
        repo: "combie",
        fullName: "acme/combie",
        repoId: "9999",
      },
      repos,
    );
    expect(match).toBeNull();
  });

  test("falls back to exact fullName only when repoId is absent", () => {
    const match = matchGitHubRepository(
      {
        provider: "github",
        org: "acme",
        repo: "other",
        fullName: "acme/other",
      },
      repos,
    );
    expect(match?.id).toBe("github:repository:1002");
  });
});

describe("inferGitHubVercelRelationships", () => {
  test("creates source_for Relationship from deterministic repoId evidence", () => {
    const resources = [
      githubRepo({ id: "1001", name: "combie", fullName: "acme/combie" }),
      vercelProject({
        id: "prj_abc",
        name: "combie-web",
        git: {
          provider: "github",
          org: "acme",
          repo: "combie",
          fullName: "acme/combie",
          repoId: "1001",
          linkType: "github",
        },
      }),
    ];

    const rels = inferGitHubVercelRelationships(resources);
    expect(rels).toHaveLength(1);
    expect(rels[0]!.kind).toBe("source_for");
    expect(rels[0]!.sourceResourceId).toBe("github:repository:1001");
    expect(rels[0]!.targetResourceId).toBe("vercel:project:prj_abc");
    expect(rels[0]!.evidence).toMatchObject({
      source: "vercel",
      mechanism: "git_repository_reference",
      repository: "acme/combie",
      githubRepoId: "1001",
      vercelLinkType: "github",
    });
  });

  test("returns empty when no match", () => {
    const resources = [
      githubRepo({ id: "1001", name: "combie", fullName: "acme/combie" }),
      vercelProject({
        id: "prj_abc",
        name: "other-app",
        git: {
          provider: "github",
          org: "acme",
          repo: "unrelated",
          fullName: "acme/unrelated",
          repoId: "9999",
        },
      }),
    ];
    expect(inferGitHubVercelRelationships(resources)).toHaveLength(0);
  });

  test("same display name but different repository → no Relationship", () => {
    // Vercel project named "combie" linked to a different repo than GitHub "combie"
    const resources = [
      githubRepo({ id: "1001", name: "combie", fullName: "acme/combie" }),
      vercelProject({
        id: "prj_same_name",
        name: "combie",
        git: {
          provider: "github",
          org: "other-org",
          repo: "combie",
          fullName: "other-org/combie",
          repoId: "5555",
        },
      }),
    ];
    // Name collision alone is not evidence
    expect(inferGitHubVercelRelationships(resources)).toHaveLength(0);
  });

  test("project with no git metadata → no Relationship", () => {
    const resources = [
      githubRepo({ id: "1001", name: "combie", fullName: "acme/combie" }),
      vercelProject({ id: "prj_cli", name: "combie" }),
    ];
    expect(inferGitHubVercelRelationships(resources)).toHaveLength(0);
  });

  test("multiple repositories with unambiguous evidence", () => {
    const resources = [
      githubRepo({ id: "1001", name: "combie", fullName: "acme/combie" }),
      githubRepo({ id: "1002", name: "docs", fullName: "acme/docs" }),
      vercelProject({
        id: "prj_1",
        name: "web",
        git: {
          provider: "github",
          org: "acme",
          repo: "combie",
          fullName: "acme/combie",
          repoId: "1001",
        },
      }),
      vercelProject({
        id: "prj_2",
        name: "docs-site",
        git: {
          provider: "github",
          org: "acme",
          repo: "docs",
          fullName: "acme/docs",
          repoId: "1002",
        },
      }),
    ];
    const rels = inferGitHubVercelRelationships(resources);
    expect(rels).toHaveLength(2);
    const pairs = rels.map((r) => [r.sourceResourceId, r.targetResourceId]);
    expect(pairs).toContainEqual([
      "github:repository:1001",
      "vercel:project:prj_1",
    ]);
    expect(pairs).toContainEqual([
      "github:repository:1002",
      "vercel:project:prj_2",
    ]);
  });

  test("Vercel rename stability when git evidence remains", () => {
    const repo = githubRepo({
      id: "1001",
      name: "combie",
      fullName: "acme/combie",
    });
    const before = vercelProject({
      id: "prj_stable",
      name: "old-name",
      git: {
        provider: "github",
        org: "acme",
        repo: "combie",
        fullName: "acme/combie",
        repoId: "1001",
      },
    });
    const after = vercelProject({
      id: "prj_stable",
      name: "new-name",
      git: {
        provider: "github",
        org: "acme",
        repo: "combie",
        fullName: "acme/combie",
        repoId: "1001",
      },
    });

    const r1 = inferGitHubVercelRelationships([repo, before]);
    const r2 = inferGitHubVercelRelationships([repo, after]);
    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);
    expect(r1[0]!.id).toBe(r2[0]!.id);
  });

  test("GitHub rename: match still holds via stable repoId", () => {
    const before = githubRepo({
      id: "1001",
      name: "old-name",
      fullName: "acme/old-name",
    });
    const after = githubRepo({
      id: "1001",
      name: "new-name",
      fullName: "acme/new-name",
    });
    const project = vercelProject({
      id: "prj_1",
      name: "app",
      git: {
        provider: "github",
        org: "acme",
        repo: "old-name",
        fullName: "acme/old-name",
        repoId: "1001",
      },
    });

    const r1 = inferGitHubVercelRelationships([before, project]);
    const r2 = inferGitHubVercelRelationships([after, project]);
    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);
    expect(r1[0]!.sourceResourceId).toBe(r2[0]!.sourceResourceId);
    expect(r1[0]!.id).toBe(r2[0]!.id);
  });

  test("malformed git metadata → no Relationship", () => {
    const resources = [
      githubRepo({ id: "1001", name: "combie", fullName: "acme/combie" }),
      createResource({
        provider: "vercel",
        providerResourceId: "prj_bad",
        kind: "project",
        name: "bad",
        metadata: {
          accountId: "t",
          git: { provider: "github", org: "acme" }, // missing repo
        },
      }),
      createResource({
        provider: "vercel",
        providerResourceId: "prj_gitlab",
        kind: "project",
        name: "gitlab-app",
        metadata: {
          accountId: "t",
          git: {
            provider: "gitlab",
            org: "acme",
            repo: "combie",
            fullName: "acme/combie",
            repoId: "1001",
          },
        },
      }),
    ];
    expect(inferGitHubVercelRelationships(resources)).toHaveLength(0);
  });

  test("ignores non-github / non-vercel resources", () => {
    const resources = [
      githubRepo({ id: "1001", name: "combie", fullName: "acme/combie" }),
      vercelProject({
        id: "prj_1",
        name: "web",
        git: {
          provider: "github",
          org: "acme",
          repo: "combie",
          fullName: "acme/combie",
          repoId: "1001",
        },
      }),
      createResource({
        provider: "sentry",
        providerResourceId: "450001",
        kind: "project",
        name: "combie",
        metadata: {},
      }),
    ];
    const rels = inferGitHubVercelRelationships(resources);
    expect(rels).toHaveLength(1);
  });
});

describe("isGitHubVercelSourceFor", () => {
  test("identifies this inference path only", () => {
    expect(
      isGitHubVercelSourceFor({
        kind: "source_for",
        sourceResourceId: "github:repository:1",
        targetResourceId: "vercel:project:p",
      }),
    ).toBe(true);
    expect(
      isGitHubVercelSourceFor({
        kind: "source_for",
        sourceResourceId: "sentry:project:1",
        targetResourceId: "vercel:project:p",
      }),
    ).toBe(false);
  });
});
