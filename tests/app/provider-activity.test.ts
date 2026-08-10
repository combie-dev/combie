import { describe, expect, test } from "bun:test";
import type { InvestigationContext } from "../../src/app/investigate.ts";
import {
  composeProviderActivityChronology,
  nativeEvidenceId,
  type ProviderActivityEntry,
} from "../../src/app/provider-activity.ts";
import {
  createRelationship,
  type Relationship,
} from "../../src/domain/relationship.ts";
import { createResource, type Resource } from "../../src/domain/resource.ts";
import type { GitHubWorkflowRunEvidence } from "../../src/providers/github/workflow-run.ts";
import type { NeonOperationEvidence } from "../../src/providers/neon/operation.ts";
import type {
  DeploymentEvidenceAuthority,
  VercelDeploymentEvidence,
} from "../../src/providers/vercel/deployment.ts";
import type {
  NeonOperationEvidenceAuthority,
} from "../../src/providers/neon/operation.ts";
import type {
  WorkflowRunEvidenceAuthority,
} from "../../src/providers/github/workflow-run.ts";

const CREATED_AT = "2026-08-08T08:00:00.000Z";

function resource(
  provider: string,
  kind: Resource["kind"],
  providerResourceId: string,
  name: string,
): Resource {
  return createResource({
    provider,
    kind,
    providerResourceId,
    name,
    metadata: {},
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
}

function relationship(
  sourceResourceId: string,
  targetResourceId: string,
  kind: Relationship["kind"],
  mechanism: string,
): Relationship {
  return createRelationship({
    sourceResourceId,
    targetResourceId,
    kind,
    evidence: {
      source: "fixture",
      mechanism,
      repository: kind === "source_for" ? "acme/application" : undefined,
      apexName: kind === "uses_domain_in" ? "example.com" : undefined,
    },
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
}

function deployment(
  overrides: Partial<VercelDeploymentEvidence> = {},
): VercelDeploymentEvidence {
  return {
    provider: "vercel",
    uid: "dpl_1",
    resourceId: "vercel:project:prj_subject",
    projectId: "prj_subject",
    readyState: "READY",
    state: "READY",
    target: "production",
    createdAtMs: 1754733600000,
    buildingAtMs: 1754733605000,
    readyAtMs: 1754733900000,
    observedAt: "2026-08-09T12:00:00.000Z",
    source: "git",
    ...overrides,
  };
}

function run(
  overrides: Partial<GitHubWorkflowRunEvidence> = {},
): GitHubWorkflowRunEvidence {
  return {
    provider: "github",
    runId: 9001,
    resourceId: "github:repository:915052094",
    repositoryId: "915052094",
    workflowId: 1,
    name: "ci",
    runNumber: 12,
    runAttempt: 1,
    event: "push",
    status: "completed",
    conclusion: "success",
    headBranch: "main",
    headSha: "abc123",
    createdAt: "2026-08-09T10:00:00.000Z",
    runStartedAt: "2026-08-09T10:00:05.000Z",
    updatedAt: "2026-08-09T10:01:00.000Z",
    observedAt: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

function operation(
  overrides: Partial<NeonOperationEvidence> = {},
): NeonOperationEvidence {
  return {
    provider: "neon",
    operationId: "op_1",
    resourceId: "neon:project:neon_subject",
    projectId: "neon_subject",
    action: "start_compute",
    status: "finished",
    failuresCount: 0,
    branchId: null,
    endpointId: "ep_1",
    createdAt: "2026-08-09T08:47:52.000Z",
    updatedAt: "2026-08-09T08:48:10.000Z",
    retryAt: null,
    totalDurationMs: 18000,
    observedAt: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

const NOT_APPLICABLE_DEPLOYMENTS: DeploymentEvidenceAuthority = {
  kind: "not_applicable",
};
const NOT_APPLICABLE_RUNS: WorkflowRunEvidenceAuthority = {
  kind: "not_applicable",
};
const NOT_APPLICABLE_OPERATIONS: NeonOperationEvidenceAuthority = {
  kind: "not_applicable",
};

function populatedDeployments(
  deployments: VercelDeploymentEvidence[],
): DeploymentEvidenceAuthority {
  return {
    kind: "populated",
    observedAt: "2026-08-09T12:00:00.000Z",
    resultCount: deployments.length,
    deployments,
  };
}

function populatedRuns(
  runs: GitHubWorkflowRunEvidence[],
): WorkflowRunEvidenceAuthority {
  return {
    kind: "populated",
    observedAt: "2026-08-09T12:00:00.000Z",
    resultCount: runs.length,
    runs,
  };
}

function populatedOperations(
  operations: NeonOperationEvidence[],
): NeonOperationEvidenceAuthority {
  return {
    kind: "populated",
    observedAt: "2026-08-09T12:00:00.000Z",
    operations,
  };
}

function context(
  overrides: Partial<InvestigationContext> = {},
): InvestigationContext {
  return {
    subject: resource("vercel", "project", "prj_subject", "application"),
    subjectChanges: [],
    related: [],
    subjectDeployments: NOT_APPLICABLE_DEPLOYMENTS,
    subjectWorkflowRuns: NOT_APPLICABLE_RUNS,
    subjectOperations: NOT_APPLICABLE_OPERATIONS,
    ...overrides,
  };
}

describe("provider activity chronology composition", () => {
  test("projects Vercel deployments only", () => {
    const first = deployment({ uid: "dpl_a", createdAtMs: 2000 });
    const second = deployment({ uid: "dpl_b", createdAtMs: 1000 });
    const chronology = composeProviderActivityChronology(
      context({ subjectDeployments: populatedDeployments([first, second]) }),
    );

    expect(chronology.entries).toHaveLength(2);
    expect(chronology.entries.every((e) => e.family === "vercel_deployment")).toBe(true);
    expect(chronology.entries[0]!.evidence).toBe(first);
    expect(chronology.entries[1]!.evidence).toBe(second);
  });

  test("projects GitHub workflow runs only", () => {
    const only = run();
    const chronology = composeProviderActivityChronology(
      context({
        subject: resource("github", "repository", "915052094", "application"),
        subjectWorkflowRuns: populatedRuns([only]),
      }),
    );

    expect(chronology.entries).toHaveLength(1);
    expect(chronology.entries[0]!.family).toBe("github_workflow_run");
    expect(chronology.entries[0]!.evidence).toBe(only);
  });

  test("projects Neon operations only", () => {
    const only = operation();
    const chronology = composeProviderActivityChronology(
      context({
        subject: resource("neon", "project", "neon_subject", "application"),
        subjectOperations: populatedOperations([only]),
      }),
    );

    expect(chronology.entries).toHaveLength(1);
    expect(chronology.entries[0]!.family).toBe("neon_operation");
    expect(chronology.entries[0]!.evidence).toBe(only);
  });

  test("projects all three families from subject and one-hop neighbors", () => {
    const subject = resource("vercel", "project", "prj_subject", "application");
    const repository = resource("github", "repository", "915052094", "application");
    const neonProject = resource("neon", "project", "neon_subject", "application");
    const sourceFor = relationship(
      repository.id,
      subject.id,
      "source_for",
      "git_repository_reference",
    );
    const usesDomain = relationship(
      subject.id,
      neonProject.id,
      "uses_domain_in",
      "custom_domain_match",
    );
    const chronology = composeProviderActivityChronology(context({
      subject,
      subjectDeployments: populatedDeployments([deployment()]),
      related: [
        {
          relationship: sourceFor,
          direction: "inbound",
          resource: repository,
          changes: [],
          deployments: NOT_APPLICABLE_DEPLOYMENTS,
          workflowRuns: populatedRuns([run()]),
          operations: NOT_APPLICABLE_OPERATIONS,
        },
        {
          relationship: usesDomain,
          direction: "outbound",
          resource: neonProject,
          changes: [],
          deployments: NOT_APPLICABLE_DEPLOYMENTS,
          workflowRuns: NOT_APPLICABLE_RUNS,
          operations: populatedOperations([operation()]),
        },
      ],
    }));

    expect(chronology.entries.map((e) => e.family)).toEqual([
      "github_workflow_run",
      "neon_operation",
      "vercel_deployment",
    ]);
  });

  test("empty evidence produces zero entries", () => {
    const chronology = composeProviderActivityChronology(context());
    expect(chronology.entries).toEqual([]);
  });

  test("orders newest first by provider-native primary time", () => {
    const oldest = deployment({ uid: "dpl_old", createdAtMs: 1000 });
    const newest = deployment({ uid: "dpl_new", createdAtMs: 3000 });
    const middle = deployment({ uid: "dpl_mid", createdAtMs: 2000 });
    const chronology = composeProviderActivityChronology(
      context({ subjectDeployments: populatedDeployments([oldest, newest, middle]) }),
    );

    expect(chronology.entries.map((e) => nativeEvidenceId(e))).toEqual([
      "dpl_new",
      "dpl_mid",
      "dpl_old",
    ]);
  });

  test("equal timestamps use family then native id tie-breaks", () => {
    const at = "2026-08-09T10:00:00.000Z";
    const chronology = composeProviderActivityChronology(context({
      subjectDeployments: populatedDeployments([
        deployment({ uid: "dpl_a", createdAtMs: Date.parse(at) }),
        deployment({ uid: "dpl_b", createdAtMs: Date.parse(at) }),
      ]),
      related: [
        {
          relationship: relationship(
            "github:repository:915052094",
            "vercel:project:prj_subject",
            "source_for",
            "git_repository_reference",
          ),
          direction: "inbound",
          resource: resource("github", "repository", "915052094", "application"),
          changes: [],
          deployments: NOT_APPLICABLE_DEPLOYMENTS,
          workflowRuns: populatedRuns([
            run({ runId: 9, createdAt: at }),
            run({ runId: 10, createdAt: at }),
          ]),
          operations: NOT_APPLICABLE_OPERATIONS,
        },
        {
          relationship: relationship(
            "vercel:project:prj_subject",
            "neon:project:neon_subject",
            "uses_domain_in",
            "custom_domain_match",
          ),
          direction: "outbound",
          resource: resource("neon", "project", "neon_subject", "application"),
          changes: [],
          deployments: NOT_APPLICABLE_DEPLOYMENTS,
          workflowRuns: NOT_APPLICABLE_RUNS,
          operations: populatedOperations([
            operation({ operationId: "op_a", createdAt: at }),
            operation({ operationId: "op_b", createdAt: at }),
          ]),
        },
      ],
    }));

    expect(chronology.entries.map((e) => `${e.family}:${nativeEvidenceId(e)}`)).toEqual([
      "github_workflow_run:10",
      "github_workflow_run:9",
      "neon_operation:op_b",
      "neon_operation:op_a",
      "vercel_deployment:dpl_b",
      "vercel_deployment:dpl_a",
    ]);
  });

  test("repeated composition over unchanged input is identical", () => {
    const input = context({
      subjectDeployments: populatedDeployments([
        deployment({ uid: "dpl_a", createdAtMs: 2000 }),
        deployment({ uid: "dpl_b", createdAtMs: 1000 }),
      ]),
    });
    const first = composeProviderActivityChronology(input);
    const second = composeProviderActivityChronology(input);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  test("does not mutate the investigation context", () => {
    const input = context({
      subjectDeployments: populatedDeployments([
        deployment({ uid: "dpl_a", createdAtMs: 2000 }),
        deployment({ uid: "dpl_b", createdAtMs: 1000 }),
      ]),
    });
    const before = JSON.stringify(input);
    composeProviderActivityChronology(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  test("primary time is the provider created time, never a later lifecycle time", () => {
    const evidence = deployment({
      createdAtMs: 1000,
      buildingAtMs: 2000,
      readyAtMs: 3000,
      readyState: "READY",
    });
    const chronology = composeProviderActivityChronology(
      context({ subjectDeployments: populatedDeployments([evidence]) }),
    );

    expect(chronology.entries[0]!.primaryTime).toBe(
      new Date(1000).toISOString(),
    );
  });

  test("secondary lifecycle timestamps remain evidence attributes", () => {
    const evidence = deployment({
      createdAtMs: 1000,
      buildingAtMs: 2000,
      readyAtMs: 3000,
    });
    const chronology = composeProviderActivityChronology(
      context({ subjectDeployments: populatedDeployments([evidence]) }),
    );

    const entry = chronology.entries[0]!;
    expect(entry.family).toBe("vercel_deployment");
    if (entry.family !== "vercel_deployment") return;
    expect(entry.evidence.buildingAtMs).toBe(2000);
    expect(entry.evidence.readyAtMs).toBe(3000);
  });

  test("observedAt is preserved but never drives chronology ordering", () => {
    const earlyCreated = deployment({
      uid: "dpl_early",
      createdAtMs: 1000,
      observedAt: "2026-08-09T23:00:00.000Z",
    });
    const lateCreated = deployment({
      uid: "dpl_late",
      createdAtMs: 2000,
      observedAt: "2026-08-09T01:00:00.000Z",
    });
    const chronology = composeProviderActivityChronology(
      context({
        subjectDeployments: populatedDeployments([earlyCreated, lateCreated]),
      }),
    );

    expect(chronology.entries.map((e) => nativeEvidenceId(e))).toEqual([
      "dpl_late",
      "dpl_early",
    ]);
    const earlyEntry = chronology.entries[1]!;
    expect(earlyEntry.family).toBe("vercel_deployment");
    if (earlyEntry.family !== "vercel_deployment") return;
    expect(earlyEntry.evidence.observedAt).toBe("2026-08-09T23:00:00.000Z");
  });

  test("subject entries carry subject role and no relationships", () => {
    const chronology = composeProviderActivityChronology(
      context({ subjectDeployments: populatedDeployments([deployment()]) }),
    );

    expect(chronology.entries[0]!.role).toBe("subject");
    expect(chronology.entries[0]!.relationships).toEqual([]);
    expect(chronology.entries[0]!.resourceId).toBe("vercel:project:prj_subject");
  });

  test("neighbor entries preserve inbound Relationship provenance", () => {
    const subject = resource("vercel", "project", "prj_subject", "application");
    const repository = resource("github", "repository", "915052094", "application");
    const edge = relationship(
      repository.id,
      subject.id,
      "source_for",
      "git_repository_reference",
    );
    const chronology = composeProviderActivityChronology(context({
      subject,
      related: [
        {
          relationship: edge,
          direction: "inbound",
          resource: repository,
          changes: [],
          deployments: NOT_APPLICABLE_DEPLOYMENTS,
          workflowRuns: populatedRuns([run()]),
          operations: NOT_APPLICABLE_OPERATIONS,
        },
      ],
    }));

    const entry = chronology.entries[0]!;
    expect(entry.role).toBe("related");
    expect(entry.relationships).toEqual([{ relationship: edge, direction: "inbound" }]);
    expect(entry.relationships[0]!.relationship).toBe(edge);
  });

  test("neighbor entries preserve outbound Relationship provenance", () => {
    const subject = resource("vercel", "project", "prj_subject", "application");
    const neonProject = resource("neon", "project", "neon_subject", "application");
    const edge = relationship(
      subject.id,
      neonProject.id,
      "uses_domain_in",
      "custom_domain_match",
    );
    const chronology = composeProviderActivityChronology(context({
      subject,
      related: [
        {
          relationship: edge,
          direction: "outbound",
          resource: neonProject,
          changes: [],
          deployments: NOT_APPLICABLE_DEPLOYMENTS,
          workflowRuns: NOT_APPLICABLE_RUNS,
          operations: populatedOperations([operation()]),
        },
      ],
    }));

    const entry = chronology.entries[0]!;
    expect(entry.role).toBe("related");
    expect(entry.relationships).toEqual([
      { relationship: edge, direction: "outbound" },
    ]);
  });

  test("multi-edge neighbors dedupe evidence and keep every Relationship path", () => {
    const subject = resource("vercel", "project", "prj_subject", "application");
    const repository = resource("github", "repository", "915052094", "application");
    const firstEdge = relationship(
      repository.id,
      subject.id,
      "source_for",
      "git_repository_reference",
    );
    const secondEdge = relationship(
      subject.id,
      repository.id,
      "uses_domain_in",
      "custom_domain_match",
    );
    const sharedRun = run();
    const chronology = composeProviderActivityChronology(context({
      subject,
      related: [
        {
          relationship: firstEdge,
          direction: "inbound",
          resource: repository,
          changes: [],
          deployments: NOT_APPLICABLE_DEPLOYMENTS,
          workflowRuns: populatedRuns([sharedRun]),
          operations: NOT_APPLICABLE_OPERATIONS,
        },
        {
          relationship: secondEdge,
          direction: "outbound",
          resource: repository,
          changes: [],
          deployments: NOT_APPLICABLE_DEPLOYMENTS,
          workflowRuns: populatedRuns([sharedRun]),
          operations: NOT_APPLICABLE_OPERATIONS,
        },
      ],
    }));

    expect(chronology.entries).toHaveLength(1);
    expect(chronology.entries[0]!.relationships).toEqual([
      { relationship: firstEdge, direction: "inbound" },
      { relationship: secondEdge, direction: "outbound" },
    ]);
  });

  test("dangling neighbors contribute no provider activity", () => {
    const subject = resource("vercel", "project", "prj_subject", "application");
    const edge = relationship(
      "github:repository:404",
      subject.id,
      "source_for",
      "git_repository_reference",
    );
    const chronology = composeProviderActivityChronology(context({
      subject,
      related: [
        {
          relationship: edge,
          direction: "inbound",
          resource: null,
          changes: [],
          deployments: NOT_APPLICABLE_DEPLOYMENTS,
          workflowRuns: NOT_APPLICABLE_RUNS,
          operations: NOT_APPLICABLE_OPERATIONS,
        },
      ],
    }));

    expect(chronology.entries).toEqual([]);
  });

  test("unknown refresh retains stale evidence instead of becoming empty", () => {
    const stale = deployment();
    const chronology = composeProviderActivityChronology(context({
      subjectDeployments: {
        kind: "unknown",
        deployments: [stale],
        lastSuccessAt: null,
        resultCount: null,
        message: "refresh failed",
      },
    }));

    expect(chronology.entries).toHaveLength(1);
    expect(chronology.entries[0]!.authority).toBe("unknown");
    expect(chronology.entries[0]!.evidence).toBe(stale);
  });

  test("known-empty Vercel and GitHub authorities project no entries", () => {
    const chronology = composeProviderActivityChronology(context({
      subjectDeployments: {
        kind: "empty",
        observedAt: "2026-08-09T12:00:00.000Z",
        resultCount: null,
        deployments: [],
      },
      subjectWorkflowRuns: {
        kind: "empty",
        observedAt: "2026-08-09T12:00:00.000Z",
        resultCount: null,
        runs: [],
      },
    }));

    expect(chronology.entries).toEqual([]);
  });

  test("known-empty Neon authority still projects retained history", () => {
    const retained = operation();
    const chronology = composeProviderActivityChronology(context({
      subject: resource("neon", "project", "neon_subject", "application"),
      subjectOperations: {
        kind: "empty",
        observedAt: "2026-08-09T12:00:00.000Z",
        operations: [retained],
      },
    }));

    expect(chronology.entries).toHaveLength(1);
    expect(chronology.entries[0]!.authority).toBe("empty");
    expect(chronology.entries[0]!.evidence).toBe(retained);
  });

  test("populated authority is preserved on entries", () => {
    const chronology = composeProviderActivityChronology(
      context({ subjectDeployments: populatedDeployments([deployment()]) }),
    );

    expect(chronology.entries[0]!.authority).toBe("populated");
  });

  test("chronology never invents Relationships beyond the context edges", () => {
    const subject = resource("vercel", "project", "prj_subject", "application");
    const repository = resource("github", "repository", "915052094", "application");
    const edge = relationship(
      repository.id,
      subject.id,
      "source_for",
      "git_repository_reference",
    );
    const chronology = composeProviderActivityChronology(context({
      subject,
      related: [
        {
          relationship: edge,
          direction: "inbound",
          resource: repository,
          changes: [],
          deployments: NOT_APPLICABLE_DEPLOYMENTS,
          workflowRuns: populatedRuns([run()]),
          operations: NOT_APPLICABLE_OPERATIONS,
        },
      ],
    }));

    const relationships = chronology.entries.flatMap((e) => e.relationships);
    expect(relationships).toHaveLength(1);
    expect(relationships[0]!.relationship.id).toBe(edge.id);
  });

  test("chronology subject is the investigation subject", () => {
    const subject = resource("vercel", "project", "prj_subject", "application");
    const chronology = composeProviderActivityChronology(context({ subject }));
    expect(chronology.subject).toBe(subject);
  });

  test("cross-family permutations keep deterministic newest-first order", () => {
    const subject = resource("vercel", "project", "prj_subject", "application");
    const repository = resource("github", "repository", "915052094", "application");
    const neonProject = resource("neon", "project", "neon_subject", "application");
    const sourceFor = relationship(
      repository.id,
      subject.id,
      "source_for",
      "git_repository_reference",
    );
    const usesDomain = relationship(
      subject.id,
      neonProject.id,
      "uses_domain_in",
      "custom_domain_match",
    );
    const cases: Array<{
      vercelAt: number;
      githubAt: string;
      neonAt: string;
      expected: string[];
    }> = [
      {
        vercelAt: 1000,
        githubAt: "2026-08-09T10:00:00.000Z",
        neonAt: "2026-08-09T09:00:00.000Z",
        expected: ["9001", "op_1", "dpl_1"],
      },
      {
        vercelAt: Date.parse("2026-08-09T11:00:00.000Z"),
        githubAt: "2026-08-09T09:00:00.000Z",
        neonAt: "2026-08-09T10:00:00.000Z",
        expected: ["dpl_1", "op_1", "9001"],
      },
      {
        vercelAt: Date.parse("2026-08-09T09:30:00.000Z"),
        githubAt: "2026-08-09T09:00:00.000Z",
        neonAt: "2026-08-09T11:00:00.000Z",
        expected: ["op_1", "dpl_1", "9001"],
      },
    ];

    for (const item of cases) {
      const chronology = composeProviderActivityChronology(context({
        subject,
        subjectDeployments: populatedDeployments([
          deployment({ createdAtMs: item.vercelAt }),
        ]),
        related: [
          {
            relationship: sourceFor,
            direction: "inbound",
            resource: repository,
            changes: [],
            deployments: NOT_APPLICABLE_DEPLOYMENTS,
            workflowRuns: populatedRuns([run({ createdAt: item.githubAt })]),
            operations: NOT_APPLICABLE_OPERATIONS,
          },
          {
            relationship: usesDomain,
            direction: "outbound",
            resource: neonProject,
            changes: [],
            deployments: NOT_APPLICABLE_DEPLOYMENTS,
            workflowRuns: NOT_APPLICABLE_RUNS,
            operations: populatedOperations([
              operation({ createdAt: item.neonAt }),
            ]),
          },
        ],
      }));
      expect(chronology.entries.map((e) => nativeEvidenceId(e))).toEqual(
        item.expected,
      );
    }
  });
});
