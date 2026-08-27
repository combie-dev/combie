/**
 * Deterministic Incident precedent composition (Sprint 112).
 *
 * Explicit links are durable organizational claims. Candidates are ephemeral
 * read-time exact matches from a closed reason union — never similarity,
 * score, rank, or inferred success.
 *
 * Temporal prior (corrective closeout): a peer is a precedent only when
 * `effectiveAt(peer) < effectiveAt(query)`, where
 * `effectiveAt = occurredAt ?? recordedAt`. Equal or later peers are never
 * returned as precedents (including explicit link peers). Non-prior links
 * remain available via `incident-links`; they are not called precedents.
 */

import type { IncidentLinkRecord } from "../domain/incident-link.ts";
import type { IncidentRecord } from "../domain/incident.ts";
import type { Relationship } from "../domain/relationship.ts";
import type { RelationshipKind } from "../domain/relationship.ts";
import type { ActionRecord } from "../domain/action.ts";
import type { DecisionRecord } from "../domain/decision.ts";
import { isDecisionDisposition } from "../domain/decision.ts";
import type { OutcomeRecord } from "../domain/outcome.ts";
import { isOutcomeAssessment } from "../domain/outcome.ts";
import type { RecommendationRecord } from "../domain/recommendation.ts";
import { Store } from "../storage/store.ts";
import { BINARY_NAME } from "../cli/constants.ts";
import { CombieError, notInitialized } from "./errors.ts";
import { listIncidentLinks } from "./incident-links.ts";
import {
  lastAttemptAtByProvider,
  lastRequiredProviderAttemptAt,
} from "./relationship-verification-clocks.ts";
import type {
  StructuredAction,
  StructuredDecision,
  StructuredResponseChain,
} from "./structured-response-memory.ts";
import {
  composeIncidentResponseExperience,
  formatIncidentResponseExperience,
} from "./incident-response-experience.ts";

export interface IncidentSubjectSummary {
  id: string;
  title?: string;
  recordedAt: string;
  subjectResourceIds: string[];
  unresolvedResolutionIds: string[];
}

type RelationshipClockProjection = {
  id: string;
  kind: string;
  sourceResourceId: string;
  targetResourceId: string;
  evidence: unknown;
  lastVerifiedAt: string;
  lastRequiredProviderAttemptAt: string | null;
};

export type IncidentPrecedentMatchReason =
  | {
      kind: "same_subject_resource";
      subjectResourceId: string;
    }
  | {
      kind: "directly_related_subjects";
      querySubjectResourceId: string;
      candidateSubjectResourceId: string;
      relationship: RelationshipClockProjection;
      direction: "outbound" | "inbound";
    }
  | {
      kind: "shared_proven_neighbor";
      querySubjectResourceId: string;
      candidateSubjectResourceId: string;
      sharedNeighborResourceId: string;
      queryRelationship: RelationshipClockProjection;
      candidateRelationship: RelationshipClockProjection;
      queryDirection: "outbound" | "inbound";
      candidateDirection: "outbound" | "inbound";
    }
  | {
      kind: "same_recommendation_action_key";
      actionKey: string;
      queryRecommendationIds: string[];
      candidateRecommendationIds: string[];
    }
  | {
      kind: "same_attempted_action_key";
      actionKey: string;
      queryActionIds: string[];
      candidateActionIds: string[];
    };

export interface ExplicitIncidentPrecedent {
  link: IncidentLinkRecord;
  incident: IncidentSubjectSummary;
  structuredResponseMemory: StructuredResponseChain[];
}

export interface CandidateIncidentPrecedent {
  incident: IncidentSubjectSummary;
  matchReasons: IncidentPrecedentMatchReason[];
  structuredResponseMemory: StructuredResponseChain[];
}

export interface IncidentPrecedentSet {
  queryIncident: IncidentSubjectSummary;
  explicitPrecedents: ExplicitIncidentPrecedent[];
  candidatePrecedents: CandidateIncidentPrecedent[];
}

