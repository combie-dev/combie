import { describe, expect, test } from "bun:test";
import { normalizeRepository } from "../../../src/providers/github/normalize.ts";
import type { GitHubRepository } from "../../../src/providers/github/client.ts";
import reposFixture from "./fixtures/repos.json";

describe("normalizeRepository", () => {
  test("maps GitHub repository fields into Resource model", () => {
    const repo = reposFixture[0] as GitHubRepository;
    const resource = normalizeRepository(repo);

    expect(resource.provider).toBe("github");
    expect(resource.kind).toBe("repository");
    expect(resource.providerResourceId).toBe("1001");
    expect(resource.id).toBe("github:repository:1001");
    expect(resource.name).toBe("combie");
    expect(resource.metadata).toMatchObject({
      owner: "example-user",
      fullName: "example-user/combie",
      visibility: "private",
      private: true,
      defaultBranch: "master",
      archived: false,
      htmlUrl: "https://github.com/example-user/combie",
      language: "TypeScript",
    });
  });

  test("uses stable GitHub numeric id (rename-safe identity)", () => {
    const before = normalizeRepository(reposFixture[0] as GitHubRepository);
    const renamed: GitHubRepository = {
      ...(reposFixture[0] as GitHubRepository),
      name: "combie-renamed",
      full_name: "example-user/combie-renamed",
    };
    const after = normalizeRepository(renamed);

    expect(after.id).toBe(before.id);
    expect(after.providerResourceId).toBe(before.providerResourceId);
    expect(after.name).toBe("combie-renamed");
  });

  test("omits language when null/missing", () => {
    const resource = normalizeRepository(reposFixture[2] as GitHubRepository);
    expect(resource.metadata.language).toBeUndefined();
    expect(resource.metadata.archived).toBe(true);
  });

  test("derives visibility from private when visibility absent", () => {
    const repo: GitHubRepository = {
      id: 9,
      name: "pub",
      full_name: "acme/pub",
      private: false,
      html_url: "https://github.com/acme/pub",
      owner: { login: "acme" },
    };
    const resource = normalizeRepository(repo);
    expect(resource.metadata.visibility).toBe("public");
    expect(resource.metadata.private).toBe(false);
  });
});
