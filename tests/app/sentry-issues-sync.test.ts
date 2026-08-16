import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncSentryIssues } from "../../src/app/sentry-issues.ts";
import { syncSentryReleases } from "../../src/app/sentry-releases.ts";
import { createResource } from "../../src/domain/resource.ts";
import issuesFixture from "../providers/sentry/fixtures/issues.json";
import releasesFixture from "../providers/sentry/fixtures/releases.json";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-sentry-iss-sync-"));
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

describe("syncSentryIssues", () => {
  test("success persists exact project issues without Resource Changes", async () => {
    const store = new Store(dir);
    store.init();
    const project = projectResource();
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-15T08:00:00.000Z",
    });

    const result = await syncSentryIssues({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-15T16:00:00.000Z",
      fetch: (async () => Response.json(issuesFixture)) as unknown as typeof fetch,
    });

    expect(result.refreshed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.upserted).toBe(2);
    expect(result.lines.join("\n")).toContain(
      "bound: ≤100 most-recently-seen issues each",
    );
    const list = store.listSentryIssuesForResource(project.id);
    expect(list).toHaveLength(2);
    expect(store.getSentryIssueRefresh(project.id)?.status).toBe("success");
    expect(store.listChanges()).toHaveLength(0);
    store.close();
  });

  test("known-empty success and failure retain/unknown semantics", async () => {
    const store = new Store(dir);
    store.init();
    const project = projectResource();
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-15T08:00:00.000Z",
    });

    await syncSentryIssues({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-15T12:00:00.000Z",
      fetch: (async () => Response.json([])) as unknown as typeof fetch,
    });
    expect(store.getSentryIssueRefresh(project.id)?.status).toBe("success");
    expect(store.getSentryIssueRefresh(project.id)?.resultCount).toBe(0);
    expect(store.listSentryIssuesForResource(project.id)).toEqual([]);

    await syncSentryIssues({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-15T12:30:00.000Z",
      fetch: (async () => Response.json(issuesFixture)) as unknown as typeof fetch,
    });
    expect(store.countSentryIssues()).toBe(2);

    await syncSentryIssues({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-15T13:00:00.000Z",
      fetch: (async () =>
        Response.json({ detail: "Forbidden" }, { status: 403 })) as unknown as typeof fetch,
    });
    expect(store.getSentryIssueRefresh(project.id)?.status).toBe("failure");
    expect(store.getSentryIssueRefresh(project.id)?.resultCount).toBe(2);
    expect(store.countSentryIssues()).toBe(2);
    store.close();
  });

  test("release refresh success and issue refresh failure stay isolated", async () => {
    const store = new Store(dir);
    store.init();
    const project = projectResource();
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-15T08:00:00.000Z",
    });

    const fetchImpl = ((input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.includes("/releases")) {
        return Response.json(releasesFixture);
      }
      if (url.includes("/issues")) {
        return Response.json({ detail: "Forbidden" }, { status: 403 });
      }
      throw new Error(`unexpected url: ${url}`);
    }) as unknown as typeof fetch;

    await syncSentryReleases({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-15T16:00:00.000Z",
      fetch: fetchImpl,
    });
    await syncSentryIssues({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-15T16:00:00.000Z",
      fetch: fetchImpl,
    });

    expect(store.getSentryReleaseRefresh(project.id)?.status).toBe("success");
    expect(store.getSentryReleaseRefresh(project.id)?.resultCount).toBeGreaterThan(0);
    expect(store.getSentryIssueRefresh(project.id)?.status).toBe("failure");
    expect(store.countSentryReleases()).toBeGreaterThan(0);
    expect(store.countSentryIssues()).toBe(0);
    expect(store.listChanges()).toHaveLength(0);
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
      observedAt: "2026-08-15T08:00:00.000Z",
    });
    store.applyResource(repo, {
      id: "b2",
      observedAt: "2026-08-15T08:00:00.000Z",
    });
    await syncSentryIssues({
      store,
      token: "token",
      projects: [project, repo],
      observedAt: "2026-08-15T16:00:00.000Z",
      fetch: (async () => Response.json(issuesFixture)) as unknown as typeof fetch,
    });
    expect(store.countSentryIssues()).toBe(2);
    expect(store.countGitHubWorkflowRuns()).toBe(0);
    expect(store.listChanges()).toHaveLength(0);
    store.close();
  });

  test("missing organization_slug is failure not known-empty", async () => {
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
      observedAt: "2026-08-15T08:00:00.000Z",
    });
    const result = await syncSentryIssues({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-15T16:00:00.000Z",
      fetch: (async () => Response.json(issuesFixture)) as unknown as typeof fetch,
    });
    expect(result.failed).toBe(1);
    expect(store.getSentryIssueRefresh(project.id)?.status).toBe("failure");
    expect(store.countSentryIssues()).toBe(0);
    store.close();
  });
});
