import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connectProvider } from "../../src/app/connect.ts";
import { initCombie } from "../../src/app/init.ts";
import {
  formatInvestigationContext,
  getInvestigationContext,
} from "../../src/app/investigate.ts";
import { composeInvestigationFacts } from "../../src/app/investigation-facts.ts";
import { listRelationships } from "../../src/app/list.ts";
import { composeMissingContext } from "../../src/app/missing-context.ts";
import { getRelatedContext } from "../../src/app/related.ts";
import { syncProviders } from "../../src/app/sync.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { Store } from "../../src/storage/store.ts";

function mockGitHubSentryFetch(options?: {
  githubFail?: boolean;
  sentryFail?: boolean;
  mappingFail?: boolean;
  mappings?: unknown[];
  unlinkMapping?: boolean;
}): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.includes("api.github.com") || (url.includes("/user") && !url.includes("sentry.io"))) {
      if (url.endsWith("/user") || (url.includes("/user") && !url.includes("/repos"))) {
        if (options?.githubFail) {
          return Response.json({ message: "Bad credentials" }, { status: 401 });
        }
        return Response.json({ id: 42, login: "acme", name: "Acme" });
      }
      if (url.includes("/actions/runs")) {
        return Response.json({ total_count: 0, workflow_runs: [] });
      }
      if (url.includes("/user/repos") || url.includes("/repos")) {
        if (options?.githubFail) {
          return Response.json({ message: "Bad credentials" }, { status: 401 });
        }
        return Response.json([
          {
            id: 1001,
            name: "combie",
            full_name: "acme/combie",
            private: true,
            html_url: "https://github.com/acme/combie",
            default_branch: "main",
            archived: false,
            language: "TypeScript",
            visibility: "private",
            owner: { login: "acme", id: 1 },
          },
        ]);
      }
    }

    if (url.includes("sentry.io")) {
      if (url.includes("/auth/") || url.endsWith("/auth")) {
        if (options?.sentryFail) {
          return Response.json({ detail: "Invalid token" }, { status: 401 });
        }
        return Response.json({
          id: "sentry_user_1",
          username: "sentry-tester",
        });
      }
      if (url.includes("/code-mappings")) {
        if (options?.mappingFail) {
          return Response.json({ detail: "Forbidden" }, { status: 403 });
        }
        if (options?.unlinkMapping) return Response.json([]);
        return Response.json(
          options?.mappings ?? [
            {
              id: "11",
              projectId: "450",
              projectSlug: "combie",
              repoId: "3",
              repoName: "acme/combie",
              provider: { key: "github", slug: "github", name: "GitHub" },
              stackRoot: "/",
              sourceRoot: "/",
              defaultBranch: "main",
            },
          ],
        );
      }
      if (url.includes("/issues")) return Response.json([]);
      if (url.includes("/releases")) return Response.json([]);
      if (url.includes("/organizations/") && url.includes("/projects")) {
        if (options?.sentryFail) {
          return Response.json({ detail: "Forbidden" }, { status: 403 });
        }
        return Response.json([
          {
            id: "450",
            slug: "combie",
            name: "combie",
            platform: "javascript",
            status: "active",
            organization: { id: "1", slug: "acme", name: "Acme" },
          },
        ]);
      }
      if (url.includes("/organizations")) {
        if (options?.sentryFail) {
          return Response.json({ detail: "Invalid token" }, { status: 401 });
        }
        return Response.json([{ id: "1", slug: "acme", name: "Acme" }]);
      }
    }

    return Response.json({ message: `unexpected ${url}` }, { status: 404 });
  }) as typeof fetch;
}

