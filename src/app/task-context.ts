import type { Change } from "../domain/change.ts";
import type { IncidentRecord } from "../domain/incident.ts";
import type { InvestigationRecord } from "../domain/investigation.ts";
import type { Relationship } from "../domain/relationship.ts";
import type { ResolutionRecord } from "../domain/resolution.ts";
import type { Resource } from "../domain/resource.ts";
import { CombieError } from "./errors.ts";
import {
  composeInvestigationFacts,
  type InvestigationFact,
} from "./investigation-facts.ts";
import type {
  InvestigationContext,
  InvestigationNeighbor,
} from "./investigate.ts";
import { composeMissingContext, type MissingContextItem } from "./missing-context.ts";
import {
  composeProviderActivityChronology,
  type ProviderActivityChronology,
} from "./provider-activity.ts";
import {
  composeSharedCommitContext,
  composeSharedCommitCorrespondences,
  type GitCommitEvidenceGroup,
  type SharedCommitCorrespondence,
} from "./shared-commit-context.ts";
import {
  composeInvestigationTimeline,
  type InvestigationTimeline,
} from "./timeline.ts";

/**
 * Exact, caller-named task profiles (Sprint 109 / v0.5 Wave 1).
 *
 * Combie does not classify arbitrary natural language. The caller names the
 * profile; Combie selects only already-known exact evidence for it. Three
 * explicit values only — no fuzzy matching.
 */
export type TaskProfile =
  | "change-review"
  | "dependency-impact"
  | "response-recall";

export const TASK_PROFILES = [
  "change-review",
  "dependency-impact",
  "response-recall",
] as const;

export function isTaskProfile(value: unknown): value is TaskProfile {
  return (
    typeof value === "string" &&
    (TASK_PROFILES as readonly string[]).includes(value)
  );
}

/**
 * Normalize an exact profile name without fuzzy matching. Unknown values fail
 * with one stable actionable error listing the accepted profiles.
 */
export function normalizeTaskProfile(value: string): TaskProfile {
  if (isTaskProfile(value)) {
    return value;
  }
  throw new CombieError(
    "TASK_PROFILE_UNKNOWN",
    `Task profile must be one of: change-review, dependency-impact, response-recall.\nGot: ${JSON.stringify(value)}`,
  );
}

/**
 * Missing Context kinds a dependency-impact task keeps. Only graph / authority
 * items — never provider evidence-family freshness, shared-commit, or linkage
 * gaps. This reports proven connectivity and graph authority gaps; it does not
 * claim runtime dependency, blast radius, or impact certainty.
 */
const DEPENDENCY_IMPACT_MISSING_CONTEXT_KINDS = new Set<MissingContextItem["kind"]>([
  "no_known_relationships",
  "unknown_relationship_authority",
  "unknown_provider_sync_authority",
  "not_in_last_successful_discovery",
  "code_mapping_refresh_unknown",
  "code_mapping_unmatched_repository",
]);

export interface ComposeTaskContextInput {
  task: TaskProfile;
  /** Complete already-composed Investigation context (authoritative source). */
  ctx: InvestigationContext;
  resolutionRows: ResolutionRecord[];
  incidentRows: IncidentRecord[];
  investigationRows: InvestigationRecord[];
}

/**
 * Closed semantic target union for progressive on-demand retrieval (Sprint 110
 * / v0.5 Wave 2). Pure, semantic targets only — no CLI argv, no MCP tool
 * names. The boundary (projections) owns all retrieval syntax.
 */
export type OnDemandTarget =
  | { kind: "current-investigation"; subjectResourceId: string }
  | {
      kind: "retained-investigation";
      investigationId: string;
      subjectResourceId: string;
      composedAt: string;
    };

/**
 * Selected, already-known sections for one exact task profile. Only the
 * sections the profile requires are present; the profile field names stay the
 * existing shapes from the full Investigation projection. Not a ContextPack,
 * not a generic section registry, not persisted.
 */
type TaskSubjectContext = Pick<
  InvestigationContext,
  "subject" | "providerSyncClocks" | "lastSuccessfulDiscovery"
>;

type DependencyImpactRelationship = Pick<
  Relationship,
  | "id"
  | "kind"
  | "sourceResourceId"
  | "targetResourceId"
  | "evidence"
  | "updatedAt"
>;

type DependencyImpactResource = Pick<
  Resource,
  "id" | "provider" | "kind" | "providerResourceId" | "name"
>;

/** Identity, exact Relationship evidence, and clocks only — no neighbor evidence. */
export interface DependencyImpactNeighbor {
  direction: InvestigationNeighbor["direction"];
  relationship: DependencyImpactRelationship;
  resource: DependencyImpactResource | null;
}

interface TaskContextBase<P extends TaskProfile> {
  /** Internal discriminant; the boundary emits the nested task envelope only. */
  profile: P;
  task: {
    profile: P;
    subjectResourceId: string;
  };
  subjectContext: TaskSubjectContext;
  onDemandTargets: OnDemandTarget[];
}

