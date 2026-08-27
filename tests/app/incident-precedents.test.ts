import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CombieError } from "../../src/app/errors.ts";
import { initCombie } from "../../src/app/init.ts";
import { recordIncidentLink, listIncidentLinks } from "../../src/app/incident-links.ts";
import {
  composeIncidentPrecedentMemory,
  composeIncidentPrecedents,
  formatIncidentPrecedents,
} from "../../src/app/incident-precedents.ts";
import { recordIncident, setIncidentOccurredAt } from "../../src/app/incidents.ts";
import { recordResolution } from "../../src/app/resolutions.ts";
import {
  recordAction,
  recordDecision,
  recordOutcome,
  recordRecommendation,
} from "../../src/app/structured-response-memory.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import { projectIncidentPrecedentSet } from "../../src/mcp/projections.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-precedents-"));
  initCombie(dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function seedResource(
  provider: string,
  providerResourceId: string,
  kind: "project" | "repository" | "zone" = "project",
  name = providerResourceId,
) {
  const store = new Store(dir);
  store.init();
  const resource = createResource({
    provider,
    providerResourceId,
    kind,
    name,
    metadata: {},
  });
  store.applyResource(resource, {
    id: `obs-${provider}-${providerResourceId}`,
    observedAt: "2026-08-16T00:00:00.000Z",
  });
  store.close();
  return resource;
}

function pairResolutions(
  subjectResourceId: string,
  prefix: string,
  recordedAt: string,
) {
  const a = recordResolution({
    baseDir: dir,
    subjectResourceId,
    decision: `${prefix}-a`,
    recordedAt,
  });
  const b = recordResolution({
    baseDir: dir,
    subjectResourceId,
    decision: `${prefix}-b`,
    recordedAt: new Date(Date.parse(recordedAt) + 1000).toISOString(),
  });
  return [a, b] as const;
}

function openDb(): Database {
  return new Database(join(dir, "combie.db"));
}

describe("RED 7 — subject derivation", () => {
  test("uses loadable Resolution members, deduplicates subjects, preserves unresolved ids", () => {
    const subject = seedResource("sentry", "450");
    const other = seedResource("vercel", "prj_a");
    const r1 = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "one",
      recordedAt: "2026-08-16T10:00:00.000Z",
    });
    const r2 = recordResolution({
      baseDir: dir,
      subjectResourceId: other.id,
      decision: "two",
      recordedAt: "2026-08-16T10:01:00.000Z",
    });
    const r3 = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "three",
      recordedAt: "2026-08-16T10:02:00.000Z",
    });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: [r1.id, r2.id, r3.id],
      recordedAt: "2026-08-16T11:00:00.000Z",
      title: "Mixed",
    });

    // Drop one member row and append a never-persisted member id on the Incident.
    const db = openDb();
    db.exec(`DELETE FROM resolutions WHERE id = '${r2.id}'`);
    const members = JSON.stringify([
      r1.id,
      r2.id,
      r3.id,
      "res:missing-member",
    ]);
    db.query(`UPDATE incidents SET resolution_ids = ? WHERE id = ?`).run(
      members,
      incident.id,
    );
    db.close();

    const set = composeIncidentPrecedents(dir, incident.id);
    expect(set.queryIncident.id).toBe(incident.id);
    expect(set.queryIncident.title).toBe("Mixed");
    expect(set.queryIncident.subjectResourceIds).toEqual([subject.id]);
    expect(set.queryIncident.unresolvedResolutionIds).toEqual([
      r2.id,
      "res:missing-member",
    ]);
  });

  test("survives Resource deletion: retained Resolution subject ids remain", () => {
    const subject = seedResource("sentry", "450");
    const [r1, r2] = pairResolutions(
      subject.id,
      "keep",
      "2026-08-16T10:00:00.000Z",
    );
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: [r1.id, r2.id],
      recordedAt: "2026-08-16T11:00:00.000Z",
    });

    const db = openDb();
    db.exec(`DELETE FROM resources WHERE id = '${subject.id}'`);
    db.close();

    const set = composeIncidentPrecedents(dir, incident.id);
    expect(set.queryIncident.subjectResourceIds).toEqual([subject.id]);
    expect(set.queryIncident.unresolvedResolutionIds).toEqual([]);
  });
});

describe("RED 8 — same_subject_resource", () => {
  test("exact shared subject matches; near/substring subjects do not", () => {
    const exact = seedResource("sentry", "450");
    const near = seedResource("sentry", "4500");
    const [q1, q2] = pairResolutions(exact.id, "q", "2026-08-16T10:00:00.000Z");
    const [c1, c2] = pairResolutions(exact.id, "c", "2026-08-16T10:10:00.000Z");
    const [n1, n2] = pairResolutions(near.id, "n", "2026-08-16T10:20:00.000Z");

    const query = recordIncident({
      baseDir: dir,
      resolutionIds: [q1.id, q2.id],
      recordedAt: "2026-08-20T12:00:00.000Z",
    });
    const candidate = recordIncident({
      baseDir: dir,
      resolutionIds: [c1.id, c2.id],
      recordedAt: "2026-08-18T12:00:00.000Z",
    });
    const distractor = recordIncident({
      baseDir: dir,
      resolutionIds: [n1.id, n2.id],
      recordedAt: "2026-08-17T12:00:00.000Z",
      title: "Production API errors",
    });

    const set = composeIncidentPrecedents(dir, query.id);
    expect(set.candidatePrecedents.map((c) => c.incident.id)).toEqual([
      candidate.id,
    ]);
    expect(set.candidatePrecedents[0]!.matchReasons).toEqual([
      {
        kind: "same_subject_resource",
        subjectResourceId: exact.id,
      },
    ]);
    expect(
      set.candidatePrecedents.some((c) => c.incident.id === distractor.id),
    ).toBe(false);
  });
});

