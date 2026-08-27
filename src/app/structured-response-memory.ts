import { randomUUID } from "node:crypto";
import type { ActionRecord } from "../domain/action.ts";
import { actionId } from "../domain/action.ts";
import {
  DECISION_DISPOSITIONS,
  type DecisionDisposition,
  type DecisionRecord,
  isDecisionDisposition,
} from "../domain/decision.ts";
import { decisionId } from "../domain/decision.ts";
import {
  OUTCOME_ASSESSMENTS,
  type OutcomeAssessment,
  type OutcomeMeasurement,
  type OutcomeRecord,
  isOutcomeAssessment,
} from "../domain/outcome.ts";
import { outcomeId } from "../domain/outcome.ts";
import type { RecommendationRecord } from "../domain/recommendation.ts";
import { recommendationId } from "../domain/recommendation.ts";
import { Store } from "../storage/store.ts";
import { BINARY_NAME } from "../cli/constants.ts";
import { CombieError, notInitialized } from "./errors.ts";
import { validateEvidenceIds } from "./evidence-attachment.ts";

/** Explicit normalized response category: lower-kebab token. */
const ACTION_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidActionKey(value: string): boolean {
  return ACTION_KEY_PATTERN.test(value);
}

function trimField(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function uniqueFirstSeen(ids: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }
  return unique;
}

function canonicalizeIso(value: string): string | undefined {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString();
}

function requireCanonicalIso(
  value: string,
  code: string,
  message: string,
): string {
  const canonical = canonicalizeIso(value.trim());
  if (!canonical) throw new CombieError(code, message);
  return canonical;
}

function validateActionKey(
  value: string,
  code: string,
  message: string,
): string {
  const trimmed = value.trim();
  if (!isValidActionKey(trimmed)) throw new CombieError(code, message);
  return trimmed;
}

function requireText(
  value: string | undefined,
  code: string,
  message: string,
): string | undefined {
  const trimmed = trimField(value);
  if (!trimmed) throw new CombieError(code, message);
  return trimmed;
}

function normalizeEvidenceIds(ids: string[]): string[] | undefined {
  const unique = uniqueFirstSeen(ids);
  return unique.length > 0 ? unique : undefined;
}

function validateEvidence(
  baseDir: string,
  subjectResourceId: string,
  evidenceIds: string[],
): void {
  if (evidenceIds.length > 0) {
    validateEvidenceIds(baseDir, subjectResourceId, evidenceIds);
  }
}

// ---------------------------------------------------------------------------
// Recommendation
// ---------------------------------------------------------------------------

export interface RecordRecommendationOptions {
  baseDir: string;
  investigationId?: string;
  subjectResourceId?: string;
  incidentId?: string;
  actionKey: string;
  proposal: string;
  rationale?: string;
  evidenceIds?: string[];
  recordedAt?: string;
}

export interface ListRecommendationsOptions {
  subjectResourceId?: string;
  investigationId?: string;
  incidentId?: string;
}