const MATCH_KIND_ORDER: Record<IncidentPrecedentMatchReason["kind"], number> = {
  same_subject_resource: 0,
  directly_related_subjects: 1,
  shared_proven_neighbor: 2,
  same_recommendation_action_key: 3,
  same_attempted_action_key: 4,
};

/**
 * Deterministic Incident time for precedent inclusion.
 * Prefer human-named occurrence time; fall back to Combie recordedAt.
 */
export function incidentEffectiveAt(incident: {
  recordedAt: string;
  occurredAt?: string;
}): string {
  return incident.occurredAt ?? incident.recordedAt;
}

/** True when candidate is strictly before the query (equal time is not prior). */
export function isTemporallyPriorIncident(
  candidate: { recordedAt: string; occurredAt?: string },
  query: { recordedAt: string; occurredAt?: string },
): boolean {
  return incidentEffectiveAt(candidate) < incidentEffectiveAt(query);
}

type IncidentWorking = {
  record: IncidentRecord;
  summary: IncidentSubjectSummary;
  recommendations: RecommendationRecord[];
  chains: StructuredResponseChain[];
  recommendationIdsByActionKey: Map<string, string[]>;
  actionIdsByActionKey: Map<string, string[]>;
};

function projectRelationship(
  relationship: Relationship,
  attempts: Readonly<Record<string, string | null | undefined>>,
): RelationshipClockProjection {
  return {
    id: relationship.id,
    kind: relationship.kind,
    sourceResourceId: relationship.sourceResourceId,
    targetResourceId: relationship.targetResourceId,
    evidence: structuredClone(relationship.evidence),
    lastVerifiedAt: relationship.updatedAt,
    lastRequiredProviderAttemptAt: lastRequiredProviderAttemptAt(
      relationship.kind as RelationshipKind,
      attempts,
    ),
  };
}

function hopFrom(
  relationship: Relationship,
  fromResourceId: string,
): { direction: "outbound" | "inbound"; neighborId: string } | null {
  if (relationship.sourceResourceId === fromResourceId) {
    return {
      direction: "outbound",
      neighborId: relationship.targetResourceId,
    };
  }
  if (relationship.targetResourceId === fromResourceId) {
    return {
      direction: "inbound",
      neighborId: relationship.sourceResourceId,
    };
  }
  return null;
}

function deriveIncidentSubjectSummary(
  store: Store,
  incident: IncidentRecord,
): IncidentSubjectSummary {
  const subjects = new Set<string>();
  const unresolvedResolutionIds: string[] = [];
  for (const memberId of incident.resolutionIds) {
    const member = store.getResolutionRow(memberId);
    if (!member) {
      unresolvedResolutionIds.push(memberId);
      continue;
    }
    subjects.add(member.subjectResourceId);
  }
  return {
    id: incident.id,
    ...(incident.title ? { title: incident.title } : {}),
    recordedAt: incident.recordedAt,
    subjectResourceIds: [...subjects].sort(),
    unresolvedResolutionIds,
  };
}

function composeChainsForIncident(
  store: Store,
  incidentId: string,
  decisionsByRecommendation: Map<string, DecisionRecord[]>,
  actionsByDecision: Map<string, ActionRecord[]>,
  outcomesByAction: Map<string, OutcomeRecord[]>,
): {
  recommendations: RecommendationRecord[];
  chains: StructuredResponseChain[];
} {
  const recommendations = store.listRecommendations({ incidentId });
  const chains = recommendations.map(
    (recommendation): StructuredResponseChain => ({
      recommendation: { ...recommendation },
      decisions: (decisionsByRecommendation.get(recommendation.id) ?? []).map(
        (decision): StructuredDecision => ({
          decision: { ...decision },
          actions: (actionsByDecision.get(decision.id) ?? []).map(
            (action): StructuredAction => ({
              action: { ...action },
              outcomes: (outcomesByAction.get(action.id) ?? []).map(
                (outcome) => ({ ...outcome }),
              ),
            }),
          ),
        }),
      ),
    }),
  );
  return { recommendations, chains };
}