describe("RED 9 — directly_related_subjects", () => {
  test("one stored Relationship matches with evidence and clocks; no inverse invented", () => {
    const github = seedResource("github", "915", "repository", "demo");
    const vercel = seedResource("vercel", "prj_demo");
    const [q1, q2] = pairResolutions(
      github.id,
      "q",
      "2026-08-16T10:00:00.000Z",
    );
    const [c1, c2] = pairResolutions(
      vercel.id,
      "c",
      "2026-08-16T10:10:00.000Z",
    );
    const query = recordIncident({
      baseDir: dir,
      resolutionIds: [q1.id, q2.id],
      recordedAt: "2026-08-20T12:00:00.000Z",
    });
    const candidate = recordIncident({
      baseDir: dir,
      resolutionIds: [c1.id, c2.id],
      recordedAt: "2026-08-18T12:00:00.000Z",
    });

    const evidence = {
      source: "vercel",
      mechanism: "git_repository_reference",
      repository: "acme/demo",
      githubRepoId: "915",
      vercelLinkType: "github",
    };
    const store = new Store(dir);
    store.init();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
      lastSyncAt: "2026-08-19T11:00:00.000Z",
      lastAttemptAt: "2026-08-19T12:30:00.000Z",
    });
    store.upsertProvider({
      id: "vercel",
      name: "Vercel",
      status: "connected",
      lastSyncAt: "2026-08-19T11:00:00.000Z",
      lastAttemptAt: "2026-08-19T11:00:00.000Z",
    });
    const relationship = createRelationship({
      sourceResourceId: github.id,
      targetResourceId: vercel.id,
      kind: "source_for",
      evidence,
      createdAt: "2026-08-19T10:00:00.000Z",
      updatedAt: "2026-08-19T12:00:00.000Z",
    });
    store.upsertRelationship(relationship);
    const beforeCount = store.listRelationships().length;
    store.close();

    const set = composeIncidentPrecedents(dir, query.id);
    expect(set.candidatePrecedents).toHaveLength(1);
    const reason = set.candidatePrecedents[0]!.matchReasons.find(
      (r) => r.kind === "directly_related_subjects",
    );
    expect(reason).toEqual({
      kind: "directly_related_subjects",
      querySubjectResourceId: github.id,
      candidateSubjectResourceId: vercel.id,
      relationship: {
        id: relationship.id,
        kind: "source_for",
        sourceResourceId: github.id,
        targetResourceId: vercel.id,
        evidence,
        lastVerifiedAt: "2026-08-19T12:00:00.000Z",
        lastRequiredProviderAttemptAt: "2026-08-19T12:30:00.000Z",
      },
      direction: "outbound",
    });

    const after = new Store(dir);
    after.init();
    expect(after.listRelationships()).toHaveLength(beforeCount);
    expect(
      after.listRelationships().some(
        (r) =>
          r.sourceResourceId === vercel.id &&
          r.targetResourceId === github.id,
      ),
    ).toBe(false);
    after.close();
  });
});

describe("RED 10 — shared_proven_neighbor", () => {
  test("two one-hop Relationships through a third Resource match; no transitive row stored", () => {
    const githubA = seedResource("github", "111", "repository", "a");
    const githubB = seedResource("github", "222", "repository", "b");
    const vercel = seedResource("vercel", "prj_shared");
    const [q1, q2] = pairResolutions(
      githubA.id,
      "q",
      "2026-08-16T10:00:00.000Z",
    );
    const [c1, c2] = pairResolutions(
      githubB.id,
      "c",
      "2026-08-16T10:10:00.000Z",
    );
    const query = recordIncident({
      baseDir: dir,
      resolutionIds: [q1.id, q2.id],
      recordedAt: "2026-08-20T12:00:00.000Z",
    });
    const candidate = recordIncident({
      baseDir: dir,
      resolutionIds: [c1.id, c2.id],
      recordedAt: "2026-08-18T12:00:00.000Z",
    });

    const store = new Store(dir);
    store.init();
    store.upsertProvider({
      id: "github",
      name: "GitHub",
      status: "connected",
      lastSyncAt: "2026-08-19T11:00:00.000Z",
      lastAttemptAt: "2026-08-19T11:00:00.000Z",
    });
    store.upsertProvider({
      id: "vercel",
      name: "Vercel",
      status: "connected",
      lastSyncAt: "2026-08-19T11:00:00.000Z",
      lastAttemptAt: "2026-08-19T11:00:00.000Z",
    });
    const relA = createRelationship({
      sourceResourceId: githubA.id,
      targetResourceId: vercel.id,
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "acme/a",
        githubRepoId: "111",
      },
      updatedAt: "2026-08-19T12:00:00.000Z",
    });
    const relB = createRelationship({
      sourceResourceId: githubB.id,
      targetResourceId: vercel.id,
      kind: "source_for",
      evidence: {
        source: "vercel",
        mechanism: "git_repository_reference",
        repository: "acme/b",
        githubRepoId: "222",
      },
      updatedAt: "2026-08-19T12:05:00.000Z",
    });
    store.upsertRelationship(relA);
    store.upsertRelationship(relB);
    const before = store.listRelationships().map((r) => r.id).sort();
    store.close();

    const set = composeIncidentPrecedents(dir, query.id);
    const reason = set.candidatePrecedents[0]!.matchReasons.find(
      (r) => r.kind === "shared_proven_neighbor",
    );
    expect(reason).toMatchObject({
      kind: "shared_proven_neighbor",
      querySubjectResourceId: githubA.id,
      candidateSubjectResourceId: githubB.id,
      sharedNeighborResourceId: vercel.id,
      queryDirection: "outbound",
      candidateDirection: "outbound",
    });
    expect(reason).toMatchObject({
      queryRelationship: {
        id: relA.id,
        lastVerifiedAt: "2026-08-19T12:00:00.000Z",
        lastRequiredProviderAttemptAt: "2026-08-19T11:00:00.000Z",
      },
      candidateRelationship: {
        id: relB.id,
        lastVerifiedAt: "2026-08-19T12:05:00.000Z",
      },
    });

    const after = new Store(dir);
    after.init();
    expect(after.listRelationships().map((r) => r.id).sort()).toEqual(before);
    after.close();
  });
});

