import { describe, expect, test } from "bun:test";
import {
  composeWorkflowRunAuthority,
  githubRepositoryResourceId,
  normalizeWorkflowRun,
  repositoryApiPathParts,
} from "../../../src/providers/github/workflow-run.ts";
import workflowRunsFixture from "./fixtures/workflow-runs.json";

const OBSERVED = "2026-08-09T12:00:00.000Z";
const REPO_ID = "915052094";

describe("normalizeWorkflowRun", () => {
  test("maps stable identity, exact Resource binding, status, conclusion, times", () => {
    const raw = workflowRunsFixture.workflow_runs[0]!;
    const evidence = normalizeWorkflowRun(raw, REPO_ID, OBSERVED);
    expect(evidence).not.toBeNull();
    expect(evidence!.provider).toBe("github");
    expect(evidence!.runId).toBe(9001);
    expect(evidence!.repositoryId).toBe(REPO_ID);
    expect(evidence!.resourceId).toBe(githubRepositoryResourceId(REPO_ID));
    expect(evidence!.resourceId).toBe("github:repository:915052094");
    expect(evidence!.workflowId).toBe(101);
    expect(evidence!.name).toBe("CI");
    expect(evidence!.runNumber).toBe(42);
    expect(evidence!.runAttempt).toBe(1);
    expect(evidence!.event).toBe("push");
    expect(evidence!.status).toBe("completed");
    expect(evidence!.conclusion).toBe("success");
    expect(evidence!.headBranch).toBe("main");
    expect(evidence!.headSha).toBe(
      "abc123def4567890abc123def4567890abc123de",
    );
    expect(evidence!.createdAt).toBe("2026-08-09T10:00:00.000Z");
    expect(evidence!.runStartedAt).toBe("2026-08-09T10:00:05.000Z");
    expect(evidence!.updatedAt).toBe("2026-08-09T10:05:00.000Z");
    expect(evidence!.observedAt).toBe(OBSERVED);
  });

  test("rejects wrong repository id (no name/SHA matching)", () => {
    const raw = workflowRunsFixture.workflow_runs[0]!;
    expect(normalizeWorkflowRun(raw, "999", OBSERVED)).toBeNull();
  });

  test("rejects missing run id or created_at", () => {
    expect(
      normalizeWorkflowRun(
        { repository: { id: Number(REPO_ID) }, created_at: "2026-01-01T00:00:00Z" },
        REPO_ID,
        OBSERVED,
      ),
    ).toBeNull();
    expect(
      normalizeWorkflowRun(
        { id: 1, repository: { id: Number(REPO_ID) } },
        REPO_ID,
        OBSERVED,
      ),
    ).toBeNull();
  });

  test("excludes actor, commit message, logs, and secrets from compact evidence", () => {
    const raw = workflowRunsFixture.workflow_runs[0]!;
    const evidence = normalizeWorkflowRun(raw, REPO_ID, OBSERVED)!;
    const json = JSON.stringify(evidence);
    expect(json).not.toContain("secret@example.com");
    expect(json).not.toContain("ghp_should_not_store");
    expect(json).not.toContain("secret-user");
    expect(json).not.toContain("logs_url");
    expect(json).not.toContain("jobs_url");
    expect(Object.keys(evidence).sort()).toEqual(
      [
        "conclusion",
        "createdAt",
        "event",
        "headBranch",
        "headSha",
        "name",
        "observedAt",
        "provider",
        "repositoryId",
        "resourceId",
        "runAttempt",
        "runId",
        "runNumber",
        "runStartedAt",
        "status",
        "updatedAt",
        "workflowId",
      ].sort(),
    );
  });

  test("preserves status and conclusion separately", () => {
    const raw = workflowRunsFixture.workflow_runs[1]!;
    const evidence = normalizeWorkflowRun(raw, REPO_ID, OBSERVED)!;
    expect(evidence.status).toBe("completed");
    expect(evidence.conclusion).toBe("failure");
    expect(evidence.runAttempt).toBe(2);
  });
});

