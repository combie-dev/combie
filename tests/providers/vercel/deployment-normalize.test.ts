import { describe, expect, test } from "bun:test";
import {
  canonicalizeFullGitCommitSha,
  composeDeploymentAuthority,
  extractGitCommitShaFromMeta,
  normalizeDeployment,
  vercelProjectResourceId,
} from "../../../src/providers/vercel/deployment.ts";
import deploymentsFixture from "./fixtures/deployments.json";

const OBSERVED = "2026-08-09T12:00:00.000Z";
const PROJECT_ID = "prj_demo_hub";
const FULL_SHA = "abc123def4567890abc123def4567890abc123de";
const FULL_SHA_64 =
  "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

describe("canonicalizeFullGitCommitSha", () => {
  test("accepts full 40 and 64 hex, lowercases and trims", () => {
    expect(canonicalizeFullGitCommitSha(FULL_SHA)).toBe(FULL_SHA);
    expect(
      canonicalizeFullGitCommitSha(FULL_SHA.toUpperCase()),
    ).toBe(FULL_SHA);
    expect(canonicalizeFullGitCommitSha(`  ${FULL_SHA}  `)).toBe(FULL_SHA);
    expect(canonicalizeFullGitCommitSha(FULL_SHA_64)).toBe(FULL_SHA_64);
  });

  test("rejects short, prefix, malformed, empty, non-string", () => {
    expect(canonicalizeFullGitCommitSha("abc123def456")).toBeNull();
    expect(canonicalizeFullGitCommitSha(FULL_SHA.slice(0, 7))).toBeNull();
    expect(canonicalizeFullGitCommitSha("g".repeat(40))).toBeNull();
    expect(canonicalizeFullGitCommitSha("")).toBeNull();
    expect(canonicalizeFullGitCommitSha("   ")).toBeNull();
    expect(canonicalizeFullGitCommitSha(null)).toBeNull();
    expect(canonicalizeFullGitCommitSha(123)).toBeNull();
  });
});

describe("extractGitCommitShaFromMeta", () => {
  test("reads only githubCommitSha and rejects raw meta bags without it", () => {
    expect(
      extractGitCommitShaFromMeta({ githubCommitSha: FULL_SHA }),
    ).toBe(FULL_SHA);
    expect(extractGitCommitShaFromMeta({ githubCommitMessage: "x" })).toBeNull();
    expect(extractGitCommitShaFromMeta(null)).toBeNull();
    expect(extractGitCommitShaFromMeta("not-object")).toBeNull();
  });
});