export function recordRecommendation(
  options: RecordRecommendationOptions,
): RecommendationRecord {
  const investigationId = trimField(options.investigationId);
  const subjectResourceId = trimField(options.subjectResourceId);
  const incidentId = trimField(options.incidentId);

  if (investigationId && (subjectResourceId || incidentId)) {
    throw new CombieError(
      "RECOMMENDATION_ANCHOR_CONFLICT",
      `Use exactly one of --investigation, --resource, or --incident.\nUsage: ${BINARY_NAME} recommendation --investigation <investigation-id> --action-key <token> --proposal <text>\nUsage: ${BINARY_NAME} recommendation --resource <resource-id> --action-key <token> --proposal <text>\nUsage: ${BINARY_NAME} recommendation --incident <incident-id> --resource <resource-id> --action-key <token> --proposal <text>`,
    );
  }
  if (!investigationId && !subjectResourceId && !incidentId) {
    throw new CombieError(
      "RECOMMENDATION_ANCHOR_REQUIRED",
      `Recording a recommendation requires --investigation, --resource, or --incident.\nUsage: ${BINARY_NAME} recommendation --investigation <investigation-id> --action-key <token> --proposal <text>\nUsage: ${BINARY_NAME} recommendation --resource <resource-id> --action-key <token> --proposal <text>\nUsage: ${BINARY_NAME} recommendation --incident <incident-id> --resource <resource-id> --action-key <token> --proposal <text>`,
    );
  }
  if (incidentId && !subjectResourceId) {
    throw new CombieError(
      "RECOMMENDATION_INCIDENT_REQUIRES_RESOURCE",
      `An incident-anchored recommendation requires --resource naming the exact member subject.\nUsage: ${BINARY_NAME} recommendation --incident <incident-id> --resource <resource-id> --action-key <token> --proposal <text>`,
    );
  }

  const actionKey = validateActionKey(
    options.actionKey,
    "RECOMMENDATION_ACTION_KEY_INVALID",
    `--action-key must be a lower-kebab token (e.g. rollback-deployment, inspect-database).\nUsage: ${BINARY_NAME} recommendation --investigation <investigation-id> --action-key <token> --proposal <text>`,
  );
  const proposal = requireText(
    options.proposal,
    "RECOMMENDATION_PROPOSAL_REQUIRED",
    `--proposal requires non-blank text.\nUsage: ${BINARY_NAME} recommendation --investigation <investigation-id> --action-key <token> --proposal <text>`,
  )!;
  const rationale = trimField(options.rationale);

  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    store.init();
    let subjectId: string;
    let recordInvestigationId: string | undefined;
    let recordIncidentId: string | undefined;
    if (investigationId) {
      const investigation = store.getInvestigationRow(investigationId);
      if (!investigation) {
        throw new CombieError(
          "INVESTIGATION_NOT_FOUND",
          `Investigation not found: ${investigationId}\nList saved investigations: ${BINARY_NAME} investigations`,
        );
      }
      subjectId = investigation.subjectResourceId;
      recordInvestigationId = investigation.id;
    } else if (incidentId) {
      const incident = store.getIncidentRow(incidentId);
      if (!incident) {
        throw new CombieError(
          "INCIDENT_NOT_FOUND",
          `Incident not found: ${incidentId}\nList recorded incidents: ${BINARY_NAME} incidents`,
        );
      }
      const loadedSubjects: string[] = [];
      for (const memberId of incident.resolutionIds) {
        const member = store.getResolutionRow(memberId);
        if (!member) continue;
        loadedSubjects.push(member.subjectResourceId);
      }
      if (loadedSubjects.length === 0) {
        throw new CombieError(
          "INCIDENT_MEMBERS_UNRESOLVED",
          `Incident ${incidentId} has no loadable member resolutions, so no subject can be named.\nRecord with --resource (ungrouped) or --investigation instead.`,
        );
      }
      const resource = store.getResource(subjectResourceId!);
      if (!resource) {
        throw new CombieError(
          "RESOURCE_NOT_FOUND",
          `Resource not found: ${subjectResourceId}\nUse a stable resource id (provider:kind:providerResourceId).\nList known resources: ${BINARY_NAME} resources`,
        );
      }
      if (!loadedSubjects.includes(subjectResourceId!)) {
        throw new CombieError(
          "INCIDENT_SUBJECT_NOT_MEMBER",
          `Incident ${incidentId} has no loadable member on subject ${subjectResourceId}.\nName a subject already on a member of this incident.`,
        );
      }
      subjectId = resource.id;
      recordIncidentId = incident.id;
    } else {
      const resource = store.getResource(subjectResourceId!);
      if (!resource) {
        throw new CombieError(
          "RESOURCE_NOT_FOUND",
          `Resource not found: ${subjectResourceId}\nUse a stable resource id (provider:kind:providerResourceId).\nList known resources: ${BINARY_NAME} resources`,
        );
      }
      subjectId = resource.id;
    }

    const evidenceIds = normalizeEvidenceIds(options.evidenceIds ?? []);
    if (evidenceIds !== undefined) {
      validateEvidence(options.baseDir, subjectId, evidenceIds);
    }

    const record: RecommendationRecord = {
      id: recommendationId(randomUUID()),
      subjectResourceId: subjectId,
      ...(recordInvestigationId
        ? { investigationId: recordInvestigationId }
        : {}),
      ...(recordIncidentId ? { incidentId: recordIncidentId } : {}),
      recordedAt: options.recordedAt ?? new Date().toISOString(),
      actionKey,
      proposal,
      ...(rationale ? { rationale } : {}),
      ...(evidenceIds !== undefined ? { evidenceIds } : {}),
    };
    store.insertRecommendation(record);
    return record;
  } finally {
    store.close();
  }
}