describe("RED 11 — same_recommendation_action_key", () => {
  test("Incident-anchored actionKey matches; proposal text and Resource-anchored do not", () => {
    const subject = seedResource("sentry", "450");
    const other = seedResource("vercel", "prj_x");
    const [q1, q2] = pairResolutions(
      subject.id,
      "q",
      "2026-08-16T10:00:00.000Z",
    );
    const [c1, c2] = pairResolutions(other.id, "c", "2026-08-16T10:10:00.000Z");
    const query = recordIncident({
      baseDir: dir,
      resolutionIds: [q1.id, q2.id],
      recordedAt: "2026-08-20T12:00:00.000Z",
    });
    const candidate = recordIncident({
      baseDir: dir,
      resolutionIds: [c1.id, c2.id],
      recordedAt: "2026-08-18T12:00:00.000Z",
    });

    const queryRec = recordRecommendation({
      baseDir: dir,
      incidentId: query.id,
      subjectResourceId: subject.id,
      actionKey: "rollback-deployment",
      proposal: "Roll back now",
      recordedAt: "2026-08-20T13:00:00.000Z",
    });
    const candidateRec = recordRecommendation({
      baseDir: dir,
      incidentId: candidate.id,
      subjectResourceId: other.id,
      actionKey: "rollback-deployment",
      proposal: "Completely different proposal text",
      recordedAt: "2026-08-18T13:00:00.000Z",
    });
    // Resource-anchored with same key must not create a match by itself.
    recordRecommendation({
      baseDir: dir,
      subjectResourceId: subject.id,
      actionKey: "rollback-deployment",
      proposal: "Resource anchored",
      recordedAt: "2026-08-18T14:00:00.000Z",
    });

    // Distractor: similar proposal, different key, different subjects already.
    const [d1, d2] = pairResolutions(
      seedResource("neon", "proj_n").id,
      "d",
      "2026-08-16T10:30:00.000Z",
    );
    const distractor = recordIncident({
      baseDir: dir,
      resolutionIds: [d1.id, d2.id],
      recordedAt: "2026-08-17T12:00:00.000Z",
    });
    recordRecommendation({
      baseDir: dir,
      incidentId: distractor.id,
      subjectResourceId: d1.subjectResourceId,
      actionKey: "inspect-database",
      proposal: "Roll back now",
      recordedAt: "2026-08-17T13:00:00.000Z",
    });

    const set = composeIncidentPrecedents(dir, query.id);
    expect(set.candidatePrecedents.map((c) => c.incident.id)).toEqual([
      candidate.id,
    ]);
    expect(set.candidatePrecedents[0]!.matchReasons).toEqual([
      {
        kind: "same_recommendation_action_key",
        actionKey: "rollback-deployment",
        queryRecommendationIds: [queryRec.id],
        candidateRecommendationIds: [candidateRec.id],
      },
    ]);
  });
});

