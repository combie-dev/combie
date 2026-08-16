import { describe, expect, test } from "bun:test";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import type { GitHubWorkflowRunEvidence } from "../../src/providers/github/workflow-run.ts";
import type { VercelDeploymentEvidence } from "../../src/providers/vercel/deployment.ts";
import type { SentryReleaseEvidence } from "../../src/providers/sentry/release.ts";
import {
  composeSharedCommitContext,
  type GitCommitEvidenceGroup,
} from "../../src/app/shared-commit-context.ts";
import type { InvestigationContext } from "../../src/app/investigate.ts";
import { formatSharedCommitContext } from "../../src/app/investigate.ts";

const SHA_A = "abc123def4567890abc123def4567890abc123de";
const SHA_B = "fff111aaa222bbb333ccc444ddd555eee666fff7";
const SHA_UPPER = "ABC123DEF4567890ABC123DEF4567890ABC123DE";

const REPO_ID = "github:repository:101";
const PROJECT_ID = "vercel:project:prj_a";
const REL_ID = `rel:${REPO_ID}:source_for:${PROJECT_ID}`;

function repo() {
  return createResource({
    provider: "github",
    providerResourceId: "101",
    kind: "repository",
    name: "demo",
    metadata: { fullName: "acme/demo" },
  });
}

function project() {
  return createResource({
    provider: "vercel",
    providerResourceId: "prj_a",
    kind: "project",
    name: "demo-hub",
    metadata: {},
  });
}

function sourceFor() {
  return createRelationship({
    sourceResourceId: REPO_ID,
    targetResourceId: PROJECT_ID,
    kind: "source_for",
    evidence: {
      source: "vercel",
      mechanism: "git_repository_reference",
      repository: "acme/demo",
      githubRepoId: "101",
    },
  });
}