export function listRecommendations(
  baseDir: string,
  filter?: ListRecommendationsOptions,
): RecommendationRecord[] {
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    return store.listRecommendations(
      filter &&
        (filter.subjectResourceId !== undefined ||
          filter.investigationId !== undefined ||
          filter.incidentId !== undefined)
        ? {
            ...(filter.subjectResourceId !== undefined
              ? { subjectResourceId: filter.subjectResourceId }
              : {}),
            ...(filter.investigationId !== undefined
              ? { investigationId: filter.investigationId }
              : {}),
            ...(filter.incidentId !== undefined
              ? { incidentId: filter.incidentId }
              : {}),
          }
        : undefined,
    );
  } finally {
    store.close();
  }
}

export function getRecommendation(
  baseDir: string,
  id: string,
): RecommendationRecord {
  const ref = id.trim();
  if (!ref) {
    throw new CombieError(
      "RECOMMENDATION_ID_REQUIRED",
      `Recommendation id is required.\nUsage: ${BINARY_NAME} recommendation <recommendation-id>\nList ids: ${BINARY_NAME} recommendations`,
    );
  }
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    const row = store.getRecommendation(ref);
    if (!row) {
      throw new CombieError(
        "RECOMMENDATION_NOT_FOUND",
        `Recommendation not found: ${ref}\nList recorded recommendations: ${BINARY_NAME} recommendations`,
      );
    }
    return row;
  } finally {
    store.close();
  }
}

// ---------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------

export interface RecordDecisionOptions {
  baseDir: string;
  recommendationId: string;
  disposition: DecisionDisposition;
  note?: string;
  recordedAt?: string;
}

export interface ListDecisionsOptions {
  recommendationId?: string;
}

export function recordDecision(options: RecordDecisionOptions): DecisionRecord {
  const recommendationId = trimField(options.recommendationId);
  if (!recommendationId) {
    throw new CombieError(
      "DECISION_RECOMMENDATION_ID_REQUIRED",
      `--recommendation requires a recommendation id.\nUsage: ${BINARY_NAME} decision --recommendation <recommendation-id> --disposition approved|rejected|deferred|modified [--note <text>]`,
    );
  }
  const disposition = options.disposition;
  if (!isDecisionDisposition(disposition)) {
    throw new CombieError(
      "DECISION_DISPOSITION_INVALID",
      `--disposition must be one of: ${DECISION_DISPOSITIONS.join(", ")}.\nUsage: ${BINARY_NAME} decision --recommendation <recommendation-id> --disposition approved|rejected|deferred|modified [--note <text>]`,
    );
  }
  const note = trimField(options.note);
  if (disposition === "modified" && !note) {
    throw new CombieError(
      "DECISION_MODIFIED_REQUIRES_NOTE",
      `A modified decision requires --note describing the change.\nUsage: ${BINARY_NAME} decision --recommendation <recommendation-id> --disposition modified --note <text>`,
    );
  }

  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    store.init();
    if (!store.getRecommendation(recommendationId)) {
      throw new CombieError(
        "RECOMMENDATION_NOT_FOUND",
        `Recommendation not found: ${recommendationId}\nList recorded recommendations: ${BINARY_NAME} recommendations`,
      );
    }
    const record: DecisionRecord = {
      id: decisionId(randomUUID()),
      recommendationId,
      recordedAt: options.recordedAt ?? new Date().toISOString(),
      disposition,
      ...(note ? { note } : {}),
    };
    store.insertDecision(record);
    return record;
  } finally {
    store.close();
  }
}

export function listDecisions(
  baseDir: string,
  filter?: ListDecisionsOptions,
): DecisionRecord[] {
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    return store.listDecisions(
      filter?.recommendationId !== undefined
        ? { recommendationId: filter.recommendationId }
        : undefined,
    );
  } finally {
    store.close();
  }
}

export function getDecision(baseDir: string, id: string): DecisionRecord {
  const ref = id.trim();
  if (!ref) {
    throw new CombieError(
      "DECISION_ID_REQUIRED",
      `Decision id is required.\nUsage: ${BINARY_NAME} decision <decision-id>\nList ids: ${BINARY_NAME} decisions`,
    );
  }
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    const row = store.getDecision(ref);
    if (!row) {
      throw new CombieError(
        "DECISION_NOT_FOUND",
        `Decision not found: ${ref}\nList recorded decisions: ${BINARY_NAME} decisions`,
      );
    }
    return row;
  } finally {
    store.close();
  }
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