function indexRecommendationActionKeys(
  recommendations: RecommendationRecord[],
): Map<string, string[]> {
  const byKey = new Map<string, string[]>();
  for (const recommendation of recommendations) {
    const list = byKey.get(recommendation.actionKey) ?? [];
    list.push(recommendation.id);
    byKey.set(recommendation.actionKey, list);
  }
  for (const [key, ids] of byKey) {
    byKey.set(key, [...ids].sort());
  }
  return byKey;
}

function indexAttemptedActionKeys(
  recommendations: RecommendationRecord[],
  decisionsByRecommendation: Map<string, DecisionRecord[]>,
  actionsByDecision: Map<string, ActionRecord[]>,
): Map<string, string[]> {
  const byKey = new Map<string, string[]>();
  for (const recommendation of recommendations) {
    for (const decision of decisionsByRecommendation.get(recommendation.id) ??
      []) {
      if (
        decision.disposition !== "approved" &&
        decision.disposition !== "modified"
      ) {
        continue;
      }
      for (const action of actionsByDecision.get(decision.id) ?? []) {
        const list = byKey.get(action.actionKey) ?? [];
        list.push(action.id);
        byKey.set(action.actionKey, list);
      }
    }
  }
  for (const [key, ids] of byKey) {
    byKey.set(key, [...ids].sort());
  }
  return byKey;
}

function buildMatchReasons(
  query: IncidentWorking,
  candidate: IncidentWorking,
  relationships: Relationship[],
  attempts: Readonly<Record<string, string | null | undefined>>,
): IncidentPrecedentMatchReason[] {
  const reasons: IncidentPrecedentMatchReason[] = [];

  const querySubjects = new Set(query.summary.subjectResourceIds);
  const candidateSubjects = new Set(candidate.summary.subjectResourceIds);

  for (const subjectResourceId of query.summary.subjectResourceIds) {
    if (candidateSubjects.has(subjectResourceId)) {
      reasons.push({ kind: "same_subject_resource", subjectResourceId });
    }
  }

  for (const relationship of relationships) {
    const sourceIsQuery = querySubjects.has(relationship.sourceResourceId);
    const targetIsQuery = querySubjects.has(relationship.targetResourceId);
    const sourceIsCandidate = candidateSubjects.has(
      relationship.sourceResourceId,
    );
    const targetIsCandidate = candidateSubjects.has(
      relationship.targetResourceId,
    );

    if (sourceIsQuery && targetIsCandidate) {
      reasons.push({
        kind: "directly_related_subjects",
        querySubjectResourceId: relationship.sourceResourceId,
        candidateSubjectResourceId: relationship.targetResourceId,
        relationship: projectRelationship(relationship, attempts),
        direction: "outbound",
      });
    } else if (targetIsQuery && sourceIsCandidate) {
      reasons.push({
        kind: "directly_related_subjects",
        querySubjectResourceId: relationship.targetResourceId,
        candidateSubjectResourceId: relationship.sourceResourceId,
        relationship: projectRelationship(relationship, attempts),
        direction: "inbound",
      });
    }
  }

  const queryNeighbors = new Map<
    string,
    Array<{
      subjectId: string;
      relationship: Relationship;
      direction: "outbound" | "inbound";
      neighborId: string;
    }>
  >();
  for (const subjectId of query.summary.subjectResourceIds) {
    for (const relationship of relationships) {
      const hop = hopFrom(relationship, subjectId);
      if (!hop) continue;
      if (querySubjects.has(hop.neighborId)) continue;
      const list = queryNeighbors.get(hop.neighborId) ?? [];
      list.push({
        subjectId,
        relationship,
        direction: hop.direction,
        neighborId: hop.neighborId,
      });
      queryNeighbors.set(hop.neighborId, list);
    }
  }

  for (const subjectId of candidate.summary.subjectResourceIds) {
    for (const relationship of relationships) {
      const hop = hopFrom(relationship, subjectId);
      if (!hop) continue;
      // Shared neighbor must not be a query or candidate subject.
      if (
        querySubjects.has(hop.neighborId) ||
        candidateSubjects.has(hop.neighborId)
      ) {
        continue;
      }
      const queryHops = queryNeighbors.get(hop.neighborId);
      if (!queryHops) continue;
      for (const queryHop of queryHops) {
        if (queryHop.subjectId === subjectId) continue;
        reasons.push({
          kind: "shared_proven_neighbor",
          querySubjectResourceId: queryHop.subjectId,
          candidateSubjectResourceId: subjectId,
          sharedNeighborResourceId: hop.neighborId,
          queryRelationship: projectRelationship(
            queryHop.relationship,
            attempts,
          ),
          candidateRelationship: projectRelationship(relationship, attempts),
          queryDirection: queryHop.direction,
          candidateDirection: hop.direction,
        });
      }
    }
  }

  for (const [actionKey, queryRecommendationIds] of query
    .recommendationIdsByActionKey) {
    const candidateRecommendationIds =
      candidate.recommendationIdsByActionKey.get(actionKey);
    if (!candidateRecommendationIds || candidateRecommendationIds.length === 0) {
      continue;
    }
    reasons.push({
      kind: "same_recommendation_action_key",
      actionKey,
      queryRecommendationIds: [...queryRecommendationIds],
      candidateRecommendationIds: [...candidateRecommendationIds],
    });
  }

  for (const [actionKey, queryActionIds] of query.actionIdsByActionKey) {
    const candidateActionIds = candidate.actionIdsByActionKey.get(actionKey);
    if (!candidateActionIds || candidateActionIds.length === 0) continue;
    reasons.push({
      kind: "same_attempted_action_key",
      actionKey,
      queryActionIds: [...queryActionIds],
      candidateActionIds: [...candidateActionIds],
    });
  }

  return dedupeAndSortMatchReasons(reasons);
}