export interface ChangeReviewTaskContext
  extends TaskContextBase<"change-review"> {
  providerLastAttemptAt: Readonly<Record<string, string | null | undefined>>;
  subjectChanges: Change[];
  subjectDeployments: InvestigationContext["subjectDeployments"];
  subjectWorkflowRuns: InvestigationContext["subjectWorkflowRuns"];
  subjectOperations: InvestigationContext["subjectOperations"];
  subjectReleases: InvestigationContext["subjectReleases"];
  subjectIssues: InvestigationContext["subjectIssues"];
  subjectGitHubIssues?: InvestigationContext["subjectGitHubIssues"];
  related: InvestigationNeighbor[];
  paths: NonNullable<InvestigationContext["paths"]>;
  knownFacts: InvestigationFact[];
  missingContext: MissingContextItem[];
  providerActivity: ProviderActivityChronology;
  timeline: InvestigationTimeline;
  sharedCommitContext: GitCommitEvidenceGroup[];
  sharedCommitCorrespondences: SharedCommitCorrespondence[];
}

export interface DependencyImpactTaskContext
  extends TaskContextBase<"dependency-impact"> {
  providerLastAttemptAt: Readonly<Record<string, string | null | undefined>>;
  related: DependencyImpactNeighbor[];
  paths: NonNullable<InvestigationContext["paths"]>;
  missingContext: MissingContextItem[];
}

export interface ResponseRecallTaskContext
  extends TaskContextBase<"response-recall"> {
  investigationHistory: InvestigationRecord[];
  resolutionMemory: ResolutionRecord[];
  incidentMemory: IncidentRecord[];
}

export type TaskScopedContext =
  | ChangeReviewTaskContext
  | DependencyImpactTaskContext
  | ResponseRecallTaskContext;

/**
 * Concrete, exhaustive selector for the three Wave 1 task profiles. Reuses the
 * existing deterministic composers; selects a smaller view, never redesigns
 * provider queries or storage. Ephemeral, offline, read-only.
 */
export function composeTaskContext(input: ComposeTaskContextInput): TaskScopedContext {
  const { task, ctx, resolutionRows, incidentRows, investigationRows } = input;
  const taskEnvelope = {
    task: {
      subjectResourceId: ctx.subject.id,
    },
    subjectContext: {
      subject: ctx.subject,
      providerSyncClocks: ctx.providerSyncClocks,
      lastSuccessfulDiscovery: ctx.lastSuccessfulDiscovery,
    },
  };
  const currentTarget: OnDemandTarget = {
    kind: "current-investigation",
    subjectResourceId: ctx.subject.id,
  };

  switch (task) {
    case "change-review": {
      const sharedCommitGroups = composeSharedCommitContext(ctx);
      return {
        ...taskEnvelope,
        profile: "change-review",
        task: { ...taskEnvelope.task, profile: "change-review" },
        onDemandTargets: [currentTarget],
        providerLastAttemptAt: ctx.providerLastAttemptAt ?? {},
        subjectChanges: ctx.subjectChanges,
        subjectDeployments: ctx.subjectDeployments,
        subjectWorkflowRuns: ctx.subjectWorkflowRuns,
        subjectOperations: ctx.subjectOperations,
        subjectReleases: ctx.subjectReleases,
        subjectIssues: ctx.subjectIssues,
        ...(ctx.subjectGitHubIssues
          ? { subjectGitHubIssues: ctx.subjectGitHubIssues }
          : {}),
        related: ctx.related,
        paths: ctx.paths ?? [],
        knownFacts: composeInvestigationFacts(ctx),
        missingContext: composeMissingContext(ctx),
        providerActivity: composeProviderActivityChronology(ctx),
        timeline: composeInvestigationTimeline(ctx),
        sharedCommitContext: sharedCommitGroups,
        sharedCommitCorrespondences:
          composeSharedCommitCorrespondences(sharedCommitGroups),
      };
    }
    case "dependency-impact": {
      return {
        ...taskEnvelope,
        profile: "dependency-impact",
        task: { ...taskEnvelope.task, profile: "dependency-impact" },
        onDemandTargets: [currentTarget],
        providerLastAttemptAt: ctx.providerLastAttemptAt ?? {},
        related: ctx.related.map((neighbor) => ({
          direction: neighbor.direction,
          relationship: {
            id: neighbor.relationship.id,
            kind: neighbor.relationship.kind,
            sourceResourceId: neighbor.relationship.sourceResourceId,
            targetResourceId: neighbor.relationship.targetResourceId,
            evidence: neighbor.relationship.evidence,
            updatedAt: neighbor.relationship.updatedAt,
          },
          resource: neighbor.resource
            ? {
                id: neighbor.resource.id,
                provider: neighbor.resource.provider,
                kind: neighbor.resource.kind,
                providerResourceId: neighbor.resource.providerResourceId,
                name: neighbor.resource.name,
              }
            : null,
        })),
        paths: ctx.paths ?? [],
        missingContext: composeMissingContext(ctx).filter((item) =>
          DEPENDENCY_IMPACT_MISSING_CONTEXT_KINDS.has(item.kind),
        ),
      };
    }
    case "response-recall": {
      return {
        ...taskEnvelope,
        profile: "response-recall",
        task: { ...taskEnvelope.task, profile: "response-recall" },
        onDemandTargets: [
          currentTarget,
          ...investigationRows.map((row): OnDemandTarget => ({
            kind: "retained-investigation",
            investigationId: row.id,
            subjectResourceId: row.subjectResourceId,
            composedAt: row.composedAt,
          })),
        ],
        investigationHistory: investigationRows,
        resolutionMemory: resolutionRows,
        incidentMemory: incidentRows,
      };
    }
  }
}