export interface RecordActionOptions {
  baseDir: string;
  decisionId: string;
  actionKey: string;
  summary: string;
  performedAt?: string;
  recordedAt?: string;
}

export interface ListActionsOptions {
  decisionId?: string;
}

export function recordAction(options: RecordActionOptions): ActionRecord {
  const decisionId = trimField(options.decisionId);
  if (!decisionId) {
    throw new CombieError(
      "ACTION_DECISION_ID_REQUIRED",
      `--decision requires a decision id.\nUsage: ${BINARY_NAME} action --decision <decision-id> --action-key <token> --summary <text> [--performed-at <iso>]`,
    );
  }
  const actionKey = validateActionKey(
    options.actionKey,
    "ACTION_ACTION_KEY_INVALID",
    `--action-key must be a lower-kebab token (e.g. rollback-deployment, configuration-repair).\nUsage: ${BINARY_NAME} action --decision <decision-id> --action-key <token> --summary <text>`,
  );
  const summary = requireText(
    options.summary,
    "ACTION_SUMMARY_REQUIRED",
    `--summary requires non-blank text.\nUsage: ${BINARY_NAME} action --decision <decision-id> --action-key <token> --summary <text>`,
  )!;
  const performedAt =
    options.performedAt !== undefined && options.performedAt.trim().length > 0
      ? requireCanonicalIso(
          options.performedAt,
          "ACTION_PERFORMED_AT_INVALID",
          `--performed-at requires a valid ISO timestamp.\nUsage: ${BINARY_NAME} action --decision <decision-id> --action-key <token> --summary <text> [--performed-at <iso>]`,
        )
      : undefined;

  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    store.init();
    const decision = store.getDecision(decisionId);
    if (!decision) {
      throw new CombieError(
        "DECISION_NOT_FOUND",
        `Decision not found: ${decisionId}\nList recorded decisions: ${BINARY_NAME} decisions`,
      );
    }
    if (decision.disposition !== "approved" && decision.disposition !== "modified") {
      throw new CombieError(
        "ACTION_DECISION_NOT_APPROVED",
        `Decision ${decisionId} has disposition ${decision.disposition}; an action requires an approved or modified decision.\nList decisions: ${BINARY_NAME} decisions --recommendation ${decision.recommendationId}`,
      );
    }
    const record: ActionRecord = {
      id: actionId(randomUUID()),
      decisionId,
      recordedAt: options.recordedAt ?? new Date().toISOString(),
      actionKey,
      summary,
      ...(performedAt ? { performedAt } : {}),
    };
    store.insertAction(record);
    return record;
  } finally {
    store.close();
  }
}

export function listActions(
  baseDir: string,
  filter?: ListActionsOptions,
): ActionRecord[] {
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    return store.listActions(
      filter?.decisionId !== undefined
        ? { decisionId: filter.decisionId }
        : undefined,
    );
  } finally {
    store.close();
  }
}

export function getAction(baseDir: string, id: string): ActionRecord {
  const ref = id.trim();
  if (!ref) {
    throw new CombieError(
      "ACTION_ID_REQUIRED",
      `Action id is required.\nUsage: ${BINARY_NAME} action <action-id>\nList ids: ${BINARY_NAME} actions`,
    );
  }
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    const row = store.getAction(ref);
    if (!row) {
      throw new CombieError(
        "ACTION_NOT_FOUND",
        `Action not found: ${ref}\nList recorded actions: ${BINARY_NAME} actions`,
      );
    }
    return row;
  } finally {
    store.close();
  }
}

// ---------------------------------------------------------------------------
// Outcome
// ---------------------------------------------------------------------------

export interface RecordOutcomeOptions {
  baseDir: string;
  actionId: string;
  assessment: OutcomeAssessment;
  summary: string;
  observedAt?: string;
  measurement?: OutcomeMeasurement;
  evidenceIds?: string[];
  recordedAt?: string;
}

export interface ListOutcomesOptions {
  actionId?: string;
}