function matchReasonDedupeKey(reason: IncidentPrecedentMatchReason): string {
  switch (reason.kind) {
    case "same_subject_resource":
      return `same_subject_resource:${reason.subjectResourceId}`;
    case "directly_related_subjects":
      return (
        `directly_related_subjects:${reason.querySubjectResourceId}:` +
        `${reason.candidateSubjectResourceId}:${reason.relationship.id}`
      );
    case "shared_proven_neighbor":
      return (
        `shared_proven_neighbor:${reason.querySubjectResourceId}:` +
        `${reason.candidateSubjectResourceId}:${reason.sharedNeighborResourceId}:` +
        `${reason.queryRelationship.id}:${reason.candidateRelationship.id}`
      );
    case "same_recommendation_action_key":
      return `same_recommendation_action_key:${reason.actionKey}`;
    case "same_attempted_action_key":
      return `same_attempted_action_key:${reason.actionKey}`;
  }
}

function compareMatchReasons(
  a: IncidentPrecedentMatchReason,
  b: IncidentPrecedentMatchReason,
): number {
  const kindDiff = MATCH_KIND_ORDER[a.kind] - MATCH_KIND_ORDER[b.kind];
  if (kindDiff !== 0) return kindDiff;
  switch (a.kind) {
    case "same_subject_resource": {
      const other = b as Extract<
        IncidentPrecedentMatchReason,
        { kind: "same_subject_resource" }
      >;
      return a.subjectResourceId.localeCompare(other.subjectResourceId);
    }
    case "directly_related_subjects": {
      const other = b as Extract<
        IncidentPrecedentMatchReason,
        { kind: "directly_related_subjects" }
      >;
      return (
        a.querySubjectResourceId.localeCompare(other.querySubjectResourceId) ||
        a.candidateSubjectResourceId.localeCompare(
          other.candidateSubjectResourceId,
        ) ||
        a.relationship.id.localeCompare(other.relationship.id)
      );
    }
    case "shared_proven_neighbor": {
      const other = b as Extract<
        IncidentPrecedentMatchReason,
        { kind: "shared_proven_neighbor" }
      >;
      return (
        a.querySubjectResourceId.localeCompare(other.querySubjectResourceId) ||
        a.candidateSubjectResourceId.localeCompare(
          other.candidateSubjectResourceId,
        ) ||
        a.sharedNeighborResourceId.localeCompare(
          other.sharedNeighborResourceId,
        ) ||
        a.queryRelationship.id.localeCompare(other.queryRelationship.id) ||
        a.candidateRelationship.id.localeCompare(other.candidateRelationship.id)
      );
    }
    case "same_recommendation_action_key": {
      const other = b as Extract<
        IncidentPrecedentMatchReason,
        { kind: "same_recommendation_action_key" }
      >;
      return a.actionKey.localeCompare(other.actionKey);
    }
    case "same_attempted_action_key": {
      const other = b as Extract<
        IncidentPrecedentMatchReason,
        { kind: "same_attempted_action_key" }
      >;
      return a.actionKey.localeCompare(other.actionKey);
    }
  }
}

