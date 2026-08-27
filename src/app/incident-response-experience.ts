/**
 * Transparent response experience summary (Sprint 113 / Operational Learning
 * MVP Wave 3).
 *
 * A pure, read-time, provider-independent projection over one already-composed
 * `IncidentPrecedentSet`. It groups exact retained Recommendation, Decision,
 * Action, and Outcome rows by exact `actionKey`, keeping proposed and attempted
 * meanings separate, preserving incomplete branches, and exposing every count
 * as exact record ids.
 *
 * This is deterministic reuse of retained organizational history — not a
 * prediction, not success, not a recommended next action. It opens no Store,
 * performs no I/O, and never re-derives precedents.
 */

import type { IncidentPrecedentSet } from "./incident-precedents.ts";
import type { DecisionDisposition } from "../domain/decision.ts";
import type { OutcomeAssessment } from "../domain/outcome.ts";

export interface ExactRecordBucket {
  count: number;
  ids: string[];
}

export type PrecedentBasis = {
  incidentId: string;
  kind: "explicit" | "candidate";
};

export interface ActionKeyExperience {
  actionKey: string;
  precedentBasis: PrecedentBasis[];
  proposed: {
    recommendations: ExactRecordBucket;
    recommendationsWithoutDecision: ExactRecordBucket;
    decisionsByDisposition: {
      approved: ExactRecordBucket;
      rejected: ExactRecordBucket;
      deferred: ExactRecordBucket;
      modified: ExactRecordBucket;
    };
  };
  attempted: {
    actions: ExactRecordBucket;
    actionsWithoutOutcome: ExactRecordBucket;
    outcomesByAssessment: {
      positive: ExactRecordBucket;
      negative: ExactRecordBucket;
      mixed: ExactRecordBucket;
      neutral: ExactRecordBucket;
      inconclusive: ExactRecordBucket;
    };
  };
}

export interface IncidentResponseExperience {
  queryIncidentId: string;
  explicitPrecedentIds: string[];
  candidatePrecedentIds: string[];
  precedentsWithoutStructuredResponseIds: string[];
  actionKeys: ActionKeyExperience[];
}

const DISPOSITIONS: readonly DecisionDisposition[] = [
  "approved",
  "rejected",
  "deferred",
  "modified",
];

const ASSESSMENTS: readonly OutcomeAssessment[] = [
  "positive",
  "negative",
  "mixed",
  "neutral",
  "inconclusive",
];

function lexicalCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function buildBucket(ids: Iterable<string>): ExactRecordBucket {
  const unique = [...ids].sort(lexicalCompare);
  return { count: unique.length, ids: unique };
}

interface KeyAccumulator {
  actionKey: string;
  proposedRecommendationIds: Set<string>;
  proposedWithoutDecisionIds: Set<string>;
  decisionIdsByDisposition: Record<DecisionDisposition, Set<string>>;
  attemptedActionIds: Set<string>;
  attemptedWithoutOutcomeIds: Set<string>;
  outcomeIdsByAssessment: Record<OutcomeAssessment, Set<string>>;
  basis: PrecedentBasis[];
}

function newAccumulator(actionKey: string): KeyAccumulator {
  return {
    actionKey,
    proposedRecommendationIds: new Set(),
    proposedWithoutDecisionIds: new Set(),
    decisionIdsByDisposition: {
      approved: new Set(),
      rejected: new Set(),
      deferred: new Set(),
      modified: new Set(),
    },
    attemptedActionIds: new Set(),
    attemptedWithoutOutcomeIds: new Set(),
    outcomeIdsByAssessment: {
      positive: new Set(),
      negative: new Set(),
      mixed: new Set(),
      neutral: new Set(),
      inconclusive: new Set(),
    },
    basis: [],
  };
}

function addBasis(acc: KeyAccumulator, basis: PrecedentBasis): void {
  if (acc.basis.some((b) => b.incidentId === basis.incidentId)) return;
  acc.basis.push(basis);
}

/**
 * Compose one transparent response-experience summary from a single composed
 * precedent set. Pure: no Store, no I/O, no provider/model/shell call.
 */
