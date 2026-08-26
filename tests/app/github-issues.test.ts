import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncGitHubIssues } from "../../src/app/github-issues.ts";
import { composeGitHubIssueAuthority } from "../../src/providers/github/issue.ts";
import { createResource } from "../../src/domain/resource.ts";
import issuesFixture from "../providers/github/fixtures/issues.json";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-gh-issues-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function repoResource() {
  return createResource({
    provider: "github",
    providerResourceId: "915052094",
    kind: "repository",
    name: "demo",
    metadata: { fullName: "acme/demo", owner: "acme" },
  });
}

describe("syncGitHubIssues", () => {
  test("success populates issues and drops PRs / missing id", async () => {
    const store = new Store(dir);
    store.init();
    const repo = repoResource();
    store.applyResource(repo, {
      id: "b1",
      observedAt: "2026-08-24T08:00:00.000Z",
    });

    const result = await syncGitHubIssues({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-24T16:00:00.000Z",
      fetch: (async () =>
        Response.json(issuesFixture)) as unknown as typeof fetch,
    });

    expect(result.refreshed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.upserted).toBe(2);
    const list = store.listGitHubIssuesForResource(repo.id);
    expect(list).toHaveLength(2);
    expect(list.map((i) => i.issueId)).toEqual([180000001, 180000002]);
    expect(list.every((i) => i.resourceId === repo.id)).toBe(true);
    expect(JSON.stringify(list)).not.toContain("ghp_should_not_store");
    expect(JSON.stringify(list)).not.toContain("title");
    expect(store.getGitHubIssueRefresh(repo.id)?.status).toBe("success");
    expect(store.getGitHubIssueRefresh(repo.id)?.resultCount).toBe(2);
    expect(store.listChanges()).toHaveLength(0);
    const authority = composeGitHubIssueAuthority(
      "github",
      "repository",
      store.getGitHubIssueRefresh(repo.id),
      list,
    );
    expect(authority.kind).toBe("populated");
    store.close();
  });

  test("success empty: authority empty, resultCount 0", async () => {
    const store = new Store(dir);
    store.init();
    const repo = repoResource();
    store.applyResource(repo, {
      id: "b1",
      observedAt: "2026-08-24T08:00:00.000Z",
    });

    const result = await syncGitHubIssues({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-24T16:00:00.000Z",
      fetch: (async () => Response.json([])) as unknown as typeof fetch,
    });

    expect(result.refreshed).toBe(1);
    expect(result.upserted).toBe(0);
    expect(store.listGitHubIssuesForResource(repo.id)).toEqual([]);
    expect(store.getGitHubIssueRefresh(repo.id)?.status).toBe("success");
    expect(store.getGitHubIssueRefresh(repo.id)?.resultCount).toBe(0);
    const authority = composeGitHubIssueAuthority(
      "github",
      "repository",
      store.getGitHubIssueRefresh(repo.id),
      store.listGitHubIssuesForResource(repo.id),
    );
    expect(authority.kind).toBe("empty");
    if (authority.kind === "empty") {
      expect(authority.resultCount).toBe(0);
    }
    store.close();
  });

  test("failure retains prior rows and lastSuccessfulObservedAt", async () => {
    const store = new Store(dir);
    store.init();
    const repo = repoResource();
    store.applyResource(repo, {
      id: "b1",
      observedAt: "2026-08-24T08:00:00.000Z",
    });

    await syncGitHubIssues({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-24T16:00:00.000Z",
      fetch: (async () =>
        Response.json(issuesFixture)) as unknown as typeof fetch,
    });
    expect(store.countGitHubIssues()).toBe(2);
    expect(store.getGitHubIssueRefresh(repo.id)?.lastSuccessfulObservedAt).toBe(
      "2026-08-24T16:00:00.000Z",
    );

    await syncGitHubIssues({
      store,
      token: "token",
      repositories: [repo],
      observedAt: "2026-08-24T17:00:00.000Z",
      fetch: (async () =>
        Response.json(
          { message: "Forbidden" },
          { status: 403 },
        )) as unknown as typeof fetch,
    });

    expect(store.getGitHubIssueRefresh(repo.id)?.status).toBe("failure");
    expect(store.getGitHubIssueRefresh(repo.id)?.observedAt).toBe(
      "2026-08-24T17:00:00.000Z",
    );
    expect(store.getGitHubIssueRefresh(repo.id)?.resultCount).toBe(2);
    expect(store.getGitHubIssueRefresh(repo.id)?.lastSuccessfulObservedAt).toBe(
      "2026-08-24T16:00:00.000Z",
    );
    expect(store.countGitHubIssues()).toBe(2);
    expect(store.listGitHubIssuesForResource(repo.id)).toHaveLength(2);
    const authority = composeGitHubIssueAuthority(
      "github",
      "repository",
      store.getGitHubIssueRefresh(repo.id),
      store.listGitHubIssuesForResource(repo.id),
    );
    expect(authority.kind).toBe("unknown");
    if (authority.kind === "unknown") {
      expect(authority.issues).toHaveLength(2);
      expect(authority.lastSuccessAt).toBe("2026-08-24T16:00:00.000Z");
    }
    store.close();
  });

  test("lists most-recently-updated first with issue_id tie-break", async () => {
    const store = new Store(dir);
    store.init();
    const repo = repoResource();
    store.upsertGitHubIssue({
      provider: "github",
      issueId: 1,
      resourceId: repo.id,
      repositoryId: repo.providerResourceId,
      number: 1,
      state: "open",
      createdAt: "2026-08-20T10:00:00.000Z",
      updatedAt: "2026-08-24T12:00:00.000Z",
      closedAt: null,
      observedAt: "2026-08-24T16:00:00.000Z",
    });
    store.upsertGitHubIssue({
      provider: "github",
      issueId: 3,
      resourceId: repo.id,
      repositoryId: repo.providerResourceId,
      number: 3,
      state: "open",
      createdAt: "2026-08-20T10:00:00.000Z",
      updatedAt: "2026-08-24T15:00:00.000Z",
      closedAt: null,
      observedAt: "2026-08-24T16:00:00.000Z",
    });
    store.upsertGitHubIssue({
      provider: "github",
      issueId: 2,
      resourceId: repo.id,
      repositoryId: repo.providerResourceId,
      number: 2,
      state: "closed",
      createdAt: "2026-08-20T10:00:00.000Z",
      updatedAt: "2026-08-24T15:00:00.000Z",
      closedAt: "2026-08-24T15:00:00.000Z",
      observedAt: "2026-08-24T16:00:00.000Z",
    });
    expect(
      store.listGitHubIssuesForResource(repo.id).map((i) => i.issueId),
    ).toEqual([3, 2, 1]);
    store.close();
  });
});