describe("RED 12 — same_attempted_action_key", () => {
  test("matching Action keys under approved/modified only; rejected invents nothing", () => {
    const subject = seedResource("sentry", "450");
    const other = seedResource("vercel", "prj_y");
    const [q1, q2] = pairResolutions(
      subject.id,
      "q",
      "2026-08-16T10:00:00.000Z",
    );
    const [c1, c2] = pairResolutions(other.id, "c", "2026-08-16T10:10:00.000Z");
    const query = recordIncident({
      baseDir: dir,
      resolutionIds: [q1.id, q2.id],
      recordedAt: "2026-08-20T12:00:00.000Z",
    });
    const candidate = recordIncident({
      baseDir: dir,
      resolutionIds: [c1.id, c2.id],
      recordedAt: "2026-08-18T12:00:00.000Z",
    });

    const queryRec = recordRecommendation({
      baseDir: dir,
      incidentId: query.id,
      subjectResourceId: subject.id,
      actionKey: "hold",
      proposal: "Hold traffic",
    });
    const queryApproved = recordDecision({
      baseDir: dir,
      recommendationId: queryRec.id,
      disposition: "approved",
    });
    const queryAction = recordAction({
      baseDir: dir,
      decisionId: queryApproved.id,
      actionKey: "configuration-repair",
      summary: "Patched config A",
    });
    const queryRejected = recordDecision({
      baseDir: dir,
      recommendationId: queryRec.id,
      disposition: "rejected",
      note: "No",
    });
    expect(queryRejected.disposition).toBe("rejected");

    const candidateRec = recordRecommendation({
      baseDir: dir,
      incidentId: candidate.id,
      subjectResourceId: other.id,
      actionKey: "scale",
      proposal: "Scale up",
    });
    const candidateApproved = recordDecision({
      baseDir: dir,
      recommendationId: candidateRec.id,
      disposition: "modified",
      note: "Scale differently",
    });
    const candidateAction = recordAction({
      baseDir: dir,
      decisionId: candidateApproved.id,
      actionKey: "configuration-repair",
      summary: "Totally different summary text",
    });

    const set = composeIncidentPrecedents(dir, query.id);
    expect(set.candidatePrecedents).toHaveLength(1);
    expect(set.candidatePrecedents[0]!.matchReasons).toEqual([
      {
        kind: "same_attempted_action_key",
        actionKey: "configuration-repair",
        queryActionIds: [queryAction.id],
        candidateActionIds: [candidateAction.id],
      },
    ]);
  });
});

describe("RED 13 — negative matching boundary", () => {
  test("titles, free text, times, dispositions, assessments, legacy Resolution text never match", () => {
    const a = seedResource("sentry", "1");
    const b = seedResource("vercel", "2");
    const [a1, a2] = pairResolutions(a.id, "a", "2026-08-16T10:00:00.000Z");
    const [b1, b2] = pairResolutions(b.id, "b", "2026-08-16T10:00:01.000Z");

    const left = recordIncident({
      baseDir: dir,
      resolutionIds: [a1.id, a2.id],
      recordedAt: "2026-08-20T12:00:00.000Z",
      title: "Production API errors",
    });
    const right = recordIncident({
      baseDir: dir,
      resolutionIds: [b1.id, b2.id],
      recordedAt: "2026-08-20T12:00:30.000Z",
      title: "Production API errors",
    });

    const leftRec = recordRecommendation({
      baseDir: dir,
      incidentId: left.id,
      subjectResourceId: a.id,
      actionKey: "inspect-logs",
      proposal: "Same proposal prose",
      rationale: "Same rationale",
    });
    const rightRec = recordRecommendation({
      baseDir: dir,
      incidentId: right.id,
      subjectResourceId: b.id,
      actionKey: "restart-service",
      proposal: "Same proposal prose",
      rationale: "Same rationale",
    });
    const leftDec = recordDecision({
      baseDir: dir,
      recommendationId: leftRec.id,
      disposition: "approved",
      note: "Same note",
    });
    const rightDec = recordDecision({
      baseDir: dir,
      recommendationId: rightRec.id,
      disposition: "approved",
      note: "Same note",
    });
    const leftAct = recordAction({
      baseDir: dir,
      decisionId: leftDec.id,
      actionKey: "read-metrics",
      summary: "Same summary",
    });
    const rightAct = recordAction({
      baseDir: dir,
      decisionId: rightDec.id,
      actionKey: "write-metrics",
      summary: "Same summary",
    });
    recordOutcome({
      baseDir: dir,
      actionId: leftAct.id,
      assessment: "positive",
      summary: "Same outcome",
      measurement: { metric: "errors", before: 10, after: 1, unit: "count" },
    });
    recordOutcome({
      baseDir: dir,
      actionId: rightAct.id,
      assessment: "positive",
      summary: "Same outcome",
      measurement: { metric: "errors", before: 10, after: 1, unit: "count" },
    });

    const set = composeIncidentPrecedents(dir, left.id);
    expect(set.candidatePrecedents).toEqual([]);
    expect(set.explicitPrecedents).toEqual([]);
  });
});

describe("RED 14 — explicit excludes from candidates", () => {
  test("explicitly linked Incidents appear only under explicitPrecedents", () => {
    const subject = seedResource("sentry", "450");
    const [q1, q2] = pairResolutions(
      subject.id,
      "q",
      "2026-08-16T10:00:00.000Z",
    );
    const [p1, p2] = pairResolutions(
      subject.id,
      "p",
      "2026-08-16T10:10:00.000Z",
    );
    const query = recordIncident({
      baseDir: dir,
      resolutionIds: [q1.id, q2.id],
      recordedAt: "2026-08-20T12:00:00.000Z",
    });
    const prior = recordIncident({
      baseDir: dir,
      resolutionIds: [p1.id, p2.id],
      recordedAt: "2026-08-18T12:00:00.000Z",
    });

    const link = recordIncidentLink({
      baseDir: dir,
      incidentIds: [prior.id, query.id],
      reason: "Same customer-visible failure mode",
      recordedAt: "2026-08-21T09:00:00.000Z",
    });

    const set = composeIncidentPrecedents(dir, query.id);
    expect(set.explicitPrecedents).toHaveLength(1);
    expect(set.explicitPrecedents[0]!.link.id).toBe(link.id);
    expect(set.explicitPrecedents[0]!.link.reason).toBe(
      "Same customer-visible failure mode",
    );
    expect(set.explicitPrecedents[0]!.incident.id).toBe(prior.id);
    expect(set.candidatePrecedents).toEqual([]);
  });
});

