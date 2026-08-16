import { describe, expect, test } from "bun:test";
import { createResource } from "../../../src/domain/resource.ts";
import {
  composeCodeMappingAuthority,
  normalizeSentryCodeMapping,
  scmProviderKeyFromMapping,
} from "../../../src/providers/sentry/code-mapping.ts";
import fixture from "./fixtures/code-mappings.json";

describe("normalizeSentryCodeMapping", () => {
  test("keeps GitHub mappings with exact project id and owner/repo", () => {
    const fact = normalizeSentryCodeMapping(fixture[0], "450");
    expect(fact).toEqual({
      mappingId: "11",
      sentryRepoId: "3",
      repository: "acme/combie",
      scmProvider: "github",
    });
  });

  test("drops GitLab and unknown SCM", () => {
    expect(normalizeSentryCodeMapping(fixture[1], "450")).toBeNull();
    expect(
      normalizeSentryCodeMapping(
        { ...fixture[0], provider: { key: "bitbucket" } },
        "450",
      ),
    ).toBeNull();
    expect(
      normalizeSentryCodeMapping({ ...fixture[0], provider: undefined }, "450"),
    ).toBeNull();
  });

  test("rejects wrong project id (no slug matching)", () => {
    expect(normalizeSentryCodeMapping(fixture[0], "999")).toBeNull();
    expect(
      normalizeSentryCodeMapping(
        { ...fixture[0], projectId: "999", projectSlug: "combie" },
        "450",
      ),
    ).toBeNull();
  });

  test("rejects missing or non owner/repo names", () => {
    expect(
      normalizeSentryCodeMapping({ ...fixture[0], repoName: "combie" }, "450"),
    ).toBeNull();
    expect(
      normalizeSentryCodeMapping({ ...fixture[0], repoName: "" }, "450"),
    ).toBeNull();
  });

  test("excludes stack roots, source roots, default branch, and slugs", () => {
    const fact = normalizeSentryCodeMapping(fixture[0], "450");
    expect(fact).not.toBeNull();
    expect(fact).not.toHaveProperty("stackRoot");
    expect(fact).not.toHaveProperty("sourceRoot");
    expect(fact).not.toHaveProperty("defaultBranch");
    expect(fact).not.toHaveProperty("projectSlug");
    expect(fact?.repository).toBe("acme/combie");
  });

  test("uses githubRepoId only when Sentry supplies it", () => {
    const fact = normalizeSentryCodeMapping(
      { ...fixture[0], githubRepoId: "915052094" },
      "450",
    );
    expect(fact?.githubRepoId).toBe("915052094");
  });
});

describe("scmProviderKeyFromMapping", () => {
  test("reads provider.key and string providers", () => {
    expect(scmProviderKeyFromMapping({ key: "GitHub" })).toBe("github");
    expect(scmProviderKeyFromMapping("github")).toBe("github");
    expect(scmProviderKeyFromMapping({ provider: { key: "github" } })).toBe(
      "github",
    );
  });
});

describe("composeCodeMappingAuthority", () => {
  test("distinguishes not-applicable, unknown, empty, and populated", () => {
    expect(composeCodeMappingAuthority(null).kind).toBe("not_applicable");
    const github = createResource({
      provider: "github",
      providerResourceId: "1",
      kind: "repository",
      name: "combie",
      metadata: {},
    });
    expect(composeCodeMappingAuthority(github).kind).toBe("not_applicable");

    const bare = createResource({
      provider: "sentry",
      providerResourceId: "450",
      kind: "project",
      name: "combie",
      metadata: { organization_slug: "acme" },
    });
    expect(composeCodeMappingAuthority(bare).kind).toBe("unknown");

    const empty = createResource({
      provider: "sentry",
      providerResourceId: "450",
      kind: "project",
      name: "combie",
      metadata: {
        codeMappings: [],
        codeMappingRefresh: {
          status: "success",
          observedAt: "2026-08-15T16:00:00.000Z",
          message: null,
          resultCount: 0,
          lastSuccessfulObservedAt: "2026-08-15T16:00:00.000Z",
        },
      },
    });
    expect(composeCodeMappingAuthority(empty).kind).toBe("empty");

    const populated = createResource({
      provider: "sentry",
      providerResourceId: "450",
      kind: "project",
      name: "combie",
      metadata: {
        codeMappings: [
          {
            mappingId: "11",
            sentryRepoId: "3",
            repository: "acme/combie",
            scmProvider: "github",
          },
        ],
        codeMappingRefresh: {
          status: "success",
          observedAt: "2026-08-15T16:00:00.000Z",
          message: null,
          resultCount: 1,
          lastSuccessfulObservedAt: "2026-08-15T16:00:00.000Z",
        },
      },
    });
    expect(composeCodeMappingAuthority(populated).kind).toBe("populated");
  });
});
