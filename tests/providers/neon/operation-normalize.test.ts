import { describe, expect, test } from "bun:test";
import {
  composeNeonOperationAuthority,
  neonProjectResourceId,
  normalizeNeonOperation,
  type NeonOperationEvidence,
} from "../../../src/providers/neon/operation.ts";
import operationsFixture from "./fixtures/operations.json";

const OBSERVED = "2026-08-09T12:00:00.000Z";
const PROJECT_ID = "steep-moon-132241";

describe("normalizeNeonOperation", () => {
  test("preserves Neon identity, lifecycle, retry, target, and named times", () => {
    const evidence = normalizeNeonOperation(
      operationsFixture.operations[1]!,
      PROJECT_ID,
      OBSERVED,
    );
    expect(evidence).not.toBeNull();
    expect(evidence).toEqual({
      provider: "neon",
      operationId: "0f3daf10-2544-425c-86d3-9a9932ab25b9",
      resourceId: "neon:project:steep-moon-132241",
      projectId: PROJECT_ID,
      action: "create_branch",
      status: "failed",
      failuresCount: 2,
      branchId: "br-wispy-dew-591433",
      endpointId: null,
      createdAt: "2026-08-09T09:00:00.000Z",
      updatedAt: "2026-08-09T09:05:00.000Z",
      retryAt: "2026-08-09T09:10:00.000Z",
      totalDurationMs: 300000,
      observedAt: OBSERVED,
    });
    expect(neonProjectResourceId(PROJECT_ID)).toBe(
      "neon:project:steep-moon-132241",
    );
  });

  test("rejects wrong project identity and malformed required fields", () => {
    const raw = operationsFixture.operations[0]!;
    expect(normalizeNeonOperation(raw, "other-project", OBSERVED)).toBeNull();
    expect(
      normalizeNeonOperation({ ...raw, created_at: "not-a-date" }, PROJECT_ID, OBSERVED),
    ).toBeNull();
    expect(
      normalizeNeonOperation({ ...raw, created_at: "2026-08-09" }, PROJECT_ID, OBSERVED),
    ).toBeNull();
    expect(
      normalizeNeonOperation({ ...raw, failures_count: -1 }, PROJECT_ID, OBSERVED),
    ).toBeNull();
    expect(
      normalizeNeonOperation({ ...raw, id: "not-a-uuid" }, PROJECT_ID, OBSERVED),
    ).toBeNull();
    expect(
      normalizeNeonOperation({ ...raw, action: "start\ncompute" }, PROJECT_ID, OBSERVED),
    ).toBeNull();
    expect(
      normalizeNeonOperation({ ...raw, endpoint_id: "ep-bad\u001b[2J" }, PROJECT_ID, OBSERVED),
    ).toBeNull();
    expect(
      normalizeNeonOperation({ ...raw, endpoint_id: "EP-bad" }, PROJECT_ID, OBSERVED),
    ).toBeNull();
  });

  test("uses a compact allowlist and excludes raw error and connection details", () => {
    const evidence = normalizeNeonOperation(
      operationsFixture.operations[0]!,
      PROJECT_ID,
      OBSERVED,
    )!;
    const json = JSON.stringify(evidence);
    expect(json).not.toContain("must never be persisted");
    expect(json).not.toContain("postgresql://");
    expect(Object.keys(evidence).sort()).toEqual(
      [
        "action",
        "branchId",
        "createdAt",
        "endpointId",
        "failuresCount",
        "observedAt",
        "operationId",
        "projectId",
        "provider",
        "resourceId",
        "retryAt",
        "status",
        "totalDurationMs",
        "updatedAt",
      ].sort(),
    );
  });

  test("preserves safe future provider action and status values", () => {
    const raw = operationsFixture.operations[0]!;
    const evidence = normalizeNeonOperation(
      { ...raw, action: "future-action-v2", status: "warming-up" },
      PROJECT_ID,
      OBSERVED,
    );
    expect(evidence?.action).toBe("future-action-v2");
    expect(evidence?.status).toBe("warming-up");
  });
});

describe("composeNeonOperationAuthority", () => {
  const operation: NeonOperationEvidence = {
    provider: "neon",
    operationId: "op-1",
    resourceId: "neon:project:p1",
    projectId: "p1",
    action: "start_compute",
    status: "finished",
    failuresCount: 0,
    branchId: null,
    endpointId: "ep-1",
    createdAt: "2026-08-09T10:00:00.000Z",
    updatedAt: "2026-08-09T10:01:00.000Z",
    retryAt: null,
    totalDurationMs: 60000,
    observedAt: OBSERVED,
  };

  test("distinguishes not-applicable, unknown, empty, populated, and stale", () => {
    expect(
      composeNeonOperationAuthority("github", "repository", null, []).kind,
    ).toBe("not_applicable");
    expect(
      composeNeonOperationAuthority("neon", "project", null, []).kind,
    ).toBe("unknown");
    expect(
      composeNeonOperationAuthority(
        "neon",
        "project",
        {
          resourceId: operation.resourceId,
          status: "success",
          observedAt: OBSERVED,
          message: null,
          resultCount: 0,
        lastSuccessfulObservedAt: null,
        },
        [],
      ).kind,
    ).toBe("empty");
    expect(
      composeNeonOperationAuthority(
        "neon",
        "project",
        {
          resourceId: operation.resourceId,
          status: "success",
          observedAt: OBSERVED,
          message: null,
          resultCount: 1,
        lastSuccessfulObservedAt: null,
        },
        [operation],
      ).kind,
    ).toBe("populated");
    const failed = composeNeonOperationAuthority(
      "neon",
      "project",
      {
        resourceId: operation.resourceId,
        status: "failure",
        observedAt: OBSERVED,
        message: "403 forbidden",
        resultCount: null,
      lastSuccessfulObservedAt: null,
      },
      [operation],
    );
    expect(failed.kind).toBe("unknown");
    if (failed.kind === "unknown") expect(failed.operations).toEqual([operation]);
  });
});