function run(
  overrides: Partial<GitHubWorkflowRunEvidence> = {},
): GitHubWorkflowRunEvidence {
  return {
    provider: "github",
    runId: 9001,
    resourceId: REPO_ID,
    repositoryId: "101",
    workflowId: 1,
    name: "CI",
    runNumber: 12,
    runAttempt: 1,
    event: "push",
    status: "completed",
    conclusion: "failure",
    headBranch: "main",
    headSha: SHA_A,
    createdAt: "2026-08-09T10:00:00.000Z",
    runStartedAt: "2026-08-09T10:00:05.000Z",
    updatedAt: "2026-08-09T10:05:00.000Z",
    observedAt: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

function dep(
  overrides: Partial<VercelDeploymentEvidence> = {},
): VercelDeploymentEvidence {
  return {
    provider: "vercel",
    uid: "dpl_1",
    resourceId: PROJECT_ID,
    projectId: "prj_a",
    readyState: "ERROR",
    state: "ERROR",
    target: "production",
    createdAtMs: 1723201000000,
    buildingAtMs: 1723201005000,
    readyAtMs: 1723201300000,
    observedAt: "2026-08-09T12:00:00.000Z",
    source: "git",
    gitCommitSha: SHA_A,
    ...overrides,
  };
}

function contextFromVercelSubject(options: {
  runs: GitHubWorkflowRunEvidence[];
  deployments: VercelDeploymentEvidence[];
  runAuthority?: "populated" | "empty" | "unknown";
  deployAuthority?: "populated" | "empty" | "unknown";
  includeRelationship?: boolean;
  relationship?: ReturnType<typeof sourceFor>;
}): InvestigationContext {
  const rel = options.relationship ?? sourceFor();
  const runAuth = options.runAuthority ?? "populated";
  const deployAuth = options.deployAuthority ?? "populated";
  const includeRel = options.includeRelationship !== false;

  return {
    subject: project(),
    subjectChanges: [],
    subjectDeployments: {
      kind: deployAuth,
      observedAt: "2026-08-09T12:00:00.000Z",
      resultCount: options.deployments.length,
      deployments: options.deployments,
      ...(deployAuth === "unknown"
        ? {
            latestAttemptObservedAt: "2026-08-09T12:00:00.000Z",
            lastSuccessAt: "2026-08-09T11:00:00.000Z",
            message: null,
          }
        : {}),
    } as InvestigationContext["subjectDeployments"],
    subjectWorkflowRuns: { kind: "not_applicable" },
    subjectOperations: { kind: "not_applicable" },
    subjectReleases: { kind: "not_applicable" },
    subjectIssues: { kind: "not_applicable" },
    related: includeRel
      ? [
          {
            relationship: rel,
            direction: "inbound",
            resource: repo(),
            changes: [],
            deployments: { kind: "not_applicable" },
            workflowRuns: {
              kind: runAuth,
              observedAt: "2026-08-09T12:00:00.000Z",
              resultCount: options.runs.length,
              runs: options.runs,
              ...(runAuth === "unknown"
                ? {
                    latestAttemptObservedAt: "2026-08-09T12:00:00.000Z",
                    lastSuccessAt: "2026-08-09T11:00:00.000Z",
                    message: null,
                  }
                : {}),
            } as InvestigationContext["subjectWorkflowRuns"],
            operations: { kind: "not_applicable" },
        releases: { kind: "not_applicable" },
        issues: { kind: "not_applicable" },
          },
        ]
      : [],
  };
}

function contextFromGitHubSubject(options: {
  runs: GitHubWorkflowRunEvidence[];
  deployments: VercelDeploymentEvidence[];
}): InvestigationContext {
  const rel = sourceFor();
  return {
    subject: repo(),
    subjectChanges: [],
    subjectDeployments: { kind: "not_applicable" },
    subjectWorkflowRuns: {
      kind: "populated",
      observedAt: "2026-08-09T12:00:00.000Z",
      resultCount: options.runs.length,
      runs: options.runs,
    },
    subjectOperations: { kind: "not_applicable" },
    subjectReleases: { kind: "not_applicable" },
    subjectIssues: { kind: "not_applicable" },
    related: [
      {
        relationship: rel,
        direction: "outbound",
        resource: project(),
        changes: [],
        deployments: {
          kind: "populated",
          observedAt: "2026-08-09T12:00:00.000Z",
          resultCount: options.deployments.length,
          deployments: options.deployments,
        },
        workflowRuns: { kind: "not_applicable" },
        operations: { kind: "not_applicable" },
        releases: { kind: "not_applicable" },
        issues: { kind: "not_applicable" },
      },
    ],
  };
}

describe("composeSharedCommitContext (Sprint 035)", () => {
  test("same SHA + source_for creates one group", () => {
    const groups = composeSharedCommitContext(
      contextFromVercelSubject({
        runs: [run()],
        deployments: [dep()],
      }),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.commitSha).toBe(SHA_A);
    expect(groups[0]!.relationshipId).toBe(REL_ID);
    expect(groups[0]!.sourceResourceId).toBe(REPO_ID);
    expect(groups[0]!.targetResourceId).toBe(PROJECT_ID);
    expect(groups[0]!.workflowRuns.map((m) => m.evidence.runId)).toEqual([
      9001,
    ]);
    expect(groups[0]!.deployments.map((m) => m.evidence.uid)).toEqual([
      "dpl_1",
    ]);
    expect(groups[0]!.includesUnknownAuthority).toBe(false);
  });

  test("case-insensitive full SHA equality after canonicalize", () => {
    const groups = composeSharedCommitContext(
      contextFromVercelSubject({
        runs: [run({ headSha: SHA_UPPER })],
        deployments: [dep({ gitCommitSha: SHA_A })],
      }),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.commitSha).toBe(SHA_A);
  });

  test("different SHA + source_for → no group", () => {
    const groups = composeSharedCommitContext(
      contextFromVercelSubject({
        runs: [run({ headSha: SHA_A })],
        deployments: [dep({ gitCommitSha: SHA_B })],
      }),
    );
    expect(groups).toEqual([]);
  });

  test("same SHA without source_for → no group", () => {
    const groups = composeSharedCommitContext(
      contextFromVercelSubject({
        runs: [run()],
        deployments: [dep()],
        includeRelationship: false,
      }),
    );
    expect(groups).toEqual([]);
  });

  test("missing or malformed SHA → no group", () => {
    expect(
      composeSharedCommitContext(
        contextFromVercelSubject({
          runs: [run({ headSha: null })],
          deployments: [dep()],
        }),
      ),
    ).toEqual([]);
    expect(
      composeSharedCommitContext(
        contextFromVercelSubject({
          runs: [run()],
          deployments: [dep({ gitCommitSha: null })],
        }),
      ),
    ).toEqual([]);
    expect(
      composeSharedCommitContext(
        contextFromVercelSubject({
          runs: [run({ headSha: "abc123" })],
          deployments: [dep({ gitCommitSha: "abc123" })],
        }),
      ),
    ).toEqual([]);
  });

  test("many-to-many collapses to one group per relationship+SHA", () => {
    const groups = composeSharedCommitContext(
      contextFromVercelSubject({
        runs: [
          run({ runId: 1, headSha: SHA_A }),
          run({ runId: 2, headSha: SHA_A }),
        ],
        deployments: [
          dep({ uid: "dpl_x", gitCommitSha: SHA_A }),
          dep({ uid: "dpl_y", gitCommitSha: SHA_A }),
          dep({ uid: "dpl_z", gitCommitSha: SHA_A }),
        ],
      }),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.workflowRuns).toHaveLength(2);
    expect(groups[0]!.deployments).toHaveLength(3);
  });

  test("multiple source_for pairs stay separate even with same SHA", () => {
    const projectB = createResource({
      provider: "vercel",
      providerResourceId: "prj_b",
      kind: "project",
      name: "other",
      metadata: {},
    });
    const relB = createRelationship({
      sourceResourceId: REPO_ID,
      targetResourceId: projectB.id,
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "acme/demo",
      },
    });
    const ctx: InvestigationContext = {
      subject: repo(),
      subjectChanges: [],
      subjectDeployments: { kind: "not_applicable" },
      subjectWorkflowRuns: {
        kind: "populated",
        observedAt: "2026-08-09T12:00:00.000Z",
        resultCount: 1,
        runs: [run()],
      },
      subjectOperations: { kind: "not_applicable" },
      subjectReleases: { kind: "not_applicable" },
    subjectIssues: { kind: "not_applicable" },
      related: [
        {
          relationship: sourceFor(),
          direction: "outbound",
          resource: project(),
          changes: [],
          deployments: {
            kind: "populated",
            observedAt: "2026-08-09T12:00:00.000Z",
            resultCount: 1,
            deployments: [dep()],
          },
          workflowRuns: { kind: "not_applicable" },
          operations: { kind: "not_applicable" },
        releases: { kind: "not_applicable" },
        issues: { kind: "not_applicable" },
        },
        {
          relationship: relB,
          direction: "outbound",
          resource: projectB,
          changes: [],
          deployments: {
            kind: "populated",
            observedAt: "2026-08-09T12:00:00.000Z",
            resultCount: 1,
            deployments: [
              dep({
                uid: "dpl_b",
                resourceId: projectB.id,
                projectId: "prj_b",
                gitCommitSha: SHA_A,
              }),
            ],
          },
          workflowRuns: { kind: "not_applicable" },
          operations: { kind: "not_applicable" },
        releases: { kind: "not_applicable" },
        issues: { kind: "not_applicable" },
        },
      ],
    };
    const groups = composeSharedCommitContext(ctx);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.relationshipId).sort()).toEqual(
      [REL_ID, relB.id].sort(),
    );
    expect(new Set(groups.map((g) => g.commitSha))).toEqual(new Set([SHA_A]));
  });

  test("unknown authority retained evidence may group with qualification", () => {
    const groups = composeSharedCommitContext(
      contextFromVercelSubject({
        runs: [run()],
        deployments: [dep()],
        runAuthority: "unknown",
        deployAuthority: "populated",
      }),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.includesUnknownAuthority).toBe(true);
  });

  test("GitHub subject and Vercel subject both see the same group", () => {
    const fromVercel = composeSharedCommitContext(
      contextFromVercelSubject({
        runs: [run()],
        deployments: [dep()],
      }),
    );
    const fromGitHub = composeSharedCommitContext(
      contextFromGitHubSubject({
        runs: [run()],
        deployments: [dep()],
      }),
    );
    expect(fromVercel).toHaveLength(1);
    expect(fromGitHub).toHaveLength(1);
    expect(fromVercel[0]!.relationshipId).toBe(fromGitHub[0]!.relationshipId);
    expect(fromVercel[0]!.commitSha).toBe(fromGitHub[0]!.commitSha);
  });

  test("deterministic under shuffled related and evidence order", () => {
    const relB = createRelationship({
      sourceResourceId: REPO_ID,
      targetResourceId: "vercel:project:prj_b",
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "acme/demo",
      },
    });
    const projectB = createResource({
      provider: "vercel",
      providerResourceId: "prj_b",
      kind: "project",
      name: "other",
      metadata: {},
    });

    function build(relatedOrder: "ab" | "ba"): InvestigationContext {
      const a = {
        relationship: sourceFor(),
        direction: "outbound" as const,
        resource: project(),
        changes: [],
        deployments: {
          kind: "populated" as const,
          observedAt: "2026-08-09T12:00:00.000Z",
          resultCount: 1,
          deployments: [dep({ gitCommitSha: SHA_A })],
        },
        workflowRuns: { kind: "not_applicable" as const },
        operations: { kind: "not_applicable" as const },
        releases: { kind: "not_applicable" as const },
        issues: { kind: "not_applicable" as const },
      };
      const b = {
        relationship: relB,
        direction: "outbound" as const,
        resource: projectB,
        changes: [],
        deployments: {
          kind: "populated" as const,
          observedAt: "2026-08-09T12:00:00.000Z",
          resultCount: 1,
          deployments: [
            dep({
              uid: "dpl_b",
              resourceId: projectB.id,
              projectId: "prj_b",
              gitCommitSha: SHA_B,
            }),
          ],
        },
        workflowRuns: { kind: "not_applicable" as const },
        operations: { kind: "not_applicable" as const },
        releases: { kind: "not_applicable" as const },
        issues: { kind: "not_applicable" as const },
      };
      return {
        subject: repo(),
        subjectChanges: [],
        subjectDeployments: { kind: "not_applicable" },
        subjectWorkflowRuns: {
          kind: "populated",
          observedAt: "2026-08-09T12:00:00.000Z",
          resultCount: 2,
          runs: [
            run({ runId: 1, headSha: SHA_A }),
            run({ runId: 2, headSha: SHA_B }),
          ],
        },
        subjectOperations: { kind: "not_applicable" },
        subjectReleases: { kind: "not_applicable" },
    subjectIssues: { kind: "not_applicable" },
        related: relatedOrder === "ab" ? [a, b] : [b, a],
      };
    }

    const g1 = composeSharedCommitContext(build("ab"));
    const g2 = composeSharedCommitContext(build("ba"));
    expect(g1.map(groupKey)).toEqual(g2.map(groupKey));
    expect(g1.map(groupKey)).toEqual(
      [groupKey(g1[0]!), groupKey(g1[1]!)].sort(),
    );
  });

  test("does not mutate input context", () => {
    const ctx = contextFromVercelSubject({
      runs: [run()],
      deployments: [dep()],
    });
    const before = JSON.stringify(ctx);
    composeSharedCommitContext(ctx);
    composeSharedCommitContext(ctx);
    expect(JSON.stringify(ctx)).toBe(before);
  });

  test("ignores uses_domain_in and non-source_for relationships", () => {
    const zone = createResource({
      provider: "cloudflare",
      providerResourceId: "zone1",
      kind: "zone",
      name: "example.com",
      metadata: {},
    });
    const uses = createRelationship({
      sourceResourceId: PROJECT_ID,
      targetResourceId: zone.id,
      kind: "uses_domain_in",
      evidence: {
        source: "vercel",
        mechanism: "custom_domain_apex",
        apexName: "example.com",
      },
    });
    const ctx: InvestigationContext = {
      subject: project(),
      subjectChanges: [],
      subjectDeployments: {
        kind: "populated",
        observedAt: "2026-08-09T12:00:00.000Z",
        resultCount: 1,
        deployments: [dep()],
      },
      subjectWorkflowRuns: { kind: "not_applicable" },
      subjectOperations: { kind: "not_applicable" },
      subjectReleases: { kind: "not_applicable" },
    subjectIssues: { kind: "not_applicable" },
      related: [
        {
          relationship: uses,
          direction: "outbound",
          resource: zone,
          changes: [],
          deployments: { kind: "not_applicable" },
          workflowRuns: { kind: "not_applicable" },
          operations: { kind: "not_applicable" },
        releases: { kind: "not_applicable" },
        issues: { kind: "not_applicable" },
        },
      ],
    };
    expect(composeSharedCommitContext(ctx)).toEqual([]);
  });
});