describe("GitHub↔Sentry code_mapped_to sync", () => {
  let dir: string;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "combie-gh-sentry-"));
    originalFetch = globalThis.fetch;
    globalThis.fetch = mockGitHubSentryFetch();
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
      providerId: "sentry",
      token: "sn-secret-token",
    });
  }

  test("GitHub + Sentry success infers code_mapped_to", async () => {
    await connectBoth();
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(sync.codeMappingRelationships?.refreshed).toBe(true);
    expect(sync.codeMappingRelationships?.inferred).toBe(1);
    expect(sync.message).toContain("1 GitHub → Sentry code_mapped_to");

    const { relationships } = listRelationships(dir);
    expect(relationships).toHaveLength(1);
    expect(relationships[0]!.kind).toBe("code_mapped_to");
    expect(relationships[0]!.sourceResourceId).toBe("github:repository:1001");
    expect(relationships[0]!.targetResourceId).toBe("sentry:project:450");
    expect(relationships[0]!.evidence.source).toBe("sentry");
    expect(relationships[0]!.evidence.mechanism).toBe("code_mapping");

    const store = new Store(dir);
    store.init();
    expect(store.listChanges()).toHaveLength(0);
    store.close();
  });

  test("Sentry-only sync does not refresh or stale-clean this kind", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });

    globalThis.fetch = mockGitHubSentryFetch({ unlinkMapping: true });
    const sentryOnly = await syncProviders({
      baseDir: dir,
      providerId: "sentry",
    });
    expect(sentryOnly.ok).toBe(true);
    expect(sentryOnly.codeMappingRelationships?.refreshed).toBe(false);

    const { relationships } = listRelationships(dir);
    expect(relationships).toHaveLength(1);
    expect(relationships[0]!.kind).toBe("code_mapped_to");
  });

  test("GitHub-only sync does not refresh this kind", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });
    const githubOnly = await syncProviders({
      baseDir: dir,
      providerId: "github",
    });
    expect(githubOnly.codeMappingRelationships?.refreshed).toBe(false);
    expect(listRelationships(dir).relationships).toHaveLength(1);
  });

  test("both succeed and empty mappings remove the stale edge", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });
    globalThis.fetch = mockGitHubSentryFetch({ unlinkMapping: true });
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(sync.codeMappingRelationships?.refreshed).toBe(true);
    expect(sync.codeMappingRelationships?.inferred).toBe(0);
    expect(sync.codeMappingRelationships?.removed).toBe(1);
    expect(listRelationships(dir).relationships).toHaveLength(0);
  });

  test("mapping refresh failure preserves prior edge", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });
    globalThis.fetch = mockGitHubSentryFetch({ mappingFail: true });
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.ok).toBe(true);
    expect(listRelationships(dir).relationships).toHaveLength(1);
  });

  test("does not touch source_for", async () => {
    await connectBoth();
    const store = new Store(dir);
    store.init();
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: "github:repository:1001",
        targetResourceId: "vercel:project:prj_x",
        kind: "source_for",
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "acme/combie",
        },
      }),
    );
    store.close();

    await syncProviders({ baseDir: dir });
    const kinds = listRelationships(dir).relationships.map((r) => r.kind).sort();
    expect(kinds).toEqual(["code_mapped_to", "source_for"]);
  });

  test("related and investigate surface the edge both ways", async () => {
    await connectBoth();
    await syncProviders({ baseDir: dir });

    const fromRepo = getRelatedContext({
      baseDir: dir,
      resourceRef: "github:repository:1001",
    });
    expect(fromRepo.related).toHaveLength(1);
    expect(fromRepo.related[0]!.relationship.kind).toBe("code_mapped_to");
    expect(fromRepo.related[0]!.direction).toBe("outbound");

    const fromProject = getRelatedContext({
      baseDir: dir,
      resourceRef: "sentry:project:450",
    });
    expect(fromProject.related[0]!.direction).toBe("inbound");

    const investigation = getInvestigationContext({
      baseDir: dir,
      resourceRef: "sentry:project:450",
    });
    const rendered = formatInvestigationContext(investigation);
    expect(rendered).toContain("code_mapped_to");
    expect(rendered).toContain("github:repository:1001");
    expect(rendered).not.toContain("caused");
    expect(rendered).not.toContain("CORRELATED");

    const facts = composeInvestigationFacts(investigation);
    const mappingFact = facts.find((f) => f.kind === "code_mapping_relationship");
    expect(mappingFact).toBeDefined();

    const missing = composeMissingContext(investigation);
    expect(
      missing.some((item) => item.kind === "no_deterministic_release_issue_linkage"),
    ).toBe(false);
    expect(missing.some((item) => item.kind === "no_known_relationships")).toBe(
      false,
    );
  });

  test("unmatched mapping is Missing Context, not a Relationship", async () => {
    globalThis.fetch = mockGitHubSentryFetch({
      mappings: [
        {
          id: "11",
          projectId: "450",
          repoId: "3",
          repoName: "someone/else",
          provider: { key: "github", slug: "github", name: "GitHub" },
        },
      ],
    });
    await connectBoth();
    const sync = await syncProviders({ baseDir: dir });
    expect(sync.codeMappingRelationships?.inferred).toBe(0);
    expect(listRelationships(dir).relationships).toHaveLength(0);

    const investigation = getInvestigationContext({
      baseDir: dir,
      resourceRef: "sentry:project:450",
    });
    const missing = composeMissingContext(investigation);
    const unmatched = missing.find(
      (item) => item.kind === "code_mapping_unmatched_repository",
    );
    expect(unmatched).toBeDefined();
    if (unmatched?.kind === "code_mapping_unmatched_repository") {
      expect(unmatched.repositories).toContain("someone/else");
    }
  });
});
