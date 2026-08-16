import { describe, expect, test } from "bun:test";
import {
  formatInvestigationContext,
  type InvestigationContext,
} from "../../src/app/investigate.ts";
import {
  composeInvestigationFacts,
  MAX_INVESTIGATION_FACTS,
} from "../../src/app/investigation-facts.ts";
import {
  composeMissingContext,
  formatMissingContextItem,
  type MissingContextItem,
} from "../../src/app/missing-context.ts";
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
import type {
  IssueEvidenceAuthority,
  SentryIssueEvidence,
} from "../../src/providers/sentry/issue.ts";
import type {
  ReleaseEvidenceAuthority,
  SentryReleaseEvidence,
} from "../../src/providers/sentry/release.ts";

const OBSERVED_AT = "2026-08-09T12:00:00.000Z";
const SUCCESS_AT = "2026-08-09T11:00:00.000Z";
const ATTEMPT_AT = "2026-08-09T12:30:00.000Z";

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
    gitCommitSha: null,
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

const NA_DEPLOYMENTS: DeploymentEvidenceAuthority = { kind: "not_applicable" };
const NA_RUNS: WorkflowRunEvidenceAuthority = { kind: "not_applicable" };
const NA_OPERATIONS: NeonOperationEvidenceAuthority = { kind: "not_applicable" };

function unknownDeployments(
  items: VercelDeploymentEvidence[],
  overrides: Partial<
    Extract<DeploymentEvidenceAuthority, { kind: "unknown" }>
  > = {},
): DeploymentEvidenceAuthority {
  return {
    kind: "unknown",
    deployments: items,
    latestAttemptObservedAt: null,
    lastSuccessAt: null,
    resultCount: null,
    message: null,
    ...overrides,
  };
}

function unknownRuns(
  items: GitHubWorkflowRunEvidence[],
  overrides: Partial<
    Extract<WorkflowRunEvidenceAuthority, { kind: "unknown" }>
  > = {},
): WorkflowRunEvidenceAuthority {
  return {
    kind: "unknown",
    runs: items,
    latestAttemptObservedAt: null,
    lastSuccessAt: null,
    resultCount: null,
    message: null,
    ...overrides,
  };
}

function unknownOperations(
  items: NeonOperationEvidence[],
  overrides: Partial<
    Extract<NeonOperationEvidenceAuthority, { kind: "unknown" }>
  > = {},
): NeonOperationEvidenceAuthority {
  return {
    kind: "unknown",
    operations: items,
    latestAttemptObservedAt: null,
    lastSuccessAt: null,
    message: null,
    ...overrides,
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
    subjectReleases: { kind: "not_applicable" as const },
    subjectIssues: { kind: "not_applicable" as const },
    ...overrides,
  };
}

function kinds(items: MissingContextItem[]): string[] {
  return items.map((item) => item.kind);
}

