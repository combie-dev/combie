import { describe, expect, test } from "bun:test";
import {
  formatInvestigationContext,
  type InvestigationContext,
} from "../../src/app/investigate.ts";
import {
  composeInvestigationFacts,
  MAX_INVESTIGATION_FACTS,
} from "../../src/app/investigation-facts.ts";
import type { Change } from "../../src/domain/change.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource, type Resource } from "../../src/domain/resource.ts";
import type {
  GitHubWorkflowRunEvidence,
  WorkflowRunEvidenceAuthority,
} from "../../src/providers/github/workflow-run.ts";
import type {
  NeonOperationEvidence,
  NeonOperationEvidenceAuthority,
} from "../../src/providers/neon/operation.ts";
import type {
  DeploymentEvidenceAuthority,
  VercelDeploymentEvidence,
} from "../../src/providers/vercel/deployment.ts";

const OBSERVED_AT = "2026-08-09T12:00:00.000Z";

function resource(
  provider: string,
  kind: Resource["kind"],
  providerResourceId: string,
): Resource {
  return createResource({
    provider,
    kind,
    providerResourceId,
    name: providerResourceId,
    metadata: {},
    createdAt: OBSERVED_AT,
    updatedAt: OBSERVED_AT,
  });
}

function deployment(
  overrides: Partial<VercelDeploymentEvidence> = {},
): VercelDeploymentEvidence {
  return {
    provider: "vercel",
    uid: "dpl_1",
    resourceId: "vercel:project:prj_app",
    projectId: "prj_app",
    readyState: "READY",
    state: "READY",
    target: "production",
    createdAtMs: Date.parse("2026-08-09T10:00:00.000Z"),
    buildingAtMs: null,
    readyAtMs: null,
    observedAt: OBSERVED_AT,
    source: "git",
    ...overrides,
  };
}

function workflowRun(
  overrides: Partial<GitHubWorkflowRunEvidence> = {},
): GitHubWorkflowRunEvidence {
  return {
    provider: "github",
    runId: 9001,
    resourceId: "github:repository:101",
    repositoryId: "101",
    workflowId: 55,
    name: "ci",
    runNumber: 12,
    runAttempt: 1,
    event: "push",
    status: "completed",
    conclusion: "success",
    headBranch: "main",
    headSha: "abc123",
    createdAt: "2026-08-09T09:00:00.000Z",
    runStartedAt: null,
    updatedAt: null,
    observedAt: OBSERVED_AT,
    ...overrides,
  };
}

function neonOperation(
  overrides: Partial<NeonOperationEvidence> = {},
): NeonOperationEvidence {
  return {
    provider: "neon",
    operationId: "op_1",
    resourceId: "neon:project:db",
    projectId: "db",
    action: "start_compute",
    status: "finished",
    failuresCount: 0,
    branchId: null,
    endpointId: null,
    createdAt: "2026-08-09T08:00:00.000Z",
    updatedAt: "2026-08-09T08:01:00.000Z",
    retryAt: null,
    totalDurationMs: 60_000,
    observedAt: OBSERVED_AT,
    ...overrides,
  };
}

function change(
  id: string,
  resourceId: string,
  observedAt: string,
): Change {
  return {
    id,
    resourceId,
    kind: "updated",
    observedAt,
    fields: [{ path: "name", before: "before", after: "after" }],
  };
}

const NA_DEPLOYMENTS: DeploymentEvidenceAuthority = {
  kind: "not_applicable",
};
const NA_RUNS: WorkflowRunEvidenceAuthority = { kind: "not_applicable" };
const NA_OPERATIONS: NeonOperationEvidenceAuthority = {
  kind: "not_applicable",
};

function populatedDeployments(
  items: VercelDeploymentEvidence[],
): DeploymentEvidenceAuthority {
  return { kind: "populated", observedAt: OBSERVED_AT, deployments: items };
}