function validateMeasurement(
  measurement: OutcomeMeasurement,
): OutcomeMeasurement {
  const metric = trimField(measurement.metric);
  const unit = trimField(measurement.unit);
  if (
    !metric ||
    !unit ||
    !Number.isFinite(measurement.before) ||
    !Number.isFinite(measurement.after)
  ) {
    throw new CombieError(
      "OUTCOME_MEASUREMENT_INVALID",
      `A measurement requires a non-blank --metric, finite numeric --before and --after, and a non-blank --unit supplied together.\nUsage: ${BINARY_NAME} outcome --action <action-id> --assessment <assessment> --summary <text> --metric <name> --before <number> --after <number> --unit <unit>`,
    );
  }
  return {
    metric,
    before: measurement.before,
    after: measurement.after,
    unit,
  };
}

function resolveOutcomeSubject(
  store: Store,
  actionId: string,
): string {
  const action = store.getAction(actionId);
  if (!action) {
    throw new CombieError(
      "ACTION_NOT_FOUND",
      `Action not found: ${actionId}\nList recorded actions: ${BINARY_NAME} actions`,
    );
  }
  const decision = store.getDecision(action.decisionId);
  if (!decision) {
    throw new CombieError(
      "DECISION_NOT_FOUND",
      `Decision not found: ${action.decisionId}\nThe action's parent decision is no longer resolvable.\nList recorded decisions: ${BINARY_NAME} decisions`,
    );
  }
  const recommendation = store.getRecommendation(decision.recommendationId);
  if (!recommendation) {
    throw new CombieError(
      "RECOMMENDATION_NOT_FOUND",
      `Recommendation not found: ${decision.recommendationId}\nThe decision's parent recommendation is no longer resolvable.\nList recorded recommendations: ${BINARY_NAME} recommendations`,
    );
  }
  return recommendation.subjectResourceId;
}

export function recordOutcome(options: RecordOutcomeOptions): OutcomeRecord {
  const actionId = trimField(options.actionId);
  if (!actionId) {
    throw new CombieError(
      "OUTCOME_ACTION_ID_REQUIRED",
      `--action requires an action id.\nUsage: ${BINARY_NAME} outcome --action <action-id> --assessment positive|negative|mixed|neutral|inconclusive --summary <text> [--observed-at <iso>] [--evidence <id>]\nUsage: ${BINARY_NAME} outcome --action <action-id> --assessment <assessment> --summary <text> --metric <name> --before <number> --after <number> --unit <unit>`,
    );
  }
  const assessment = options.assessment;
  if (!isOutcomeAssessment(assessment)) {
    throw new CombieError(
      "OUTCOME_ASSESSMENT_INVALID",
      `--assessment must be one of: ${OUTCOME_ASSESSMENTS.join(", ")}.\nUsage: ${BINARY_NAME} outcome --action <action-id> --assessment positive|negative|mixed|neutral|inconclusive --summary <text>`,
    );
  }
  const summary = requireText(
    options.summary,
    "OUTCOME_SUMMARY_REQUIRED",
    `--summary requires non-blank text.\nUsage: ${BINARY_NAME} outcome --action <action-id> --assessment <assessment> --summary <text>`,
  )!;
  const observedAt =
    options.observedAt !== undefined && options.observedAt.trim().length > 0
      ? requireCanonicalIso(
          options.observedAt,
          "OUTCOME_OBSERVED_AT_INVALID",
          `--observed-at requires a valid ISO timestamp.\nUsage: ${BINARY_NAME} outcome --action <action-id> --assessment <assessment> --summary <text> [--observed-at <iso>]`,
        )
      : undefined;
  const measurement = options.measurement
    ? validateMeasurement(options.measurement)
    : undefined;

  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    store.init();
    const subjectId = resolveOutcomeSubject(store, actionId);

    const evidenceIds = normalizeEvidenceIds(options.evidenceIds ?? []);
    if (evidenceIds !== undefined) {
      validateEvidence(options.baseDir, subjectId, evidenceIds);
    }

    const record: OutcomeRecord = {
      id: outcomeId(randomUUID()),
      actionId,
      recordedAt: options.recordedAt ?? new Date().toISOString(),
      ...(observedAt ? { observedAt } : {}),
      assessment,
      summary,
      ...(measurement ? { measurement } : {}),
      ...(evidenceIds !== undefined ? { evidenceIds } : {}),
    };
    store.insertOutcome(record);
    return record;
  } finally {
    store.close();
  }
}

