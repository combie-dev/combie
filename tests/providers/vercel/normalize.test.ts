import { describe, expect, test } from "bun:test";
import { normalizeProject, VERCEL_PROVIDER } from "../../../src/providers/vercel/normalize.ts";
import { resourceId } from "../../../src/domain/resource.ts";
import type { VercelProject } from "../../../src/providers/vercel/client.ts";
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
