import { describe, expect, test } from "bun:test";
import {
  composeGitHubIssueAuthority,
  githubRepositoryResourceId,
  normalizeGitHubIssue,
} from "../../../src/providers/github/issue.ts";
import issuesFixture from "./fixtures/issues.json";

const OBSERVED = "2026-08-24T16:00:00.000Z";
const REPO_ID = "915052094";

describe("normalizeGitHubIssue", () => {
  test("maps compact identity, binds omitted repository, drops title/body", () => {
    const raw = issuesFixture[0]!;
    const evidence = normalizeGitHubIssue(raw, REPO_ID, OBSERVED);
    expect(evidence).not.toBeNull();
    expect(evidence!.provider).toBe("github");
    expect(evidence!.issueId).toBe(180000001);
    expect(evidence!.number).toBe(42);
    expect(evidence!.state).toBe("open");
    expect(evidence!.repositoryId).toBe(REPO_ID);
    expect(evidence!.resourceId).toBe(githubRepositoryResourceId(REPO_ID));
    expect(evidence!.resourceId).toBe("github:repository:915052094");
    expect(evidence!.createdAt).toBe("2026-08-20T10:00:00.000Z");
    expect(evidence!.updatedAt).toBe("2026-08-24T15:00:00.000Z");
    expect(evidence!.closedAt).toBeNull();
    expect(evidence!.observedAt).toBe(OBSERVED);
    expect(Object.keys(evidence!).sort()).toEqual(
      [
        "closedAt",
        "createdAt",
        "issueId",
        "number",
        "observedAt",
        "provider",
        "repositoryId",
        "resourceId",
        "state",
        "updatedAt",
      ].sort(),
    );
  });

  test("keeps closed issue with matching repository.id", () => {
    const evidence = normalizeGitHubIssue(issuesFixture[1]!, REPO_ID, OBSERVED)!;
    expect(evidence.issueId).toBe(180000002);
    expect(evidence.state).toBe("closed");
    expect(evidence.closedAt).toBe("2026-08-23T12:00:00.000Z");
    expect(evidence.repositoryId).toBe(REPO_ID);
  });

  test("PR rows with pull_request normalize to null", () => {
    expect(normalizeGitHubIssue(issuesFixture[2]!, REPO_ID, OBSERVED)).toBeNull();
    expect(
      normalizeGitHubIssue(
        {
          id: 9,
          number: 9,
          created_at: "2026-08-20T10:00:00Z",
          pull_request: true,
        },
        REPO_ID,
        OBSERVED,
      ),
    ).toBeNull();
  });

  test("rejects missing id, number, or created_at", () => {
    expect(
      normalizeGitHubIssue(issuesFixture[3]!, REPO_ID, OBSERVED),
    ).toBeNull();
    expect(
      normalizeGitHubIssue(
        { id: 1, created_at: "2026-08-20T10:00:00Z" },
        REPO_ID,
        OBSERVED,
      ),
    ).toBeNull();
    expect(
      normalizeGitHubIssue({ id: 1, number: 1 }, REPO_ID, OBSERVED),
    ).toBeNull();
  });

  test("rejects listed repository.id that does not match expected", () => {
    expect(
      normalizeGitHubIssue(
        {
          id: 1,
          number: 1,
          created_at: "2026-08-20T10:00:00Z",
          repository: { id: 999 },
        },
        REPO_ID,
        OBSERVED,
      ),
    ).toBeNull();
  });

  test("excludes title, body, comments, user, labels, and secrets", () => {
    const evidence = normalizeGitHubIssue(issuesFixture[0]!, REPO_ID, OBSERVED)!;
    const json = JSON.stringify(evidence);
    expect(json).not.toContain("title");
    expect(json).not.toContain("Release workflow");
    expect(json).not.toContain("ghp_should_not_store");
    expect(json).not.toContain("secret@example.com");
    expect(json).not.toContain("secret-user");
    expect(json).not.toContain("html_url");
    expect(json).not.toContain("pull_request");
    expect(json).not.toContain("comments");
  });
});

describe("composeGitHubIssueAuthority", () => {
  const base = {
    provider: "github" as const,
    issueId: 1,
    resourceId: "github:repository:1",
    repositoryId: "1",
    number: 1,
    state: "open",
    createdAt: "2026-08-20T10:00:00.000Z",
    updatedAt: "2026-08-24T15:00:00.000Z",
    closedAt: null,
    observedAt: OBSERVED,
  };

  test("not_applicable for non-GitHub repository resources", () => {
    expect(
      composeGitHubIssueAuthority("sentry", "project", null, []).kind,
    ).toBe("not_applicable");
    expect(
      composeGitHubIssueAuthority("github", "project", null, []).kind,
    ).toBe("not_applicable");
  });

  test("unknown when never refreshed", () => {
    expect(
      composeGitHubIssueAuthority("github", "repository", null, []).kind,
    ).toBe("unknown");
  });

  test("empty vs populated vs failed refresh with stale rows", () => {
    expect(
      composeGitHubIssueAuthority(
        "github",
        "repository",
        {
          resourceId: "github:repository:1",
          status: "success",
          observedAt: OBSERVED,
          message: null,
          resultCount: null,
          lastSuccessfulObservedAt: null,
        },
        [],
      ).kind,
    ).toBe("empty");

    const populated = composeGitHubIssueAuthority(
      "github",
      "repository",
      {
        resourceId: "github:repository:1",
        status: "success",
        observedAt: OBSERVED,
        message: null,
        resultCount: null,
        lastSuccessfulObservedAt: null,
      },
      [base],
    );
    expect(populated.kind).toBe("populated");

    const failed = composeGitHubIssueAuthority(
      "github",
      "repository",
      {
        resourceId: "github:repository:1",
        status: "failure",
        observedAt: OBSERVED,
        message: "403 forbidden",
        resultCount: null,
        lastSuccessfulObservedAt: null,
      },
      [base],
    );
    expect(failed.kind).toBe("unknown");
    if (failed.kind === "unknown") {
      expect(failed.issues).toHaveLength(1);
      expect(failed.message).toContain("403");
    }
  });

  test("result_count distinguishes empty/bounded success and failure", () => {
    const emptyWithHistory = composeGitHubIssueAuthority(
      "github",
      "repository",
      {
        resourceId: "github:repository:1",
        status: "success",
        observedAt: OBSERVED,
        message: null,
        resultCount: 0,
        lastSuccessfulObservedAt: null,
      },
      [base],
    );
    expect(emptyWithHistory.kind).toBe("empty");
    if (emptyWithHistory.kind === "empty") {
      expect(emptyWithHistory.resultCount).toBe(0);
      expect(emptyWithHistory.issues).toHaveLength(1);
    }

    const bounded = composeGitHubIssueAuthority(
      "github",
      "repository",
      {
        resourceId: "github:repository:1",
        status: "success",
        observedAt: OBSERVED,
        message: null,
        resultCount: 100,
        lastSuccessfulObservedAt: null,
      },
      [base],
    );
    expect(bounded.kind).toBe("populated");
    if (bounded.kind === "populated") {
      expect(bounded.resultCount).toBe(100);
      expect(bounded.issues).toHaveLength(1);
    }

    const failed = composeGitHubIssueAuthority(
      "github",
      "repository",
      {
        resourceId: "github:repository:1",
        status: "failure",
        observedAt: OBSERVED,
        message: "rate limited",
        resultCount: 3,
        lastSuccessfulObservedAt: null,
      },
      [base],
    );
    expect(failed.kind).toBe("unknown");
    if (failed.kind === "unknown") {
      expect(failed.resultCount).toBe(3);
    }
  });
});