export function listOutcomes(
  baseDir: string,
  filter?: ListOutcomesOptions,
): OutcomeRecord[] {
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    return store.listOutcomes(
      filter?.actionId !== undefined ? { actionId: filter.actionId } : undefined,
    );
  } finally {
    store.close();
  }
}

export function getOutcome(baseDir: string, id: string): OutcomeRecord {
  const ref = id.trim();
  if (!ref) {
    throw new CombieError(
      "OUTCOME_ID_REQUIRED",
      `Outcome id is required.\nUsage: ${BINARY_NAME} outcome <outcome-id>\nList ids: ${BINARY_NAME} outcomes`,
    );
  }
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    const row = store.getOutcome(ref);
    if (!row) {
      throw new CombieError(
        "OUTCOME_NOT_FOUND",
        `Outcome not found: ${ref}\nList recorded outcomes: ${BINARY_NAME} outcomes`,
      );
    }
    return row;
  } finally {
    store.close();
  }
}

// ---------------------------------------------------------------------------
// Subject-scoped structured response composition
// ---------------------------------------------------------------------------

export interface StructuredAction {
  action: ActionRecord;
  outcomes: OutcomeRecord[];
}

export interface StructuredDecision {
  decision: DecisionRecord;
  actions: StructuredAction[];
}

export interface StructuredResponseChain {
  recommendation: RecommendationRecord;
  decisions: StructuredDecision[];
}

/**
 * Deterministic subject-scoped nested chain recall (read-only). Traverses
 * exact stored parent ids from recommendations down; orphaned rows are
 * naturally omitted, corrupt enum values are skipped, and no invented
 * parentage is created.
 */
export function composeStructuredResponseMemory(
  baseDir: string,
  subjectResourceId: string,
): StructuredResponseChain[] {
  const store = new Store(baseDir);
  try {
    if (!store.isInitialized()) throw notInitialized();
    const recommendations = store.listRecommendations({ subjectResourceId });
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

    return recommendations.map((recommendation): StructuredResponseChain => {
      const decisions = (decisionsByRecommendation.get(recommendation.id) ?? []).map(
        (decision): StructuredDecision => ({
          decision,
          actions: (actionsByDecision.get(decision.id) ?? []).map(
            (action): StructuredAction => ({
              action,
              outcomes: outcomesByAction.get(action.id) ?? [],
            }),
          ),
        }),
      );
      return { recommendation, decisions };
    });
  } finally {
    store.close();
  }
}

// ---------------------------------------------------------------------------
// Human formatting
// ---------------------------------------------------------------------------

const RETAINED_NOTE =
  "This is retained organizational memory. It is not current provider truth.";

export function formatRecommendation(record: RecommendationRecord): string {
  const lines = [
    "RECOMMENDATION",
    `ID: ${record.id}`,
    ...(record.investigationId
      ? [`INVESTIGATION: ${record.investigationId}`]
      : []),
    ...(record.incidentId ? [`INCIDENT: ${record.incidentId}`] : []),
    `SUBJECT: ${record.subjectResourceId}`,
    `Recorded by Combie at ${record.recordedAt}`,
    RETAINED_NOTE,
    "",
    `ACTION KEY: ${record.actionKey}`,
    "",
    "PROPOSAL",
    record.proposal,
  ];
  if (record.rationale) {
    lines.push("", "RATIONALE", record.rationale);
  }
  if (record.evidenceIds && record.evidenceIds.length > 0) {
    lines.push("", "EVIDENCE", ...record.evidenceIds);
  }
  return lines.join("\n");
}

