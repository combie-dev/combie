import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CombieError } from "../../src/app/errors.ts";
import { initCombie } from "../../src/app/init.ts";
import { recordIncident, getIncident } from "../../src/app/incidents.ts";
import {
  formatSavedInvestigation,
  getSavedInvestigation,
  saveInvestigation,
} from "../../src/app/investigations.ts";
import { recordResolution, listResolutions } from "../../src/app/resolutions.ts";
import {
  composeStructuredResponseMemory,
  formatAction,
  formatDecision,
  formatOutcome,
  formatRecommendation,
  formatRecommendationList,
  getAction,
  getDecision,
  getOutcome,
  getRecommendation,
  isValidActionKey,
  listActions,
  listDecisions,
  listOutcomes,
  listRecommendations,
  recordAction,
  recordDecision,
  recordOutcome,
  recordRecommendation,
} from "../../src/app/structured-response-memory.ts";
import { actionId } from "../../src/domain/action.ts";
import { decisionId } from "../../src/domain/decision.ts";
import { outcomeId } from "../../src/domain/outcome.ts";
import { recommendationId } from "../../src/domain/recommendation.ts";
import { createResource } from "../../src/domain/resource.ts";
import type { VercelDeploymentEvidence } from "../../src/providers/vercel/deployment.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-srm-"));
  initCombie(dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function seedSubject(
  provider = "sentry",
  providerResourceId = "450",
): ReturnType<typeof createResource> {
  const store = new Store(dir);
  store.init();
  const resource = createResource({
    provider,
    providerResourceId,
    kind: provider === "sentry" ? "project" : "project",
    name: "combie",
    metadata: { slug: "combie", organization_slug: "acme" },
  });
  store.applyResource(resource, {
    id: `obs-${providerResourceId}`,
    observedAt: "2026-08-16T00:00:00.000Z",
  });
  store.close();
  return resource;
}

function deployment(
  uid: string,
  resourceId = "sentry:project:450",
): VercelDeploymentEvidence {
  return {
    provider: "vercel",
    uid,
    resourceId,
    projectId: resourceId.split(":").at(-1)!,
    readyState: "READY",
    state: "READY",
    target: "production",
    createdAtMs: 1723201000000,
    buildingAtMs: 1723201005000,
    readyAtMs: 1723201300000,
    observedAt: "2026-08-16T12:00:00.000Z",
    source: "git",
    gitCommitSha: null,
  };
}

function seedVercelSubject(): ReturnType<typeof createResource> {
  const store = new Store(dir);
  store.init();
  const resource = createResource({
    provider: "vercel",
    providerResourceId: "prj_demo",
    kind: "project",
    name: "demo",
    metadata: { accountId: "team_1" },
  });
  store.applyResource(resource, {
    id: "obs-demo",
    observedAt: "2026-08-16T00:00:00.000Z",
  });
  store.upsertVercelDeployment(deployment("dpl_abc", resource.id));
  store.upsertVercelDeployment(deployment("dpl_xyz", resource.id));
  store.close();
  return resource;
}

describe("structured response ids", () => {
  test("id helpers produce the four stable identities", () => {
    expect(recommendationId("u")).toBe("rec:u");
    expect(decisionId("u")).toBe("dec:u");
    expect(actionId("u")).toBe("act:u");
    expect(outcomeId("u")).toBe("out:u");
  });

  test("action keys accept lower-kebab and reject anything else", () => {
    expect(isValidActionKey("rollback-deployment")).toBe(true);
    expect(isValidActionKey("inspect-database")).toBe(true);
    expect(isValidActionKey("hold")).toBe(true);
    expect(isValidActionKey("a1-b2")).toBe(true);
    expect(isValidActionKey("Rollback")).toBe(false);
    expect(isValidActionKey("rollback deployment")).toBe(false);
    expect(isValidActionKey("-rollback")).toBe(false);
    expect(isValidActionKey("rollback-")).toBe(false);
    expect(isValidActionKey("rollback_deployment")).toBe(false);
    expect(isValidActionKey("")).toBe(false);
  });
});

describe("recommendation anchors", () => {
  test("investigation anchor copies the retained subject", () => {
    seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const recorded = recordRecommendation({
      baseDir: dir,
      investigationId: saved.record.id,
      actionKey: "rollback-deployment",
      proposal: "Rollback the latest deployment",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    expect(recorded.id.startsWith("rec:")).toBe(true);
    expect(recorded.investigationId).toBe(saved.record.id);
    expect(recorded.subjectResourceId).toBe("sentry:project:450");
    expect(recorded.incidentId).toBeUndefined();
    expect(getRecommendation(dir, recorded.id)).toEqual(recorded);
  });

  test("resource anchor requires the resource to exist", () => {
    seedSubject();
    const recorded = recordRecommendation({
      baseDir: dir,
      subjectResourceId: "sentry:project:450",
      actionKey: "inspect-deployment",
      proposal: "Inspect the failed deployment",
    });
    expect(recorded.subjectResourceId).toBe("sentry:project:450");
    expect(recorded.investigationId).toBeUndefined();
    expect(() =>
      recordRecommendation({
        baseDir: dir,
        subjectResourceId: "github:repository:missing",
        actionKey: "inspect",
        proposal: "Inspect",
      }),
    ).toThrow(/Resource not found/);
  });

  test("incident anchor requires --resource and an exact current member subject", () => {
    seedSubject();
    const r1 = recordResolution({
      baseDir: dir,
      subjectResourceId: "sentry:project:450",
      decision: "Hold",
      recordedAt: "2026-08-16T10:00:00.000Z",
    });
    const r2 = recordResolution({
      baseDir: dir,
      subjectResourceId: "sentry:project:450",
      decision: "Hold more",
      recordedAt: "2026-08-16T10:05:00.000Z",
    });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: [r1.id, r2.id],
      recordedAt: "2026-08-16T11:00:00.000Z",
    });

    // Without --resource: rejected.
    expect(() =>
      recordRecommendation({
        baseDir: dir,
        incidentId: incident.id,
        actionKey: "hold-deploys",
        proposal: "Hold deploys",
      }),
    ).toThrow(/requires --resource/);

    // Non-member subject: rejected atomically.
    const otherStore = new Store(dir);
    otherStore.init();
    otherStore.applyResource(
      createResource({
        provider: "github",
        providerResourceId: "1001",
        kind: "repository",
        name: "other-repo",
        metadata: {},
      }),
      { id: "obs-other", observedAt: "2026-08-16T00:00:00.000Z" },
    );
    otherStore.close();
    expect(() =>
      recordRecommendation({
        baseDir: dir,
        incidentId: incident.id,
        subjectResourceId: "github:repository:1001",
        actionKey: "hold-deploys",
        proposal: "Hold deploys",
      }),
    ).toThrow(/no loadable member on subject/);

    const recorded = recordRecommendation({
      baseDir: dir,
      incidentId: incident.id,
      subjectResourceId: "sentry:project:450",
      actionKey: "hold-deploys",
      proposal: "Hold deploys while the incident is active",
      recordedAt: "2026-08-16T15:00:00.000Z",
    });
    expect(recorded.incidentId).toBe(incident.id);
    expect(recorded.subjectResourceId).toBe("sentry:project:450");
    expect(getIncident(dir, incident.id).resolutionIds).toEqual([r1.id, r2.id]);
  });

  test("anchors conflict and missing anchor fail atomically", () => {
    seedSubject();
    expect(() =>
      recordRecommendation({
        baseDir: dir,
        investigationId: "inv:x",
        subjectResourceId: "sentry:project:450",
        actionKey: "a",
        proposal: "p",
      }),
    ).toThrow(/exactly one/);
    expect(() =>
      recordRecommendation({
        baseDir: dir,
        actionKey: "a",
        proposal: "p",
      }),
    ).toThrow(/requires --investigation, --resource, or --incident/);
  });
});

describe("recommendation evidence", () => {
  test("evidence duplicates collapse first-seen and unknown evidence rejects", () => {
    const subject = seedVercelSubject();
    const recorded = recordRecommendation({
      baseDir: dir,
      subjectResourceId: subject.id,
      actionKey: "rollback-deployment",
      proposal: "Rollback",
      evidenceIds: ["dpl_abc", "dpl_xyz", "dpl_abc"],
    });
    expect(recorded.evidenceIds).toEqual(["dpl_abc", "dpl_xyz"]);

    expect(() =>
      recordRecommendation({
        baseDir: dir,
        subjectResourceId: subject.id,
        actionKey: "rollback-deployment",
        proposal: "Rollback",
        evidenceIds: ["dpl_zzz"],
      }),
    ).toThrow(/Evidence id not found/);
    expect(listRecommendations(dir, { subjectResourceId: subject.id })).toHaveLength(1);
  });
});

describe("decision", () => {
  let rec: ReturnType<typeof recordRecommendation>;
  beforeEach(() => {
    seedSubject();
    rec = recordRecommendation({
      baseDir: dir,
      subjectResourceId: "sentry:project:450",
      actionKey: "rollback-deployment",
      proposal: "Rollback",
    });
  });

  test("records each disposition and rejects unknown values", () => {
    for (const disposition of ["approved", "rejected", "deferred"] as const) {
      const d = recordDecision({
        baseDir: dir,
        recommendationId: rec.id,
        disposition,
      });
      expect(d.disposition).toBe(disposition);
      expect(getDecision(dir, d.id)).toEqual(d);
    }
    expect(() =>
      recordDecision({
        baseDir: dir,
        recommendationId: rec.id,
        disposition: "maybe" as never,
      }),
    ).toThrow(/disposition must be one of/);
  });

  test("modified requires a note", () => {
    expect(() =>
      recordDecision({
        baseDir: dir,
        recommendationId: rec.id,
        disposition: "modified",
      }),
    ).toThrow(/modified decision requires --note/);
    const d = recordDecision({
      baseDir: dir,
      recommendationId: rec.id,
      disposition: "modified",
      note: "Roll back to 1.4.1 instead",
    });
    expect(d.note).toBe("Roll back to 1.4.1 instead");
  });

  test("unknown recommendation rejects the whole insert", () => {
    expect(() =>
      recordDecision({
        baseDir: dir,
        recommendationId: "rec:missing",
        disposition: "approved",
      }),
    ).toThrow(/Recommendation not found/);
    expect(listDecisions(dir)).toEqual([]);
  });
});

describe("action", () => {
  let approved: ReturnType<typeof recordDecision>;
  let rejected: ReturnType<typeof recordDecision>;

  beforeEach(() => {
    seedSubject();
    const rec = recordRecommendation({
      baseDir: dir,
      subjectResourceId: "sentry:project:450",
      actionKey: "rollback-deployment",
      proposal: "Rollback",
    });
    approved = recordDecision({
      baseDir: dir,
      recommendationId: rec.id,
      disposition: "approved",
    });
    rejected = recordDecision({
      baseDir: dir,
      recommendationId: rec.id,
      disposition: "rejected",
    });
  });

  test("accepts approved decision and stores performedAt", () => {
    const a = recordAction({
      baseDir: dir,
      decisionId: approved.id,
      actionKey: "rollback-deployment",
      summary: "Rolled back deployment dpl_abc",
      performedAt: "2026-08-16T16:00:00.000Z",
    });
    expect(a.id.startsWith("act:")).toBe(true);
    expect(a.performedAt).toBe("2026-08-16T16:00:00.000Z");
    expect(getAction(dir, a.id)).toEqual(a);
  });

  test("rejects rejected and deferred decisions", () => {
    expect(() =>
      recordAction({
        baseDir: dir,
        decisionId: rejected.id,
        actionKey: "rollback-deployment",
        summary: "Rollback",
      }),
    ).toThrow(/requires an approved or modified decision/);
    expect(listActions(dir)).toEqual([]);
  });

  test("rejects malformed actionKey, blank summary, invalid performedAt, unknown parent", () => {
    expect(() =>
      recordAction({
        baseDir: dir,
        decisionId: approved.id,
        actionKey: "Bad Key",
        summary: "s",
      }),
    ).toThrow(/--action-key must be a lower-kebab token/);
    expect(() =>
      recordAction({
        baseDir: dir,
        decisionId: approved.id,
        actionKey: "rollback",
        summary: "   ",
      }),
    ).toThrow(/--summary requires non-blank text/);
    expect(() =>
      recordAction({
        baseDir: dir,
        decisionId: approved.id,
        actionKey: "rollback",
        summary: "s",
        performedAt: "not-a-time",
      }),
    ).toThrow(/--performed-at requires a valid ISO/);
    expect(() =>
      recordAction({
        baseDir: dir,
        decisionId: "dec:missing",
        actionKey: "rollback",
        summary: "s",
      }),
    ).toThrow(/Decision not found/);
    expect(listActions(dir)).toEqual([]);
  });
});

describe("outcome", () => {
  let act: ReturnType<typeof recordAction>;
  beforeEach(() => {
    seedSubject();
    const rec = recordRecommendation({
      baseDir: dir,
      subjectResourceId: "sentry:project:450",
      actionKey: "rollback-deployment",
      proposal: "Rollback",
    });
    const dec = recordDecision({
      baseDir: dir,
      recommendationId: rec.id,
      disposition: "approved",
    });
    act = recordAction({
      baseDir: dir,
      decisionId: dec.id,
      actionKey: "rollback-deployment",
      summary: "Rolled back",
    });
  });

  test("records each assessment and rejects unknown values", () => {
    for (const assessment of ["positive", "negative", "mixed", "neutral", "inconclusive"] as const) {
      const o = recordOutcome({
        baseDir: dir,
        actionId: act.id,
        assessment,
        summary: "Observed result",
      });
      expect(o.assessment).toBe(assessment);
      expect(getOutcome(dir, o.id)).toEqual(o);
    }
    expect(() =>
      recordOutcome({
        baseDir: dir,
        actionId: act.id,
        assessment: "great" as never,
        summary: "s",
      }),
    ).toThrow(/--assessment must be one of/);
  });

  test("stores a complete atomic measurement", () => {
    const o = recordOutcome({
      baseDir: dir,
      actionId: act.id,
      assessment: "positive",
      summary: "Error rate returned toward baseline",
      measurement: { metric: "error-rate", before: 12.4, after: 1.1, unit: "percent" },
    });
    expect(o.measurement).toEqual({
      metric: "error-rate",
      before: 12.4,
      after: 1.1,
      unit: "percent",
    });
  });

  test("rejects partial or non-finite measurement atomically", () => {
    expect(() =>
      recordOutcome({
        baseDir: dir,
        actionId: act.id,
        assessment: "positive",
        summary: "s",
        measurement: { metric: "error-rate", before: NaN, after: 1, unit: "percent" },
      }),
    ).toThrow(/measurement requires/);
    expect(() =>
      recordOutcome({
        baseDir: dir,
        actionId: act.id,
        assessment: "positive",
        summary: "s",
        measurement: { metric: " ", before: 1, after: 2, unit: "percent" },
      }),
    ).toThrow(/measurement requires/);
    expect(listOutcomes(dir)).toEqual([]);
  });

  test("rejects invalid observedAt, unknown evidence, and unknown action", () => {
    expect(() =>
      recordOutcome({
        baseDir: dir,
        actionId: act.id,
        assessment: "positive",
        summary: "s",
        observedAt: "not-a-time",
      }),
    ).toThrow(/--observed-at requires a valid ISO/);
    expect(() =>
      recordOutcome({
        baseDir: dir,
        actionId: "act:missing",
        assessment: "positive",
        summary: "s",
      }),
    ).toThrow(/Action not found/);
    expect(() =>
      recordOutcome({
        baseDir: dir,
        actionId: act.id,
        assessment: "positive",
        summary: "s",
        evidenceIds: ["dpl_zzz"],
      }),
    ).toThrow(/Evidence id not found/);
  });
});

describe("append-only ordering and no inferred latest", () => {
  test("multiple decisions/actions/outcomes stay append-only and ordered", () => {
    seedSubject();
    const rec = recordRecommendation({
      baseDir: dir,
      subjectResourceId: "sentry:project:450",
      actionKey: "rollback-deployment",
      proposal: "Rollback",
    });
    const d1 = recordDecision({
      baseDir: dir,
      recommendationId: rec.id,
      disposition: "rejected",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    const d2 = recordDecision({
      baseDir: dir,
      recommendationId: rec.id,
      disposition: "approved",
      recordedAt: "2026-08-16T14:05:00.000Z",
    });
    const decisions = listDecisions(dir, { recommendationId: rec.id });
    expect(decisions.map((d) => d.id)).toEqual([d2.id, d1.id]);

    const a1 = recordAction({
      baseDir: dir,
      decisionId: d2.id,
      actionKey: "rollback-deployment",
      summary: "Rolled back",
      recordedAt: "2026-08-16T15:00:00.000Z",
    });
    const o1 = recordOutcome({
      baseDir: dir,
      actionId: a1.id,
      assessment: "positive",
      summary: "Recovered",
      recordedAt: "2026-08-16T15:30:00.000Z",
    });
    const o2 = recordOutcome({
      baseDir: dir,
      actionId: a1.id,
      assessment: "inconclusive",
      summary: "Later unclear",
      recordedAt: "2026-08-16T16:00:00.000Z",
    });
    expect(listOutcomes(dir, { actionId: a1.id }).map((o) => o.id)).toEqual([
      o2.id,
      o1.id,
    ]);
    // No "latest" is inferred: both outcomes remain visible.
    expect(listOutcomes(dir, { actionId: a1.id })).toHaveLength(2);
  });
});

describe("show/list known-empty", () => {
  test("lists return [] for unknown filters and unknown ids throw typed errors", () => {
    seedSubject();
    expect(listRecommendations(dir)).toEqual([]);
    expect(listRecommendations(dir, { subjectResourceId: "x:y:z" })).toEqual([]);
    expect(listDecisions(dir, { recommendationId: "rec:x" })).toEqual([]);
    expect(listActions(dir, { decisionId: "dec:x" })).toEqual([]);
    expect(listOutcomes(dir, { actionId: "act:x" })).toEqual([]);
    expect(() => getRecommendation(dir, "rec:x")).toThrow(/Recommendation not found/);
    expect(() => getDecision(dir, "dec:x")).toThrow(/Decision not found/);
    expect(() => getAction(dir, "act:x")).toThrow(/Action not found/);
    expect(() => getOutcome(dir, "out:x")).toThrow(/Outcome not found/);
  });

  test("empty recommendation list renders known-empty copy", () => {
    seedSubject();
    expect(formatRecommendationList([])).toContain("No recommendations recorded yet");
  });
});

describe("legacy continuity", () => {
  test("structured writes leave Resolution, Incident, and snapshots unchanged", () => {
    seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const before = new Store(dir);
    before.init();
    const snapshotJson = before.getInvestigationRow(saved.record.id)?.snapshotJson;
    before.close();

    const rec = recordRecommendation({
      baseDir: dir,
      investigationId: saved.record.id,
      actionKey: "rollback-deployment",
      proposal: "Rollback",
    });
    const dec = recordDecision({
      baseDir: dir,
      recommendationId: rec.id,
      disposition: "approved",
    });
    const act = recordAction({
      baseDir: dir,
      decisionId: dec.id,
      actionKey: "rollback-deployment",
      summary: "Rolled back",
    });
    recordOutcome({
      baseDir: dir,
      actionId: act.id,
      assessment: "positive",
      summary: "Recovered",
    });

    const after = new Store(dir);
    after.init();
    expect(after.getInvestigationRow(saved.record.id)?.snapshotJson).toBe(snapshotJson);
    after.close();

    // Legacy resolution/incident still function.
    expect(listResolutions(dir)).toEqual([]);
    const res = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Also",
    });
    expect(res.id.startsWith("res:")).toBe(true);

    expect(formatSavedInvestigation(getSavedInvestigation(dir, saved.record.id))).toContain(
      "INVESTIGATION",
    );
  });
});

describe("compose structured response memory", () => {
  test("composes nested chains for the exact subject and [] when empty", () => {
    seedSubject();
    expect(composeStructuredResponseMemory(dir, "sentry:project:450")).toEqual([]);

    const rec = recordRecommendation({
      baseDir: dir,
      subjectResourceId: "sentry:project:450",
      actionKey: "rollback-deployment",
      proposal: "Rollback the latest deployment",
      rationale: "Errors began after the release",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    const dec = recordDecision({
      baseDir: dir,
      recommendationId: rec.id,
      disposition: "approved",
      recordedAt: "2026-08-16T14:05:00.000Z",
    });
    const act = recordAction({
      baseDir: dir,
      decisionId: dec.id,
      actionKey: "rollback-deployment",
      summary: "Rolled back deployment dpl_abc",
      recordedAt: "2026-08-16T14:10:00.000Z",
    });
    const out = recordOutcome({
      baseDir: dir,
      actionId: act.id,
      assessment: "positive",
      summary: "Error rate returned toward baseline",
      observedAt: "2026-08-16T14:20:00.000Z",
      measurement: { metric: "error-rate", before: 12.4, after: 1.1, unit: "percent" },
      recordedAt: "2026-08-16T14:25:00.000Z",
    });

    const chains = composeStructuredResponseMemory(dir, "sentry:project:450");
    expect(chains).toHaveLength(1);
    expect(chains[0]!.recommendation.id).toBe(rec.id);
    expect(chains[0]!.recommendation.rationale).toBe("Errors began after the release");
    expect(chains[0]!.decisions).toHaveLength(1);
    expect(chains[0]!.decisions[0]!.decision.id).toBe(dec.id);
    expect(chains[0]!.decisions[0]!.actions).toHaveLength(1);
    expect(chains[0]!.decisions[0]!.actions[0]!.action.id).toBe(act.id);
    expect(chains[0]!.decisions[0]!.actions[0]!.outcomes).toHaveLength(1);
    expect(chains[0]!.decisions[0]!.actions[0]!.outcomes[0]!.id).toBe(out.id);

    // A different subject has none.
    expect(composeStructuredResponseMemory(dir, "github:repository:9")).toEqual([]);
  });

  test("formatters distinguish retained memory from current provider truth", () => {
    seedSubject();
    const rec = recordRecommendation({
      baseDir: dir,
      subjectResourceId: "sentry:project:450",
      actionKey: "rollback-deployment",
      proposal: "Rollback",
    });
    const dec = recordDecision({
      baseDir: dir,
      recommendationId: rec.id,
      disposition: "approved",
    });
    const act = recordAction({
      baseDir: dir,
      decisionId: dec.id,
      actionKey: "rollback-deployment",
      summary: "Rolled back",
    });
    const out = recordOutcome({
      baseDir: dir,
      actionId: act.id,
      assessment: "positive",
      summary: "Recovered",
    });
    for (const text of [
      formatRecommendation(rec),
      formatDecision(dec),
      formatAction(act),
      formatOutcome(out),
    ]) {
      expect(text).toContain("not current provider truth");
    }
    expect(formatRecommendation(rec)).toContain("RECOMMENDATION");
    expect(formatDecision(dec)).toContain("approved");
    expect(formatAction(act)).toContain("SUMMARY");
    expect(formatOutcome(out)).toContain("positive");
  });
});