function unknownDeployments(
  items: VercelDeploymentEvidence[],
): DeploymentEvidenceAuthority {
  return {
    kind: "unknown",
    deployments: items,
    lastSuccessAt: null,
    message: null,
  };
}

function populatedRuns(
  items: GitHubWorkflowRunEvidence[],
): WorkflowRunEvidenceAuthority {
  return { kind: "populated", observedAt: OBSERVED_AT, runs: items };
}

function unknownRuns(
  items: GitHubWorkflowRunEvidence[],
): WorkflowRunEvidenceAuthority {
  return { kind: "unknown", runs: items, lastSuccessAt: null, message: null };
}

function populatedOperations(
  items: NeonOperationEvidence[],
): NeonOperationEvidenceAuthority {
  return { kind: "populated", observedAt: OBSERVED_AT, operations: items };
}

function unknownOperations(
  items: NeonOperationEvidence[],
): NeonOperationEvidenceAuthority {
  return {
    kind: "unknown",
    operations: items,
    lastSuccessAt: null,
    message: null,
  };
}

function context(
  overrides: Partial<InvestigationContext> = {},
): InvestigationContext {
  return {
    subject: resource("cloudflare", "worker", "worker-1"),
    subjectChanges: [],
    related: [],
    subjectDeployments: NA_DEPLOYMENTS,
    subjectWorkflowRuns: NA_RUNS,
    subjectOperations: NA_OPERATIONS,
    ...overrides,
  };
}

function sourceFor(repository: Resource, project: Resource) {
  return createRelationship({
    sourceResourceId: repository.id,
    targetResourceId: project.id,
    kind: "source_for",
    evidence: {
      source: "vercel",
      mechanism: "git_repository_reference",
      repository: "acme/app",
    },
    createdAt: OBSERVED_AT,
    updatedAt: OBSERVED_AT,
  });
}