describe("normalizeDeployment", () => {
  test("maps stable identity, exact Resource association, and provider times", () => {
    const raw = deploymentsFixture.deployments[0]!;
    const evidence = normalizeDeployment(raw, PROJECT_ID, OBSERVED);
    expect(evidence).not.toBeNull();
    expect(evidence!.provider).toBe("vercel");
    expect(evidence!.uid).toBe("dpl_ready_001");
    expect(evidence!.projectId).toBe(PROJECT_ID);
    expect(evidence!.resourceId).toBe(vercelProjectResourceId(PROJECT_ID));
    expect(evidence!.resourceId).toBe("vercel:project:prj_demo_hub");
    expect(evidence!.createdAtMs).toBe(1723200000000);
    expect(evidence!.buildingAtMs).toBe(1723200005000);
    expect(evidence!.readyAtMs).toBe(1723200300000);
    expect(evidence!.readyState).toBe("READY");
    expect(evidence!.state).toBe("READY");
    expect(evidence!.target).toBe("production");
    expect(evidence!.source).toBe("git");
    expect(evidence!.observedAt).toBe(OBSERVED);
    expect(evidence!.gitCommitSha).toBe(FULL_SHA);
  });

  test("preserves optional absence of buildingAt/ready without inventing times", () => {
    const raw = deploymentsFixture.deployments[1]!;
    const evidence = normalizeDeployment(raw, PROJECT_ID, OBSERVED);
    expect(evidence!.buildingAtMs).toBeNull();
    expect(evidence!.readyAtMs).toBeNull();
    expect(evidence!.readyState).toBe("BUILDING");
  });

  test("accepts createdAt when created is absent", () => {
    const evidence = normalizeDeployment(
      {
        uid: "dpl_x",
        projectId: PROJECT_ID,
        createdAt: 1000,
        readyState: "READY",
      },
      PROJECT_ID,
      OBSERVED,
    );
    expect(evidence!.createdAtMs).toBe(1000);
  });

  test("rejects wrong projectId (no name/url matching)", () => {
    const raw = deploymentsFixture.deployments[0]!;
    expect(normalizeDeployment(raw, "prj_other", OBSERVED)).toBeNull();
  });

  test("rejects missing uid or created timestamp", () => {
    expect(
      normalizeDeployment(
        { projectId: PROJECT_ID, created: 1 },
        PROJECT_ID,
        OBSERVED,
      ),
    ).toBeNull();
    expect(
      normalizeDeployment(
        { uid: "dpl_x", projectId: PROJECT_ID },
        PROJECT_ID,
        OBSERVED,
      ),
    ).toBeNull();
  });

  test("excludes secrets, creator, raw meta, urls, env from compact evidence", () => {
    const raw = deploymentsFixture.deployments[0]!;
    const evidence = normalizeDeployment(raw, PROJECT_ID, OBSERVED)!;
    const json = JSON.stringify(evidence);
    expect(json).not.toContain("secret@example.com");
    expect(json).not.toContain("vercel_should_not_store");
    expect(json).not.toContain("postgres://");
    expect(json).not.toContain("demo-hub-abc.vercel.app");
    expect(json).not.toContain("inspectorUrl");
    expect(json).not.toContain("githubCommitMessage");
    expect(json).not.toContain("Secret Author");
    expect(json).not.toContain("DATABASE_URL");
    // Allowlisted commit SHA only — not raw meta bag.
    expect(Object.keys(evidence).sort()).toEqual(
      [
        "buildingAtMs",
        "createdAtMs",
        "gitCommitSha",
        "observedAt",
        "projectId",
        "provider",
        "readyAtMs",
        "readyState",
        "resourceId",
        "source",
        "state",
        "target",
        "uid",
      ].sort(),
    );
  });

  test("Sprint 035: gitCommitSha allowlist and rejection paths", () => {
    const base = {
      uid: "dpl_sha",
      projectId: PROJECT_ID,
      created: 1000,
      readyState: "READY",
    };
    expect(
      normalizeDeployment(
        {
          ...base,
          meta: { githubCommitSha: FULL_SHA.toUpperCase() },
        },
        PROJECT_ID,
        OBSERVED,
      )!.gitCommitSha,
    ).toBe(FULL_SHA);
    expect(
      normalizeDeployment(
        { ...base, meta: { githubCommitSha: FULL_SHA_64 } },
        PROJECT_ID,
        OBSERVED,
      )!.gitCommitSha,
    ).toBe(FULL_SHA_64);
    expect(
      normalizeDeployment(
        { ...base, meta: { githubCommitSha: "  " + FULL_SHA + "  " } },
        PROJECT_ID,
        OBSERVED,
      )!.gitCommitSha,
    ).toBe(FULL_SHA);
    expect(
      normalizeDeployment(
        { ...base, meta: { githubCommitSha: "abc123def456" } },
        PROJECT_ID,
        OBSERVED,
      )!.gitCommitSha,
    ).toBeNull();
    expect(
      normalizeDeployment(
        { ...base, meta: { githubCommitSha: FULL_SHA.slice(0, 12) } },
        PROJECT_ID,
        OBSERVED,
      )!.gitCommitSha,
    ).toBeNull();
    expect(
      normalizeDeployment({ ...base }, PROJECT_ID, OBSERVED)!.gitCommitSha,
    ).toBeNull();
    expect(
      normalizeDeployment(
        { ...base, meta: { githubCommitMessage: "no sha" } },
        PROJECT_ID,
        OBSERVED,
      )!.gitCommitSha,
    ).toBeNull();
    // CLI fixture row has no meta.
    const cli = deploymentsFixture.deployments[1]!;
    expect(normalizeDeployment(cli, PROJECT_ID, OBSERVED)!.gitCommitSha).toBeNull();
  });
});