describe("formatSharedCommitContext", () => {
  test("renders safe wording and omits when empty", () => {
    expect(formatSharedCommitContext([])).toBe("");
    const groups = composeSharedCommitContext(
      contextFromVercelSubject({
        runs: [run()],
        deployments: [dep()],
      }),
    );
    const text = formatSharedCommitContext(groups);
    expect(text).toContain("SHARED COMMIT CONTEXT");
    expect(text).toContain(`Commit ${SHA_A}`);
    expect(text).toContain("9001");
    expect(text).toContain("dpl_1");
    expect(text).toContain("exact Git commit SHA");
    expect(text).toContain(`${REPO_ID} source_for ${PROJECT_ID}`);
    expect(text).toContain("among held evidence");
    expect(text).not.toContain("triggered");
    expect(text).not.toContain("caused by");
    expect(text).not.toContain("deployed by");
    expect(text).not.toContain("same incident");
    expect(text).not.toContain("workflow for deployment");
    expect(text).not.toContain("current workflow");
    expect(text).not.toContain("current deployment");
  });

  test("unknown authority adds may-be-stale qualifier", () => {
    const groups = composeSharedCommitContext(
      contextFromVercelSubject({
        runs: [run()],
        deployments: [dep()],
        runAuthority: "unknown",
      }),
    );
    const text = formatSharedCommitContext(groups);
    expect(text).toContain("may be stale");
  });
});