export function composeIncidentResponseExperience(
  set: IncidentPrecedentSet,
): IncidentResponseExperience {
  const explicitPrecedentIds = set.explicitPrecedents.map((p) => p.incident.id);
  const candidatePrecedentIds = set.candidatePrecedents.map(
    (p) => p.incident.id,
  );

  const precedentsWithoutStructuredResponseIds: string[] = [];
  const byKey = new Map<string, KeyAccumulator>();

  const precedents: Array<{
    incidentId: string;
    kind: "explicit" | "candidate";
    structuredResponseMemory: IncidentPrecedentSet["explicitPrecedents"][number]["structuredResponseMemory"];
  }> = [
    ...set.explicitPrecedents.map((p) => ({
      incidentId: p.incident.id,
      kind: "explicit" as const,
      structuredResponseMemory: p.structuredResponseMemory,
    })),
    ...set.candidatePrecedents.map((p) => ({
      incidentId: p.incident.id,
      kind: "candidate" as const,
      structuredResponseMemory: p.structuredResponseMemory,
    })),
  ];

  for (const precedent of precedents) {
    if (precedent.structuredResponseMemory.length === 0) {
      precedentsWithoutStructuredResponseIds.push(precedent.incidentId);
      continue;
    }
    for (const chain of precedent.structuredResponseMemory) {
      const proposedKey = chain.recommendation.actionKey;
      const proposed = byKey.get(proposedKey) ?? newAccumulator(proposedKey);
      proposed.proposedRecommendationIds.add(chain.recommendation.id);
      if (chain.decisions.length === 0) {
        proposed.proposedWithoutDecisionIds.add(chain.recommendation.id);
      }
      addBasis(proposed, {
        incidentId: precedent.incidentId,
        kind: precedent.kind,
      });
      byKey.set(proposedKey, proposed);

      for (const decision of chain.decisions) {
        proposed.decisionIdsByDisposition[decision.decision.disposition].add(
          decision.decision.id,
        );

        for (const action of decision.actions) {
          const attemptedKey = action.action.actionKey;
          const attempted =
            byKey.get(attemptedKey) ?? newAccumulator(attemptedKey);
          attempted.attemptedActionIds.add(action.action.id);
          if (action.outcomes.length === 0) {
            attempted.attemptedWithoutOutcomeIds.add(action.action.id);
          }
          addBasis(attempted, {
            incidentId: precedent.incidentId,
            kind: precedent.kind,
          });
          for (const outcome of action.outcomes) {
            attempted.outcomeIdsByAssessment[outcome.assessment].add(outcome.id);
          }
          byKey.set(attemptedKey, attempted);
        }
      }
    }
  }

  const actionKeys = [...byKey.keys()].sort(lexicalCompare).map((key) => {
    const acc = byKey.get(key)!;
    return {
      actionKey: key,
      precedentBasis: acc.basis,
      proposed: {
        recommendations: buildBucket(acc.proposedRecommendationIds),
        recommendationsWithoutDecision: buildBucket(
          acc.proposedWithoutDecisionIds,
        ),
        decisionsByDisposition: {
          approved: buildBucket(acc.decisionIdsByDisposition.approved),
          rejected: buildBucket(acc.decisionIdsByDisposition.rejected),
          deferred: buildBucket(acc.decisionIdsByDisposition.deferred),
          modified: buildBucket(acc.decisionIdsByDisposition.modified),
        },
      },
      attempted: {
        actions: buildBucket(acc.attemptedActionIds),
        actionsWithoutOutcome: buildBucket(acc.attemptedWithoutOutcomeIds),
        outcomesByAssessment: {
          positive: buildBucket(acc.outcomeIdsByAssessment.positive),
          negative: buildBucket(acc.outcomeIdsByAssessment.negative),
          mixed: buildBucket(acc.outcomeIdsByAssessment.mixed),
          neutral: buildBucket(acc.outcomeIdsByAssessment.neutral),
          inconclusive: buildBucket(acc.outcomeIdsByAssessment.inconclusive),
        },
      },
    };
  });

  return {
    queryIncidentId: set.queryIncident.id,
    explicitPrecedentIds,
    candidatePrecedentIds,
    precedentsWithoutStructuredResponseIds,
    actionKeys,
  };
}

function formatDispositionLine(buckets: {
  approved: ExactRecordBucket;
  rejected: ExactRecordBucket;
  deferred: ExactRecordBucket;
  modified: ExactRecordBucket;
}): string {
  const parts = DISPOSITIONS.map((disposition) => {
    const bucket = buckets[disposition];
    return `${disposition} ${bucket.count} [${bucket.ids.join(", ")}]`;
  });
  return `decisions: ${parts.join(", ")}`;
}

function formatAssessmentLine(buckets: {
  positive: ExactRecordBucket;
  negative: ExactRecordBucket;
  mixed: ExactRecordBucket;
  neutral: ExactRecordBucket;
  inconclusive: ExactRecordBucket;
}): string {
  const parts = ASSESSMENTS.map((assessment) => {
    const bucket = buckets[assessment];
    return `${assessment} ${bucket.count} [${bucket.ids.join(", ")}]`;
  });
  return `outcomes: ${parts.join(", ")}`;
}

/**
 * Human RECORDED RESPONSE EXPERIENCE section. Deterministic, no dates or
 * randomness, no success/rank/recommendation/causality language.
 */
export function formatIncidentResponseExperience(
  experience: IncidentResponseExperience,
): string {
  const lines: string[] = [
    "RECORDED RESPONSE EXPERIENCE",
    "Only temporally prior precedents contribute (effectiveAt = occurredAt ?? recordedAt).",
    "Counts are exact retained record ids, never success or similarity.",
  ];

  if (experience.actionKeys.length === 0) {
    if (experience.precedentsWithoutStructuredResponseIds.length > 0) {
      lines.push(
        "No action keys to summarize: the temporally prior precedents below recorded no structured response chains.",
        `Precedents without structured response chains: ${experience.precedentsWithoutStructuredResponseIds.join(", ")}`,
      );
    } else {
      lines.push(
        "No action keys to summarize: no prior precedents contributed structured response chains.",
      );
    }
    return lines.join("\n");
  }

  for (const key of experience.actionKeys) {
    const basis = key.precedentBasis
      .map((b) => `${b.kind} ${b.incidentId}`)
      .join("; ");
    lines.push(
      "",
      `ACTION KEY: ${key.actionKey}`,
      `  basis: ${basis}`,
      "  PROPOSED",
      `    recommendations: ${key.proposed.recommendations.count} [${key.proposed.recommendations.ids.join(", ")}]`,
      `    without decision: ${key.proposed.recommendationsWithoutDecision.count} [${key.proposed.recommendationsWithoutDecision.ids.join(", ")}]`,
      `    ${formatDispositionLine(key.proposed.decisionsByDisposition)}`,
      "  ATTEMPTED",
      `    actions: ${key.attempted.actions.count} [${key.attempted.actions.ids.join(", ")}]`,
      `    without outcome: ${key.attempted.actionsWithoutOutcome.count} [${key.attempted.actionsWithoutOutcome.ids.join(", ")}]`,
      `    ${formatAssessmentLine(key.attempted.outcomesByAssessment)}`,
    );
  }

  return lines.join("\n");
}