describe("composeDeploymentAuthority", () => {
  const resourceId = "vercel:project:prj_demo_hub";
  const base = {
    provider: "vercel" as const,
    uid: "dpl_1",
    resourceId,
    projectId: "prj_demo_hub",
    readyState: "READY",
    state: "READY",
    target: "production",
    createdAtMs: 100,
    buildingAtMs: null,
    readyAtMs: 200,
    observedAt: OBSERVED,
    source: "git",
    gitCommitSha: null,
  };

  test("not_applicable for non-Vercel resources", () => {
    expect(
      composeDeploymentAuthority(
        "github:repository:1",
        "github",
        "repository",
        null,
        [],
      ).kind,
    ).toBe("not_applicable");
  });

  test("unknown when never refreshed", () => {
    const auth = composeDeploymentAuthority(
      resourceId,
      "vercel",
      "project",
      null,
      [],
    );
    expect(auth.kind).toBe("unknown");
  });

  test("empty when last refresh succeeded with zero rows", () => {
    const auth = composeDeploymentAuthority(
      resourceId,
      "vercel",
      "project",
      {
        resourceId,
        status: "success",
        observedAt: OBSERVED,
        message: null,
      resultCount: null,
      lastSuccessfulObservedAt: null,
      },
      [],
    );
    expect(auth.kind).toBe("empty");
  });

  test("populated when last refresh succeeded with deployments", () => {
    const auth = composeDeploymentAuthority(
      resourceId,
      "vercel",
      "project",
      {
        resourceId,
        status: "success",
        observedAt: OBSERVED,
        message: null,
      resultCount: null,
      lastSuccessfulObservedAt: null,
      },
      [base],
    );
    expect(auth.kind).toBe("populated");
    if (auth.kind === "populated") {
      expect(auth.deployments).toHaveLength(1);
    }
  });

  test("unknown retains prior deployments after failure", () => {
    const auth = composeDeploymentAuthority(
      resourceId,
      "vercel",
      "project",
      {
        resourceId,
        status: "failure",
        observedAt: OBSERVED,
        message: "List deployments failed",
      resultCount: null,
      lastSuccessfulObservedAt: null,
      },
      [base],
    );
    expect(auth.kind).toBe("unknown");
    if (auth.kind === "unknown") {
      expect(auth.deployments).toHaveLength(1);
      expect(auth.message).toContain("List deployments failed");
    }
  });

  test("Sprint 028: failure preserves lastSuccessAt while latest attempt advances", () => {
    const auth = composeDeploymentAuthority(
      resourceId,
      "vercel",
      "project",
      {
        resourceId,
        status: "failure",
        observedAt: "2026-08-09T12:30:00.000Z",
        message: "timeout",
        resultCount: 3,
        lastSuccessfulObservedAt: "2026-08-09T12:00:00.000Z",
      },
      [base],
    );
    expect(auth.kind).toBe("unknown");
    if (auth.kind === "unknown") {
      expect(auth.latestAttemptObservedAt).toBe("2026-08-09T12:30:00.000Z");
      expect(auth.lastSuccessAt).toBe("2026-08-09T12:00:00.000Z");
      expect(auth.resultCount).toBe(3);
    }
  });

  test("Sprint 027: result_count distinguishes empty success with retained history", () => {
    const emptyWithHistory = composeDeploymentAuthority(
      resourceId,
      "vercel",
      "project",
      {
        resourceId,
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
      expect(emptyWithHistory.deployments).toHaveLength(1);
    }

    const populated = composeDeploymentAuthority(
      resourceId,
      "vercel",
      "project",
      {
        resourceId,
        status: "success",
        observedAt: OBSERVED,
        message: null,
        resultCount: 1,
      lastSuccessfulObservedAt: null,
      },
      [base, { ...base, uid: "dpl_2" }],
    );
    expect(populated.kind).toBe("populated");
    if (populated.kind === "populated") {
      expect(populated.resultCount).toBe(1);
      expect(populated.deployments).toHaveLength(2);
    }

    const failedAfterSuccess = composeDeploymentAuthority(
      resourceId,
      "vercel",
      "project",
      {
        resourceId,
        status: "failure",
        observedAt: OBSERVED,
        message: "timeout",
        resultCount: 2,
      lastSuccessfulObservedAt: null,
      },
      [base],
    );
    expect(failedAfterSuccess.kind).toBe("unknown");
    if (failedAfterSuccess.kind === "unknown") {
      expect(failedAfterSuccess.resultCount).toBe(2);
      expect(failedAfterSuccess.deployments).toHaveLength(1);
    }

    // Pre-027 success with null resultCount does not invent a count.
    const legacy = composeDeploymentAuthority(
      resourceId,
      "vercel",
      "project",
      {
        resourceId,
        status: "success",
        observedAt: OBSERVED,
        message: null,
        resultCount: null,
      lastSuccessfulObservedAt: null,
      },
      [base],
    );
    expect(legacy.kind).toBe("populated");
    if (legacy.kind === "populated") {
      expect(legacy.resultCount).toBeNull();
    }
  });
});