describe("investigation fact composition", () => {
  test("returns no low-value facts for an empty, non-applicable context", () => {
    expect(composeInvestigationFacts(context())).toEqual([]);
  });

  test("unknown without rows emits authority only and never becomes empty", () => {
    const facts = composeInvestigationFacts(
      context({
        subject: resource("github", "repository", "101"),
        subjectWorkflowRuns: unknownRuns([]),
      }),
    );

    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      kind: "provider_evidence_authority",
      source: {
        family: "github_workflow_run",
        authority: { kind: "unknown", refreshObservedAt: null },
        locallyHeldNativeIds: [],
      },
    });
  });

  test("unknown retained rows preserve stale authority and native ids", () => {
    const retained = [
      workflowRun({ runId: 9002, conclusion: "failure" }),
      workflowRun({ runId: 9001, conclusion: "success" }),
    ];
    const facts = composeInvestigationFacts(
      context({
        subject: resource("github", "repository", "101"),
        subjectWorkflowRuns: unknownRuns(retained),
      }),
    );

    const authority = facts.find(
      (fact) => fact.kind === "provider_evidence_authority",
    );
    expect(authority).toMatchObject({
      source: {
        locallyHeldNativeIds: ["9002", "9001"],
        authority: { kind: "unknown" },
      },
    });
    const state = facts.find(
      (fact) => fact.kind === "provider_state_summary",
    );
    expect(state).toMatchObject({
      family: "github_workflow_run",
      field: "conclusion",
      totalCount: 2,
      groups: [
        { value: "failure", count: 1 },
        { value: "success", count: 1 },
      ],
    });
    if (!state || state.kind !== "provider_state_summary") return;
    expect(state.evidence.every((item) => item.authority.kind === "unknown")).toBe(
      true,
    );
  });

  test("Neon known-empty retains current-response authority and prior history", () => {
    const retained = [
      neonOperation({ operationId: "op_2", status: "failed" }),
      neonOperation({ operationId: "op_1", status: "finished" }),
    ];
    const facts = composeInvestigationFacts(
      context({
        subject: resource("neon", "project", "db"),
        subjectOperations: {
          kind: "empty",
          observedAt: OBSERVED_AT,
          operations: retained,
        },
      }),
    );

    expect(facts[0]).toMatchObject({
      kind: "provider_evidence_authority",
      source: {
        family: "neon_operation",
        authority: { kind: "empty", refreshObservedAt: OBSERVED_AT },
        locallyHeldNativeIds: ["op_2", "op_1"],
      },
    });
    expect(facts).toContainEqual(
      expect.objectContaining({
        kind: "provider_state_summary",
        family: "neon_operation",
        field: "status",
      }),
    );
  });

  test("GitHub and Vercel known-empty facts preserve successful refresh authority", () => {
    const github = composeInvestigationFacts(
      context({
        subject: resource("github", "repository", "101"),
        subjectWorkflowRuns: {
          kind: "empty",
          observedAt: OBSERVED_AT,
          runs: [],
        },
      }),
    );
    const vercel = composeInvestigationFacts(
      context({
        subject: resource("vercel", "project", "prj_app"),
        subjectDeployments: {
          kind: "empty",
          observedAt: OBSERVED_AT,
          deployments: [],
        },
      }),
    );

    expect(github[0]).toMatchObject({
      kind: "provider_evidence_authority",
      source: {
        family: "github_workflow_run",
        authority: { kind: "empty", refreshObservedAt: OBSERVED_AT },
      },
    });
    expect(vercel[0]).toMatchObject({
      kind: "provider_evidence_authority",
      source: {
        family: "vercel_deployment",
        authority: { kind: "empty", refreshObservedAt: OBSERVED_AT },
      },
    });
  });

  test("unknown authority semantics apply to retained Vercel and Neon rows", () => {
    const vercel = composeInvestigationFacts(
      context({
        subject: resource("vercel", "project", "prj_app"),
        subjectDeployments: unknownDeployments([
          deployment({ uid: "dpl_2" }),
          deployment({ uid: "dpl_1" }),
        ]),
      }),
    );
    const neon = composeInvestigationFacts(
      context({
        subject: resource("neon", "project", "db"),
        subjectOperations: unknownOperations([
          neonOperation({ operationId: "op_2" }),
          neonOperation({ operationId: "op_1" }),
        ]),
      }),
    );

    expect(vercel[0]).toMatchObject({
      source: {
        family: "vercel_deployment",
        authority: { kind: "unknown", refreshObservedAt: null },
        locallyHeldNativeIds: ["dpl_2", "dpl_1"],
      },
    });
    expect(neon[0]).toMatchObject({
      source: {
        family: "neon_operation",
        authority: { kind: "unknown", refreshObservedAt: null },
        locallyHeldNativeIds: ["op_2", "op_1"],
      },
    });
  });

  test("preserves provider-native state fields without one generic state enum", () => {
    const githubFacts = composeInvestigationFacts(
      context({
        subject: resource("github", "repository", "101"),
        subjectWorkflowRuns: populatedRuns([
          workflowRun({ runId: 1, status: "completed", conclusion: "failure" }),
          workflowRun({ runId: 2, status: "in_progress", conclusion: null }),
        ]),
      }),
    );
    const vercelFacts = composeInvestigationFacts(
      context({
        subject: resource("vercel", "project", "prj_app"),
        subjectDeployments: populatedDeployments([
          deployment({ uid: "dpl_ready", readyState: "READY" }),
          deployment({ uid: "dpl_error", readyState: "ERROR" }),
        ]),
      }),
    );
    const neonFacts = composeInvestigationFacts(
      context({
        subject: resource("neon", "project", "db"),
        subjectOperations: populatedOperations([
          neonOperation({ operationId: "op_a", status: "failed" }),
          neonOperation({ operationId: "op_b", status: "finished" }),
        ]),
      }),
    );

    expect(githubFacts).toContainEqual(
      expect.objectContaining({
        kind: "provider_state_summary",
        family: "github_workflow_run",
        field: "conclusion",
        groups: [{ value: "failure", count: 1, evidence: expect.any(Array) }],
      }),
    );
    expect(vercelFacts).toContainEqual(
      expect.objectContaining({
        kind: "provider_state_summary",
        family: "vercel_deployment",
        field: "readyState",
      }),
    );
    expect(neonFacts).toContainEqual(
      expect.objectContaining({
        kind: "provider_state_summary",
        family: "neon_operation",
        field: "status",
      }),
    );
  });

  test("uniform multi-row state still earns one aggregate fact", () => {
    const facts = composeInvestigationFacts(
      context({
        subject: resource("vercel", "project", "prj_app"),
        subjectDeployments: populatedDeployments([
          deployment({ uid: "dpl_2", readyState: "READY" }),
          deployment({ uid: "dpl_1", readyState: "READY" }),
        ]),
      }),
    );

    expect(facts).toContainEqual(
      expect.objectContaining({
        kind: "provider_state_summary",
        family: "vercel_deployment",
        field: "readyState",
        totalCount: 2,
        groups: [
          { value: "READY", count: 2, evidence: expect.any(Array) },
        ],
      }),
    );
    expect(
      facts.filter((fact) => fact.kind === "provider_state_summary"),
    ).toHaveLength(1);
  });

  test("mixed families preserve subject/neighbor scope and canonical paths", () => {
    const project = resource("vercel", "project", "prj_app");
    const repository = resource("github", "repository", "101");
    const edge = sourceFor(repository, project);
    const facts = composeInvestigationFacts(
      context({
        subject: project,
        subjectDeployments: populatedDeployments([
          deployment({ uid: "dpl_1" }),
        ]),
        related: [
          {
            relationship: edge,
            direction: "inbound",
            resource: repository,
            changes: [],
            deployments: NA_DEPLOYMENTS,
            workflowRuns: populatedRuns([workflowRun({ runId: 9001 })]),
            operations: NA_OPERATIONS,
          },
        ],
      }),
    );

    const activity = facts.find(
      (fact) => fact.kind === "provider_activity_summary",
    );
    expect(activity).toMatchObject({
      totalCount: 2,
      families: [
        { family: "github_workflow_run", count: 1 },
        { family: "vercel_deployment", count: 1 },
      ],
    });
    const scope = facts.find((fact) => fact.kind === "provider_activity_scope");
    expect(scope).toMatchObject({
      resources: [
        { scope: { resourceId: project.id, role: "subject", relationships: [] } },
        {
          scope: {
            resourceId: repository.id,
            role: "related",
            relationships: [
              {
                relationshipId: edge.id,
                kind: "source_for",
                direction: "inbound",
                sourceResourceId: repository.id,
                targetResourceId: project.id,
              },
            ],
          },
        },
      ],
    });
  });

  test("multi-edge neighbors are counted once while every path is retained", () => {
    const project = resource("vercel", "project", "prj_app");
    const repository = resource("github", "repository", "101");
    const first = sourceFor(repository, project);
    const second = createRelationship({
      sourceResourceId: repository.id,
      targetResourceId: project.id,
      // Synthetic multi-path fixture only: canonical Relationship identity is
      // endpoint+kind, so a second source_for row would be the same path. This
      // intentionally does not claim current uses_domain_in product semantics.
      kind: "uses_domain_in",
      evidence: {
        source: "fixture",
        mechanism: "second_canonical_path",
        apexName: "example.com",
      },
      createdAt: "2026-08-09T11:00:00.000Z",
      updatedAt: OBSERVED_AT,
    });
    const neighbor = (relationship: typeof first) => ({
      relationship,
      direction: "inbound" as const,
      resource: repository,
      changes: [],
      deployments: NA_DEPLOYMENTS,
      workflowRuns: populatedRuns([workflowRun()]),
      operations: NA_OPERATIONS,
    });
    const facts = composeInvestigationFacts(
      context({
        subject: project,
        subjectDeployments: populatedDeployments([deployment()]),
        related: [neighbor(second), neighbor(first)],
      }),
    );

    const activity = facts.find(
      (fact) => fact.kind === "provider_activity_summary",
    );
    expect(activity).toMatchObject({ totalCount: 2 });
    const scope = facts.find((fact) => fact.kind === "provider_activity_scope");
    if (!scope || scope.kind !== "provider_activity_scope") return;
    const related = scope.resources.find(
      (item) => item.scope.role === "related",
    );
    expect(related?.evidence).toHaveLength(1);
    expect(related?.scope.relationships.map((path) => path.relationshipId)).toEqual(
      [first.id, second.id].sort(),
    );
  });

  test("newest uses fixed provider-created time and omits a one-row restatement", () => {
    const one = composeInvestigationFacts(
      context({
        subject: resource("vercel", "project", "prj_app"),
        subjectDeployments: populatedDeployments([deployment()]),
      }),
    );
    expect(one.some((fact) => fact.kind === "newest_provider_activity")).toBe(
      false,
    );

    const facts = composeInvestigationFacts(
      context({
        subject: resource("vercel", "project", "prj_app"),
        subjectDeployments: populatedDeployments([
          deployment({
            uid: "created_newest",
            createdAtMs: Date.parse("2026-08-09T10:00:00.000Z"),
            readyAtMs: Date.parse("2026-08-09T10:01:00.000Z"),
            observedAt: "2026-08-09T10:02:00.000Z",
          }),
          deployment({
            uid: "ready_newer_only",
            createdAtMs: Date.parse("2026-08-09T09:00:00.000Z"),
            readyAtMs: Date.parse("2026-08-09T11:00:00.000Z"),
            observedAt: "2026-08-09T12:00:00.000Z",
          }),
        ]),
      }),
    );
    const newest = facts.find(
      (fact) => fact.kind === "newest_provider_activity",
    );
    expect(newest).toMatchObject({
      selected: {
        nativeId: "created_newest",
        primaryTimeField: "created",
        primaryTime: "2026-08-09T10:00:00.000Z",
      },
    });
  });

  test("newest selection inherits chronology family and native-id tie behavior", () => {
    const at = "2026-08-09T10:00:00.000Z";
    const project = resource("vercel", "project", "prj_app");
    const repository = resource("github", "repository", "101");
    const facts = composeInvestigationFacts(
      context({
        subject: project,
        subjectDeployments: populatedDeployments([
          deployment({ uid: "dpl_z", createdAtMs: Date.parse(at) }),
        ]),
        related: [
          {
            relationship: sourceFor(repository, project),
            direction: "inbound",
            resource: repository,
            changes: [],
            deployments: NA_DEPLOYMENTS,
            workflowRuns: populatedRuns([
              workflowRun({ runId: 9, createdAt: at }),
              workflowRun({ runId: 10, createdAt: at }),
            ]),
            operations: NA_OPERATIONS,
          },
        ],
      }),
    );
    const newest = facts.find(
      (fact) => fact.kind === "newest_provider_activity",
    );
    expect(newest).toMatchObject({
      selected: { family: "github_workflow_run", nativeId: "10" },
      compared: [
        { family: "github_workflow_run", nativeId: "10" },
        { family: "github_workflow_run", nativeId: "9" },
        { family: "vercel_deployment", nativeId: "dpl_z" },
      ],
    });
  });

  test("Resource Changes remain on explicit Combie observation authority", () => {
    const subject = resource("vercel", "project", "prj_app");
    const facts = composeInvestigationFacts(
      context({
        subject,
        subjectChanges: [
          change("change-2", subject.id, "2026-08-09T13:00:00.000Z"),
          change("change-1", subject.id, "2026-08-09T12:00:00.000Z"),
        ],
        subjectDeployments: populatedDeployments([
          deployment({ uid: "dpl_2", createdAtMs: 2000 }),
          deployment({ uid: "dpl_1", createdAtMs: 1000 }),
        ]),
      }),
    );

    const changeFact = facts.find(
      (fact) => fact.kind === "resource_change_summary",
    );
    expect(changeFact).toMatchObject({
      totalCount: 2,
      changes: [
        {
          changeId: "change-2",
          observedAt: "2026-08-09T13:00:00.000Z",
          timeAuthority: "combie_observation",
        },
        {
          changeId: "change-1",
          observedAt: "2026-08-09T12:00:00.000Z",
          timeAuthority: "combie_observation",
        },
      ],
    });
    const newest = facts.find(
      (fact) => fact.kind === "newest_provider_activity",
    );
    expect(newest).toMatchObject({ selected: { nativeId: "dpl_2" } });
  });

  test("related Change summary dedupes multi-edge history and retains paths", () => {
    const project = resource("vercel", "project", "prj_app");
    const repository = resource("github", "repository", "101");
    const edge = sourceFor(repository, project);
    const relatedChange = change(
      "related-change",
      repository.id,
      "2026-08-09T11:00:00.000Z",
    );
    const emptyRuns: WorkflowRunEvidenceAuthority = {
      kind: "empty",
      observedAt: OBSERVED_AT,
      runs: [],
    };
    const neighbor = {
      relationship: edge,
      direction: "inbound" as const,
      resource: repository,
      changes: [relatedChange],
      deployments: NA_DEPLOYMENTS,
      workflowRuns: emptyRuns,
      operations: NA_OPERATIONS,
    };
    const facts = composeInvestigationFacts(
      context({
        subject: project,
        subjectChanges: [
          change("subject-change", project.id, "2026-08-09T12:00:00.000Z"),
        ],
        related: [neighbor, neighbor],
      }),
    );
    const summary = facts.find(
      (fact) => fact.kind === "resource_change_summary",
    );

    expect(summary).toMatchObject({
      totalCount: 2,
      changes: [
        { changeId: "subject-change", scope: { role: "subject" } },
        {
          changeId: "related-change",
          scope: {
            role: "related",
            resourceId: repository.id,
            relationships: [{ relationshipId: edge.id }],
          },
        },
      ],
    });
  });

  test("dangling and not-applicable neighbors add no activity or authority", () => {
    const subject = resource("cloudflare", "zone", "example.com");
    const missingId = "github:repository:missing";
    const edge = createRelationship({
      sourceResourceId: missingId,
      targetResourceId: subject.id,
      kind: "source_for",
      evidence: { source: "fixture", mechanism: "dangling" },
      createdAt: OBSERVED_AT,
      updatedAt: OBSERVED_AT,
    });
    const facts = composeInvestigationFacts(
      context({
        subject,
        related: [
          {
            relationship: edge,
            direction: "inbound",
            resource: null,
            changes: [],
            deployments: NA_DEPLOYMENTS,
            workflowRuns: NA_RUNS,
            operations: NA_OPERATIONS,
          },
        ],
      }),
    );
    expect(facts).toEqual([]);
  });

  test("selection is deterministic, immutable, and capped at five", () => {
    const project = resource("vercel", "project", "prj_app");
    const repositories = Array.from({ length: 6 }, (_, index) =>
      resource("github", "repository", String(101 + index)),
    );
    const related = repositories.map((repository) => ({
      relationship: sourceFor(repository, project),
      direction: "inbound" as const,
      resource: repository,
      changes: [],
      deployments: NA_DEPLOYMENTS,
      workflowRuns: unknownRuns([]),
      operations: NA_OPERATIONS,
    }));
    const input = context({ subject: project, related });
    const before = JSON.stringify(input);
    const first = composeInvestigationFacts(input);
    const reordered = composeInvestigationFacts(
      context({ subject: project, related: [...related].reverse() }),
    );

    expect(first).toHaveLength(MAX_INVESTIGATION_FACTS);
    expect(first.every((fact) => fact.kind === "provider_evidence_authority")).toBe(
      true,
    );
    expect(first).toEqual(reordered);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe("known facts formatting", () => {
  test("renders a trustworthy zero state before detailed evidence", () => {
    const output = formatInvestigationContext(context());
    const factsIndex = output.indexOf("KNOWN FACTS");
    const changesIndex = output.indexOf("SUBJECT CHANGES");

    expect(factsIndex).toBeGreaterThan(-1);
    expect(factsIndex).toBeLessThan(changesIndex);
    expect(output).toContain(
      "No additional deterministic facts to summarize from the currently known investigation evidence.",
    );
  });

  test("renders unknown authority without fabricating absence", () => {
    const output = formatInvestigationContext(
      context({
        subject: resource("github", "repository", "101"),
        subjectWorkflowRuns: unknownRuns([]),
      }),
    );

    expect(output).toContain(
      "- GitHub workflow-run evidence for github:repository:101 has unknown current refresh authority; no absence can be inferred.",
    );
    expect(output).not.toContain("latest successful GitHub workflow-run refresh");
  });

  test("renders Neon current retained-response emptiness beside retained history", () => {
    const output = formatInvestigationContext(
      context({
        subject: resource("neon", "project", "db"),
        subjectOperations: {
          kind: "empty",
          observedAt: OBSERVED_AT,
          operations: [
            neonOperation({ operationId: "op_2", status: "failed" }),
            neonOperation({ operationId: "op_1", status: "finished" }),
          ],
        },
      }),
    );

    expect(output).toContain(
      "- The latest successful Neon operation refresh for neon:project:db returned no current operations; 2 previously recorded operations are retained.",
    );
    expect(output).toContain(
      "- Among 2 previously recorded Neon operations, 1 has last recorded status: failed and 1 has last recorded status: finished.",
    );
  });

  test("renders GitHub and Vercel known-empty facts without current-row claims", () => {
    const github = formatInvestigationContext(
      context({
        subject: resource("github", "repository", "101"),
        subjectWorkflowRuns: {
          kind: "empty",
          observedAt: OBSERVED_AT,
          runs: [],
        },
      }),
    );
    const vercel = formatInvestigationContext(
      context({
        subject: resource("vercel", "project", "prj_app"),
        subjectDeployments: {
          kind: "empty",
          observedAt: OBSERVED_AT,
          deployments: [],
        },
      }),
    );

    expect(github).toContain(
      "- The latest successful GitHub workflow-run refresh for github:repository:101 returned no workflow runs.",
    );
    expect(vercel).toContain(
      "- The latest successful Vercel deployment refresh for vercel:project:prj_app returned no deployments.",
    );
    expect(github).not.toContain("all GitHub evidence is current");
    expect(vercel).not.toContain("all Vercel evidence is current");
  });

  test("renders mixed-family summaries while preserving existing detail sections", () => {
    const project = resource("vercel", "project", "prj_app");
    const repository = resource("github", "repository", "101");
    const edge = sourceFor(repository, project);
    const output = formatInvestigationContext(
      context({
        subject: project,
        subjectDeployments: populatedDeployments([deployment()]),
        related: [
          {
            relationship: edge,
            direction: "inbound",
            resource: repository,
            changes: [],
            deployments: NA_DEPLOYMENTS,
            workflowRuns: populatedRuns([
              workflowRun({
                runId: 9002,
                createdAt: "2026-08-09T11:00:00.000Z",
                conclusion: "failure",
              }),
            ]),
            operations: NA_OPERATIONS,
          },
        ],
      }),
    );

    expect(output).toContain(
      "- Combie currently holds 2 provider activity records in scope: 1 GitHub workflow run and 1 Vercel deployment.",
    );
    expect(output).toContain(
      "- Known provider activity appears on the subject and 1 directly related Resource through source_for.",
    );
    expect(output).toContain(
      "- The newest known provider activity is GitHub workflow run 9002, by created_at 2026-08-09T11:00:00.000Z; its recorded conclusion is failure.",
    );
    expect(output).toContain("DEPLOYMENTS (newest first)");
    expect(output).toContain("WORKFLOW RUNS (newest first)");
    expect(output).toContain("KNOWN PROVIDER ACTIVITY (newest first; incomplete)");
    expect(output).toContain("COMBIE OBSERVATIONS (newest first)");
    for (const unsafe of [
      "occurred together",
      "form a sequence",
      "triggered",
      "caused",
      "produced",
      "fixed",
    ]) {
      expect(output).not.toContain(unsafe);
    }
  });

  test("neighbor-only rows do not turn unknown subject authority into absence", () => {
    const project = resource("vercel", "project", "prj_app");
    const repository = resource("github", "repository", "101");
    const output = formatInvestigationContext(
      context({
        subject: project,
        subjectDeployments: unknownDeployments([]),
        related: [
          {
            relationship: sourceFor(repository, project),
            direction: "inbound",
            resource: repository,
            changes: [],
            deployments: NA_DEPLOYMENTS,
            workflowRuns: populatedRuns([workflowRun()]),
            operations: NA_OPERATIONS,
          },
        ],
      }),
    );
    const knownFacts = output.slice(
      output.indexOf("KNOWN FACTS"),
      output.indexOf("SUBJECT CHANGES"),
    );

    expect(knownFacts).toContain("unknown current refresh authority");
    expect(knownFacts).toContain(
      "Known provider activity rows currently held by Combie come from 1 directly related Resource through source_for.",
    );
    expect(knownFacts).not.toContain("not on the subject");
    expect(knownFacts).not.toContain("no activity on the subject");
  });

  test("populated GitHub and Vercel rows never become latest-refresh counts", () => {
    const github = formatInvestigationContext(
      context({
        subject: resource("github", "repository", "101"),
        subjectWorkflowRuns: populatedRuns([
          workflowRun({ runId: 9002, conclusion: "success" }),
          workflowRun({ runId: 9001, conclusion: "success" }),
        ]),
      }),
    );
    const vercel = formatInvestigationContext(
      context({
        subject: resource("vercel", "project", "prj_app"),
        subjectDeployments: populatedDeployments([
          deployment({ uid: "dpl_2", readyState: "READY" }),
          deployment({ uid: "dpl_1", readyState: "READY" }),
        ]),
      }),
    );
    const factsText = `${github}\n${vercel}`;

    expect(github).toContain("Of 2 GitHub workflow runs held by Combie");
    expect(vercel).toContain("Of 2 Vercel deployments held by Combie");
    expect(factsText).not.toContain("latest refresh returned 2");
    expect(factsText).not.toContain("2 current rows");
    expect(factsText).not.toContain("all GitHub evidence is current");
    expect(factsText).not.toContain("all Vercel evidence is current");
  });

  test("newest wording never narrates correlation or mixes Change clocks", () => {
    const subject = resource("vercel", "project", "prj_app");
    const output = formatInvestigationContext(
      context({
        subject,
        subjectChanges: [
          change("change-2", subject.id, "2026-08-09T14:00:00.000Z"),
          change("change-1", subject.id, "2026-08-09T13:00:00.000Z"),
        ],
        subjectDeployments: populatedDeployments([
          deployment({
            uid: "dpl_2",
            createdAtMs: Date.parse("2026-08-09T10:00:00.000Z"),
            readyState: "READY",
          }),
          deployment({
            uid: "dpl_1",
            createdAtMs: Date.parse("2026-08-09T09:00:00.000Z"),
            readyState: "ERROR",
          }),
        ]),
      }),
    );
    const knownFacts = output.slice(
      output.indexOf("KNOWN FACTS"),
      output.indexOf("SUBJECT CHANGES"),
    );

    expect(knownFacts).toContain(
      "by created 2026-08-09T10:00:00.000Z; its recorded readyState is READY",
    );
    for (const unsafe of [
      "preceded",
      "followed",
      " happened before ",
      " happened after ",
      "occurred together",
      "correlated",
      "related activity",
      "explains",
      "root cause",
      "likely",
      "READY at created",
    ]) {
      expect(knownFacts).not.toContain(unsafe);
    }
  });
});
