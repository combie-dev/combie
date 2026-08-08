import { describe, expect, test } from "bun:test";
import {
  normalizeProject,
  SENTRY_PROVIDER,
} from "../../../src/providers/sentry/normalize.ts";
import { resourceId } from "../../../src/domain/resource.ts";
import type { SentryProject } from "../../../src/providers/sentry/client.ts";
import projectsFixture from "./fixtures/projects.json";

describe("normalizeProject (Sentry)", () => {
  test("maps Sentry project fields into Resource model", () => {
    const project = projectsFixture[0] as SentryProject;
    const resource = normalizeProject(project);

    expect(resource.provider).toBe("sentry");
    expect(resource.kind).toBe("project");
    expect(resource.providerResourceId).toBe("450");
    expect(resource.id).toBe("sentry:project:450");
    expect(resource.name).toBe("combie");
    expect(resource.metadata).toMatchObject({
      slug: "combie",
      organization_slug: "acme",
      organization_id: "1",
      platform: "javascript-nextjs",
      status: "active",
      dateCreated: "2024-01-01T00:00:00.000Z",
    });
  });

  test("uses stable Sentry project id (rename/slug-change safe)", () => {
    const before = normalizeProject(projectsFixture[0] as SentryProject);
    const renamed: SentryProject = {
      ...(projectsFixture[0] as SentryProject),
      name: "combie-renamed",
      slug: "combie-renamed",
    };
    const after = normalizeProject(renamed);

    expect(after.id).toBe(before.id);
    expect(after.providerResourceId).toBe(before.providerResourceId);
    expect(after.name).toBe("combie-renamed");
    expect(after.metadata.slug).toBe("combie-renamed");
  });

  test("omits optional metadata when missing", () => {
    const project: SentryProject = {
      id: "999",
      slug: "minimal",
      name: "minimal",
    };
    const resource = normalizeProject(project);
    expect(resource.id).toBe("sentry:project:999");
    expect(resource.metadata.slug).toBe("minimal");
    expect(resource.metadata.platform).toBeUndefined();
    expect(resource.metadata.status).toBeUndefined();
    expect(resource.metadata.dateCreated).toBeUndefined();
    expect(resource.metadata.organization_slug).toBeUndefined();
    expect(resource.metadata.organization_id).toBeUndefined();
  });

  test("falls back to slug when name is empty", () => {
    const project: SentryProject = {
      id: "100",
      slug: "slug-only",
      name: "",
    };
    const resource = normalizeProject(project);
    expect(resource.name).toBe("slug-only");
  });

  test("identity collision: vercel project and sentry project with same id stay distinct", () => {
    const sharedId = "450";
    const vercelId = resourceId("vercel", "project", sharedId);
    const sentryId = resourceId(SENTRY_PROVIDER, "project", sharedId);

    expect(vercelId).toBe("vercel:project:450");
    expect(sentryId).toBe("sentry:project:450");
    expect(vercelId).not.toBe(sentryId);

    const sentryResource = normalizeProject({
      id: sharedId,
      slug: "shared",
      name: "shared",
    });
    expect(sentryResource.id).toBe(sentryId);
    expect(sentryResource.id).not.toBe(vercelId);
  });
});
