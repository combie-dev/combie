import { describe, expect, test, afterEach, beforeEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initCombie } from "../../src/app/init.ts";
import { connectProvider } from "../../src/app/connect.ts";
import { syncProviders } from "../../src/app/sync.ts";
import { listRelationships } from "../../src/app/list.ts";
import { Store } from "../../src/storage/store.ts";
import { createRelationship } from "../../src/domain/relationship.ts";

function mockGitHubVercelFetch(options?: {
  githubFail?: boolean;
  vercelFail?: boolean;
  /** When true, Vercel project loses git link (for stale cleanup). */
  unlinkVercel?: boolean;
  /** Custom github repo id in Vercel link. */
  linkRepoId?: number;
}): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.includes("api.vercel.com")) {
      if (url.includes("/v2/user")) {
        if (options?.vercelFail) {
          return Response.json(
            { error: { message: "Invalid token", code: "unauthorized" } },
            { status: 403 },
          );
        }
        return Response.json({
          user: {
            id: "vercel_user_1",
            username: "test-vercel",
            email: "v@example.com",
          },
        });
      }
      if (url.includes("/v9/projects")) {
        if (options?.vercelFail) {
          return Response.json(
            { error: { message: "Forbidden", code: "forbidden" } },
            { status: 403 },
          );
        }
        const project: Record<string, unknown> = {
          id: "prj_linked",
          name: "web-app",
          framework: "nextjs",
          accountId: "team_1",
          createdAt: 1704067200000,
          updatedAt: 1706745600000,
        };
        if (!options?.unlinkVercel) {
          project.link = {
            type: "github",
            org: "test-user",
            repo: "combie",
            repoId: options?.linkRepoId ?? 1001,
            productionBranch: "main",
            gitCredentialId: "cred_1",
            deployHooks: [],
          };
        }
        return Response.json({
          projects: [
            project,
            {
              id: "prj_unlinked",
              name: "cli-only",
              accountId: "team_1",
              createdAt: 1704067200000,
            },
            {
              // Same project display name as a GitHub repo, but different git target
              id: "prj_name_collision",
              name: "combie",
              accountId: "team_1",
              link: {
                type: "github",
                org: "someone-else",
                repo: "combie",
                repoId: 9999,
                productionBranch: "main",
                gitCredentialId: "cred_2",
                deployHooks: [],
              },
            },
          ],
          pagination: { count: 3, next: null },
        });
      }
    }

    if (
      url.includes("api.github.com") ||
      (url.includes("/user") && !url.includes("api.vercel.com"))
    ) {
      if (
        url.endsWith("/user") ||
        (url.includes("/user") && !url.includes("/repos"))
      ) {
        if (options?.githubFail) {
          return Response.json({ message: "Bad credentials" }, { status: 401 });
        }
        return Response.json({ id: 42, login: "test-user", name: "Test User" });
      }
      if (url.includes("/user/repos") || url.includes("/repos")) {
        if (options?.githubFail) {
          return Response.json({ message: "Bad credentials" }, { status: 401 });
        }
        return Response.json([
          {
            id: 1001,
            name: "combie",
            full_name: "test-user/combie",
            private: true,
            html_url: "https://github.com/test-user/combie",
            default_branch: "master",
            archived: false,
            language: "TypeScript",
            visibility: "private",
            owner: { login: "test-user", id: 42 },
          },
          {
            id: 1002,
            name: "other",
            full_name: "test-user/other",
            private: false,
            html_url: "https://github.com/test-user/other",
            default_branch: "main",
            archived: false,
            language: "Go",
            visibility: "public",
            owner: { login: "test-user", id: 42 },
          },
        ]);
      }
    }

    return Response.json({ message: `unexpected ${url}` }, { status: 404 });
  }) as typeof fetch;
}