describe("RED 15 — ordering and completeness", () => {
  test("candidates and reasons stay complete, deduped, and stable under shuffled insert order", () => {
    const subject = seedResource("sentry", "450");
    const other = seedResource("vercel", "prj_z");
    const [q1, q2] = pairResolutions(
      subject.id,
      "q",
      "2026-08-16T10:00:00.000Z",
    );
    const query = recordIncident({
      baseDir: dir,
      resolutionIds: [q1.id, q2.id],
      recordedAt: "2026-08-20T12:00:00.000Z",
    });

    const olderPair = pairResolutions(
      subject.id,
      "old",
      "2026-08-16T10:10:00.000Z",
    );
    const newerPair = pairResolutions(
      subject.id,
      "new",
      "2026-08-16T10:20:00.000Z",
    );
    const keyPair = pairResolutions(other.id, "key", "2026-08-16T10:30:00.000Z");

    // Insert newer first, then older, then action-key peer — order must not affect output.
    const newer = recordIncident({
      baseDir: dir,
      resolutionIds: [newerPair[0].id, newerPair[1].id],
      recordedAt: "2026-08-19T12:00:00.000Z",
    });
    const older = recordIncident({
      baseDir: dir,
      resolutionIds: [olderPair[0].id, olderPair[1].id],
      recordedAt: "2026-08-18T12:00:00.000Z",
    });
    const keyed = recordIncident({
      baseDir: dir,
      resolutionIds: [keyPair[0].id, keyPair[1].id],
      recordedAt: "2026-08-19T11:00:00.000Z",
    });

    const queryRec = recordRecommendation({
      baseDir: dir,
      incidentId: query.id,
      subjectResourceId: subject.id,
      actionKey: "rollback-deployment",
      proposal: "Rollback",
    });
    const keyedRec = recordRecommendation({
      baseDir: dir,
      incidentId: keyed.id,
      subjectResourceId: other.id,
      actionKey: "rollback-deployment",
      proposal: "Rollback elsewhere",
    });

    const set = composeIncidentPrecedents(dir, query.id);
    expect(set.candidatePrecedents.map((c) => c.incident.id)).toEqual([
      newer.id,
      keyed.id,
      older.id,
    ]);
    expect(
      set.candidatePrecedents.every(
        (c) =>
          !("score" in c) &&
          !("rank" in c) &&
          !("confidence" in c) &&
          !("relevance" in c),
      ),
    ).toBe(true);

    const keyedReasons = set.candidatePrecedents.find(
      (c) => c.incident.id === keyed.id,
    )!.matchReasons;
    expect(keyedReasons.map((r) => r.kind)).toEqual([
      "same_recommendation_action_key",
    ]);
    expect(keyedReasons[0]).toEqual({
      kind: "same_recommendation_action_key",
      actionKey: "rollback-deployment",
      queryRecommendationIds: [queryRec.id],
      candidateRecommendationIds: [keyedRec.id],
    });

    const human = formatIncidentPrecedents(set);
    expect(human).toContain("EXPLICIT PRECEDENTS");
    expect(human).toContain("CANDIDATE PRECEDENTS");
    expect(human).toContain("candidates");
    // Must not present candidates as similarity or recommendation products.
    expect(human).not.toMatch(/similar Incidents/i);
    expect(human).not.toMatch(/recommended responses/i);
  });
});

describe("RED 16 — structured response memory on precedents", () => {
  test("returns only Incident-anchored chains and preserves every Decision/Action/Outcome", () => {
    const subject = seedResource("sentry", "450");
    const [q1, q2] = pairResolutions(
      subject.id,
      "q",
      "2026-08-16T10:00:00.000Z",
    );
    const [p1, p2] = pairResolutions(
      subject.id,
      "p",
      "2026-08-16T10:10:00.000Z",
    );
    const query = recordIncident({
      baseDir: dir,
      resolutionIds: [q1.id, q2.id],
      recordedAt: "2026-08-20T12:00:00.000Z",
    });
    const prior = recordIncident({
      baseDir: dir,
      resolutionIds: [p1.id, p2.id],
      recordedAt: "2026-08-18T12:00:00.000Z",
    });

    const priorRec = recordRecommendation({
      baseDir: dir,
      incidentId: prior.id,
      subjectResourceId: subject.id,
      actionKey: "rollback-deployment",
      proposal: "Rollback",
    });
    const approved = recordDecision({
      baseDir: dir,
      recommendationId: priorRec.id,
      disposition: "approved",
    });
    const deferred = recordDecision({
      baseDir: dir,
      recommendationId: priorRec.id,
      disposition: "deferred",
      note: "Wait",
    });
    const action = recordAction({
      baseDir: dir,
      decisionId: approved.id,
      actionKey: "rollback-deployment",
      summary: "Rolled back",
    });
    const out1 = recordOutcome({
      baseDir: dir,
      actionId: action.id,
      assessment: "positive",
      summary: "Errors down",
    });
    const out2 = recordOutcome({
      baseDir: dir,
      actionId: action.id,
      assessment: "mixed",
      summary: "Latency up",
    });
    // Resource-anchored on same subject must not appear on the Incident precedent.
    recordRecommendation({
      baseDir: dir,
      subjectResourceId: subject.id,
      actionKey: "rollback-deployment",
      proposal: "Should not appear",
    });

    const set = composeIncidentPrecedents(dir, query.id);
    expect(set.candidatePrecedents).toHaveLength(1);
    const memory = set.candidatePrecedents[0]!.structuredResponseMemory;
    expect(memory).toHaveLength(1);
    expect(memory[0]!.recommendation.id).toBe(priorRec.id);
    expect(memory[0]!.recommendation.incidentId).toBe(prior.id);
    expect(memory[0]!.decisions.map((d) => d.decision.id).sort()).toEqual(
      [approved.id, deferred.id].sort(),
    );
    const approvedBranch = memory[0]!.decisions.find(
      (d) => d.decision.id === approved.id,
    )!;
    expect(approvedBranch.actions).toHaveLength(1);
    expect(approvedBranch.actions[0]!.action.id).toBe(action.id);
    expect(
      approvedBranch.actions[0]!.outcomes.map((o) => o.id).sort(),
    ).toEqual([out1.id, out2.id].sort());
    const deferredBranch = memory[0]!.decisions.find(
      (d) => d.decision.id === deferred.id,
    )!;
    expect(deferredBranch.actions).toEqual([]);
    // No success/final inference fields.
    expect(JSON.stringify(memory)).not.toContain("successRate");
    expect(JSON.stringify(memory)).not.toContain("finalOutcome");
  });
});