function dedupeAndSortMatchReasons(
  reasons: IncidentPrecedentMatchReason[],
): IncidentPrecedentMatchReason[] {
  const seen = new Set<string>();
  const unique: IncidentPrecedentMatchReason[] = [];
  for (const reason of reasons) {
    const key = matchReasonDedupeKey(reason);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(reason);
  }
  return unique.sort(compareMatchReasons);
}

function loadParentIndexes(store: Store): {
  decisionsByRecommendation: Map<string, DecisionRecord[]>;
  actionsByDecision: Map<string, ActionRecord[]>;
  outcomesByAction: Map<string, OutcomeRecord[]>;
} {
  const decisionsByRecommendation = new Map<string, DecisionRecord[]>();
  for (const decision of store.listDecisions()) {
    if (!isDecisionDisposition(decision.disposition)) continue;
    const list = decisionsByRecommendation.get(decision.recommendationId) ?? [];
    list.push(decision);
    decisionsByRecommendation.set(decision.recommendationId, list);
  }
  const actionsByDecision = new Map<string, ActionRecord[]>();
  for (const action of store.listActions()) {
    const list = actionsByDecision.get(action.decisionId) ?? [];
    list.push(action);
    actionsByDecision.set(action.decisionId, list);
  }
  const outcomesByAction = new Map<string, OutcomeRecord[]>();
  for (const outcome of store.listOutcomes()) {
    if (!isOutcomeAssessment(outcome.assessment)) continue;
    const list = outcomesByAction.get(outcome.actionId) ?? [];
    list.push(outcome);
    outcomesByAction.set(outcome.actionId, list);
  }
  return {
    decisionsByRecommendation,
    actionsByDecision,
    outcomesByAction,
  };
}

function buildWorkingIncident(
  store: Store,
  incident: IncidentRecord,
  decisionsByRecommendation: Map<string, DecisionRecord[]>,
  actionsByDecision: Map<string, ActionRecord[]>,
  outcomesByAction: Map<string, OutcomeRecord[]>,
): IncidentWorking {
  const summary = deriveIncidentSubjectSummary(store, incident);
  const { recommendations, chains } = composeChainsForIncident(
    store,
    incident.id,
    decisionsByRecommendation,
    actionsByDecision,
    outcomesByAction,
  );
  return {
    record: incident,
    summary,
    recommendations,
    chains,
    recommendationIdsByActionKey: indexRecommendationActionKeys(recommendations),
    actionIdsByActionKey: indexAttemptedActionKeys(
      recommendations,
      decisionsByRecommendation,
      actionsByDecision,
    ),
  };
}

/**
 * One query Incident → full precedent set. Unknown id → INCIDENT_NOT_FOUND.
 */