export function formatRecommendationList(
  records: RecommendationRecord[],
  filter?: ListRecommendationsOptions,
): string {
  if (records.length === 0) {
    if (filter?.investigationId !== undefined) {
      return (
        `No recommendations recorded for investigation ${filter.investigationId}.\n` +
        `This is known-empty for that exact investigation id.`
      );
    }
    if (filter?.incidentId !== undefined) {
      return (
        `No recommendations recorded for incident ${filter.incidentId}.\n` +
        `This is known-empty for that exact incident id.`
      );
    }
    if (filter?.subjectResourceId !== undefined) {
      return (
        `No recommendations recorded for subject ${filter.subjectResourceId}.\n` +
        `This is known-empty for that exact subject.`
      );
    }
    return (
      "No recommendations recorded yet.\n" +
      `Record one: ${BINARY_NAME} recommendation --resource <resource-id> --action-key <token> --proposal <text>`
    );
  }
  const col1 = Math.max("ID".length, ...records.map((r) => r.id.length));
  const col2 = Math.max(
    "ACTION KEY".length,
    ...records.map((r) => r.actionKey.length),
  );
  const col3 = Math.max(
    "SUBJECT".length,
    ...records.map((r) => r.subjectResourceId.length),
  );
  const header =
    "ID".padEnd(col1) +
    "  " +
    "ACTION KEY".padEnd(col2) +
    "  " +
    "SUBJECT".padEnd(col3) +
    "  " +
    "RECORDED AT";
  const body = records
    .map(
      (r) =>
        r.id.padEnd(col1) +
        "  " +
        r.actionKey.padEnd(col2) +
        "  " +
        r.subjectResourceId.padEnd(col3) +
        "  " +
        r.recordedAt,
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function formatRecommendationConfirmation(
  record: RecommendationRecord,
): string {
  return (
    `Recorded recommendation ${record.id}\n` +
    (record.investigationId
      ? `investigation ${record.investigationId}\n`
      : "") +
    (record.incidentId ? `incident ${record.incidentId}\n` : "") +
    `subject ${record.subjectResourceId}\n` +
    `${record.actionKey}\n` +
    `recorded at ${record.recordedAt} as organizational memory.\n` +
    `Show: ${BINARY_NAME} recommendation ${record.id}`
  );
}

export function formatDecision(record: DecisionRecord): string {
  const lines = [
    "DECISION",
    `ID: ${record.id}`,
    `RECOMMENDATION: ${record.recommendationId}`,
    `Recorded by Combie at ${record.recordedAt}`,
    RETAINED_NOTE,
    "",
    `DISPOSITION: ${record.disposition}`,
  ];
  if (record.note) {
    lines.push("", "NOTE", record.note);
  }
  return lines.join("\n");
}

export function formatDecisionList(
  records: DecisionRecord[],
  filter?: ListDecisionsOptions,
): string {
  if (records.length === 0) {
    if (filter?.recommendationId !== undefined) {
      return (
        `No decisions recorded for recommendation ${filter.recommendationId}.\n` +
        `This is known-empty for that exact recommendation id.`
      );
    }
    return (
      "No decisions recorded yet.\n" +
      `Record one: ${BINARY_NAME} decision --recommendation <recommendation-id> --disposition approved|rejected|deferred|modified`
    );
  }
  const col1 = Math.max("ID".length, ...records.map((r) => r.id.length));
  const col2 = Math.max(
    "RECOMMENDATION".length,
    ...records.map((r) => r.recommendationId.length),
  );
  const col3 = Math.max(
    "DISPOSITION".length,
    ...records.map((r) => r.disposition.length),
  );
  const header =
    "ID".padEnd(col1) +
    "  " +
    "RECOMMENDATION".padEnd(col2) +
    "  " +
    "DISPOSITION".padEnd(col3) +
    "  " +
    "RECORDED AT";
  const body = records
    .map(
      (r) =>
        r.id.padEnd(col1) +
        "  " +
        r.recommendationId.padEnd(col2) +
        "  " +
        r.disposition.padEnd(col3) +
        "  " +
        r.recordedAt,
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function formatDecisionConfirmation(record: DecisionRecord): string {
  return (
    `Recorded decision ${record.id}\n` +
    `recommendation ${record.recommendationId}\n` +
    `${record.disposition}\n` +
    `recorded at ${record.recordedAt} as organizational memory.\n` +
    `Show: ${BINARY_NAME} decision ${record.id}`
  );
}

export function formatAction(record: ActionRecord): string {
  const lines = [
    "ACTION",
    `ID: ${record.id}`,
    `DECISION: ${record.decisionId}`,
    `Recorded by Combie at ${record.recordedAt}`,
    RETAINED_NOTE,
  ];
  if (record.performedAt) {
    lines.push(`Performed at ${record.performedAt}`);
  }
  lines.push("", `ACTION KEY: ${record.actionKey}`, "", "SUMMARY", record.summary);
  return lines.join("\n");
}

export function formatActionList(
  records: ActionRecord[],
  filter?: ListActionsOptions,
): string {
  if (records.length === 0) {
    if (filter?.decisionId !== undefined) {
      return (
        `No actions recorded for decision ${filter.decisionId}.\n` +
        `This is known-empty for that exact decision id.`
      );
    }
    return (
      "No actions recorded yet.\n" +
      `Record one: ${BINARY_NAME} action --decision <decision-id> --action-key <token> --summary <text>`
    );
  }
  const col1 = Math.max("ID".length, ...records.map((r) => r.id.length));
  const col2 = Math.max(
    "DECISION".length,
    ...records.map((r) => r.decisionId.length),
  );
  const col3 = Math.max(
    "ACTION KEY".length,
    ...records.map((r) => r.actionKey.length),
  );
  const header =
    "ID".padEnd(col1) +
    "  " +
    "DECISION".padEnd(col2) +
    "  " +
    "ACTION KEY".padEnd(col3) +
    "  " +
    "RECORDED AT";
  const body = records
    .map(
      (r) =>
        r.id.padEnd(col1) +
        "  " +
        r.decisionId.padEnd(col2) +
        "  " +
        r.actionKey.padEnd(col3) +
        "  " +
        r.recordedAt,
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function formatActionConfirmation(record: ActionRecord): string {
  return (
    `Recorded action ${record.id}\n` +
    `decision ${record.decisionId}\n` +
    `${record.actionKey}\n` +
    `recorded at ${record.recordedAt} as organizational memory.\n` +
    `Show: ${BINARY_NAME} action ${record.id}`
  );
}

export function formatOutcome(record: OutcomeRecord): string {
  const lines = [
    "OUTCOME",
    `ID: ${record.id}`,
    `ACTION: ${record.actionId}`,
    `Recorded by Combie at ${record.recordedAt}`,
    RETAINED_NOTE,
  ];
  if (record.observedAt) {
    lines.push(`Observed at ${record.observedAt}`);
  }
  lines.push("", `ASSESSMENT: ${record.assessment}`, "", "SUMMARY", record.summary);
  if (record.measurement) {
    lines.push(
      "",
      "MEASUREMENT",
      `metric ${record.measurement.metric}`,
      `before ${record.measurement.before}`,
      `after ${record.measurement.after}`,
      `unit ${record.measurement.unit}`,
    );
  }
  if (record.evidenceIds && record.evidenceIds.length > 0) {
    lines.push("", "EVIDENCE", ...record.evidenceIds);
  }
  return lines.join("\n");
}

export function formatOutcomeList(
  records: OutcomeRecord[],
  filter?: ListOutcomesOptions,
): string {
  if (records.length === 0) {
    if (filter?.actionId !== undefined) {
      return (
        `No outcomes recorded for action ${filter.actionId}.\n` +
        `This is known-empty for that exact action id.`
      );
    }
    return (
      "No outcomes recorded yet.\n" +
      `Record one: ${BINARY_NAME} outcome --action <action-id> --assessment positive|negative|mixed|neutral|inconclusive --summary <text>`
    );
  }
  const col1 = Math.max("ID".length, ...records.map((r) => r.id.length));
  const col2 = Math.max(
    "ACTION".length,
    ...records.map((r) => r.actionId.length),
  );
  const col3 = Math.max(
    "ASSESSMENT".length,
    ...records.map((r) => r.assessment.length),
  );
  const header =
    "ID".padEnd(col1) +
    "  " +
    "ACTION".padEnd(col2) +
    "  " +
    "ASSESSMENT".padEnd(col3) +
    "  " +
    "RECORDED AT";
  const body = records
    .map(
      (r) =>
        r.id.padEnd(col1) +
        "  " +
        r.actionId.padEnd(col2) +
        "  " +
        r.assessment.padEnd(col3) +
        "  " +
        r.recordedAt,
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function formatOutcomeConfirmation(record: OutcomeRecord): string {
  return (
    `Recorded outcome ${record.id}\n` +
    `action ${record.actionId}\n` +
    `${record.assessment}\n` +
    `recorded at ${record.recordedAt} as organizational memory.\n` +
    `Show: ${BINARY_NAME} outcome ${record.id}`
  );
}