describe("composeMissingContext", () => {
  test("is pure, deterministic, and input-order independent for related neighbors", () => {
    const repo = resource("github", "repository", "101");
    const project = resource("vercel", "project", "prj_app");
    const edge = createRelationship({
      sourceResourceId: repo.id,
      targetResourceId: project.id,
      kind: "source_for",
      evidence: { source: "vercel", mechanism: "git_repository_reference" },
    });
    const base = context({
      subject: project,
      subjectDeployments: unknownDeployments([], {
        latestAttemptObservedAt: ATTEMPT_AT,
        lastSuccessAt: SUCCESS_AT,
        resultCount: 2,
        message: "timeout",
      }),
      related: [
        {
          relationship: edge,
          direction: "inbound",
          resource: repo,
          changes: [],
          deployments: NA_DEPLOYMENTS,
          workflowRuns: unknownRuns([]),
          operations: NA_OPERATIONS,
      releases: { kind: "not_applicable" as const },
      issues: { kind: "not_applicable" as const },
        },
      ],
    });
    const first = composeMissingContext(base);
    const second = composeMissingContext({
      ...base,
      related: [...base.related].reverse(),
    });
    expect(first).toEqual(second);
    expect(composeMissingContext(base)).toEqual(first);
  });

  test("zero state when no supported gaps exist", () => {
    const items = composeMissingContext(
      context({
        subject: resource("vercel", "project", "prj_app"),
        related: [
          {
            relationship: createRelationship({
              sourceResourceId: "github:repository:101",
              targetResourceId: "vercel:project:prj_app",
              kind: "source_for",
              evidence: { source: "vercel", mechanism: "git" },
            }),
            direction: "inbound",
            resource: resource("github", "repository", "101"),
            changes: [],
            deployments: NA_DEPLOYMENTS,
            workflowRuns: {
              kind: "populated",
              observedAt: OBSERVED_AT,
              resultCount: 1,
              runs: [workflowRun()],
            },
            operations: NA_OPERATIONS,
      releases: { kind: "not_applicable" as const },
      issues: { kind: "not_applicable" as const },
          },
        ],
        subjectDeployments: {
          kind: "populated",
          observedAt: OBSERVED_AT,
          resultCount: 1,
          deployments: [deployment()],
        },
      }),
    );
    // Has a relationship and populated authority — no missing-context items.
    expect(items).toEqual([]);
  });

  test("no_known_relationships only when related is empty", () => {
    const alone = composeMissingContext(
      context({
        subject: resource("neon", "project", "db"),
        subjectOperations: {
          kind: "populated",
          observedAt: OBSERVED_AT,
          operations: [neonOperation()],
        },
      }),
    );
    expect(alone).toEqual([
      {
        kind: "no_known_relationships",
        scope: {
          resourceId: "neon:project:db",
          role: "subject",
          relationships: [],
        },
      },
    ]);
    expect(formatMissingContextItem(alone[0]!)).toBe(
      "No one-hop Relationships are currently known to Combie for neon:project:db.",
    );
    expect(formatMissingContextItem(alone[0]!)).not.toContain(
      "has no Relationships",
    );

    const withEdge = composeMissingContext(
      context({
        subject: resource("vercel", "project", "prj_app"),
        subjectDeployments: {
          kind: "populated",
          observedAt: OBSERVED_AT,
          resultCount: 0,
          deployments: [],
        },
        related: [
          {
            relationship: createRelationship({
              sourceResourceId: "github:repository:101",
              targetResourceId: "vercel:project:prj_app",
              kind: "source_for",
              evidence: { source: "vercel", mechanism: "git" },
            }),
            direction: "inbound",
            resource: resource("github", "repository", "101"),
            changes: [],
            deployments: NA_DEPLOYMENTS,
            workflowRuns: {
              kind: "populated",
              observedAt: OBSERVED_AT,
              resultCount: 1,
              runs: [workflowRun()],
            },
            operations: NA_OPERATIONS,
      releases: { kind: "not_applicable" as const },
      issues: { kind: "not_applicable" as const },
          },
        ],
      }),
    );
    expect(kinds(withEdge)).not.toContain("no_known_relationships");
  });

  test("known empty is knowledge and never becomes Missing Context", () => {
    for (const subjectDeployments of [
      {
        kind: "empty" as const,
        observedAt: OBSERVED_AT,
        resultCount: 0,
        deployments: [] as VercelDeploymentEvidence[],
      },
      {
        kind: "empty" as const,
        observedAt: OBSERVED_AT,
        resultCount: 0,
        deployments: [deployment({ uid: "dpl_old" })],
      },
    ]) {
      const items = composeMissingContext(
        context({
          subject: resource("vercel", "project", "prj_app"),
          subjectDeployments,
          related: [
            {
              relationship: createRelationship({
                sourceResourceId: "github:repository:101",
                targetResourceId: "vercel:project:prj_app",
                kind: "source_for",
                evidence: { source: "vercel", mechanism: "git" },
              }),
              direction: "inbound",
              resource: resource("github", "repository", "101"),
              changes: [],
              deployments: NA_DEPLOYMENTS,
              workflowRuns: {
                kind: "empty",
                observedAt: OBSERVED_AT,
                resultCount: 0,
                runs: [workflowRun()],
              },
              operations: NA_OPERATIONS,
      releases: { kind: "not_applicable" as const },
      issues: { kind: "not_applicable" as const },
            },
          ],
        }),
      );
      expect(items.every((item) => item.kind === "no_known_relationships" || item.kind === "never_successfully_refreshed" || item.kind === "unknown_current_authority")).toBe(true);
      expect(
        items.filter(
          (item) =>
            item.kind === "never_successfully_refreshed" ||
            item.kind === "unknown_current_authority",
        ),
      ).toEqual([]);
    }

    const neonEmpty = composeMissingContext(
      context({
        subject: resource("neon", "project", "db"),
        subjectOperations: {
          kind: "empty",
          observedAt: OBSERVED_AT,
          operations: [neonOperation()],
        },
      }),
    );
    expect(
      neonEmpty.filter((item) => item.kind !== "no_known_relationships"),
    ).toEqual([]);
  });

  test("never_successfully_refreshed vs unknown_current_authority are exclusive", () => {
    const never = composeMissingContext(
      context({
        subject: resource("github", "repository", "101"),
        subjectWorkflowRuns: unknownRuns([]),
        related: [
          {
            relationship: createRelationship({
              sourceResourceId: "github:repository:101",
              targetResourceId: "vercel:project:prj_app",
              kind: "source_for",
              evidence: { source: "vercel", mechanism: "git" },
            }),
            direction: "outbound",
            resource: resource("vercel", "project", "prj_app"),
            changes: [],
            deployments: {
              kind: "populated",
              observedAt: OBSERVED_AT,
              resultCount: 1,
              deployments: [deployment()],
            },
            workflowRuns: NA_RUNS,
            operations: NA_OPERATIONS,
      releases: { kind: "not_applicable" as const },
      issues: { kind: "not_applicable" as const },
          },
        ],
      }),
    );
    expect(never).toContainEqual(
      expect.objectContaining({
        kind: "never_successfully_refreshed",
        family: "github_workflow_run",
        scope: expect.objectContaining({ resourceId: "github:repository:101" }),
        retainedCount: 0,
      }),
    );
    expect(
      never.filter(
        (item) =>
          item.kind === "unknown_current_authority" &&
          item.family === "github_workflow_run",
      ),
    ).toEqual([]);

    const afterSuccess = composeMissingContext(
      context({
        subject: resource("github", "repository", "101"),
        subjectWorkflowRuns: unknownRuns(
          [workflowRun(), workflowRun({ runId: 9002 })],
          {
            latestAttemptObservedAt: ATTEMPT_AT,
            lastSuccessAt: SUCCESS_AT,
            resultCount: 3,
            message: "403",
          },
        ),
        related: [
          {
            relationship: createRelationship({
              sourceResourceId: "github:repository:101",
              targetResourceId: "vercel:project:prj_app",
              kind: "source_for",
              evidence: { source: "vercel", mechanism: "git" },
            }),
            direction: "outbound",
            resource: resource("vercel", "project", "prj_app"),
            changes: [],
            deployments: {
              kind: "populated",
              observedAt: OBSERVED_AT,
              resultCount: 1,
              deployments: [deployment()],
            },
            workflowRuns: NA_RUNS,
            operations: NA_OPERATIONS,
      releases: { kind: "not_applicable" as const },
      issues: { kind: "not_applicable" as const },
          },
        ],
      }),
    );
    expect(afterSuccess).toContainEqual(
      expect.objectContaining({
        kind: "unknown_current_authority",
        family: "github_workflow_run",
        retainedCount: 2,
        lastSuccessfulObservedAt: SUCCESS_AT,
        lastSuccessfulResultCount: 3,
        latestAttemptObservedAt: ATTEMPT_AT,
      }),
    );
    expect(
      afterSuccess.filter(
        (item) =>
          item.kind === "never_successfully_refreshed" &&
          item.family === "github_workflow_run",
      ),
    ).toEqual([]);
  });

  test("covers Vercel, GitHub, and Neon subject/neighbor unknowns with retained rows", () => {
    const repo = resource("github", "repository", "101");
    const project = resource("vercel", "project", "prj_app");
    const neon = resource("neon", "project", "db");
    const edge = createRelationship({
      sourceResourceId: repo.id,
      targetResourceId: project.id,
      kind: "source_for",
      evidence: { source: "vercel", mechanism: "git" },
    });
    // Neon is subject alone for operations + no relationships case is separate.
    const neonItems = composeMissingContext(
      context({
        subject: neon,
        subjectOperations: unknownOperations([neonOperation()], {
          latestAttemptObservedAt: ATTEMPT_AT,
          lastSuccessAt: SUCCESS_AT,
          message: "rate limited",
        }),
      }),
    );
    expect(neonItems).toContainEqual(
      expect.objectContaining({
        kind: "unknown_current_authority",
        family: "neon_operation",
        retainedCount: 1,
        lastSuccessfulObservedAt: SUCCESS_AT,
        lastSuccessfulResultCount: null,
      }),
    );

    const items = composeMissingContext(
      context({
        subject: project,
        subjectDeployments: unknownDeployments([deployment()], {
          lastSuccessAt: SUCCESS_AT,
          resultCount: 1,
          latestAttemptObservedAt: ATTEMPT_AT,
        }),
        related: [
          {
            relationship: edge,
            direction: "inbound",
            resource: repo,
            changes: [],
            deployments: NA_DEPLOYMENTS,
            workflowRuns: unknownRuns([workflowRun()], {
              lastSuccessAt: SUCCESS_AT,
              resultCount: 100,
              latestAttemptObservedAt: ATTEMPT_AT,
            }),
            operations: NA_OPERATIONS,
      releases: { kind: "not_applicable" as const },
      issues: { kind: "not_applicable" as const },
          },
        ],
      }),
    );
    expect(kinds(items)).toEqual([
      "unknown_current_authority",
      "unknown_current_authority",
    ]);
    expect(items.map((item) => ("family" in item ? item.family : ""))).toEqual([
      "github_workflow_run",
      "vercel_deployment",
    ]);
  });

  test("not_applicable families produce no gaps", () => {
    const items = composeMissingContext(
      context({
        subject: resource("cloudflare", "zone", "zone-1"),
        related: [
          {
            relationship: createRelationship({
              sourceResourceId: "vercel:project:prj_app",
              targetResourceId: "cloudflare:zone:zone-1",
              kind: "uses_domain_in",
              evidence: { source: "vercel", mechanism: "domain" },
            }),
            direction: "inbound",
            resource: resource("vercel", "project", "prj_app"),
            changes: [],
            deployments: {
              kind: "populated",
              observedAt: OBSERVED_AT,
              resultCount: 1,
              deployments: [deployment()],
            },
            workflowRuns: NA_RUNS,
            operations: NA_OPERATIONS,
      releases: { kind: "not_applicable" as const },
      issues: { kind: "not_applicable" as const },
          },
        ],
      }),
    );
    expect(items).toEqual([]);
  });

  test("dedupes multi-edge neighbors and preserves relationship paths", () => {
    const repo = resource("github", "repository", "101");
    const project = resource("vercel", "project", "prj_app");
    const edgeA = createRelationship({
      sourceResourceId: repo.id,
      targetResourceId: project.id,
      kind: "source_for",
      evidence: { source: "vercel", mechanism: "git_a" },
    });
    // Same endpoints/kind would collide on relationship id generation — use
    // second edge from same repo via a distinct synthetic path only if ids differ.
    // Multi-edge same neighbor: two Relationship objects with different ids.
    const edgeB = {
      ...edgeA,
      id: "rel_second_path",
      evidence: { source: "vercel", mechanism: "git_b" },
    };
    const items = composeMissingContext(
      context({
        subject: project,
        subjectDeployments: {
          kind: "populated",
          observedAt: OBSERVED_AT,
          resultCount: 1,
          deployments: [deployment()],
        },
        related: [
          {
            relationship: edgeA,
            direction: "inbound",
            resource: repo,
            changes: [],
            deployments: NA_DEPLOYMENTS,
            workflowRuns: unknownRuns([]),
            operations: NA_OPERATIONS,
      releases: { kind: "not_applicable" as const },
      issues: { kind: "not_applicable" as const },
          },
          {
            relationship: edgeB,
            direction: "inbound",
            resource: repo,
            changes: [],
            deployments: NA_DEPLOYMENTS,
            workflowRuns: unknownRuns([]),
            operations: NA_OPERATIONS,
      releases: { kind: "not_applicable" as const },
      issues: { kind: "not_applicable" as const },
          },
        ],
      }),
    );
    const githubGaps = items.filter(
      (item) =>
        item.kind === "never_successfully_refreshed" &&
        item.family === "github_workflow_run",
    );
    expect(githubGaps).toHaveLength(1);
    if (githubGaps[0]?.scope.role === "related") {
      expect(githubGaps[0].scope.relationships).toHaveLength(2);
    }
  });

  test("stable category order: never-success before unknown before no-relationships", () => {
    const items = composeMissingContext(
      context({
        subject: resource("vercel", "project", "prj_app"),
        subjectDeployments: unknownDeployments([], {
          lastSuccessAt: SUCCESS_AT,
          resultCount: 1,
        }),
        subjectWorkflowRuns: NA_RUNS,
        subjectOperations: NA_OPERATIONS,
      }),
    );
    // subject is vercel project: deployments unknown-after-success + no relationships
    // also not_applicable for runs/ops
    expect(kinds(items)).toEqual([
      "unknown_current_authority",
      "no_known_relationships",
    ]);

    const neverPlusNone = composeMissingContext(
      context({
        subject: resource("github", "repository", "101"),
        subjectWorkflowRuns: unknownRuns([]),
      }),
    );
    expect(kinds(neverPlusNone)).toEqual([
      "never_successfully_refreshed",
      "no_known_relationships",
    ]);
  });

  test("coexisting retained releases and issues emit no deterministic linkage", () => {
    const project = resource("sentry", "project", "450");
    const items = composeMissingContext(
      context({
        subject: project,
        subjectReleases: {
          kind: "populated",
          observedAt: OBSERVED_AT,
          resultCount: 1,
          releases: [
            {
              provider: "sentry",
              version: "1.4.2",
              resourceId: project.id,
              projectId: "450",
              shortVersion: null,
              status: "open",
              dateCreated: "2026-08-15T14:31:00.000Z",
              dateReleased: null,
              observedAt: OBSERVED_AT,
            } satisfies SentryReleaseEvidence,
          ],
        } satisfies ReleaseEvidenceAuthority,
        subjectIssues: {
          kind: "populated",
          observedAt: OBSERVED_AT,
          resultCount: 1,
          issues: [
            {
              provider: "sentry",
              issueId: "1001",
              resourceId: project.id,
              projectId: "450",
              shortId: "COMBIE-1",
              status: "unresolved",
              level: "error",
              count: 42,
              userCount: 7,
              issueCategory: "error",
              firstSeen: "2026-08-15T14:37:00.000Z",
              lastSeen: "2026-08-15T15:08:00.000Z",
              observedAt: OBSERVED_AT,
            } satisfies SentryIssueEvidence,
          ],
        } satisfies IssueEvidenceAuthority,
      }),
    );
    expect(items.some((item) => item.kind === "no_deterministic_release_issue_linkage")).toBe(
      true,
    );
    const linkage = items.find(
      (item) => item.kind === "no_deterministic_release_issue_linkage",
    );
    expect(linkage).toMatchObject({
      releaseCount: 1,
      issueCount: 1,
      scope: { resourceId: project.id, role: "subject" },
    });
    expect(formatMissingContextItem(linkage!)).toContain(
      "No deterministic evidence currently proves a Sentry release caused a Sentry issue",
    );
    expect(formatMissingContextItem(linkage!)).not.toContain("likely caused");
  });

  test("does not mutate the input context", () => {
    const ctx = context({
      subject: resource("github", "repository", "101"),
      subjectWorkflowRuns: unknownRuns([workflowRun()]),
    });
    const snapshot = structuredClone(ctx);
    composeMissingContext(ctx);
    expect(ctx).toEqual(snapshot);
  });
});