describe("compose helpers", () => {
  test("unknown query Incident fails with INCIDENT_NOT_FOUND", () => {
    expect(() => composeIncidentPrecedents(dir, "inc:missing")).toThrow(
      CombieError,
    );
    try {
      composeIncidentPrecedents(dir, "inc:missing");
    } catch (error) {
      expect((error as CombieError).code).toBe("INCIDENT_NOT_FOUND");
    }
  });

  test("composeIncidentPrecedentMemory preserves input order", () => {
    const subject = seedResource("sentry", "450");
    const [a1, a2] = pairResolutions(subject.id, "a", "2026-08-16T10:00:00.000Z");
    const [b1, b2] = pairResolutions(subject.id, "b", "2026-08-16T10:10:00.000Z");
    const first = recordIncident({
      baseDir: dir,
      resolutionIds: [a1.id, a2.id],
      recordedAt: "2026-08-20T12:00:00.000Z",
    });
    const second = recordIncident({
      baseDir: dir,
      resolutionIds: [b1.id, b2.id],
      recordedAt: "2026-08-18T12:00:00.000Z",
    });

    const sets = composeIncidentPrecedentMemory(dir, [second.id, first.id]);
    expect(sets.map((s) => s.queryIncident.id)).toEqual([second.id, first.id]);
  });

  test("known-empty precedents exit as empty arrays", () => {
    const subject = seedResource("sentry", "450");
    const [r1, r2] = pairResolutions(
      subject.id,
      "solo",
      "2026-08-16T10:00:00.000Z",
    );
    const solo = recordIncident({
      baseDir: dir,
      resolutionIds: [r1.id, r2.id],
      recordedAt: "2026-08-20T12:00:00.000Z",
    });
    const set = composeIncidentPrecedents(dir, solo.id);
    expect(set.explicitPrecedents).toEqual([]);
    expect(set.candidatePrecedents).toEqual([]);
  });
});