const SENTRY_PROJECT_ID = "sentry:project:450";
const REL_CMT_ID = `rel:${REPO_ID}:code_mapped_to:${SENTRY_PROJECT_ID}`;

function sentryProject() {
  return createResource({
    provider: "sentry",
    providerResourceId: "450",
    kind: "project",
    name: "combie",
    metadata: { organizationSlug: "acme" },
  });
}

function codeMappedTo() {
  return createRelationship({
    sourceResourceId: REPO_ID,
    targetResourceId: SENTRY_PROJECT_ID,
    kind: "code_mapped_to",
    evidence: {
      source: "sentry",
      mechanism: "code_mapping",
      repository: "acme/demo",
    },
  });
}

function release(
  overrides: Partial<SentryReleaseEvidence> = {},
): SentryReleaseEvidence {
  return {
    provider: "sentry",
    version: "frontend@1.2.0",
    resourceId: SENTRY_PROJECT_ID,
    projectId: "450",
    shortVersion: "1.2.0",
    status: "open",
    dateCreated: "2026-08-09T12:00:00.000Z",
    dateReleased: "2026-08-09T12:05:00.000Z",
    observedAt: "2026-08-09T12:00:00.000Z",
    gitCommitSha: SHA_A,
    ...overrides,
  };
}

function contextFromSentrySubject(options: {
  runs: GitHubWorkflowRunEvidence[];
  releases: SentryReleaseEvidence[];
  runAuthority?: "populated" | "empty" | "unknown";
  releaseAuthority?: "populated" | "empty" | "unknown";
  includeRelationship?: boolean;
  relationship?: ReturnType<typeof codeMappedTo>;
}): InvestigationContext {
  const rel = options.relationship ?? codeMappedTo();
  const runAuth = options.runAuthority ?? "populated";
  const releaseAuth = options.releaseAuthority ?? "populated";
  const includeRel = options.includeRelationship !== false;

  return {
    subject: sentryProject(),
    subjectChanges: [],
    subjectDeployments: { kind: "not_applicable" },
    subjectWorkflowRuns: { kind: "not_applicable" },
    subjectOperations: { kind: "not_applicable" },
    subjectReleases: {
      kind: releaseAuth,
      observedAt: "2026-08-09T12:00:00.000Z",
      resultCount: options.releases.length,
      releases: options.releases,
      ...(releaseAuth === "unknown"
        ? {
            latestAttemptObservedAt: "2026-08-09T12:00:00.000Z",
            lastSuccessAt: "2026-08-09T11:00:00.000Z",
            message: null,
          }
        : {}),
    } as InvestigationContext["subjectReleases"],
    subjectIssues: { kind: "not_applicable" },
    related: includeRel
      ? [
          {
            relationship: rel,
            direction: "inbound",
            resource: repo(),
            changes: [],
            deployments: { kind: "not_applicable" },
            workflowRuns: {
              kind: runAuth,
              observedAt: "2026-08-09T12:00:00.000Z",
              resultCount: options.runs.length,
              runs: options.runs,
              ...(runAuth === "unknown"
                ? {
                    latestAttemptObservedAt: "2026-08-09T12:00:00.000Z",
                    lastSuccessAt: "2026-08-09T11:00:00.000Z",
                    message: null,
                  }
                : {}),
            } as InvestigationContext["subjectWorkflowRuns"],
            operations: { kind: "not_applicable" },
            releases: { kind: "not_applicable" },
            issues: { kind: "not_applicable" },
          },
        ]
      : [],
  };
}