export function composeIncidentPrecedents(
  baseDir: string,
  queryIncidentId: string,
): IncidentPrecedentSet {
  const ref = queryIncidentId.trim();
  if (!ref) {
    throw new CombieError(
      "INCIDENT_ID_REQUIRED",
      `Incident id is required.\nUsage: ${BINARY_NAME} precedents --incident <incident-id>`,
    );
  }

  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();

    const queryRow = store.getIncidentRow(ref);
    if (!queryRow) {
      throw new CombieError(
        "INCIDENT_NOT_FOUND",
        `Incident not found: ${ref}\nList recorded incidents: ${BINARY_NAME} incidents`,
      );
    }

    const {
      decisionsByRecommendation,
      actionsByDecision,
      outcomesByAction,
    } = loadParentIndexes(store);

    const query = buildWorkingIncident(
      store,
      queryRow,
      decisionsByRecommendation,
      actionsByDecision,
      outcomesByAction,
    );

    const links = listIncidentLinks(baseDir, { incidentId: query.record.id });
    const explicitPeerIds = new Set<string>();
    const explicitPrecedents: ExplicitIncidentPrecedent[] = [];

    for (const link of links) {
      const peerId =
        link.incidentIds[0] === query.record.id
          ? link.incidentIds[1]
          : link.incidentIds[0];
      explicitPeerIds.add(peerId);
      const peerRow = store.getIncidentRow(peerId);
      if (!peerRow) continue;
      // Non-prior explicit peers stay listed via incident-links, not as precedents.
      if (!isTemporallyPriorIncident(peerRow, query.record)) continue;
      const peer = buildWorkingIncident(
        store,
        peerRow,
        decisionsByRecommendation,
        actionsByDecision,
        outcomesByAction,
      );
      explicitPrecedents.push({
        link: {
          id: link.id,
          incidentIds: [...link.incidentIds] as [string, string],
          recordedAt: link.recordedAt,
          reason: link.reason,
        },
        incident: peer.summary,
        structuredResponseMemory: peer.chains,
      });
    }

    const relationships = store.listRelationships();
    const attempts = lastAttemptAtByProvider(store.listProviders());

    const candidatePrecedents: CandidateIncidentPrecedent[] = [];
    for (const other of store.listIncidentSummaries()) {
      if (other.id === query.record.id) continue;
      if (explicitPeerIds.has(other.id)) continue;
      if (!isTemporallyPriorIncident(other, query.record)) continue;

      const candidate = buildWorkingIncident(
        store,
        other,
        decisionsByRecommendation,
        actionsByDecision,
        outcomesByAction,
      );
      const matchReasons = buildMatchReasons(
        query,
        candidate,
        relationships,
        attempts,
      );
      if (matchReasons.length === 0) continue;
      candidatePrecedents.push({
        incident: candidate.summary,
        matchReasons,
        structuredResponseMemory: candidate.chains,
      });
    }

    candidatePrecedents.sort((a, b) => {
      const timeDiff = b.incident.recordedAt.localeCompare(a.incident.recordedAt);
      if (timeDiff !== 0) return timeDiff;
      return b.incident.id.localeCompare(a.incident.id);
    });

    return {
      queryIncident: query.summary,
      explicitPrecedents,
      candidatePrecedents,
    };
  } finally {
    store.close();
  }
}

/**
 * Compose one set per id, preserving input order.
 * Used by response-recall: pass incidentMemory ids in that order.
 */
export function composeIncidentPrecedentMemory(
  baseDir: string,
  queryIncidentIds: string[],
): IncidentPrecedentSet[] {
  return queryIncidentIds.map((id) => composeIncidentPrecedents(baseDir, id));
}