describe("temporal prior — effectiveAt = occurredAt ?? recordedAt", () => {
  test("future and equal-time same-subject peers are not candidates", () => {
    const subject = seedResource("sentry", "450");
    const [q1, q2] = pairResolutions(
      subject.id,
      "q",
      "2026-01-01T10:00:00.000Z",
    );
    const [f1, f2] = pairResolutions(
      subject.id,
      "future",
      "2026-01-02T10:00:00.000Z",
    );
    const [e1, e2] = pairResolutions(
      subject.id,
      "equal",
      "2026-01-01T10:05:00.000Z",
    );
    const [p1, p2] = pairResolutions(
      subject.id,
      "prior",
      "2025-12-31T10:00:00.000Z",
    );
    const query = recordIncident({
      baseDir: dir,
      resolutionIds: [q1.id, q2.id],
      recordedAt: "2026-01-01T12:00:00.000Z",
      title: "Query day",
    });
    const future = recordIncident({
      baseDir: dir,
      resolutionIds: [f1.id, f2.id],
      recordedAt: "2026-01-02T12:00:00.000Z",
      title: "Next day",
    });
    const equal = recordIncident({
      baseDir: dir,
      resolutionIds: [e1.id, e2.id],
      recordedAt: "2026-01-01T12:00:00.000Z",
      title: "Same recordedAt",
    });
    const prior = recordIncident({
      baseDir: dir,
      resolutionIds: [p1.id, p2.id],
      recordedAt: "2025-12-31T12:00:00.000Z",
      title: "Prior day",
    });

    const set = composeIncidentPrecedents(dir, query.id);
    expect(set.candidatePrecedents.map((c) => c.incident.id)).toEqual([
      prior.id,
    ]);
    expect(
      set.candidatePrecedents.some((c) => c.incident.id === future.id),
    ).toBe(false);
    expect(
      set.candidatePrecedents.some((c) => c.incident.id === equal.id),
    ).toBe(false);
  });

  test("occurredAt overrides recordedAt for prior inclusion", () => {
    const subject = seedResource("sentry", "450");
    const [q1, q2] = pairResolutions(
      subject.id,
      "q",
      "2026-01-01T10:00:00.000Z",
    );
    const [a1, a2] = pairResolutions(
      subject.id,
      "a",
      "2026-01-01T10:10:00.000Z",
    );
    const [b1, b2] = pairResolutions(
      subject.id,
      "b",
      "2026-01-01T10:20:00.000Z",
    );
    const query = recordIncident({
      baseDir: dir,
      resolutionIds: [q1.id, q2.id],
      recordedAt: "2026-01-05T12:00:00.000Z",
    });
    setIncidentOccurredAt({
      baseDir: dir,
      incidentId: query.id,
      occurredAt: "2026-01-03T12:00:00.000Z",
    });

    // recordedAt after query.recordedAt, but occurredAt before query.occurredAt → prior
    const priorByOccurred = recordIncident({
      baseDir: dir,
      resolutionIds: [a1.id, a2.id],
      recordedAt: "2026-01-10T12:00:00.000Z",
    });
    setIncidentOccurredAt({
      baseDir: dir,
      incidentId: priorByOccurred.id,
      occurredAt: "2026-01-02T12:00:00.000Z",
    });

    // recordedAt before query.recordedAt, but occurredAt after query.occurredAt → not prior
    const futureByOccurred = recordIncident({
      baseDir: dir,
      resolutionIds: [b1.id, b2.id],
      recordedAt: "2026-01-01T12:00:00.000Z",
    });
    setIncidentOccurredAt({
      baseDir: dir,
      incidentId: futureByOccurred.id,
      occurredAt: "2026-01-04T12:00:00.000Z",
    });

    const set = composeIncidentPrecedents(dir, query.id);
    expect(set.candidatePrecedents.map((c) => c.incident.id)).toEqual([
      priorByOccurred.id,
    ]);
    expect(
      set.candidatePrecedents.some((c) => c.incident.id === futureByOccurred.id),
    ).toBe(false);
  });

  test("non-prior explicit link peers are omitted from precedents but remain in incident-links", () => {
    const subject = seedResource("sentry", "450");
    const [q1, q2] = pairResolutions(
      subject.id,
      "q",
      "2026-01-01T10:00:00.000Z",
    );
    const [f1, f2] = pairResolutions(
      subject.id,
      "f",
      "2026-01-02T10:00:00.000Z",
    );
    const [p1, p2] = pairResolutions(
      subject.id,
      "p",
      "2025-12-30T10:00:00.000Z",
    );
    const query = recordIncident({
      baseDir: dir,
      resolutionIds: [q1.id, q2.id],
      recordedAt: "2026-01-01T12:00:00.000Z",
    });
    const future = recordIncident({
      baseDir: dir,
      resolutionIds: [f1.id, f2.id],
      recordedAt: "2026-01-02T12:00:00.000Z",
    });
    const prior = recordIncident({
      baseDir: dir,
      resolutionIds: [p1.id, p2.id],
      recordedAt: "2025-12-30T12:00:00.000Z",
    });

    const futureLink = recordIncidentLink({
      baseDir: dir,
      incidentIds: [query.id, future.id],
      reason: "Linked across time — not a precedent",
    });
    const priorLink = recordIncidentLink({
      baseDir: dir,
      incidentIds: [query.id, prior.id],
      reason: "Prior link is a precedent",
    });

    const set = composeIncidentPrecedents(dir, query.id);
    expect(set.explicitPrecedents.map((e) => e.incident.id)).toEqual([prior.id]);
    expect(set.explicitPrecedents[0]!.link.id).toBe(priorLink.id);
    expect(
      set.explicitPrecedents.some((e) => e.incident.id === future.id),
    ).toBe(false);
    expect(
      set.candidatePrecedents.some((c) => c.incident.id === future.id),
    ).toBe(false);

    const links = listIncidentLinks(dir, { incidentId: query.id });
    expect(links.map((l) => l.id).sort()).toEqual(
      [futureLink.id, priorLink.id].sort(),
    );
  });
});