function contextFromGitHubSentrySubject(options: {
  runs: GitHubWorkflowRunEvidence[];
  releases: SentryReleaseEvidence[];
}): InvestigationContext {
  const rel = codeMappedTo();
  return {
    subject: repo(),
    subjectChanges: [],
    subjectDeployments: { kind: "not_applicable" },
    subjectWorkflowRuns: {
      kind: "populated",
      observedAt: "2026-08-09T12:00:00.000Z",
      resultCount: options.runs.length,
      runs: options.runs,
    },
    subjectOperations: { kind: "not_applicable" },
    subjectReleases: { kind: "not_applicable" },
    subjectIssues: { kind: "not_applicable" },
    related: [
      {
        relationship: rel,
        direction: "outbound",
        resource: sentryProject(),
        changes: [],
        deployments: { kind: "not_applicable" },
        workflowRuns: { kind: "not_applicable" },
        operations: { kind: "not_applicable" },
        releases: {
          kind: "populated",
          observedAt: "2026-08-09T12:00:00.000Z",
          resultCount: options.releases.length,
          releases: options.releases,
        },
        issues: { kind: "not_applicable" },
      },
    ],
  };
}

describe("composeSharedCommitContext (Sprint 046)", () => {
  test("same SHA + code_mapped_to creates one code_mapped_to group", () => {
    const groups = composeSharedCommitContext(
      contextFromSentrySubject({
        runs: [run()],
        releases: [release()],
      }),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.relationshipKind).toBe("code_mapped_to");
    expect(groups[0]!.commitSha).toBe(SHA_A);
    expect(groups[0]!.relationshipId).toBe(REL_CMT_ID);
    expect(groups[0]!.sourceResourceId).toBe(REPO_ID);
    expect(groups[0]!.targetResourceId).toBe(SENTRY_PROJECT_ID);
    expect(groups[0]!.workflowRuns.map((m) => m.evidence.runId)).toEqual([
      9001,
    ]);
    expect(groups[0]!.deployments).toEqual([]);
    expect(groups[0]!.releases.map((m) => m.evidence.version)).toEqual([
      "frontend@1.2.0",
    ]);
    expect(groups[0]!.includesUnknownAuthority).toBe(false);
  });

  test("same SHA without code_mapped_to edge → no group", () => {
    const groups = composeSharedCommitContext(
      contextFromSentrySubject({
        runs: [run()],
        releases: [release()],
        includeRelationship: false,
      }),
    );
    expect(groups).toEqual([]);
  });

  test("one-sided SHA → no code_mapped_to group", () => {
    expect(
      composeSharedCommitContext(
        contextFromSentrySubject({
          runs: [run({ headSha: null })],
          releases: [release()],
        }),
      ),
    ).toEqual([]);
    expect(
      composeSharedCommitContext(
        contextFromSentrySubject({
          runs: [run()],
          releases: [release({ gitCommitSha: null })],
        }),
      ),
    ).toEqual([]);
  });

  test("source_for and code_mapped_to never merge even with same SHA and same repo", () => {
    const ctx: InvestigationContext = {
      subject: repo(),
      subjectChanges: [],
      subjectDeployments: { kind: "not_applicable" },
      subjectWorkflowRuns: {
        kind: "populated",
        observedAt: "2026-08-09T12:00:00.000Z",
        resultCount: 1,
        runs: [run()],
      },
      subjectOperations: { kind: "not_applicable" },
      subjectReleases: { kind: "not_applicable" },
      subjectIssues: { kind: "not_applicable" },
      related: [
        {
          relationship: sourceFor(),
          direction: "outbound",
          resource: project(),
          changes: [],
          deployments: {
            kind: "populated",
            observedAt: "2026-08-09T12:00:00.000Z",
            resultCount: 1,
            deployments: [dep()],
          },
          workflowRuns: { kind: "not_applicable" },
          operations: { kind: "not_applicable" },
          releases: { kind: "not_applicable" },
          issues: { kind: "not_applicable" },
        },
        {
          relationship: codeMappedTo(),
          direction: "outbound",
          resource: sentryProject(),
          changes: [],
          deployments: { kind: "not_applicable" },
          workflowRuns: { kind: "not_applicable" },
          operations: { kind: "not_applicable" },
          releases: {
            kind: "populated",
            observedAt: "2026-08-09T12:00:00.000Z",
            resultCount: 1,
            releases: [release()],
          },
          issues: { kind: "not_applicable" },
        },
      ],
    };
    const groups = composeSharedCommitContext(ctx);
    expect(groups).toHaveLength(2);
    expect(new Set(groups.map((g) => g.relationshipKind))).toEqual(
      new Set(["source_for", "code_mapped_to"]),
    );
    expect(new Set(groups.map((g) => g.commitSha))).toEqual(new Set([SHA_A]));
    const mapped = groups.find((g) => g.relationshipKind === "code_mapped_to")!;
    expect(mapped.workflowRuns).toHaveLength(1);
    expect(mapped.releases).toHaveLength(1);
    const sourced = groups.find((g) => g.relationshipKind === "source_for")!;
    expect(sourced.deployments).toHaveLength(1);
    expect(sourced.releases).toEqual([]);
  });

  test("GitHub subject and Sentry subject both see the same code_mapped_to group", () => {
    const fromSentry = composeSharedCommitContext(
      contextFromSentrySubject({
        runs: [run()],
        releases: [release()],
      }),
    );
    const fromGitHub = composeSharedCommitContext(
      contextFromGitHubSentrySubject({
        runs: [run()],
        releases: [release()],
      }),
    );
    expect(fromSentry).toHaveLength(1);
    expect(fromGitHub).toHaveLength(1);
    expect(fromSentry[0]!.relationshipKind).toBe("code_mapped_to");
    expect(fromGitHub[0]!.relationshipKind).toBe("code_mapped_to");
    expect(fromSentry[0]!.relationshipId).toBe(fromGitHub[0]!.relationshipId);
    expect(fromSentry[0]!.commitSha).toBe(fromGitHub[0]!.commitSha);
  });

  test("deterministic under shuffled related order", () => {
    const projectB = createResource({
      provider: "sentry",
      providerResourceId: "451",
      kind: "project",
      name: "other",
      metadata: { organizationSlug: "acme" },
    });
    const relB = createRelationship({
      sourceResourceId: REPO_ID,
      targetResourceId: projectB.id,
      kind: "code_mapped_to",
      evidence: {
        source: "sentry",
        mechanism: "code_mapping",
        repository: "acme/demo",
      },
    });

    function build(relatedOrder: "ab" | "ba"): InvestigationContext {
      const a = {
        relationship: codeMappedTo(),
        direction: "outbound" as const,
        resource: sentryProject(),
        changes: [],
        deployments: { kind: "not_applicable" as const },
        workflowRuns: { kind: "not_applicable" as const },
        operations: { kind: "not_applicable" as const },
        releases: {
          kind: "populated" as const,
          observedAt: "2026-08-09T12:00:00.000Z",
          resultCount: 1,
          releases: [release()],
        },
        issues: { kind: "not_applicable" as const },
      };
      const b = {
        relationship: relB,
        direction: "outbound" as const,
        resource: projectB,
        changes: [],
        deployments: { kind: "not_applicable" as const },
        workflowRuns: { kind: "not_applicable" as const },
        operations: { kind: "not_applicable" as const },
        releases: {
          kind: "populated" as const,
          observedAt: "2026-08-09T12:00:00.000Z",
          resultCount: 1,
          releases: [
            release({
              version: "frontend@1.3.0",
              resourceId: projectB.id,
              projectId: "451",
              gitCommitSha: SHA_B,
            }),
          ],
        },
        issues: { kind: "not_applicable" as const },
      };
      return {
        subject: repo(),
        subjectChanges: [],
        subjectDeployments: { kind: "not_applicable" },
        subjectWorkflowRuns: {
          kind: "populated",
          observedAt: "2026-08-09T12:00:00.000Z",
          resultCount: 2,
          runs: [
            run({ runId: 1, headSha: SHA_A }),
            run({ runId: 2, headSha: SHA_B }),
          ],
        },
        subjectOperations: { kind: "not_applicable" },
        subjectReleases: { kind: "not_applicable" },
        subjectIssues: { kind: "not_applicable" },
        related: relatedOrder === "ab" ? [a, b] : [b, a],
      };
    }

    const g1 = composeSharedCommitContext(build("ab"));
    const g2 = composeSharedCommitContext(build("ba"));
    expect(g1).toHaveLength(2);
    expect(g1.map(groupKey)).toEqual(g2.map(groupKey));
    expect(g1.map(groupKey)).toEqual(
      [groupKey(g1[0]!), groupKey(g1[1]!)].sort(),
    );
  });

  test("does not mutate input context", () => {
    const ctx = contextFromSentrySubject({
      runs: [run()],
      releases: [release()],
    });
    const before = JSON.stringify(ctx);
    composeSharedCommitContext(ctx);
    composeSharedCommitContext(ctx);
    expect(JSON.stringify(ctx)).toBe(before);
  });

  test("ignores unknown authority on either side without breaking grouping", () => {
    const groups = composeSharedCommitContext(
      contextFromSentrySubject({
        runs: [run()],
        releases: [release()],
        runAuthority: "unknown",
        releaseAuthority: "unknown",
      }),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.relationshipKind).toBe("code_mapped_to");
    expect(groups[0]!.includesUnknownAuthority).toBe(true);
  });
});

