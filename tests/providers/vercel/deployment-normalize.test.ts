import { describe, expect, test } from "bun:test";
import {
  composeDeploymentAuthority,
  normalizeDeployment,
  vercelProjectResourceId,
} from "../../../src/providers/vercel/deployment.ts";
import deploymentsFixture from "./fixtures/deployments.json";

const OBSERVED = "2026-08-09T12:00:00.000Z";
const PROJECT_ID = "prj_demo_hub";

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

  test("excludes secrets, creator, meta, urls, env from compact evidence", () => {
    const raw = deploymentsFixture.deployments[0]!;
    const evidence = normalizeDeployment(raw, PROJECT_ID, OBSERVED)!;
    const json = JSON.stringify(evidence);
    expect(json).not.toContain("secret@example.com");
    expect(json).not.toContain("vercel_should_not_store");
    expect(json).not.toContain("postgres://");
    expect(json).not.toContain("demo-hub-abc.vercel.app");
    expect(json).not.toContain("inspectorUrl");
    expect(json).not.toContain("githubCommitMessage");
    expect(json).not.toContain("DATABASE_URL");
    // No url/creator/meta fields on the evidence object.
    expect(Object.keys(evidence).sort()).toEqual(
      [
        "buildingAtMs",
        "createdAtMs",
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
      },
      [base],
    );
    expect(auth.kind).toBe("unknown");
    if (auth.kind === "unknown") {
      expect(auth.deployments).toHaveLength(1);
      expect(auth.message).toContain("List deployments failed");
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
      },
      [base],
    );
    expect(legacy.kind).toBe("populated");
    if (legacy.kind === "populated") {
      expect(legacy.resultCount).toBeNull();
    }
  });
});
