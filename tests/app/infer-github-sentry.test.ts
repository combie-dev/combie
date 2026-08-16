import { describe, expect, test } from "bun:test";
import {
  inferGitHubSentryRelationships,
  isGitHubSentryCodeMappedTo,
  matchGitHubRepositoryForMapping,
} from "../../src/app/infer-github-sentry.ts";
import { createResource } from "../../src/domain/resource.ts";
import type { SentryCodeMappingFact } from "../../src/providers/sentry/code-mapping.ts";

function githubRepo(opts: {
  id: string;
  name: string;
  fullName: string;
}) {
  return createResource({
    provider: "github",
    providerResourceId: opts.id,
    kind: "repository",
    name: opts.name,
    metadata: {
      owner: opts.fullName.split("/")[0],
      fullName: opts.fullName,
    },
  });
}

function sentryProject(opts: {
  id: string;
  name: string;
  mappings?: SentryCodeMappingFact[];
}) {
  const metadata: Record<string, unknown> = {
    slug: opts.name,
    organization_slug: "acme",
  };
  if (opts.mappings) {
    metadata.codeMappings = opts.mappings;
    metadata.codeMappingRefresh = {
      status: "success",
      observedAt: "2026-08-15T16:00:00.000Z",
      message: null,
      resultCount: opts.mappings.length,
      lastSuccessfulObservedAt: "2026-08-15T16:00:00.000Z",
    };
  }
  return createResource({
    provider: "sentry",
    providerResourceId: opts.id,
    kind: "project",
    name: opts.name,
    metadata,
  });
}

const mapping = (
  repository: string,
  extras?: Partial<SentryCodeMappingFact>,
): SentryCodeMappingFact => ({
  mappingId: "11",
  sentryRepoId: "3",
  repository,
  scmProvider: "github",
  ...extras,
});

describe("matchGitHubRepositoryForMapping", () => {
  const repos = [
    githubRepo({ id: "1001", name: "combie", fullName: "acme/combie" }),
    githubRepo({ id: "1002", name: "other", fullName: "acme/other" }),
  ];

  test("matches by githubRepoId when present", () => {
    const match = matchGitHubRepositoryForMapping(
      mapping("acme/combie", { githubRepoId: "1001" }),
      repos,
    );
    expect(match?.id).toBe("github:repository:1001");
  });

  test("does not match when githubRepoId points elsewhere even if fullName matches", () => {
    const match = matchGitHubRepositoryForMapping(
      mapping("acme/combie", { githubRepoId: "9999" }),
      repos,
    );
    expect(match).toBeNull();
  });

  test("falls back to exact fullName only when githubRepoId is absent", () => {
    const match = matchGitHubRepositoryForMapping(mapping("acme/other"), repos);
    expect(match?.id).toBe("github:repository:1002");
  });

  test("does not match display name or slug", () => {
    const match = matchGitHubRepositoryForMapping(mapping("combie"), repos);
    expect(match).toBeNull();
  });
});

describe("inferGitHubSentryRelationships", () => {
  test("creates one code_mapped_to edge from exact fullName evidence", () => {
    const resources = [
      githubRepo({ id: "1001", name: "combie", fullName: "acme/combie" }),
      sentryProject({
        id: "450",
        name: "combie",
        mappings: [mapping("acme/combie")],
      }),
    ];
    const rels = inferGitHubSentryRelationships(resources);
    expect(rels).toHaveLength(1);
    expect(rels[0]!.kind).toBe("code_mapped_to");
    expect(rels[0]!.sourceResourceId).toBe("github:repository:1001");
    expect(rels[0]!.targetResourceId).toBe("sentry:project:450");
    expect(rels[0]!.evidence).toMatchObject({
      source: "sentry",
      mechanism: "code_mapping",
      repository: "acme/combie",
      sentryRepoId: "3",
    });
    expect(isGitHubSentryCodeMappedTo(rels[0]!)).toBe(true);
  });

  test("collapses duplicate mappings to the same pair", () => {
    const resources = [
      githubRepo({ id: "1001", name: "combie", fullName: "acme/combie" }),
      sentryProject({
        id: "450",
        name: "combie",
        mappings: [mapping("acme/combie"), mapping("acme/combie", { mappingId: "99" })],
      }),
    ];
    expect(inferGitHubSentryRelationships(resources)).toHaveLength(1);
  });

  test("one repo to two projects produces two edges", () => {
    const resources = [
      githubRepo({ id: "1001", name: "combie", fullName: "acme/combie" }),
      sentryProject({
        id: "450",
        name: "combie",
        mappings: [mapping("acme/combie")],
      }),
      sentryProject({
        id: "451",
        name: "combie-api",
        mappings: [mapping("acme/combie")],
      }),
    ];
    const rels = inferGitHubSentryRelationships(resources);
    expect(rels).toHaveLength(2);
    expect(rels.map((r) => r.targetResourceId).sort()).toEqual([
      "sentry:project:450",
      "sentry:project:451",
    ]);
  });

  test("no GitHub inventory yields no edge", () => {
    const resources = [
      sentryProject({
        id: "450",
        name: "combie",
        mappings: [mapping("acme/combie")],
      }),
    ];
    expect(inferGitHubSentryRelationships(resources)).toEqual([]);
  });

  test("does not infer source_for or uses_domain_in", () => {
    const resources = [
      githubRepo({ id: "1001", name: "combie", fullName: "acme/combie" }),
      sentryProject({
        id: "450",
        name: "combie",
        mappings: [mapping("acme/combie")],
      }),
    ];
    const rels = inferGitHubSentryRelationships(resources);
    expect(rels.every((r) => r.kind === "code_mapped_to")).toBe(true);
  });

  test("omitted mappings mean unknown and produce no edge", () => {
    const resources = [
      githubRepo({ id: "1001", name: "combie", fullName: "acme/combie" }),
      sentryProject({ id: "450", name: "combie" }),
    ];
    expect(inferGitHubSentryRelationships(resources)).toEqual([]);
  });
});
