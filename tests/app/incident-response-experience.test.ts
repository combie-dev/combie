import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initCombie } from "../../src/app/init.ts";
import { recordIncidentLink } from "../../src/app/incident-links.ts";
import {
  composeIncidentPrecedents,
  type IncidentPrecedentSet,
  type IncidentSubjectSummary,
} from "../../src/app/incident-precedents.ts";
import {
  composeIncidentResponseExperience,
  formatIncidentResponseExperience,
  type ActionKeyExperience,
  type ExactRecordBucket,
} from "../../src/app/incident-response-experience.ts";
import { recordIncident } from "../../src/app/incidents.ts";
import { recordResolution } from "../../src/app/resolutions.ts";
import {
  recordAction,
  recordDecision,
  recordOutcome,
  recordRecommendation,
  type StructuredAction,
  type StructuredDecision,
  type StructuredResponseChain,
} from "../../src/app/structured-response-memory.ts";
import type { ActionRecord } from "../../src/domain/action.ts";
import type {
  DecisionDisposition,
  DecisionRecord,
} from "../../src/domain/decision.ts";
import type { IncidentLinkRecord } from "../../src/domain/incident-link.ts";
import type {
  OutcomeAssessment,
  OutcomeRecord,
} from "../../src/domain/outcome.ts";
import type { RecommendationRecord } from "../../src/domain/recommendation.ts";
import { createResource } from "../../src/domain/resource.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-experience-"));
  initCombie(dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Direct-construction builders (pure-function tests)
// ---------------------------------------------------------------------------

function makeSubject(id: string): IncidentSubjectSummary {
  return {
    id,
    recordedAt: "2026-01-01T00:00:00.000Z",
    subjectResourceIds: [],
    unresolvedResolutionIds: [],
  };
}

function makeRecommendation(
  id: string,
  actionKey: string,
): RecommendationRecord {
  return {
    id,
    subjectResourceId: "github:repository:1",
    recordedAt: "2026-01-01T00:00:00.000Z",
    actionKey,
    proposal: `proposal ${id}`,
  };
}

function makeDecision(
  id: string,
  disposition: DecisionDisposition,
): DecisionRecord {
  return {
    id,
    recommendationId: "rec:anchor",
    recordedAt: "2026-01-01T00:00:00.000Z",
    disposition,
  };
}

function makeAction(id: string, actionKey: string): ActionRecord {
  return {
    id,
    decisionId: "dec:anchor",
    recordedAt: "2026-01-01T00:00:00.000Z",
    actionKey,
    summary: `summary ${id}`,
  };
}

function makeOutcome(id: string, assessment: OutcomeAssessment): OutcomeRecord {
  return {
    id,
    actionId: "act:anchor",
    recordedAt: "2026-01-01T00:00:00.000Z",
    assessment,
    summary: `outcome ${id}`,
  };
}

function sAction(
  action: ActionRecord,
  outcomes: OutcomeRecord[] = [],
): StructuredAction {
  return { action, outcomes };
}

function sDecision(
  decision: DecisionRecord,
  actions: StructuredAction[] = [],
): StructuredDecision {
  return { decision, actions };
}

function sChain(
  recommendation: RecommendationRecord,
  decisions: StructuredDecision[] = [],
): StructuredResponseChain {
  return { recommendation, decisions };
}

function makeSet(parts: {
  queryId?: string;
  explicit?: Array<{ id: string; chains?: StructuredResponseChain[] }>;
  candidate?: Array<{ id: string; chains?: StructuredResponseChain[] }>;
}): IncidentPrecedentSet {
  const link = (id: string): IncidentLinkRecord => ({
    id: `ilink:${id}`,
    incidentIds: [id, parts.queryId ?? "inc:query"],
    recordedAt: "2026-01-01T00:00:00.000Z",
    reason: "test link",
  });
  return {
    queryIncident: makeSubject(parts.queryId ?? "inc:query"),
    explicitPrecedents: (parts.explicit ?? []).map((e) => ({
      link: link(e.id),
      incident: makeSubject(e.id),
      structuredResponseMemory: e.chains ?? [],
    })),
    candidatePrecedents: (parts.candidate ?? []).map((c) => ({
      incident: makeSubject(c.id),
      matchReasons: [],
      structuredResponseMemory: c.chains ?? [],
    })),
  };
}

function assertBucket(bucket: ExactRecordBucket): void {
  expect(bucket.count).toBe(bucket.ids.length);
}

function assertAllBuckets(experience: ReturnType<typeof composeIncidentResponseExperience>): void {
  for (const key of experience.actionKeys) {
    assertBucket(key.proposed.recommendations);
    assertBucket(key.proposed.recommendationsWithoutDecision);
    assertBucket(key.proposed.decisionsByDisposition.approved);
    assertBucket(key.proposed.decisionsByDisposition.rejected);
    assertBucket(key.proposed.decisionsByDisposition.deferred);
    assertBucket(key.proposed.decisionsByDisposition.modified);
    assertBucket(key.attempted.actions);
    assertBucket(key.attempted.actionsWithoutOutcome);
    assertBucket(key.attempted.outcomesByAssessment.positive);
    assertBucket(key.attempted.outcomesByAssessment.negative);
    assertBucket(key.attempted.outcomesByAssessment.mixed);
    assertBucket(key.attempted.outcomesByAssessment.neutral);
    assertBucket(key.attempted.outcomesByAssessment.inconclusive);
  }
}

// ---------------------------------------------------------------------------
// Pure function tests (direct construction)
// ---------------------------------------------------------------------------

describe("RED 1 — empty set", () => {
  test("produces fixed empty arrays and no action keys", () => {
    const experience = composeIncidentResponseExperience(makeSet({}));
    expect(experience.queryIncidentId).toBe("inc:query");
    expect(experience.explicitPrecedentIds).toEqual([]);
    expect(experience.candidatePrecedentIds).toEqual([]);
    expect(experience.precedentsWithoutStructuredResponseIds).toEqual([]);
    expect(experience.actionKeys).toEqual([]);
  });
});

describe("RED 2 — precedent without structured chains", () => {
  test("appears only in precedentsWithoutStructuredResponseIds and contributes no key", () => {
    const experience = composeIncidentResponseExperience(
      makeSet({
        explicit: [{ id: "inc:a", chains: [] }],
        candidate: [{ id: "inc:b", chains: [] }],
      }),
    );
    expect(experience.explicitPrecedentIds).toEqual(["inc:a"]);
    expect(experience.candidatePrecedentIds).toEqual(["inc:b"]);
    expect(experience.precedentsWithoutStructuredResponseIds).toEqual([
      "inc:a",
      "inc:b",
    ]);
    expect(experience.actionKeys).toEqual([]);
  });
});

describe("RED 3 — explicit and candidate basis separation", () => {
  test("basis stays separate, ordered explicit-first, deduplicated", () => {
    const explicitRec = makeRecommendation("rec:1", "rollback-deployment");
    const candidateRec = makeRecommendation("rec:2", "rollback-deployment");
    const experience = composeIncidentResponseExperience(
      makeSet({
        explicit: [{ id: "inc:a", chains: [sChain(explicitRec)] }],
        candidate: [{ id: "inc:b", chains: [sChain(candidateRec)] }],
      }),
    );
    const key = experience.actionKeys.find(
      (k) => k.actionKey === "rollback-deployment",
    )!;
    expect(key.precedentBasis).toEqual([
      { incidentId: "inc:a", kind: "explicit" },
      { incidentId: "inc:b", kind: "candidate" },
    ]);
    expect(key.proposed.recommendations.ids).toEqual(["rec:1", "rec:2"]);
  });

  test("a precedent contributing both a proposed and attempted record to one key is listed once", () => {
    const rec = makeRecommendation("rec:1", "shared-key");
    const dec = makeDecision("dec:1", "approved");
    const act = makeAction("act:1", "shared-key");
    const experience = composeIncidentResponseExperience(
      makeSet({
        explicit: [
          {
            id: "inc:a",
            chains: [sChain(rec, [sDecision(dec, [sAction(act)])])],
          },
        ],
      }),
    );
    const key = experience.actionKeys.find(
      (k) => k.actionKey === "shared-key",
    )!;
    expect(key.precedentBasis).toEqual([{ incidentId: "inc:a", kind: "explicit" }]);
  });
});

describe("RED 5 — exact Recommendation key grouping", () => {
  test("case, substring, and proposal text never merge groups", () => {
    const a = makeRecommendation("rec:1", "rollback-deployment");
    const b = makeRecommendation("rec:2", "rollback-deployments");
    const c = makeRecommendation("rec:3", "Rollback-deployment");
    const d = makeRecommendation("rec:4", "rollback");
    const experience = composeIncidentResponseExperience(
      makeSet({
        explicit: [
          { id: "inc:a", chains: [sChain(a), sChain(b), sChain(c), sChain(d)] },
        ],
      }),
    );
    expect(experience.actionKeys.map((k) => k.actionKey)).toEqual([
      "Rollback-deployment",
      "rollback",
      "rollback-deployment",
      "rollback-deployments",
    ]);
    for (const key of experience.actionKeys) {
      expect(key.proposed.recommendations.count).toBe(1);
    }
  });
});

describe("RED 6 — Action keys group independently", () => {
  test("a Recommendation key and an Action key with the same token stay in one group but proposed/attempted stay separate", () => {
    const rec = makeRecommendation("rec:1", "same-token");
    const dec = makeDecision("dec:1", "approved");
    const act = makeAction("act:1", "same-token");
    const experience = composeIncidentResponseExperience(
      makeSet({
        explicit: [
          { id: "inc:a", chains: [sChain(rec, [sDecision(dec, [sAction(act)])])] },
        ],
      }),
    );
    expect(experience.actionKeys).toHaveLength(1);
    const key = experience.actionKeys[0]!;
    expect(key.actionKey).toBe("same-token");
    expect(key.proposed.recommendations.ids).toEqual(["rec:1"]);
    expect(key.attempted.actions.ids).toEqual(["act:1"]);
  });
});

describe("RED 7 — modified decision key divergence", () => {
  test("records in different exact groups when Action key differs from Recommendation", () => {
    const rec = makeRecommendation("rec:1", "rollback-deployment");
    const dec = makeDecision("dec:1", "modified");
    const act = makeAction("act:1", "inspect-deployment");
    const experience = composeIncidentResponseExperience(
      makeSet({
        explicit: [
          { id: "inc:a", chains: [sChain(rec, [sDecision(dec, [sAction(act)])])] },
        ],
      }),
    );
    expect(experience.actionKeys.map((k) => k.actionKey)).toEqual([
      "inspect-deployment",
      "rollback-deployment",
    ]);

    const rollback = experience.actionKeys.find(
      (k) => k.actionKey === "rollback-deployment",
    )!;
    expect(rollback.proposed.recommendations.ids).toEqual(["rec:1"]);
    expect(rollback.proposed.decisionsByDisposition.modified.ids).toEqual([
      "dec:1",
    ]);
    expect(rollback.attempted.actions.count).toBe(0);

    const inspect = experience.actionKeys.find(
      (k) => k.actionKey === "inspect-deployment",
    )!;
    expect(inspect.proposed.recommendations.count).toBe(0);
    expect(inspect.attempted.actions.ids).toEqual(["act:1"]);
  });
});

describe("RED 8/9 — Recommendation and Decision completeness", () => {
  test("every Recommendation id appears once; zero-decision appears in recommendationsWithoutDecision", () => {
    const withDec = makeRecommendation("rec:1", "a-key");
    const withoutDec = makeRecommendation("rec:2", "a-key");
    const approved = makeDecision("dec:1", "approved");
    const deferred = makeDecision("dec:2", "deferred");
    const experience = composeIncidentResponseExperience(
      makeSet({
        explicit: [
          {
            id: "inc:a",
            chains: [
              sChain(withDec, [sDecision(approved), sDecision(deferred)]),
              sChain(withoutDec),
            ],
          },
        ],
      }),
    );
    const key = experience.actionKeys.find((k) => k.actionKey === "a-key")!;
    expect(key.proposed.recommendations.ids).toEqual(["rec:1", "rec:2"]);
    expect(key.proposed.recommendationsWithoutDecision.ids).toEqual(["rec:2"]);
    expect(key.proposed.decisionsByDisposition.approved.ids).toEqual(["dec:1"]);
    expect(key.proposed.decisionsByDisposition.deferred.ids).toEqual(["dec:2"]);
    expect(key.proposed.decisionsByDisposition.rejected.count).toBe(0);
    expect(key.proposed.decisionsByDisposition.modified.count).toBe(0);
    // no final decision field
    expect(key.proposed).not.toHaveProperty("finalDecision");
    expect(key.proposed).not.toHaveProperty("decision");
  });

  test("multiple Decisions remain multiple records", () => {
    const rec = makeRecommendation("rec:1", "multi-dec");
    const d1 = makeDecision("dec:1", "approved");
    const d2 = makeDecision("dec:2", "approved");
    const d3 = makeDecision("dec:3", "rejected");
    const experience = composeIncidentResponseExperience(
      makeSet({
        explicit: [
          {
            id: "inc:a",
            chains: [sChain(rec, [sDecision(d1), sDecision(d2), sDecision(d3)])],
          },
        ],
      }),
    );
    const key = experience.actionKeys[0]!;
    expect(key.proposed.decisionsByDisposition.approved.ids).toEqual([
      "dec:1",
      "dec:2",
    ]);
    expect(key.proposed.decisionsByDisposition.rejected.ids).toEqual(["dec:3"]);
  });
});

describe("RED 10/11 — Action and Outcome completeness", () => {
  test("every Action id appears once; zero-outcome appears in actionsWithoutOutcome", () => {
    const rec = makeRecommendation("rec:1", "act-key");
    const approved = makeDecision("dec:1", "approved");
    const withOutcome = makeAction("act:1", "act-key");
    const withoutOutcome = makeAction("act:2", "act-key");
    const positive = makeOutcome("out:1", "positive");
    const mixed = makeOutcome("out:2", "mixed");
    const experience = composeIncidentResponseExperience(
      makeSet({
        explicit: [
          {
            id: "inc:a",
            chains: [
              sChain(rec, [
                sDecision(approved, [
                  sAction(withOutcome, [positive, mixed]),
                  sAction(withoutOutcome),
                ]),
              ]),
            ],
          },
        ],
      }),
    );
    const key = experience.actionKeys.find((k) => k.actionKey === "act-key")!;
    expect(key.attempted.actions.ids).toEqual(["act:1", "act:2"]);
    expect(key.attempted.actionsWithoutOutcome.ids).toEqual(["act:2"]);
    expect(key.attempted.outcomesByAssessment.positive.ids).toEqual(["out:1"]);
    expect(key.attempted.outcomesByAssessment.mixed.ids).toEqual(["out:2"]);
    expect(key.attempted.outcomesByAssessment.negative.count).toBe(0);
    expect(key.attempted.outcomesByAssessment.neutral.count).toBe(0);
    expect(key.attempted.outcomesByAssessment.inconclusive.count).toBe(0);
    // no final outcome field
    expect(key.attempted).not.toHaveProperty("finalOutcome");
    expect(key.attempted).not.toHaveProperty("outcome");
  });

  test("multiple Outcomes remain multiple records across assessments", () => {
    const rec = makeRecommendation("rec:1", "multi-out");
    const dec = makeDecision("dec:1", "approved");
    const act = makeAction("act:1", "multi-out");
    const o1 = makeOutcome("out:1", "positive");
    const o2 = makeOutcome("out:2", "positive");
    const o3 = makeOutcome("out:3", "inconclusive");
    const experience = composeIncidentResponseExperience(
      makeSet({
        explicit: [
          {
            id: "inc:a",
            chains: [sChain(rec, [sDecision(dec, [sAction(act, [o1, o2, o3])])])],
          },
        ],
      }),
    );
    const key = experience.actionKeys[0]!;
    expect(key.attempted.outcomesByAssessment.positive.ids).toEqual([
      "out:1",
      "out:2",
    ]);
    expect(key.attempted.outcomesByAssessment.inconclusive.ids).toEqual([
      "out:3",
    ]);
  });
});

describe("RED 12/13 — no success semantics, measurements ignored", () => {
  test("positive assessment never creates success/score/rank/confidence fields", () => {
    const rec = makeRecommendation("rec:1", "no-success");
    const dec = makeDecision("dec:1", "approved");
    const act = makeAction("act:1", "no-success");
    const out = makeOutcome("out:1", "positive");
    const experience = composeIncidentResponseExperience(
      makeSet({
        explicit: [
          { id: "inc:a", chains: [sChain(rec, [sDecision(dec, [sAction(act, [out])])])] },
        ],
      }),
    );
    const json = JSON.stringify(experience);
    expect(json).not.toContain("successRate");
    expect(json).not.toContain('"success"');
    expect(json).not.toContain('"score"');
    expect(json).not.toContain('"rank"');
    expect(json).not.toContain('"confidence"');
    expect(json).not.toContain("recommendedAction");
    expect(json).not.toContain("worked");
  });

  test("measurements stay off the summary", () => {
    const rec = makeRecommendation("rec:1", "measured");
    const dec = makeDecision("dec:1", "approved");
    const act = makeAction("act:1", "measured");
    const out: OutcomeRecord = {
      id: "out:1",
      actionId: act.id,
      recordedAt: "2026-01-01T00:00:00.000Z",
      assessment: "positive",
      summary: "measured",
      measurement: { metric: "errors", before: 10, after: 1, unit: "count" },
    };
    const experience = composeIncidentResponseExperience(
      makeSet({
        explicit: [
          { id: "inc:a", chains: [sChain(rec, [sDecision(dec, [sAction(act, [out])])])] },
        ],
      }),
    );
    const json = JSON.stringify(experience);
    expect(json).not.toContain("measurement");
    expect(json).not.toContain('"before"');
    expect(json).not.toContain('"after"');
    expect(json).not.toContain('"metric"');
    expect(json).not.toContain('"unit"');
  });
});

describe("RED 15/16 — buckets, lexical order, insertion-order invariance", () => {
  test("every bucket satisfies count === ids.length; ids deduplicated and sorted", () => {
    const rec = makeRecommendation("rec:b", "dedup-key");
    const rec2 = makeRecommendation("rec:a", "dedup-key");
    const dec = makeDecision("dec:1", "approved");
    const act = makeAction("act:z", "dedup-key");
    const act2 = makeAction("act:a", "dedup-key");
    const out = makeOutcome("out:b", "positive");
    const out2 = makeOutcome("out:a", "mixed");
    const experience = composeIncidentResponseExperience(
      makeSet({
        explicit: [
          {
            id: "inc:a",
            chains: [
              sChain(rec, [sDecision(dec, [sAction(act, [out]), sAction(act2, [out2])])]),
              sChain(rec2),
            ],
          },
        ],
      }),
    );
    assertAllBuckets(experience);
    const key = experience.actionKeys.find((k) => k.actionKey === "dedup-key")!;
    expect(key.proposed.recommendations.ids).toEqual(["rec:a", "rec:b"]);
    expect(key.attempted.actions.ids).toEqual(["act:a", "act:z"]);
    expect(key.attempted.outcomesByAssessment.positive.ids).toEqual(["out:b"]);
    expect(key.attempted.outcomesByAssessment.mixed.ids).toEqual(["out:a"]);
  });

  test("action-key groups are lexical", () => {
    const build = (key: string) =>
      makeSet({
        explicit: [{ id: "inc:a", chains: [sChain(makeRecommendation(`rec:${key}`, key))] }],
      });
    const experience = composeIncidentResponseExperience(
      makeSet({
        explicit: [
          { id: "inc:a", chains: [sChain(makeRecommendation("rec:z", "zebra"))] },
          { id: "inc:b", chains: [sChain(makeRecommendation("rec:a", "apple"))] },
          { id: "inc:c", chains: [sChain(makeRecommendation("rec:m", "mango"))] },
        ],
      }),
    );
    expect(experience.actionKeys.map((k) => k.actionKey)).toEqual([
      "apple",
      "mango",
      "zebra",
    ]);
  });

  test("composition is invariant under shuffled chain and row insertion order", () => {
    const recA = makeRecommendation("rec:1", "stable-key");
    const decA = makeDecision("dec:1", "approved");
    const actA = makeAction("act:1", "stable-key");
    const actB = makeAction("act:2", "stable-key");
    const outA = makeOutcome("out:1", "positive");
    const outB = makeOutcome("out:2", "mixed");
    const recB = makeRecommendation("rec:2", "other-key");
    const recC = makeRecommendation("rec:3", "stable-key");

    const forward = composeIncidentResponseExperience(
      makeSet({
        explicit: [
          {
            id: "inc:1",
            chains: [
              sChain(recA, [sDecision(decA, [sAction(actA, [outA]), sAction(actB, [outB])])]),
              sChain(recB),
            ],
          },
          { id: "inc:2", chains: [sChain(recC)] },
        ],
      }),
    );
    const shuffled = composeIncidentResponseExperience(
      makeSet({
        explicit: [
          {
            id: "inc:1",
            chains: [
              sChain(recB),
              sChain(recA, [sDecision(decA, [sAction(actB, [outB]), sAction(actA, [outA])])]),
            ],
          },
          { id: "inc:2", chains: [sChain(recC)] },
        ],
      }),
    );
    expect(shuffled).toEqual(forward);
    expect(forward.actionKeys.map((k) => k.actionKey)).toEqual([
      "other-key",
      "stable-key",
    ]);
  });
});

describe("RED 17 — human formatter", () => {
  test("first line, PROPOSED/ATTEMPTED separation, incomplete branches, no forbidden language", () => {
    const rec = makeRecommendation("rec:1", "rollback-deployment");
    const withoutDec = makeRecommendation("rec:2", "rollback-deployment");
    const approved = makeDecision("dec:1", "approved");
    const act = makeAction("act:1", "rollback-deployment");
    const positive = makeOutcome("out:1", "positive");
    const withoutOutcome = makeAction("act:2", "rollback-deployment");
    const experience = composeIncidentResponseExperience(
      makeSet({
        explicit: [
          {
            id: "inc:a",
            chains: [
              sChain(rec, [
                sDecision(approved, [sAction(act, [positive]), sAction(withoutOutcome)]),
              ]),
              sChain(withoutDec),
            ],
          },
        ],
      }),
    );
    const human = formatIncidentResponseExperience(experience);
    expect(human.split("\n")[0]).toBe("RECORDED RESPONSE EXPERIENCE");
    expect(human).toContain("ACTION KEY: rollback-deployment");
    expect(human).toContain("PROPOSED");
    expect(human).toContain("ATTEMPTED");
    expect(human).toContain("without decision");
    expect(human).toContain("without outcome");
    expect(human).toContain("rec:1");
    expect(human).toContain("rec:2");
    expect(human).toContain("dec:1");
    expect(human).toContain("act:1");
    expect(human).toContain("act:2");
    expect(human).toContain("out:1");
    expect(human).toContain("positive");
    expect(human).not.toMatch(/success rate/i);
    expect(human).not.toMatch(/\bworked\b/i);
    expect(human).not.toMatch(/\bbest\b/i);
    expect(human).not.toMatch(/\btop\b/i);
    expect(human).not.toMatch(/recommended/i);
    expect(human).not.toMatch(/\brecommend\b/);
    expect(human).not.toMatch(/\bsimilar\b/i);
    expect(human).not.toMatch(/\bcaused\b/i);
    expect(human).not.toMatch(/\bbecause\b/i);
    expect(human).not.toMatch(/led to/i);
  });

  test("known-empty copy names precedents without structured chains", () => {
    const experience = composeIncidentResponseExperience(
      makeSet({ explicit: [{ id: "inc:a", chains: [] }] }),
    );
    const human = formatIncidentResponseExperience(experience);
    expect(human.split("\n")[0]).toBe("RECORDED RESPONSE EXPERIENCE");
    expect(human).toContain("No action keys to summarize");
    expect(human).toContain("inc:a");
  });
});

// ---------------------------------------------------------------------------
// Full-path tests (through composeIncidentPrecedents)
// ---------------------------------------------------------------------------

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

describe("RED 4/14 — complete compose→experience path", () => {
  test("explicit + candidate chains group exactly; resource-anchored never enters", () => {
    const subject = seedResource("sentry", "450");
    const [q1, q2] = pairResolutions(subject.id, "q", "2026-08-16T10:00:00.000Z");
    const [p1, p2] = pairResolutions(subject.id, "p", "2026-08-16T10:10:00.000Z");
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

    const rec = recordRecommendation({
      baseDir: dir,
      incidentId: prior.id,
      subjectResourceId: subject.id,
      actionKey: "rollback-deployment",
      proposal: "Rollback",
    });
    const approved = recordDecision({
      baseDir: dir,
      recommendationId: rec.id,
      disposition: "approved",
    });
    const action = recordAction({
      baseDir: dir,
      decisionId: approved.id,
      actionKey: "rollback-deployment",
      summary: "Rolled back",
    });
    const out = recordOutcome({
      baseDir: dir,
      actionId: action.id,
      assessment: "positive",
      summary: "Errors down",
    });
    // Resource-anchored on the same subject must never enter Incident experience.
    recordRecommendation({
      baseDir: dir,
      subjectResourceId: subject.id,
      actionKey: "rollback-deployment",
      proposal: "Should not appear",
    });

    const set = composeIncidentPrecedents(dir, query.id);
    const experience = composeIncidentResponseExperience(set);

    expect(experience.queryIncidentId).toBe(query.id);
    expect(experience.explicitPrecedentIds).toEqual([prior.id]);
    expect(experience.candidatePrecedentIds).toEqual([]);
    expect(experience.precedentsWithoutStructuredResponseIds).toEqual([]);
    expect(experience.actionKeys).toHaveLength(1);

    const key = experience.actionKeys[0]!;
    expect(key.actionKey).toBe("rollback-deployment");
    expect(key.precedentBasis).toEqual([
      { incidentId: prior.id, kind: "explicit" },
    ]);
    expect(key.proposed.recommendations).toEqual({ count: 1, ids: [rec.id] });
    expect(key.proposed.decisionsByDisposition.approved).toEqual({
      count: 1,
      ids: [approved.id],
    });
    expect(key.attempted.actions).toEqual({ count: 1, ids: [action.id] });
    expect(key.attempted.outcomesByAssessment.positive).toEqual({
      count: 1,
      ids: [out.id],
    });
    assertAllBuckets(experience);
  });

  test("future/equal-time peers never reach the experience through the composer", () => {
    const subject = seedResource("sentry", "450");
    const [q1, q2] = pairResolutions(subject.id, "q", "2026-01-01T10:00:00.000Z");
    const [f1, f2] = pairResolutions(subject.id, "f", "2026-01-02T10:00:00.000Z");
    const [p1, p2] = pairResolutions(subject.id, "p", "2025-12-30T10:00:00.000Z");
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

    const priorRec = recordRecommendation({
      baseDir: dir,
      incidentId: prior.id,
      subjectResourceId: subject.id,
      actionKey: "restart-service",
      proposal: "Restart",
    });
    const futureRec = recordRecommendation({
      baseDir: dir,
      incidentId: future.id,
      subjectResourceId: subject.id,
      actionKey: "restart-service",
      proposal: "Future restart",
    });

    const set = composeIncidentPrecedents(dir, query.id);
    const experience = composeIncidentResponseExperience(set);

    expect(experience.explicitPrecedentIds).toEqual([]);
    expect(experience.candidatePrecedentIds).toEqual([prior.id]);
    expect(experience.precedentsWithoutStructuredResponseIds).toEqual([]);
    expect(experience.actionKeys).toHaveLength(1);
    const key = experience.actionKeys[0]!;
    expect(key.precedentBasis).toEqual([
      { incidentId: prior.id, kind: "candidate" },
    ]);
    expect(key.proposed.recommendations.ids).toEqual([priorRec.id]);
    expect(key.proposed.recommendations.ids).not.toContain(futureRec.id);
  });
});
