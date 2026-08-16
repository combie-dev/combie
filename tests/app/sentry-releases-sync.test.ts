import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncSentryReleases } from "../../src/app/sentry-releases.ts";
import { createResource } from "../../src/domain/resource.ts";
import releasesFixture from "../providers/sentry/fixtures/releases.json";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-sentry-rel-sync-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function projectResource() {
  return createResource({
    provider: "sentry",
    providerResourceId: "450",
    kind: "project",
    name: "combie",
    metadata: { slug: "combie", organization_slug: "acme" },
  });
}

describe("syncSentryReleases", () => {
  test("success persists exact project releases without Resource Changes", async () => {
    const store = new Store(dir);
    store.init();
    const project = projectResource();
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });

    const result = await syncSentryReleases({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () => Response.json(releasesFixture)) as unknown as typeof fetch,
    });

    expect(result.refreshed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.upserted).toBe(2);
    expect(result.lines.join("\n")).toContain("bound: ≤100 most-recent releases each");
    const list = store.listSentryReleasesForResource(project.id);
    expect(list).toHaveLength(2);
    expect(list.every((item) => item.resourceId === project.id)).toBe(true);
    expect(store.getSentryReleaseRefresh(project.id)?.status).toBe("success");
    expect(store.getSentryReleaseRefresh(project.id)?.resultCount).toBe(2);
    expect(store.listChanges()).toHaveLength(0);
    store.close();
  });

  test("known-empty success and failure retain/unknown semantics", async () => {
    const store = new Store(dir);
    store.init();
    const project = projectResource();
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });

    await syncSentryReleases({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () => Response.json([])) as unknown as typeof fetch,
    });
    expect(store.getSentryReleaseRefresh(project.id)?.status).toBe("success");
    expect(store.getSentryReleaseRefresh(project.id)?.resultCount).toBe(0);
    expect(store.listSentryReleasesForResource(project.id)).toEqual([]);

    await syncSentryReleases({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T12:30:00.000Z",
      fetch: (async () => Response.json(releasesFixture)) as unknown as typeof fetch,
    });
    expect(store.countSentryReleases()).toBe(2);

    await syncSentryReleases({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T13:00:00.000Z",
      fetch: (async () =>
        Response.json({ detail: "Forbidden" }, { status: 403 })) as unknown as typeof fetch,
    });
    expect(store.getSentryReleaseRefresh(project.id)?.status).toBe("failure");
    expect(store.getSentryReleaseRefresh(project.id)?.resultCount).toBe(2);
    expect(store.countSentryReleases()).toBe(2);
    store.close();
  });

  test("missing organization slug fails refresh without inventing empty", async () => {
    const store = new Store(dir);
    store.init();
    const project = createResource({
      provider: "sentry",
      providerResourceId: "450",
      kind: "project",
      name: "combie",
      metadata: { slug: "combie" },
    });
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    const result = await syncSentryReleases({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () => {
        throw new Error("network must not be used");
      }) as unknown as typeof fetch,
    });
    expect(result.failed).toBe(1);
    expect(store.getSentryReleaseRefresh(project.id)?.status).toBe("failure");
    expect(store.getSentryReleaseRefresh(project.id)?.resultCount).toBeNull();
    store.close();
  });

  test("repeated sync is idempotent", async () => {
    const store = new Store(dir);
    store.init();
    const project = projectResource();
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    const fetchImpl = (async () =>
      Response.json(releasesFixture)) as unknown as typeof fetch;
    await syncSentryReleases({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: fetchImpl,
    });
    await syncSentryReleases({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T13:00:00.000Z",
      fetch: fetchImpl,
    });
    expect(store.countSentryReleases()).toBe(2);
    store.close();
  });

  test("does not touch unrelated provider evidence", async () => {
    const store = new Store(dir);
    store.init();
    const project = projectResource();
    const repo = createResource({
      provider: "github",
      providerResourceId: "1",
      kind: "repository",
      name: "demo",
      metadata: { fullName: "acme/demo" },
    });
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    store.applyResource(repo, {
      id: "b2",
      observedAt: "2026-08-09T08:00:00.000Z",
    });
    await syncSentryReleases({
      store,
      token: "token",
      projects: [project, repo],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () => Response.json(releasesFixture)) as unknown as typeof fetch,
    });
    expect(store.countSentryReleases()).toBe(2);
    expect(store.countGitHubWorkflowRuns()).toBe(0);
    expect(store.listChanges()).toHaveLength(0);
    store.close();
  });

  test("Sprint 046: full SHA in lastCommit.id persists without Changes or refresh failure", async () => {
    const sha = "abc123def4567890abc123def4567890abc123de";
    const store = new Store(dir);
    store.init();
    const project = projectResource();
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-09T08:00:00.000Z",
    });

    const payload = [
      {
        id: 20,
        version: "frontend@2.0.0",
        shortVersion: "2.0.0",
        status: "open",
        dateCreated: "2026-08-10T12:00:00Z",
        dateReleased: null,
        lastCommit: {
          id: sha,
          message: "ship it",
          author: { email: "ada@example.com" },
        },
        projects: [{ id: 450, slug: "combie", name: "combie" }],
      },
    ];
    const result = await syncSentryReleases({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-09T12:00:00.000Z",
      fetch: (async () => Response.json(payload)) as unknown as typeof fetch,
    });

    expect(result.refreshed).toBe(1);
    expect(result.failed).toBe(0);
    const list = store.listSentryReleasesForResource(project.id);
    expect(list).toHaveLength(1);
    expect(list[0]!.gitCommitSha).toBe(sha);
    expect(store.getSentryReleaseRefresh(project.id)?.status).toBe("success");
    expect(store.getSentryReleaseRefresh(project.id)?.resultCount).toBe(1);
    expect(store.listChanges()).toHaveLength(0);
    store.close();
  });
});