function formatMatchReason(reason: IncidentPrecedentMatchReason): string[] {
  switch (reason.kind) {
    case "same_subject_resource":
      return [
        `match: same_subject_resource`,
        `  subject: ${reason.subjectResourceId}`,
      ];
    case "directly_related_subjects":
      return [
        `match: directly_related_subjects (${reason.direction})`,
        `  query subject: ${reason.querySubjectResourceId}`,
        `  candidate subject: ${reason.candidateSubjectResourceId}`,
        `  relationship: ${reason.relationship.id} (${reason.relationship.kind})`,
        `  last verified by Combie at: ${reason.relationship.lastVerifiedAt}`,
        reason.relationship.lastRequiredProviderAttemptAt != null
          ? `  last required-provider sync attempt: ${reason.relationship.lastRequiredProviderAttemptAt}`
          : null,
      ].filter((line): line is string => line != null);
    case "shared_proven_neighbor":
      return [
        `match: shared_proven_neighbor`,
        `  query subject: ${reason.querySubjectResourceId} (${reason.queryDirection})`,
        `  candidate subject: ${reason.candidateSubjectResourceId} (${reason.candidateDirection})`,
        `  shared neighbor: ${reason.sharedNeighborResourceId}`,
        `  query relationship: ${reason.queryRelationship.id} (${reason.queryRelationship.kind})`,
        `  query last verified by Combie at: ${reason.queryRelationship.lastVerifiedAt}`,
        reason.queryRelationship.lastRequiredProviderAttemptAt != null
          ? `  query last required-provider sync attempt: ${reason.queryRelationship.lastRequiredProviderAttemptAt}`
          : null,
        `  candidate relationship: ${reason.candidateRelationship.id} (${reason.candidateRelationship.kind})`,
        `  candidate last verified by Combie at: ${reason.candidateRelationship.lastVerifiedAt}`,
        reason.candidateRelationship.lastRequiredProviderAttemptAt != null
          ? `  candidate last required-provider sync attempt: ${reason.candidateRelationship.lastRequiredProviderAttemptAt}`
          : null,
      ].filter((line): line is string => line != null);
    case "same_recommendation_action_key":
      return [
        `match: same_recommendation_action_key`,
        `  action key: ${reason.actionKey}`,
        `  query recommendations: ${reason.queryRecommendationIds.join(", ")}`,
        `  candidate recommendations: ${reason.candidateRecommendationIds.join(", ")}`,
      ];
    case "same_attempted_action_key":
      return [
        `match: same_attempted_action_key`,
        `  action key: ${reason.actionKey}`,
        `  query actions: ${reason.queryActionIds.join(", ")}`,
        `  candidate actions: ${reason.candidateActionIds.join(", ")}`,
      ];
  }
}

function formatIncidentSummary(summary: IncidentSubjectSummary): string[] {
  const lines = [
    `ID: ${summary.id}`,
    `Recorded by Combie at ${summary.recordedAt}`,
  ];
  if (summary.title) lines.push(`Title: ${summary.title}`);
  lines.push(
    `Subjects: ${
      summary.subjectResourceIds.length > 0
        ? summary.subjectResourceIds.join(", ")
        : "(none)"
    }`,
  );
  if (summary.unresolvedResolutionIds.length > 0) {
    lines.push(
      `Unresolved members: ${summary.unresolvedResolutionIds.join(", ")}`,
    );
  }
  return lines;
}

function formatChainCount(chains: StructuredResponseChain[]): string {
  return `Structured response chains: ${chains.length}`;
}

export function formatIncidentPrecedents(set: IncidentPrecedentSet): string {
  const lines: string[] = [
    "INCIDENT PRECEDENTS",
    ...formatIncidentSummary(set.queryIncident),
    "Precedents are temporally prior only (effectiveAt = occurredAt when set, else recordedAt). Equal or later Incidents are never precedents.",
    "These are candidates — exact inspectable matches. Combie does not claim similarity or recommend a response.",
    "",
    "EXPLICIT PRECEDENTS",
  ];

  if (set.explicitPrecedents.length === 0) {
    lines.push("No explicit incident links for this incident.");
  } else {
    for (const precedent of set.explicitPrecedents) {
      lines.push(
        "",
        `Link: ${precedent.link.id}`,
        `Reason: ${precedent.link.reason}`,
        `Linked at: ${precedent.link.recordedAt}`,
        ...formatIncidentSummary(precedent.incident),
        formatChainCount(precedent.structuredResponseMemory),
      );
    }
  }

  lines.push("", "CANDIDATE PRECEDENTS");
  if (set.candidatePrecedents.length === 0) {
    lines.push("No candidate precedents for this incident.");
  } else {
    for (const precedent of set.candidatePrecedents) {
      lines.push("", ...formatIncidentSummary(precedent.incident));
      for (const reason of precedent.matchReasons) {
        lines.push(...formatMatchReason(reason));
      }
      lines.push(formatChainCount(precedent.structuredResponseMemory));
    }
  }

  return `${lines.join("\n")}\n\n${formatIncidentResponseExperience(
    composeIncidentResponseExperience(set),
  )}`;
}