describe("repositoryApiPathParts", () => {
  test("prefers fullName then owner+name", () => {
    expect(
      repositoryApiPathParts({
        name: "demo",
        metadata: { fullName: "acme/demo", owner: "other" },
      }),
    ).toEqual({ owner: "acme", repo: "demo" });
    expect(
      repositoryApiPathParts({
        name: "demo",
        metadata: { owner: "acme" },
      }),
    ).toEqual({ owner: "acme", repo: "demo" });
    expect(repositoryApiPathParts({ name: "x", metadata: {} })).toBeNull();
  });
});

describe("composeWorkflowRunAuthority", () => {
  const base = {
    provider: "github" as const,
    runId: 1,
    resourceId: "github:repository:1",
    repositoryId: "1",
    workflowId: 1,
    name: "CI",
    runNumber: 1,
    runAttempt: 1,
    event: "push",
    status: "completed",
    conclusion: "success",
    headBranch: "main",
    headSha: "abc",
    createdAt: "2026-08-09T10:00:00.000Z",
    runStartedAt: null,
    updatedAt: null,
    observedAt: OBSERVED,
  };

  test("not_applicable for non-GitHub resources", () => {
    expect(
      composeWorkflowRunAuthority("vercel", "project", null, []).kind,
    ).toBe("not_applicable");
  });

  test("unknown when never refreshed", () => {
    expect(
      composeWorkflowRunAuthority("github", "repository", null, []).kind,
    ).toBe("unknown");
  });

  test("empty vs populated vs failed refresh with stale rows", () => {
    expect(
      composeWorkflowRunAuthority(
        "github",
        "repository",
        {
          resourceId: "github:repository:1",
          status: "success",
          observedAt: OBSERVED,
          message: null,
        resultCount: null,
        },
        [],
      ).kind,
    ).toBe("empty");

    const populated = composeWorkflowRunAuthority(
      "github",
      "repository",
      {
        resourceId: "github:repository:1",
        status: "success",
        observedAt: OBSERVED,
        message: null,
      resultCount: null,
      },
      [base],
    );
    expect(populated.kind).toBe("populated");

    const failed = composeWorkflowRunAuthority(
      "github",
      "repository",
      {
        resourceId: "github:repository:1",
        status: "failure",
        observedAt: OBSERVED,
        message: "403 forbidden",
      resultCount: null,
      },
      [base],
    );
    expect(failed.kind).toBe("unknown");
    if (failed.kind === "unknown") {
      expect(failed.runs).toHaveLength(1);
      expect(failed.message).toContain("403");
    }
  });

  test("Sprint 027: result_count distinguishes empty/bounded success and failure", () => {
    const emptyWithHistory = composeWorkflowRunAuthority(
      "github",
      "repository",
      {
        resourceId: "github:repository:1",
        status: "success",
        observedAt: OBSERVED,
        message: null,
        resultCount: 0,
      },
      [base],
    );
    expect(emptyWithHistory.kind).toBe("empty");
    if (emptyWithHistory.kind === "empty") {
      expect(emptyWithHistory.resultCount).toBe(0);
      expect(emptyWithHistory.runs).toHaveLength(1);
    }

    const bounded = composeWorkflowRunAuthority(
      "github",
      "repository",
      {
        resourceId: "github:repository:1",
        status: "success",
        observedAt: OBSERVED,
        message: null,
        resultCount: 100,
      },
      [base],
    );
    expect(bounded.kind).toBe("populated");
    if (bounded.kind === "populated") {
      // 100 is the bounded response size, not proof of complete history.
      expect(bounded.resultCount).toBe(100);
      expect(bounded.runs).toHaveLength(1);
    }

    const failed = composeWorkflowRunAuthority(
      "github",
      "repository",
      {
        resourceId: "github:repository:1",
        status: "failure",
        observedAt: OBSERVED,
        message: "rate limited",
        resultCount: 3,
      },
      [base],
    );
    expect(failed.kind).toBe("unknown");
    if (failed.kind === "unknown") {
      expect(failed.resultCount).toBe(3);
    }
  });
});