describe("missing context CLI formatting", () => {
  test("renders MISSING CONTEXT after KNOWN FACTS with zero state", () => {
    const output = formatInvestigationContext(
      context({
        subject: resource("vercel", "project", "prj_ok"),
        subjectDeployments: {
          kind: "populated",
          observedAt: OBSERVED_AT,
          resultCount: 1,
          deployments: [deployment({ resourceId: "vercel:project:prj_ok", projectId: "prj_ok" })],
        },
        related: [
          {
            relationship: createRelationship({
              sourceResourceId: "github:repository:101",
              targetResourceId: "vercel:project:prj_ok",
              kind: "source_for",
              evidence: { source: "vercel", mechanism: "git" },
            }),
            direction: "inbound",
            resource: resource("github", "repository", "101"),
            changes: [],
            deployments: NA_DEPLOYMENTS,
            workflowRuns: {
              kind: "populated",
              observedAt: OBSERVED_AT,
              resultCount: 1,
              runs: [workflowRun()],
            },
            operations: NA_OPERATIONS,
      releases: { kind: "not_applicable" as const },
      issues: { kind: "not_applicable" as const },
          },
        ],
      }),
    );
    const factsIdx = output.indexOf("KNOWN FACTS");
    const missingIdx = output.indexOf("MISSING CONTEXT");
    const changesIdx = output.indexOf("SUBJECT CHANGES");
    expect(factsIdx).toBeGreaterThan(-1);
    expect(missingIdx).toBeGreaterThan(factsIdx);
    expect(changesIdx).toBeGreaterThan(missingIdx);
    expect(output).toContain(
      "No missing or untrusted context is currently known for the supported investigation scope.",
    );
  });

  test("renders never-success, unknown-with-prior-success, and no-relationships", () => {
    const output = formatInvestigationContext(
      context({
        subject: resource("github", "repository", "101"),
        subjectWorkflowRuns: unknownRuns([workflowRun()], {
          lastSuccessAt: SUCCESS_AT,
          resultCount: 3,
          latestAttemptObservedAt: ATTEMPT_AT,
        }),
      }),
    );
    expect(output).toContain("MISSING CONTEXT");
    expect(output).toContain(
      "GitHub workflow-run evidence is currently unknown for github:repository:101",
    );
    expect(output).toContain(`last successful refresh at ${SUCCESS_AT}`);
    expect(output).toContain("returned 3");
    expect(output).toContain(
      "No one-hop Relationships are currently known to Combie for github:repository:101.",
    );
    expect(output).not.toContain("Inspect GitHub");
    expect(output).not.toContain("check this first");
    expect(output).not.toContain("likely caused");
  });

  test("known empty does not appear under MISSING CONTEXT; detailed evidence preserved", () => {
    const output = formatInvestigationContext(
      context({
        subject: resource("vercel", "project", "prj_app"),
        subjectDeployments: {
          kind: "empty",
          observedAt: OBSERVED_AT,
          resultCount: 0,
          deployments: [deployment()],
        },
        related: [
          {
            relationship: createRelationship({
              sourceResourceId: "github:repository:101",
              targetResourceId: "vercel:project:prj_app",
              kind: "source_for",
              evidence: { source: "vercel", mechanism: "git" },
            }),
            direction: "inbound",
            resource: resource("github", "repository", "101"),
            changes: [],
            deployments: NA_DEPLOYMENTS,
            workflowRuns: {
              kind: "empty",
              observedAt: OBSERVED_AT,
              resultCount: 0,
              runs: [],
            },
            operations: NA_OPERATIONS,
      releases: { kind: "not_applicable" as const },
      issues: { kind: "not_applicable" as const },
          },
        ],
      }),
    );
    const missingSection = output.slice(
      output.indexOf("MISSING CONTEXT"),
      output.indexOf("SUBJECT CHANGES"),
    );
    expect(missingSection).toContain(
      "No missing or untrusted context is currently known",
    );
    expect(missingSection).not.toContain("unknown");
    expect(output).toContain("KNOWN FACTS");
    expect(output).toContain("DEPLOYMENTS");
    expect(output).toContain("KNOWN PROVIDER ACTIVITY");
    expect(output).toContain("COMBIE OBSERVATIONS");
  });

  test("Known Facts five-cap and authority facts remain available alongside Missing Context", () => {
    const ctx = context({
      subject: resource("github", "repository", "101"),
      subjectWorkflowRuns: unknownRuns(
        [
          workflowRun({ runId: 1, conclusion: "failure" }),
          workflowRun({ runId: 2, conclusion: "success" }),
        ],
        {
          lastSuccessAt: SUCCESS_AT,
          resultCount: 2,
        },
      ),
    });
    const facts = composeInvestigationFacts(ctx);
    expect(facts.length).toBeLessThanOrEqual(MAX_INVESTIGATION_FACTS);
    expect(facts.some((fact) => fact.kind === "provider_evidence_authority")).toBe(
      true,
    );
    const missing = composeMissingContext(ctx);
    expect(missing.some((item) => item.kind === "unknown_current_authority")).toBe(
      true,
    );
    const output = formatInvestigationContext(ctx);
    expect(output).toContain("KNOWN FACTS");
    expect(output).toContain("MISSING CONTEXT");
  });
});