describe("formatSharedCommitContext (Sprint 046)", () => {
  test("code_mapped_to group renders Sentry releases with ROADMAP basis, no causality vocabulary", () => {
    const groups = composeSharedCommitContext(
      contextFromSentrySubject({
        runs: [run()],
        releases: [release()],
      }),
    );
    const text = formatSharedCommitContext(groups);
    expect(text).toContain("SHARED COMMIT CONTEXT");
    expect(text).toContain(`Commit ${SHA_A}`);
    expect(text).toContain("Sentry releases");
    expect(text).toContain("frontend@1.2.0");
    expect(text).toContain("status=open");
    expect(text).toContain("9001");
    expect(text).toContain(
      "GitHub workflow-run and Sentry release evidence reference the same exact Git commit within an already-proven code_mapped_to resource relationship",
    );
    expect(text).toContain(
      `${REPO_ID} code_mapped_to ${SENTRY_PROJECT_ID}`,
    );
    expect(text).not.toContain("triggered");
    expect(text).not.toContain("caused by");
    expect(text).not.toContain("deployed by");
    expect(text).not.toContain("same incident");
  });

  test("source_for rendering stays byte-identical with existing wording", () => {
    const groups = composeSharedCommitContext(
      contextFromVercelSubject({
        runs: [run()],
        deployments: [dep()],
      }),
    );
    const text = formatSharedCommitContext(groups);
    expect(text).toContain("Vercel deployments");
    expect(text).toContain("dpl_1");
    expect(text).toContain(`${REPO_ID} source_for ${PROJECT_ID}`);
    expect(text).not.toContain("Sentry releases");
  });
});

function groupKey(g: GitCommitEvidenceGroup): string {
  return `${g.relationshipId}|${g.commitSha}`;
}