describe("RED 17 — response experience projection", () => {
  function assertBucketInvariant(value: unknown): void {
    if (Array.isArray(value)) {
      for (const item of value) assertBucketInvariant(item);
      return;
    }
    if (value !== null && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if (typeof obj.count === "number" && Array.isArray(obj.ids)) {
        expect(obj.count).toBe(obj.ids.length);
      }
      for (const child of Object.values(obj)) assertBucketInvariant(child);
    }
  }

  test("projectIncidentPrecedentSet adds responseExperience with exact actionKey grouping and count===ids.length", () => {
    const subject = seedResource("sentry", "450");
    const [q1, q2] = pairResolutions(
      subject.id,
      "q",
      "2026-08-16T10:00:00.000Z",
    );
    const [p1, p2] = pairResolutions(
      subject.id,
      "p",
      "2026-08-16T10:10:00.000Z",
    );
    const query = recordIncident({
      baseDir: dir,
      resolutionIds: [q1.id, q2.id],
      recordedAt: "2026-08-20T12:00:00.000Z",
    });
    const prior = recordIncident({
      baseDir: dir,
      resolutionIds: [p1.id, p2.id],
      recordedAt: "2026-08-18T12:00:00.000Z",
    });
    recordIncidentLink({
      baseDir: dir,
      incidentIds: [prior.id, query.id],
      reason: "Same customer-visible failure mode",
      recordedAt: "2026-08-21T09:00:00.000Z",
    });

    const priorRec = recordRecommendation({
      baseDir: dir,
      incidentId: prior.id,
      subjectResourceId: subject.id,
      actionKey: "rollback-deployment",
      proposal: "Roll back the latest deployment",
      recordedAt: "2026-08-18T13:00:00.000Z",
    });
    const approved = recordDecision({
      baseDir: dir,
      recommendationId: priorRec.id,
      disposition: "approved",
      recordedAt: "2026-08-18T13:05:00.000Z",
    });
    const action = recordAction({
      baseDir: dir,
      decisionId: approved.id,
      actionKey: "rollback-deployment",
      summary: "Rolled back deployment dpl_abc",
      recordedAt: "2026-08-18T13:10:00.000Z",
    });
    const outcome = recordOutcome({
      baseDir: dir,
      actionId: action.id,
      assessment: "positive",
      summary: "Errors returned to baseline",
      recordedAt: "2026-08-18T13:20:00.000Z",
    });

    const set = composeIncidentPrecedents(dir, query.id);
    const projected = projectIncidentPrecedentSet(set);
    expect(projected).toHaveProperty("responseExperience");

    const experience = projected.responseExperience as {
      queryIncidentId: string;
      explicitPrecedentIds: string[];
      candidatePrecedentIds: string[];
      precedentsWithoutStructuredResponseIds: string[];
      actionKeys: Array<Record<string, unknown>>;
    };
    expect(experience.queryIncidentId).toBe(query.id);
    expect(experience.explicitPrecedentIds).toEqual([prior.id]);
    expect(experience.candidatePrecedentIds).toEqual([]);
    expect(experience.precedentsWithoutStructuredResponseIds).toEqual([]);
    expect(experience.actionKeys).toHaveLength(1);

    const key = experience.actionKeys[0]! as {
      actionKey: string;
      precedentBasis: unknown;
      proposed: {
        recommendations: unknown;
        recommendationsWithoutDecision: unknown;
        decisionsByDisposition: Record<string, unknown>;
      };
      attempted: {
        actions: unknown;
        actionsWithoutOutcome: unknown;
        outcomesByAssessment: Record<string, unknown>;
      };
    };
    expect(key.actionKey).toBe("rollback-deployment");
    expect(key.precedentBasis).toEqual([
      { incidentId: prior.id, kind: "explicit" },
    ]);
    expect(key.proposed).toMatchObject({
      recommendations: { count: 1, ids: [priorRec.id] },
      recommendationsWithoutDecision: { count: 0, ids: [] },
    });
    expect(key.proposed.decisionsByDisposition).toMatchObject({
      approved: { count: 1, ids: [approved.id] },
      rejected: { count: 0, ids: [] },
      deferred: { count: 0, ids: [] },
      modified: { count: 0, ids: [] },
    });
    expect(key.attempted).toMatchObject({
      actions: { count: 1, ids: [action.id] },
      actionsWithoutOutcome: { count: 0, ids: [] },
    });
    expect(key.attempted.outcomesByAssessment).toMatchObject({
      positive: { count: 1, ids: [outcome.id] },
      negative: { count: 0, ids: [] },
      mixed: { count: 0, ids: [] },
      neutral: { count: 0, ids: [] },
      inconclusive: { count: 0, ids: [] },
    });

    assertBucketInvariant(experience);
    expect(JSON.stringify(projected)).not.toContain("[Circular]");
  });

  test("formatIncidentPrecedents appends RECORDED RESPONSE EXPERIENCE without success/recommendation language", () => {
    const subject = seedResource("sentry", "450");
    const [q1, q2] = pairResolutions(
      subject.id,
      "q",
      "2026-08-16T10:00:00.000Z",
    );
    const [p1, p2] = pairResolutions(
      subject.id,
      "p",
      "2026-08-16T10:10:00.000Z",
    );
    const query = recordIncident({
      baseDir: dir,
      resolutionIds: [q1.id, q2.id],
      recordedAt: "2026-08-20T12:00:00.000Z",
    });
    const prior = recordIncident({
      baseDir: dir,
      resolutionIds: [p1.id, p2.id],
      recordedAt: "2026-08-18T12:00:00.000Z",
    });
    recordIncidentLink({
      baseDir: dir,
      incidentIds: [prior.id, query.id],
      reason: "Same customer-visible failure mode",
      recordedAt: "2026-08-21T09:00:00.000Z",
    });
    recordRecommendation({
      baseDir: dir,
      incidentId: prior.id,
      subjectResourceId: subject.id,
      actionKey: "rollback-deployment",
      proposal: "Roll back",
      recordedAt: "2026-08-18T13:00:00.000Z",
    });

    const set = composeIncidentPrecedents(dir, query.id);
    const human = formatIncidentPrecedents(set);
    expect(human).toContain("RECORDED RESPONSE EXPERIENCE");
    expect(human).toContain("rollback-deployment");
    expect(human).toContain("PROPOSED");
    expect(human).toContain("ATTEMPTED");
    for (const word of [
      "success rate",
      "worked",
      "recommended",
      "best",
      "top",
      "similar",
      "caused",
      "led to",
    ]) {
      expect(human).not.toMatch(new RegExp(`\\b${word}\\b`, "i"));
    }
  });
});
