import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncSentryCodeMappings } from "../../src/app/sentry-code-mappings.ts";
import { syncSentryIssues } from "../../src/app/sentry-issues.ts";
import { syncSentryReleases } from "../../src/app/sentry-releases.ts";
import { createResource } from "../../src/domain/resource.ts";
import mappingsFixture from "../providers/sentry/fixtures/code-mappings.json";
import issuesFixture from "../providers/sentry/fixtures/issues.json";
import releasesFixture from "../providers/sentry/fixtures/releases.json";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-sentry-map-sync-"));
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

describe("syncSentryCodeMappings", () => {
  test("success persists GitHub mappings without Resource Changes", async () => {
    const store = new Store(dir);
    store.init();
    const project = projectResource();
    store.applyResource(project, {
      id: "b1",
      observedAt: "2026-08-15T08:00:00.000Z",
    });

    const result = await syncSentryCodeMappings({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-15T16:00:00.000Z",
      fetch: (async () => Response.json(mappingsFixture)) as unknown as typeof fetch,
    });

    expect(result.refreshed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.upserted).toBe(1);
    const stored = store.getResource(project.id)!;
    expect(stored.metadata.codeMappings).toEqual([
      {
        mappingId: "11",
        sentryRepoId: "3",
        repository: "acme/combie",
        scmProvider: "github",
      },
    ]);
    expect(
      (stored.metadata.codeMappingRefresh as { status: string }).status,
    ).toBe("success");
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

    await syncSentryCodeMappings({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-15T12:00:00.000Z",
      fetch: (async () => Response.json([])) as unknown as typeof fetch,
    });
    expect(store.getResource(project.id)!.metadata.codeMappings).toEqual([]);

    await syncSentryCodeMappings({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-15T12:30:00.000Z",
      fetch: (async () =>
        Response.json(mappingsFixture)) as unknown as typeof fetch,
    });
    expect(
      (store.getResource(project.id)!.metadata.codeMappings as unknown[]).length,
    ).toBe(1);

    await syncSentryCodeMappings({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-15T13:00:00.000Z",
      fetch: (async () =>
        Response.json({ detail: "Forbidden" }, { status: 403 })) as unknown as typeof fetch,
    });
    const afterFail = store.getResource(project.id)!;
    expect(
      (afterFail.metadata.codeMappingRefresh as { status: string }).status,
    ).toBe("failure");
    expect(
      (afterFail.metadata.codeMappings as unknown[]).length,
    ).toBe(1);
    expect(store.listChanges()).toHaveLength(0);
    store.close();
  });

  test("release/issue success and mapping failure stay isolated", async () => {
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
      if (url.includes("/code-mappings")) {
        return Response.json({ detail: "Forbidden" }, { status: 403 });
      }
      if (url.includes("/issues")) return Response.json(issuesFixture);
      if (url.includes("/releases")) return Response.json(releasesFixture);
      return Response.json({ detail: "unexpected" }, { status: 500 });
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
    const mapping = await syncSentryCodeMappings({
      store,
      token: "token",
      projects: [project],
      observedAt: "2026-08-15T16:00:00.000Z",
      fetch: fetchImpl,
    });

    expect(store.listSentryReleasesForResource(project.id).length).toBeGreaterThan(0);
    expect(store.listSentryIssuesForResource(project.id).length).toBeGreaterThan(0);
    expect(mapping.failed).toBe(1);
    expect(store.getResource(project.id)!.metadata.codeMappings).toBeUndefined();
    store.close();
  });
});