describe("GitHub↔Vercel relationship sync", () => {
  let dir: string;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "combie-rel-"));
    originalFetch = globalThis.fetch;
    globalThis.fetch = mockGitHubVercelFetch();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    rmSync(dir, { recursive: true, force: true });
  });

  async function connectBoth() {
    initCombie(dir);
    await connectProvider({
      baseDir: dir,
      providerId: "github",
      token: "gh-secret-token",
    });
    await connectProvider({
      baseDir: dir,
      providerId: "vercel",
      token: "vercel-secret-token",
    });
  }

  test("GitHub + Vercel success infers deterministic Relationship", async () => {
    await connectBoth();
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(sync.relationships?.refreshed).toBe(true);
    expect(sync.relationships?.inferred).toBe(1);
    expect(sync.message).toContain("source_for");
    expect(sync.message).not.toContain("gh-secret-token");
    expect(sync.message).not.toContain("vercel-secret-token");

    const { relationships } = listRelationships(dir);
    expect(relationships).toHaveLength(1);
    expect(relationships[0]!.kind).toBe("source_for");
    expect(relationships[0]!.sourceResourceId).toBe("github:repository:1001");
    expect(relationships[0]!.targetResourceId).toBe(
      "vercel:project:prj_linked",
    );
    expect(relationships[0]!.evidence.repository).toBe("test-user/combie");
    expect(relationships[0]!.evidence.githubRepoId).toBe("1001");
  });

  test("does not invent Relationship from name collision alone", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });
    const { relationships } = listRelationships(dir);
    // Only the repoId-matched project, not prj_name_collision named "combie"
    expect(relationships.every((r) => r.targetResourceId !== "vercel:project:prj_name_collision")).toBe(
      true,
    );
    expect(relationships).toHaveLength(1);
  });

  test("repeated sync does not duplicate Relationships", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });
    await syncProviders({ baseDir: dir });
    await syncProviders({ baseDir: dir });
    const { relationships } = listRelationships(dir);
    expect(relationships).toHaveLength(1);
    const store = new Store(dir);
    store.isInitialized();
    expect(store.listRelationships()).toHaveLength(1);
    store.close();
  });

  test("Relationships survive process restart", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });

    const store1 = new Store(dir);
    expect(store1.isInitialized()).toBe(true);
    expect(store1.listRelationships()).toHaveLength(1);
    const id = store1.listRelationships()[0]!.id;
    store1.close();

    const store2 = new Store(dir);
    expect(store2.isInitialized()).toBe(true);
    const again = store2.listRelationships();
    expect(again).toHaveLength(1);
    expect(again[0]!.id).toBe(id);
    store2.close();
  });

  test("stale inferred Relationship is removed when evidence disappears", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });
    expect(listRelationships(dir).relationships).toHaveLength(1);

    globalThis.fetch = mockGitHubVercelFetch({ unlinkVercel: true });
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(sync.relationships?.refreshed).toBe(true);
    expect(sync.relationships?.inferred).toBe(0);
    expect(sync.relationships?.removed).toBe(1);
    expect(listRelationships(dir).relationships).toHaveLength(0);
  });

  test("incomplete evidence does not destructively refresh", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });
    expect(listRelationships(dir).relationships).toHaveLength(1);

    // Vercel fails — must not delete existing relationship
    globalThis.fetch = mockGitHubVercelFetch({ vercelFail: true });
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(false);
    expect(sync.relationships?.refreshed).toBe(false);
    expect(listRelationships(dir).relationships).toHaveLength(1);

    // GitHub fails — same
    globalThis.fetch = mockGitHubVercelFetch({ githubFail: true });
    const sync2 = await syncProviders({ baseDir: dir });
    expect(sync2.ok).toBe(false);
    expect(sync2.relationships?.refreshed).toBe(false);
    expect(listRelationships(dir).relationships).toHaveLength(1);
  });

  test("single-provider sync does not refresh relationships", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });
    expect(listRelationships(dir).relationships).toHaveLength(1);

    // Inject a stale manual relationship of this path — single-provider sync
    // must not wipe it when the other side is not re-synced this run.
    const store = new Store(dir);
    store.isInitialized();
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: "github:repository:1002",
        targetResourceId: "vercel:project:prj_linked",
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "test-user/other",
          githubRepoId: "1002",
        },
      }),
    );
    store.close();
    expect(listRelationships(dir).relationships).toHaveLength(2);

    const syncGh = await syncProviders({ baseDir: dir, providerId: "github" });
    expect(syncGh.relationships?.refreshed).toBe(false);
    expect(listRelationships(dir).relationships).toHaveLength(2);
  });

  test("Resources and Relationships coexist", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });

    const store = new Store(dir);
    store.isInitialized();
    const resources = store.listResources();
    const rels = store.listRelationships();
    expect(resources.filter((r) => r.provider === "github").length).toBe(2);
    expect(resources.filter((r) => r.provider === "vercel").length).toBe(3);
    expect(rels).toHaveLength(1);
    store.close();
  });
});
