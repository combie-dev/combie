import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CombieError } from "../../src/app/errors.ts";
import { recordIncident, getIncident, listIncidents } from "../../src/app/incidents.ts";
import { initCombie } from "../../src/app/init.ts";
import { formatInvestigationContext, getInvestigationContext } from "../../src/app/investigate.ts";
import {
  formatSavedInvestigation,
  getSavedInvestigation,
  saveInvestigation,
  serializeInvestigationSnapshot,
} from "../../src/app/investigations.ts";
import {
  formatResolution,
  formatResolutionList,
  formatRecordConfirmation,
  formatResolutionMemorySection,
  formatWithResolutionMemory,
  getResolution,
  listResolutions,
  recordResolution,
} from "../../src/app/resolutions.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import type { GitHubWorkflowRunEvidence } from "../../src/providers/github/workflow-run.ts";
import type { SentryIssueEvidence } from "../../src/providers/sentry/issue.ts";
import type { SentryReleaseEvidence } from "../../src/providers/sentry/release.ts";
import type { VercelDeploymentEvidence } from "../../src/providers/vercel/deployment.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-resolution-"));
  initCombie(dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function seedSubject(providerResourceId = "450"): ReturnType<typeof createResource> {
  const store = new Store(dir);
  store.init();
  const resource = createResource({
    provider: "sentry",
    providerResourceId,
    kind: "project",
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

function saveSnapshot(
  resourceRef: string,
  composedAt = "2026-08-16T12:00:00.000Z",
) {
  return saveInvestigation({
    baseDir: dir,
    resourceRef,
    composedAt,
  });
}

function seedVercelSubject(
  providerResourceId = "prj_demo",
): ReturnType<typeof createResource> {
  const store = new Store(dir);
  store.init();
  const resource = createResource({
    provider: "vercel",
    providerResourceId,
    kind: "project",
    name: "demo",
    metadata: { accountId: "team_1" },
  });
  store.applyResource(resource, {
    id: `obs-ch-${providerResourceId}`,
    observedAt: "2026-08-16T00:00:00.000Z",
  });
  store.close();
  return resource;
}

function deployment(
  uid: string,
  resourceId = "vercel:project:prj_demo",
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

function seedVercelEvidence(uids: string[]): void {
  const store = new Store(dir);
  store.init();
  for (const uid of uids) {
    store.upsertVercelDeployment(deployment(uid));
  }
  store.close();
}

function release(
  overrides: Partial<SentryReleaseEvidence> = {},
): SentryReleaseEvidence {
  return {
    provider: "sentry",
    version: "frontend@1.2.0",
    resourceId: "sentry:project:450",
    projectId: "450",
    shortVersion: "1.2.0",
    status: "open",
    dateCreated: "2026-08-16T10:00:00.000Z",
    dateReleased: null,
    observedAt: "2026-08-16T12:00:00.000Z",
    gitCommitSha: null,
    ...overrides,
  };
}

function issue(
  overrides: Partial<SentryIssueEvidence> = {},
): SentryIssueEvidence {
  return {
    provider: "sentry",
    issueId: "5123",
    resourceId: "sentry:project:450",
    projectId: "450",
    shortId: "ACME-123",
    status: "unresolved",
    level: "error",
    count: 42,
    userCount: 7,
    issueCategory: "error",
    firstSeen: "2026-08-16T09:00:00.000Z",
    lastSeen: "2026-08-16T11:00:00.000Z",
    observedAt: "2026-08-16T12:00:00.000Z",
    ...overrides,
  };
}

describe("investigation resolutions", () => {
  test("record persists one row against a saved snapshot and does not rewrite it", () => {
    const subject = seedSubject();
    const saved = saveSnapshot(subject.id);
    const frozen = formatSavedInvestigation(
      getSavedInvestigation(dir, saved.record.id),
    );
    const store = new Store(dir);
    store.init();
    const changeCount = store.listChanges().length;
    const relCount = store.listRelationships().length;
    const invCount = store.listInvestigationSummaries().length;
    const snapshotJson = store.getInvestigationRow(saved.record.id)?.snapshotJson;
    store.close();

    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback 1.4.2",
      action: "Reverted deployment to 1.4.1",
      outcome: "Errors returned to baseline within ~10 minutes",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });

    expect(recorded.id.startsWith("res:")).toBe(true);
    expect(recorded.investigationId).toBe(saved.record.id);
    expect(recorded.subjectResourceId).toBe(subject.id);
    expect(recorded.recordedAt).toBe("2026-08-16T14:00:00.000Z");
    expect(recorded.decision).toBe("Rollback 1.4.2");
    expect(recorded.action).toBe("Reverted deployment to 1.4.1");
    expect(recorded.outcome).toBe(
      "Errors returned to baseline within ~10 minutes",
    );

    const after = new Store(dir);
    after.init();
    expect(after.listResolutionSummaries()).toHaveLength(1);
    expect(after.listChanges()).toHaveLength(changeCount);
    expect(after.listRelationships()).toHaveLength(relCount);
    expect(after.listInvestigationSummaries()).toHaveLength(invCount);
    expect(after.getInvestigationRow(saved.record.id)?.snapshotJson).toBe(
      snapshotJson,
    );
    after.close();

    expect(
      formatSavedInvestigation(getSavedInvestigation(dir, saved.record.id)),
    ).toBe(frozen);
    expect(formatResolution(recorded)).toContain("RESOLUTION");
    expect(formatResolution(recorded)).toContain("organizational response");
    expect(formatResolution(recorded)).not.toMatch(/incident/i);
    expect(formatResolution(recorded)).not.toMatch(/resolved: true/i);
    expect(formatRecordConfirmation(recorded)).toContain(recorded.id);
  });

  test("at least one of decision, action, outcome is required", () => {
    seedSubject();
    const saved = saveSnapshot("sentry:project:450");
    expect(() =>
      recordResolution({
        baseDir: dir,
        investigationId: saved.record.id,
        decision: "   ",
        action: "",
      }),
    ).toThrow(/at least one of --decision, --action, or --outcome/i);

    const store = new Store(dir);
    store.init();
    expect(store.listResolutionSummaries()).toEqual([]);
    store.close();
  });

  test("action may be omitted when decision and outcome are present", () => {
    seedSubject();
    const saved = saveSnapshot("sentry:project:450");
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Wait",
      outcome: "Recovered without intervention",
    });
    expect(recorded.decision).toBe("Wait");
    expect(recorded.action).toBeUndefined();
    expect(recorded.outcome).toBe("Recovered without intervention");
    expect(formatResolution(recorded)).toContain("DECISION");
    expect(formatResolution(recorded)).toContain("OUTCOME");
    expect(formatResolution(recorded)).not.toContain("ACTION");
  });

  test("append-only: two records on one investigation both list", () => {
    seedSubject();
    const saved = saveSnapshot("sentry:project:450");
    const first = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Wait",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const second = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      action: "Rolled back",
      recordedAt: "2026-08-16T15:00:00.000Z",
    });
    const listed = listResolutions(dir, {
      investigationId: saved.record.id,
    });
    expect(listed.map((r) => r.id)).toEqual([second.id, first.id]);
    expect(getResolution(dir, first.id).decision).toBe("Wait");
    expect(getResolution(dir, second.id).action).toBe("Rolled back");
  });

  test("list by investigation and by subject are exact filters in recordedAt DESC, id DESC", () => {
    const sentry = seedSubject("450");
    const github = createResource({
      provider: "github",
      providerResourceId: "1001",
      kind: "repository",
      name: "acme/api",
      metadata: {},
    });
    const store = new Store(dir);
    store.init();
    store.applyResource(github, {
      id: "obs-gh",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const invA = saveSnapshot(sentry.id, "2026-08-16T10:00:00.000Z");
    const invB = saveSnapshot(github.id, "2026-08-16T11:00:00.000Z");
    const r1 = recordResolution({
      baseDir: dir,
      investigationId: invA.record.id,
      decision: "A-early",
      recordedAt: "2026-08-16T12:00:00.000Z",
    });
    const r2 = recordResolution({
      baseDir: dir,
      investigationId: invA.record.id,
      decision: "A-late",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    const r3 = recordResolution({
      baseDir: dir,
      investigationId: invB.record.id,
      decision: "B",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });

    expect(
      listResolutions(dir, { investigationId: invA.record.id }).map((r) => r.id),
    ).toEqual([r2.id, r1.id]);
    expect(
      listResolutions(dir, { subjectResourceId: sentry.id }).map((r) => r.id),
    ).toEqual([r2.id, r1.id]);
    expect(
      listResolutions(dir, { subjectResourceId: github.id }).map((r) => r.id),
    ).toEqual([r3.id]);

    const tie = recordResolution({
      baseDir: dir,
      investigationId: invA.record.id,
      decision: "A-tie",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    const tied = listResolutions(dir, { investigationId: invA.record.id });
    expect(tied.map((r) => r.id)).toEqual([
      ...[tie.id, r2.id].sort((x, y) => (y < x ? -1 : y > x ? 1 : 0)),
      r1.id,
    ]);
  });

  test("subject with zero resolutions is known-empty for that subject", () => {
    seedSubject();
    const records = listResolutions(dir, {
      subjectResourceId: "sentry:project:450",
    });
    expect(records).toEqual([]);
    expect(formatResolutionList(records, { subjectResourceId: "sentry:project:450" })).toContain(
      "No resolutions recorded for subject sentry:project:450",
    );
    expect(formatResolutionList(records)).toContain("No resolutions recorded yet.");
  });

  test("subject-filtered list survives subject Resource deletion", () => {
    const subject = seedSubject();
    const saved = saveSnapshot(subject.id);
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });

    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resources WHERE id = '${subject.id}'`);
    db.close();

    const listed = listResolutions(dir, { subjectResourceId: subject.id });
    expect(listed.map((r) => r.id)).toEqual([recorded.id]);
  });

  test("unknown investigation id fails without inserting", () => {
    seedSubject();
    expect(() =>
      recordResolution({
        baseDir: dir,
        investigationId: "inv:missing",
        decision: "Rollback",
      }),
    ).toThrow(/Investigation not found/);
    const store = new Store(dir);
    store.init();
    expect(store.listResolutionSummaries()).toEqual([]);
    store.close();
  });

  test("pre-051 database lists empty until write init creates the table", () => {
    const path = dbPath(dir);
    const db = new Database(path);
    db.exec(`DROP TABLE IF EXISTS resolutions`);
    db.close();

    expect(listResolutions(dir)).toEqual([]);

    seedSubject();
    const saved = saveSnapshot("sentry:project:450");
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
    });
    expect(getResolution(dir, recorded.id).id).toBe(recorded.id);
  });

  test("invalid id and untrusted row fail without inventing fields", () => {
    expect(() => getResolution(dir, "")).toThrow(/Resolution id is required/);
    expect(() => getResolution(dir, "res:missing")).toThrow(/Resolution not found/);
  });
});

describe("exact-id resolution recall", () => {
  test("empty list omits the memory section and leaves compose / snapshot formatters unchanged", () => {
    const subject = seedSubject();
    const saved = saveSnapshot(subject.id);
    const live = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: subject.id }),
    );
    const snapshot = formatSavedInvestigation(
      getSavedInvestigation(dir, saved.record.id),
    );

    expect(formatResolutionMemorySection([], "investigation")).toBe("");
    expect(formatResolutionMemorySection([], "subject")).toBe("");
    expect(formatWithResolutionMemory(live, [], "subject")).toBe(live);
    expect(formatWithResolutionMemory(snapshot, [], "investigation")).toBe(
      snapshot,
    );
    expect(live).not.toContain("RESOLUTION MEMORY");
    expect(snapshot).not.toContain("RESOLUTION MEMORY");
    expect(serializeInvestigationSnapshot(saved.record.snapshot)).not.toContain(
      "RESOLUTION MEMORY",
    );
  });

  test("investigation-scoped section prints retained field text and does not rewrite the snapshot", () => {
    const subject = seedSubject();
    const saved = saveSnapshot(subject.id);
    const frozenSnapshot = formatSavedInvestigation(
      getSavedInvestigation(dir, saved.record.id),
    );
    const frozenJson = serializeInvestigationSnapshot(saved.record.snapshot);
    const first = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback 1.4.2",
      action: "Reverted deployment to 1.4.1",
      outcome: "Errors returned to baseline within ~10 minutes",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const second = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Wait instead",
      recordedAt: "2026-08-16T15:00:00.000Z",
    });

    const records = listResolutions(dir, {
      investigationId: saved.record.id,
    });
    const section = formatResolutionMemorySection(records, "investigation");
    expect(section).toContain("RESOLUTION MEMORY");
    expect(section).toContain("organizational response");
    expect(section).toContain("not current provider truth");
    expect(section).toContain("It is not a recommendation");
    expect(section).not.toMatch(/you should/i);
    expect(section).not.toMatch(/incident/i);
    expect(section).not.toMatch(/resolved: true/i);
    expect(section).not.toContain("KNOWN FACTS");
    expect(section).not.toContain("MISSING CONTEXT");
    expect(section).toContain(second.id);
    expect(section).toContain(first.id);
    expect(section.indexOf(second.id)).toBeLessThan(section.indexOf(first.id));
    expect(section.split("\n")).not.toContain("RESOLUTION");
    expect(section).toContain("DECISION");
    expect(section).toContain("ACTION");
    expect(section).toContain("OUTCOME");
    expect(section).toContain("Rollback 1.4.2");
    expect(section).toContain("Reverted deployment to 1.4.1");
    expect(section).toContain("Wait instead");
    expect(section).not.toContain("decision, action, outcome");
    expect(section).toContain("Show:");
    expect(section).toContain(`resolution ${second.id}`);
    const waitBlock = section.slice(
      section.indexOf(second.id),
      section.indexOf(first.id),
    );
    expect(waitBlock).toContain("DECISION");
    expect(waitBlock).toContain("Wait instead");
    expect(waitBlock).not.toContain("ACTION");
    expect(waitBlock).not.toContain("OUTCOME");

    const snapshot = formatSavedInvestigation(
      getSavedInvestigation(dir, saved.record.id),
    );
    expect(snapshot).toBe(frozenSnapshot);
    expect(snapshot).not.toContain("RESOLUTION MEMORY");
    expect(
      serializeInvestigationSnapshot(
        getSavedInvestigation(dir, saved.record.id).snapshot,
      ),
    ).toBe(frozenJson);

    const rendered = formatWithResolutionMemory(
      snapshot,
      records,
      "investigation",
    );
    expect(rendered.startsWith(snapshot)).toBe(true);
    expect(rendered).toContain("RESOLUTION MEMORY");
    expect(rendered).toContain(second.id);
    expect(rendered).toContain("Wait instead");
    expect(formatInvestigationContext(saved.record.snapshot)).not.toContain(
      "RESOLUTION MEMORY",
    );
    expect(formatInvestigationContext(saved.record.snapshot)).not.toContain(
      "Rollback 1.4.2",
    );
  });

  test("subject-scoped section includes investigation id and excludes other subjects", () => {
    const sentry = seedSubject("450");
    const github = createResource({
      provider: "github",
      providerResourceId: "1001",
      kind: "repository",
      name: "acme/api",
      metadata: {},
    });
    const store = new Store(dir);
    store.init();
    store.applyResource(github, {
      id: "obs-gh",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.close();

    const invSentry = saveSnapshot(sentry.id, "2026-08-16T10:00:00.000Z");
    const invGithub = saveSnapshot(github.id, "2026-08-16T11:00:00.000Z");
    const ours = recordResolution({
      baseDir: dir,
      investigationId: invSentry.record.id,
      decision: "Pin the Sentry release",
      recordedAt: "2026-08-16T12:00:00.000Z",
    });
    const other = recordResolution({
      baseDir: dir,
      investigationId: invGithub.record.id,
      decision: "Pin the GitHub workflow",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });

    const live = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: sentry.id }),
    );
    expect(live).not.toContain("RESOLUTION MEMORY");
    expect(live).not.toContain(ours.id);

    const section = formatResolutionMemorySection(
      listResolutions(dir, { subjectResourceId: sentry.id }),
      "subject",
    );
    expect(section).toContain(ours.id);
    expect(section).toContain(invSentry.record.id);
    expect(section).not.toContain(other.id);
    expect(section).not.toContain(invGithub.record.id);
    expect(section).toContain("Pin the Sentry release");
    expect(section).not.toContain("Pin the GitHub workflow");
    expect(section).toContain("DECISION");
    expect(section.split("\n")).not.toContain("RESOLUTION");

    const rendered = formatWithResolutionMemory(
      live,
      listResolutions(dir, { subjectResourceId: sentry.id }),
      "subject",
    );
    expect(rendered).toContain("RESOLUTION MEMORY");
    expect(rendered).toContain(ours.id);
    expect(rendered).toContain("Pin the Sentry release");
    expect(rendered).not.toContain("Pin the GitHub workflow");
    expect(live).not.toContain("Pin the Sentry release");
  });

  test("reopen of a later resolution still hangs on the investigation id", () => {
    const subject = seedSubject();
    const saved = saveSnapshot(subject.id, "2026-08-16T12:00:00.000Z");
    const later = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      outcome: "Recovered without intervention",
      recordedAt: "2026-08-16T18:00:00.000Z",
    });
    const section = formatResolutionMemorySection(
      listResolutions(dir, { investigationId: saved.record.id }),
      "investigation",
    );
    expect(section).toContain(later.id);
    expect(section).toContain("2026-08-16T18:00:00.000Z");
    expect(section).toContain("OUTCOME");
    expect(section).toContain("Recovered without intervention");
    expect(section).not.toContain("ACTION");
    expect(section).not.toContain("DECISION");
  });
});

describe("explicit evidence references (Sprint 054)", () => {
  test("record without evidence stays 051-identical: no EVIDENCE block anywhere", () => {
    seedSubject();
    const saved = saveSnapshot("sentry:project:450");
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback 1.4.2",
      action: "Reverted deployment to 1.4.1",
      outcome: "Errors dropped",
    });
    expect(recorded.evidenceIds).toBeUndefined();
    expect(getResolution(dir, recorded.id).evidenceIds).toBeUndefined();
    expect(formatResolution(getResolution(dir, recorded.id))).not.toContain(
      "EVIDENCE",
    );
    const section = formatResolutionMemorySection(
      listResolutions(dir, { investigationId: saved.record.id }),
      "investigation",
    );
    expect(section).not.toContain("EVIDENCE");
  });

  test("record persists human-attached evidence ids and show + memory list them exactly", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc", "dpl_xyz"]);
    const saved = saveSnapshot(subject.id);
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback 1.4.2",
      action: "Reverted deployment to 1.4.1",
      evidenceIds: ["dpl_abc", "dpl_xyz"],
    });
    expect(recorded.evidenceIds).toEqual(["dpl_abc", "dpl_xyz"]);

    const fetched = getResolution(dir, recorded.id);
    expect(fetched.evidenceIds).toEqual(["dpl_abc", "dpl_xyz"]);
    expect(fetched.decision).toBe("Rollback 1.4.2");
    expect(fetched.action).toBe("Reverted deployment to 1.4.1");

    const shown = formatResolution(fetched);
    expect(shown.split("\n")).toContain("EVIDENCE");
    expect(shown.split("\n")).toContain("dpl_abc");
    expect(shown.split("\n")).toContain("dpl_xyz");
    expect(shown).toContain("Rollback 1.4.2");

    const section = formatResolutionMemorySection(
      listResolutions(dir, { investigationId: saved.record.id }),
      "investigation",
    );
    expect(section.split("\n")).toContain("EVIDENCE");
    expect(section.split("\n")).toContain("dpl_abc");
    expect(section.split("\n")).toContain("dpl_xyz");
    expect(section).toContain("Rollback 1.4.2");
    expect(section.split("\n")).not.toContain("RESOLUTION");
  });

  test("duplicate evidence ids collapse to unique first-seen order", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc", "dpl_xyz"]);
    const saved = saveSnapshot(subject.id);
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      evidenceIds: ["dpl_abc", "dpl_xyz", "dpl_abc"],
    });
    expect(recorded.evidenceIds).toEqual(["dpl_abc", "dpl_xyz"]);
    expect(getResolution(dir, recorded.id).evidenceIds).toEqual([
      "dpl_abc",
      "dpl_xyz",
    ]);
  });

  test("one-hop neighbor evidence already displayed on investigate is attachable", () => {
    const project = seedVercelSubject();
    const store = new Store(dir);
    store.init();
    const repository = createResource({
      provider: "github",
      providerResourceId: "1001",
      kind: "repository",
      name: "acme/api",
      metadata: {},
    });
    store.applyResource(repository, {
      id: "obs-gh",
      observedAt: "2026-08-16T00:00:00.000Z",
    });
    store.upsertRelationship(
      createRelationship({
        kind: "source_for",
        sourceResourceId: repository.id,
        targetResourceId: project.id,
        evidence: {
          source: "vercel",
          mechanism: "git_repository_reference",
          repository: "acme/api",
        },
      }),
    );
    store.upsertGitHubWorkflowRun({
      provider: "github",
      runId: 9001,
      resourceId: repository.id,
      repositoryId: "1001",
      workflowId: 1,
      name: "CI",
      runNumber: 12,
      runAttempt: 1,
      event: "push",
      status: "completed",
      conclusion: "success",
      headBranch: "main",
      headSha: "abc123def4567890abc123def4567890abc123de",
      createdAt: "2026-08-16T10:00:00.000Z",
      runStartedAt: null,
      updatedAt: null,
      observedAt: "2026-08-16T12:00:00.000Z",
    });
    store.close();

    const saved = saveSnapshot(project.id);
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Wait",
      evidenceIds: ["9001"],
    });
    expect(recorded.evidenceIds).toEqual(["9001"]);
  });

  test("Sentry release version and issue id attach for a Sentry subject", () => {
    const subject = seedSubject();
    const store = new Store(dir);
    store.init();
    store.upsertSentryRelease(release());
    store.upsertSentryIssue(issue());
    store.close();
    const saved = saveSnapshot(subject.id);
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Pin the release",
      evidenceIds: ["frontend@1.2.0", "5123"],
    });
    expect(recorded.evidenceIds).toEqual(["frontend@1.2.0", "5123"]);
  });

  test("unknown evidence id fails the whole record and inserts nothing", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const saved = saveSnapshot(subject.id);
    let message = "";
    expect(() => {
      try {
        recordResolution({
          baseDir: dir,
          investigationId: saved.record.id,
          decision: "Rollback",
          evidenceIds: ["dpl_zzz"],
        });
      } catch (error) {
        message = String(error);
        throw error;
      }
    }).toThrow(/Evidence id not found/i);
    expect(message).toMatch(/investigate/i);
    expect(
      listResolutions(dir, { investigationId: saved.record.id }),
    ).toEqual([]);
  });

  test("evidence retained for another resource is not attachable to this subject", () => {
    const subjectA = seedVercelSubject("prj_a");
    seedVercelSubject("prj_b");
    const store = new Store(dir);
    store.init();
    store.upsertVercelDeployment(
      deployment("dpl_a", "vercel:project:prj_a"),
    );
    store.upsertVercelDeployment(
      deployment("dpl_b", "vercel:project:prj_b"),
    );
    store.close();
    const saved = saveSnapshot(subjectA.id);
    expect(() =>
      recordResolution({
        baseDir: dir,
        investigationId: saved.record.id,
        decision: "Rollback",
        evidenceIds: ["dpl_b"],
      }),
    ).toThrow(/Evidence id not found/i);
    expect(
      listResolutions(dir, { investigationId: saved.record.id }),
    ).toEqual([]);
  });

  test("evidence-only record still fails RESOLUTION_FIELDS_REQUIRED", () => {
    seedSubject();
    const saved = saveSnapshot("sentry:project:450");
    expect(() =>
      recordResolution({
        baseDir: dir,
        investigationId: saved.record.id,
        evidenceIds: ["whatever"],
      }),
    ).toThrow(/at least one of --decision, --action, or --outcome/i);
    expect(
      listResolutions(dir, { investigationId: saved.record.id }),
    ).toEqual([]);
  });

  test("omitted evidence never attaches the newest retained evidence", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const saved = saveSnapshot(subject.id);
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
    });
    expect(recorded.evidenceIds).toBeUndefined();
    expect(getResolution(dir, recorded.id).evidenceIds).toBeUndefined();
  });

  test("recording evidence never rewrites the snapshot or its JSON", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const saved = saveSnapshot(subject.id);
    const frozenJson = serializeInvestigationSnapshot(saved.record.snapshot);
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback 1.4.2",
      evidenceIds: ["dpl_abc"],
    });
    expect(recorded.evidenceIds).toEqual(["dpl_abc"]);
    const show = formatResolution(recorded);
    expect(show).toContain("EVIDENCE");
    expect(show).toContain("dpl_abc");
    expect(
      serializeInvestigationSnapshot(
        getSavedInvestigation(dir, saved.record.id).snapshot,
      ),
    ).toBe(frozenJson);
    const store = new Store(dir);
    store.init();
    const snapshotJson =
      store.getInvestigationRow(saved.record.id)?.snapshotJson ?? "";
    store.close();
    expect(snapshotJson).toBe(frozenJson);
    expect(snapshotJson).not.toContain("EVIDENCE");
  });

  test("resolutions list omits evidence ids", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const saved = saveSnapshot(subject.id);
    recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      evidenceIds: ["dpl_abc"],
    });
    const list = formatResolutionList(
      listResolutions(dir, { investigationId: saved.record.id }),
    );
    expect(list).toContain(saved.record.id);
    expect(list).not.toContain("EVIDENCE");
    expect(list).not.toContain("dpl_abc");
  });

  test("pre-054 resolutions table without evidence column lists empty until write init upgrades", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const saved = saveSnapshot(subject.id);
    const prior = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
    });

    const db = new Database(dbPath(dir));
    db.exec(`ALTER TABLE resolutions DROP COLUMN evidence_ids`);
    db.close();

    expect(getResolution(dir, prior.id).evidenceIds).toBeUndefined();
    expect(formatResolution(getResolution(dir, prior.id))).not.toContain(
      "EVIDENCE",
    );

    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback 1.4.2",
      evidenceIds: ["dpl_abc"],
    });
    expect(recorded.evidenceIds).toEqual(["dpl_abc"]);
    const probe = new Database(dbPath(dir));
    const columns = probe
      .query(`PRAGMA table_info(resolutions)`)
      .all() as Array<{ name: string }>;
    probe.close();
    expect(columns.some((c) => c.name === "evidence_ids")).toBe(true);
  });

  test("corrupt stored evidence JSON is untrusted and omitted without crashing recall", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const saved = saveSnapshot(subject.id);
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback 1.4.2",
      evidenceIds: ["dpl_abc"],
    });
    const db = new Database(dbPath(dir));
    db.query(`UPDATE resolutions SET evidence_ids = ? WHERE id = ?`).run(
      `{"not": "json"`,
      recorded.id,
    );
    db.close();

    const fetched = getResolution(dir, recorded.id);
    expect(fetched.evidenceIds).toBeUndefined();
    expect(fetched.decision).toBe("Rollback 1.4.2");
    expect(formatResolution(fetched)).not.toContain("EVIDENCE");
    expect(formatResolution(fetched)).not.toContain("dpl_abc");
    const section = formatResolutionMemorySection(
      listResolutions(dir, { investigationId: saved.record.id }),
      "investigation",
    );
    expect(section).not.toContain("EVIDENCE");
    expect(section).not.toContain("dpl_abc");
    expect(section).toContain("Rollback 1.4.2");
  });
});

describe("exact evidence id retrieval (Sprint 055)", () => {
  test("lists only rows whose stored evidence ids include that exact id", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc", "dpl_xyz"]);
    const invA = saveSnapshot(subject.id, "2026-08-16T10:00:00.000Z");
    const invB = saveSnapshot(subject.id, "2026-08-16T11:00:00.000Z");
    const resA = recordResolution({
      baseDir: dir,
      investigationId: invA.record.id,
      decision: "Rollback",
      evidenceIds: ["dpl_abc"],
      recordedAt: "2026-08-16T12:00:00.000Z",
    });
    const resB = recordResolution({
      baseDir: dir,
      investigationId: invB.record.id,
      decision: "Wait",
      evidenceIds: ["dpl_xyz"],
      recordedAt: "2026-08-16T13:00:00.000Z",
    });

    expect(
      listResolutions(dir, { evidenceId: "dpl_abc" }).map((r) => r.id),
    ).toEqual([resA.id]);
    expect(
      listResolutions(dir, { evidenceId: "dpl_xyz" }).map((r) => r.id),
    ).toEqual([resB.id]);
  });

  test("substring or prefix does not match", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const saved = saveSnapshot(subject.id);
    recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      evidenceIds: ["dpl_abc"],
    });
    expect(listResolutions(dir, { evidenceId: "dpl_ab" })).toEqual([]);
    expect(listResolutions(dir, { evidenceId: "dpl" })).toEqual([]);
    expect(listResolutions(dir, { evidenceId: "abc" })).toEqual([]);
    expect(listResolutions(dir, { evidenceId: "dpl_abc " })).toEqual([]);
  });

  test("duplicate ids on the record still match once", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const saved = saveSnapshot(subject.id);
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      evidenceIds: ["dpl_abc", "dpl_abc"],
    });
    expect(recorded.evidenceIds).toEqual(["dpl_abc"]);
    expect(
      listResolutions(dir, { evidenceId: "dpl_abc" }).map((r) => r.id),
    ).toEqual([recorded.id]);
  });

  test("zero matches is known-empty for that evidence id with distinct copy", () => {
    seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const saved = saveSnapshot("vercel:project:prj_demo");
    recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      evidenceIds: ["dpl_abc"],
    });

    const records = listResolutions(dir, { evidenceId: "dpl_nope" });
    expect(records).toEqual([]);
    const empty = formatResolutionList(records, { evidenceId: "dpl_nope" });
    expect(empty).toContain("No resolutions recorded for evidence dpl_nope.");
    expect(empty).not.toContain("No resolutions recorded yet.");
    const investigationEmpty = formatResolutionList([], {
      investigationId: "inv:x",
    });
    const subjectEmpty = formatResolutionList([], {
      subjectResourceId: "sentry:project:450",
    });
    expect(empty).not.toBe(investigationEmpty);
    expect(empty).not.toBe(subjectEmpty);
  });

  test("AND with investigation returns the intersection", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const invA = saveSnapshot(subject.id, "2026-08-16T10:00:00.000Z");
    const invB = saveSnapshot(subject.id, "2026-08-16T11:00:00.000Z");
    const resA = recordResolution({
      baseDir: dir,
      investigationId: invA.record.id,
      decision: "A",
      evidenceIds: ["dpl_abc"],
      recordedAt: "2026-08-16T12:00:00.000Z",
    });
    const resB = recordResolution({
      baseDir: dir,
      investigationId: invB.record.id,
      decision: "B",
      evidenceIds: ["dpl_abc"],
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    expect(
      listResolutions(dir, {
        investigationId: invB.record.id,
        evidenceId: "dpl_abc",
      }).map((r) => r.id),
    ).toEqual([resB.id]);
    expect(
      listResolutions(dir, {
        investigationId: invA.record.id,
        evidenceId: "dpl_abc",
      }).map((r) => r.id),
    ).toEqual([resA.id]);
  });

  test("AND with subject returns the intersection", () => {
    const subjectA = seedVercelSubject("prj_a");
    const subjectB = seedVercelSubject("prj_b");
    const store = new Store(dir);
    store.init();
    store.upsertVercelDeployment(
      deployment("dpl_abc", "vercel:project:prj_a"),
    );
    store.upsertVercelDeployment(
      deployment("dpl_xyz", "vercel:project:prj_b"),
    );
    store.close();
    const invA = saveSnapshot(subjectA.id, "2026-08-16T10:00:00.000Z");
    const invB = saveSnapshot(subjectB.id, "2026-08-16T11:00:00.000Z");
    const resA = recordResolution({
      baseDir: dir,
      investigationId: invA.record.id,
      decision: "A",
      evidenceIds: ["dpl_abc"],
      recordedAt: "2026-08-16T12:00:00.000Z",
    });
    const resB = recordResolution({
      baseDir: dir,
      investigationId: invB.record.id,
      decision: "B",
      evidenceIds: ["dpl_xyz"],
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const db = new Database(dbPath(dir));
    db.query(`UPDATE resolutions SET evidence_ids = ? WHERE id = ?`).run(
      JSON.stringify(["dpl_abc"]),
      resB.id,
    );
    db.close();

    expect(
      listResolutions(dir, {
        subjectResourceId: subjectA.id,
        evidenceId: "dpl_abc",
      }).map((r) => r.id),
    ).toEqual([resA.id]);
    expect(
      listResolutions(dir, { evidenceId: "dpl_abc" }).map((r) => r.id).sort(),
    ).toEqual([resA.id, resB.id].sort());
  });

  test("subject Resource deleted: matching rows still list", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const saved = saveSnapshot(subject.id);
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      evidenceIds: ["dpl_abc"],
    });

    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resources WHERE id = '${subject.id}'`);
    db.close();

    const listed = listResolutions(dir, { evidenceId: "dpl_abc" });
    expect(listed.map((r) => r.id)).toEqual([recorded.id]);
  });

  test("named id no longer in live compose still lists; never revalidates or EVIDENCE_ID_NOT_FOUND", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const saved = saveSnapshot(subject.id);
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      evidenceIds: ["dpl_abc"],
    });

    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM vercel_deployments`);
    db.close();

    const listed = listResolutions(dir, { evidenceId: "dpl_abc" });
    expect(listed.map((r) => r.id)).toEqual([recorded.id]);

    const unknown = listResolutions(dir, { evidenceId: "dpl_zzz" });
    expect(unknown).toEqual([]);
    const empty = formatResolutionList(unknown, { evidenceId: "dpl_zzz" });
    expect(empty).toContain("No resolutions recorded for evidence dpl_zzz.");
    expect(empty).not.toContain("EVIDENCE_ID_NOT_FOUND");
  });

  test("pre-054 missing column: filter is empty-for-that-id, no crash, unfiltered lists rows", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const saved = saveSnapshot(subject.id);
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      evidenceIds: ["dpl_abc"],
    });

    const db = new Database(dbPath(dir));
    db.exec(`ALTER TABLE resolutions DROP COLUMN evidence_ids`);
    db.close();

    expect(listResolutions(dir, { evidenceId: "dpl_abc" })).toEqual([]);
    expect(
      listResolutions(dir).map((r) => r.id),
    ).toEqual([recorded.id]);
  });

  test("corrupt stored JSON is not a match and never invents ids in the list", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const saved = saveSnapshot(subject.id);
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback 1.4.2",
      evidenceIds: ["dpl_abc"],
    });
    const db = new Database(dbPath(dir));
    db.query(`UPDATE resolutions SET evidence_ids = ? WHERE id = ?`).run(
      `{"not": "json"`,
      recorded.id,
    );
    db.close();

    expect(listResolutions(dir, { evidenceId: "dpl_abc" })).toEqual([]);
    const list = formatResolutionList(listResolutions(dir));
    expect(list).toContain(recorded.id);
    expect(list).not.toContain("EVIDENCE");
    expect(list).not.toContain("dpl_abc");
  });

  test("filtered list keeps 051 order: recordedAt DESC, id DESC", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const saved = saveSnapshot(subject.id);
    const early = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "early",
      evidenceIds: ["dpl_abc"],
      recordedAt: "2026-08-16T12:00:00.000Z",
    });
    const late = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "late",
      evidenceIds: ["dpl_abc"],
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    const middle = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "middle",
      evidenceIds: ["dpl_abc"],
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    expect(
      listResolutions(dir, { evidenceId: "dpl_abc" }).map((r) => r.id),
    ).toEqual([late.id, middle.id, early.id]);
  });

  test("snapshot JSON is unchanged when listing by evidence", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const saved = saveSnapshot(subject.id);
    recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      evidenceIds: ["dpl_abc"],
    });
    const store = new Store(dir);
    store.init();
    const before = store.getInvestigationRow(saved.record.id)!.snapshotJson;
    store.close();

    expect(listResolutions(dir, { evidenceId: "dpl_abc" })).toHaveLength(1);

    const after = new Store(dir);
    after.init();
    expect(after.getInvestigationRow(saved.record.id)!.snapshotJson).toBe(
      before,
    );
    after.close();
  });

  test("filtered list output omits evidence essays", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const saved = saveSnapshot(subject.id);
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      evidenceIds: ["dpl_abc"],
    });
    const list = formatResolutionList(
      listResolutions(dir, { evidenceId: "dpl_abc" }),
      { evidenceId: "dpl_abc" },
    );
    expect(list).toContain(recorded.id);
    expect(list).not.toContain("EVIDENCE");
    expect(list).not.toContain("dpl_abc");
    expect(list).toContain("ID");
    expect(list).toContain("INVESTIGATION");
    expect(list).toContain("SUBJECT");
    expect(list).toContain("RECORDED AT");
  });
});

describe("resource-anchored resolution (Sprint 057)", () => {
  test("records against an exact Resource without a saved Investigation", () => {
    const subject = seedSubject();
    const store = new Store(dir);
    store.init();
    const invCount = store.listInvestigationSummaries().length;
    store.close();

    const recorded = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Rollback 1.4.2",
      action: "Reverted deployment",
      outcome: "Errors returned to baseline",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });

    expect(recorded.id.startsWith("res:")).toBe(true);
    expect(recorded.investigationId).toBeUndefined();
    expect(recorded.subjectResourceId).toBe(subject.id);
    expect(recorded.decision).toBe("Rollback 1.4.2");
    expect(recorded.action).toBe("Reverted deployment");
    expect(recorded.outcome).toBe("Errors returned to baseline");

    const after = new Store(dir);
    after.init();
    expect(after.listInvestigationSummaries()).toHaveLength(invCount);
    after.close();

    expect(listResolutions(dir, { subjectResourceId: subject.id }).map((r) => r.id)).toEqual(
      [recorded.id],
    );
    expect(listResolutions(dir, { investigationId: "inv:any" })).toEqual([]);
    const listed = formatResolutionList(listResolutions(dir));
    expect(listed).toContain(recorded.id);
    expect(listed).toContain("-");
    expect(listed).not.toContain("inv:none");
    expect(listed).not.toMatch(/inv:[a-f0-9-]+/);
  });

  test("051 investigation path still copies investigationId", () => {
    const subject = seedSubject();
    const saved = saveSnapshot(subject.id);
    const recorded = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Keep the Investigation path",
    });
    expect(recorded.investigationId).toBe(saved.record.id);
    expect(recorded.subjectResourceId).toBe(subject.id);
  });

  test("still requires at least one of decision, action, or outcome", () => {
    const subject = seedSubject();
    expect(() =>
      recordResolution({
        baseDir: dir,
        subjectResourceId: subject.id,
      }),
    ).toThrow(/At least one of --decision, --action, or --outcome/);
  });

  test("both anchors on one record fail without inserting", () => {
    const subject = seedSubject();
    const saved = saveSnapshot(subject.id);
    expect(() =>
      recordResolution({
        baseDir: dir,
        investigationId: saved.record.id,
        subjectResourceId: subject.id,
        decision: "Both",
      }),
    ).toThrow(/--investigation.*--resource|--resource.*--investigation/);
    expect(listResolutions(dir)).toEqual([]);
  });

  test("unknown Resource fails as RESOURCE_NOT_FOUND without inserting", () => {
    expect(() =>
      recordResolution({
        baseDir: dir,
        subjectResourceId: "sentry:project:missing",
        decision: "Rollback",
      }),
    ).toThrow(/Resource not found/);
    expect(listResolutions(dir)).toEqual([]);
  });

  test("attaches --evidence validated against live investigate of that Resource", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const recorded = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Rollback",
      evidenceIds: ["dpl_abc"],
    });
    expect(recorded.investigationId).toBeUndefined();
    expect(recorded.evidenceIds).toEqual(["dpl_abc"]);
    expect(listResolutions(dir, { evidenceId: "dpl_abc" }).map((r) => r.id)).toEqual(
      [recorded.id],
    );
  });

  test("unknown evidence id fails the whole record", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    expect(() =>
      recordResolution({
        baseDir: dir,
        subjectResourceId: subject.id,
        decision: "Rollback",
        evidenceIds: ["dpl_xyz"],
      }),
    ).toThrow(/Evidence id not found/);
    expect(listResolutions(dir)).toEqual([]);
  });

  test("omitted evidence never attaches newest activity", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_newest"]);
    const recorded = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Watch",
    });
    expect(recorded.evidenceIds).toBeUndefined();
    expect(formatResolution(recorded)).not.toContain("EVIDENCE");
    expect(formatResolution(recorded)).not.toContain("dpl_newest");
  });

  test("show omits INVESTIGATION line and confirmation omits investigation line", () => {
    const subject = seedSubject();
    const recorded = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Rollback",
    });
    const shown = formatResolution(recorded);
    expect(shown).toContain("RESOLUTION");
    expect(shown).toContain(`SUBJECT: ${subject.id}`);
    expect(shown).not.toContain("INVESTIGATION:");
    expect(shown).not.toMatch(/incident/i);
    const confirm = formatRecordConfirmation(recorded);
    expect(confirm).toContain(`Recorded resolution ${recorded.id}`);
    expect(confirm).toContain(`subject ${subject.id}`);
    expect(confirm).not.toContain("investigation ");
  });

  test("live investigate memory includes the row without an inv: token; reopen does not", () => {
    const subject = seedSubject();
    const saved = saveSnapshot(subject.id);
    const anchored = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Investigation-anchored",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const resourceOnly = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Resource-anchored",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });

    const subjectSection = formatResolutionMemorySection(
      listResolutions(dir, { subjectResourceId: subject.id }),
      "subject",
    );
    expect(subjectSection).toContain(resourceOnly.id);
    expect(subjectSection).toContain(anchored.id);
    const resourceLine = subjectSection
      .split("\n")
      .find((line) => line.startsWith(resourceOnly.id));
    expect(resourceLine).toBeDefined();
    expect(resourceLine).not.toContain("inv:");
    expect(resourceLine).toContain(resourceOnly.recordedAt);

    const invSection = formatResolutionMemorySection(
      listResolutions(dir, { investigationId: saved.record.id }),
      "investigation",
    );
    expect(invSection).toContain(anchored.id);
    expect(invSection).not.toContain(resourceOnly.id);

    const frozenJson = serializeInvestigationSnapshot(saved.record.snapshot);
    expect(
      serializeInvestigationSnapshot(
        getSavedInvestigation(dir, saved.record.id).snapshot,
      ),
    ).toBe(frozenJson);
  });

  test("subject Resource deletion still lists the row", () => {
    const subject = seedSubject();
    const recorded = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Rollback",
    });
    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resources WHERE id = '${subject.id}'`);
    db.close();
    const listed = listResolutions(dir, { subjectResourceId: subject.id });
    expect(listed.map((r) => r.id)).toEqual([recorded.id]);
    expect(() =>
      getInvestigationContext({ baseDir: dir, resourceRef: subject.id }),
    ).toThrow(/Resource not found/);
  });

  test("pre-057 NOT NULL investigation_id upgrades on init and keeps 051 rows", () => {
    const subject = seedSubject();
    const saved = saveSnapshot(subject.id);
    const prior = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Keep me",
    });

    const db = new Database(dbPath(dir));
    db.exec(`DROP TABLE resolutions`);
    db.exec(`
      CREATE TABLE resolutions (
        id TEXT PRIMARY KEY,
        investigation_id TEXT NOT NULL,
        subject_resource_id TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        decision TEXT,
        action TEXT,
        outcome TEXT,
        evidence_ids TEXT
      )
    `);
    db.query(
      `INSERT INTO resolutions (
         id, investigation_id, subject_resource_id, recorded_at, decision
       ) VALUES (?, ?, ?, ?, ?)`,
    ).run(
      prior.id,
      prior.investigationId!,
      prior.subjectResourceId,
      prior.recordedAt,
      prior.decision!,
    );
    db.close();

    const recorded = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Resource-anchored after upgrade",
    });
    expect(recorded.investigationId).toBeUndefined();
    expect(getResolution(dir, prior.id).investigationId).toBe(
      saved.record.id,
    );
    expect(getResolution(dir, prior.id).decision).toBe("Keep me");
    const probe = new Database(dbPath(dir));
    const info = probe
      .query(`PRAGMA table_info(resolutions)`)
      .all() as Array<{ name: string; notnull: number }>;
    probe.close();
    const investigationCol = info.find((c) => c.name === "investigation_id");
    expect(investigationCol?.notnull).toBe(0);
  });
});

describe("incident-anchored resolution (Sprint 061)", () => {
  function expectCode(fn: () => unknown, code: string): CombieError {
    try {
      fn();
    } catch (error) {
      expect(error).toBeInstanceOf(CombieError);
      expect((error as CombieError).code).toBe(code);
      return error as CombieError;
    }
    throw new Error(`expected ${code} to be thrown`);
  }

  function seedIncident(
    members: Array<{ id: string; subject: ReturnType<typeof createResource> }>,
    title?: string,
  ) {
    for (const member of members) {
      const store = new Store(dir);
      store.init();
      store.insertResolution({
        id: member.id,
        subjectResourceId: member.subject.id,
        recordedAt: "2026-08-16T12:00:00.000Z",
        decision: `Response ${member.id}`,
      });
      store.close();
    }
    return recordIncident({
      baseDir: dir,
      resolutionIds: members.map((m) => m.id),
      recordedAt: "2026-08-17T09:00:00.000Z",
      ...(title ? { title } : {}),
    });
  }

  test("records against an exact Incident, copying the shared member subject", () => {
    const subject = seedSubject();
    const incident = seedIncident(
      [
        { id: "res:a", subject },
        { id: "res:b", subject },
      ],
      "API error spike",
    );
    const recorded = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      decision: "Keep holding",
      action: "Held deploys",
      outcome: "Spike passed",
      recordedAt: "2026-08-18T10:00:00.000Z",
    });
    expect(recorded.id.startsWith("res:")).toBe(true);
    expect(recorded.investigationId).toBeUndefined();
    expect(recorded.subjectResourceId).toBe(subject.id);
    expect(recorded.decision).toBe("Keep holding");
    expect(recorded.action).toBe("Held deploys");
    expect(recorded.outcome).toBe("Spike passed");

    const stored = getResolution(dir, recorded.id);
    expect(stored.investigationId).toBeUndefined();
    expect(stored).not.toHaveProperty("incidentId");

    const store = new Store(dir);
    store.init();
    const row = store.getIncidentRow(incident.id)!;
    store.close();
    expect(row.resolutionIds).toEqual(["res:a", "res:b", recorded.id]);
    expect(row.recordedAt).toBe("2026-08-17T09:00:00.000Z");
    expect(row.title).toBe("API error spike");
    const probe = new Database(dbPath(dir));
    const columns = probe
      .query(`PRAGMA table_info(resolutions)`)
      .all() as Array<{ name: string }>;
    probe.close();
    expect(columns.map((c) => c.name)).not.toContain("incident_id");

    expect(
      listResolutions(dir, { subjectResourceId: subject.id }).map((r) => r.id),
    ).toContain(recorded.id);
    expect(
      listResolutions(dir, { subjectResourceId: subject.id }),
    ).toHaveLength(3);
    expect(listResolutions(dir, { investigationId: "inv:any" })).toEqual([]);
  });

  test("confirmation names the inc:; show has no INCIDENT heading", () => {
    const subject = seedSubject();
    const incident = seedIncident([
      { id: "res:a", subject },
      { id: "res:b", subject },
    ]);
    const recorded = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      decision: "Keep holding",
    });
    const confirm = formatRecordConfirmation(recorded, incident.id);
    expect(confirm).toContain(`Recorded resolution ${recorded.id}`);
    expect(confirm).toContain(`incident ${incident.id}`);
    expect(confirm).toContain(`subject ${subject.id}`);
    expect(confirm).not.toContain("investigation ");
    const shown = formatResolution(recorded);
    expect(shown).toContain(`SUBJECT: ${subject.id}`);
    expect(shown).not.toMatch(/INCIDENT|incident/i);
    expect(shown).not.toContain("INVESTIGATION:");
  });

  test("--incident with --investigation fails XOR; nothing inserted", () => {
    const subject = seedSubject();
    const incident = seedIncident([
      { id: "res:a", subject },
      { id: "res:b", subject },
    ]);
    const saved = saveSnapshot(subject.id);
    const error = expectCode(
      () =>
        recordResolution({
          baseDir: dir,
          incidentId: incident.id,
          investigationId: saved.record.id,
          decision: "Both",
        }),
      "RESOLUTION_ANCHOR_CONFLICT",
    );
    expect(error.message).toMatch(/--incident/);
    expect(listResolutions(dir).map((r) => r.id).sort()).toEqual(["res:a", "res:b"]);
  });

  test("no write identity mentions all three usages", () => {
    const error = expectCode(
      () =>
        recordResolution({
          baseDir: dir,
          decision: "Rollback",
        }),
      "RESOLUTION_ANCHOR_REQUIRED",
    );
    expect(error.message).toContain("--incident");
    expect(error.message).toContain("--resource");
    expect(error.message).toContain("--investigation");
  });

  test("unknown inc: is INCIDENT_NOT_FOUND; nothing inserted", () => {
    const error = expectCode(
      () =>
        recordResolution({
          baseDir: dir,
          incidentId: "inc:missing",
          decision: "Rollback",
        }),
      "INCIDENT_NOT_FOUND",
    );
    expect(error.message).toContain("inc:missing");
    expect(listResolutions(dir)).toEqual([]);
  });

  test("cross-subject members fail INCIDENT_SUBJECT_AMBIGUOUS without inventing a subject", () => {
    const subjectA = seedSubject("460");
    const subjectB = seedSubject("461");
    const incident = seedIncident([
      { id: "res:a", subject: subjectA },
      { id: "res:b", subject: subjectB },
    ]);
    const error = expectCode(
      () =>
        recordResolution({
          baseDir: dir,
          incidentId: incident.id,
          decision: "Rollback",
        }),
      "INCIDENT_SUBJECT_AMBIGUOUS",
    );
    expect(error.message).toContain(incident.id);
    expect(listResolutions(dir).map((r) => r.id).sort()).toEqual(["res:a", "res:b"]);
    const store = new Store(dir);
    store.init();
    expect(store.getIncidentRow(incident.id)!.resolutionIds).toEqual([
      "res:a",
      "res:b",
    ]);
    store.close();
  });

  test("missing member rows are skipped for homogeneity; remaining members still load", () => {
    const subjectA = seedSubject("462");
    const subjectB = seedSubject("463");
    const incident = seedIncident([
      { id: "res:a", subject: subjectA },
      { id: "res:b", subject: subjectB },
      { id: "res:c", subject: subjectA },
    ]);
    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resolutions WHERE id = 'res:b'`);
    db.close();
    const recorded = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      decision: "Same subject still loads",
    });
    expect(recorded.subjectResourceId).toBe(subjectA.id);
  });

  test("zero loadable members fail INCIDENT_MEMBERS_UNRESOLVED; nothing inserted", () => {
    const subject = seedSubject();
    const incident = seedIncident([
      { id: "res:a", subject },
      { id: "res:b", subject },
    ]);
    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resolutions WHERE id IN ('res:a', 'res:b')`);
    db.close();
    const error = expectCode(
      () =>
        recordResolution({
          baseDir: dir,
          incidentId: incident.id,
          decision: "Rollback",
        }),
      "INCIDENT_MEMBERS_UNRESOLVED",
    );
    expect(error.message).toContain(incident.id);
    expect(listResolutions(dir)).toEqual([]);
  });

  test("copied subject Resource deleted is RESOURCE_NOT_FOUND; nothing inserted", () => {
    const subject = seedSubject();
    const incident = seedIncident([
      { id: "res:a", subject },
      { id: "res:b", subject },
    ]);
    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resources WHERE id = '${subject.id}'`);
    db.close();
    const error = expectCode(
      () =>
        recordResolution({
          baseDir: dir,
          incidentId: incident.id,
          decision: "Rollback",
        }),
      "RESOURCE_NOT_FOUND",
    );
    expect(error.message).toContain(subject.id);
    expect(listResolutions(dir).map((r) => r.id).sort()).toEqual([
      "res:a",
      "res:b",
    ]);
  });

  test("--evidence validates against the copied subject's live compose", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const incident = seedIncident([
      { id: "res:a", subject },
      { id: "res:b", subject },
    ]);
    const recorded = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      decision: "Rollback",
      evidenceIds: ["dpl_abc"],
    });
    expect(recorded.evidenceIds).toEqual(["dpl_abc"]);
    expect(
      listResolutions(dir, { evidenceId: "dpl_abc" }).map((r) => r.id),
    ).toEqual([recorded.id]);
  });

  test("unknown --evidence fails the whole record; member array unchanged", () => {
    const subject = seedVercelSubject();
    seedVercelEvidence(["dpl_abc"]);
    const incident = seedIncident([
      { id: "res:a", subject },
      { id: "res:b", subject },
    ]);
    expect(() =>
      recordResolution({
        baseDir: dir,
        incidentId: incident.id,
        decision: "Rollback",
        evidenceIds: ["dpl_xyz"],
      }),
    ).toThrow(/Evidence id not found/);
    expect(listResolutions(dir).map((r) => r.id).sort()).toEqual(["res:a", "res:b"]);
    const store = new Store(dir);
    store.init();
    expect(store.getIncidentRow(incident.id)!.resolutionIds).toEqual([
      "res:a",
      "res:b",
    ]);
    store.close();
  });

  test("fields-required still applies on the incident path", () => {
    const subject = seedSubject();
    const incident = seedIncident([
      { id: "res:a", subject },
      { id: "res:b", subject },
    ]);
    const error = expectCode(
      () =>
        recordResolution({
          baseDir: dir,
          incidentId: incident.id,
        }),
      "RESOLUTION_FIELDS_REQUIRED",
    );
    expect(error.message).toContain("--incident");
  });

  test("incident-anchored record does not rewrite snapshot JSON", () => {
    const subject = seedSubject();
    const saved = saveSnapshot(subject.id);
    const frozenJson = serializeInvestigationSnapshot(saved.record.snapshot);
    const incident = seedIncident([
      { id: "res:a", subject },
      { id: "res:b", subject },
    ]);
    const recorded = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      decision: "Keep holding",
    });
    expect(
      serializeInvestigationSnapshot(
        getSavedInvestigation(dir, saved.record.id).snapshot,
      ),
    ).toBe(frozenJson);
    expect(frozenJson).not.toContain(recorded.id);
    expect(frozenJson).not.toContain("INCIDENT MEMORY");
  });

  test("live investigate RESOLUTION MEMORY includes the row; investigation reopen does not", () => {
    const subject = seedSubject();
    const saved = saveSnapshot(subject.id);
    const incident = seedIncident([
      { id: "res:a", subject },
      { id: "res:b", subject },
    ]);
    const recorded = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      decision: "Keep holding",
    });
    const live = formatWithResolutionMemory(
      formatInvestigationContext(
        getInvestigationContext({ baseDir: dir, resourceRef: subject.id }),
      ),
      listResolutions(dir, { subjectResourceId: subject.id }),
      "subject",
    );
    expect(live).toContain("RESOLUTION MEMORY");
    expect(live).toContain(recorded.id);
    expect(live).toContain("Keep holding");
    const reopen = formatWithResolutionMemory(
      formatSavedInvestigation(getSavedInvestigation(dir, saved.record.id)),
      listResolutions(dir, { investigationId: saved.record.id }),
      "investigation",
    );
    expect(reopen).not.toContain(recorded.id);
    expect(reopen).not.toContain("Keep holding");
  });

  test("051/057 paths unchanged when --incident is absent", () => {
    const subject = seedSubject();
    const saved = saveSnapshot(subject.id);
    const viaInvestigation = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Investigation path",
    });
    expect(viaInvestigation.investigationId).toBe(saved.record.id);
    const viaResource = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Resource path",
    });
    expect(viaResource.investigationId).toBeUndefined();
    expect(viaResource.subjectResourceId).toBe(subject.id);
    expect(listResolutions(dir)).toHaveLength(2);
  });
});

describe("incident-anchored resolution on mixed subjects (Sprint 064)", () => {
  function expectCode(fn: () => unknown, code: string): CombieError {
    try {
      fn();
    } catch (error) {
      expect(error).toBeInstanceOf(CombieError);
      expect((error as CombieError).code).toBe(code);
      return error as CombieError;
    }
    throw new Error(`expected ${code} to be thrown`);
  }

  function seedIncident(
    members: Array<{ id: string; subject: ReturnType<typeof createResource> }>,
    title?: string,
  ) {
    for (const member of members) {
      const store = new Store(dir);
      store.init();
      store.insertResolution({
        id: member.id,
        subjectResourceId: member.subject.id,
        recordedAt: "2026-08-16T12:00:00.000Z",
        decision: `Response ${member.id}`,
      });
      store.close();
    }
    return recordIncident({
      baseDir: dir,
      resolutionIds: members.map((m) => m.id),
      recordedAt: "2026-08-17T09:00:00.000Z",
      ...(title ? { title } : {}),
    });
  }

  test("--incident --resource on a mixed grouping inserts and appends the named subject", () => {
    const subjectA = seedSubject("640");
    const subjectB = seedSubject("641");
    const incident = seedIncident(
      [
        { id: "res:a", subject: subjectA },
        { id: "res:b", subject: subjectB },
      ],
      "Cross spike",
    );
    const recorded = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      subjectResourceId: subjectA.id,
      decision: "Keep holding",
      action: "Held deploys",
      outcome: "Spike passed",
      recordedAt: "2026-08-18T16:00:00.000Z",
    });
    expect(recorded.investigationId).toBeUndefined();
    expect(recorded.subjectResourceId).toBe(subjectA.id);
    expect(recorded.decision).toBe("Keep holding");
    expect(getIncident(dir, incident.id).resolutionIds).toEqual([
      "res:a",
      "res:b",
      recorded.id,
    ]);
    const confirm = formatRecordConfirmation(recorded, incident.id);
    expect(confirm).toContain(`incident ${incident.id}`);
    expect(confirm).toContain(`subject ${subjectA.id}`);
    expect(confirm).not.toContain("investigation ");
    const shown = formatResolution(recorded);
    expect(shown).toContain(`SUBJECT: ${subjectA.id}`);
    expect(shown).not.toMatch(/INCIDENT|incident/i);
    expect(shown).not.toContain("INVESTIGATION:");
    const store = new Store(dir);
    store.init();
    expect(store.getResolutionRow(recorded.id)).not.toHaveProperty("incidentId");
    store.close();
  });

  test("named Resource that is not a loadable member subject fails; nothing inserted", () => {
    const subjectA = seedSubject("642");
    const subjectB = seedSubject("643");
    const other = seedSubject("644");
    const incident = seedIncident([
      { id: "res:a", subject: subjectA },
      { id: "res:b", subject: subjectB },
    ]);
    const error = expectCode(
      () =>
        recordResolution({
          baseDir: dir,
          incidentId: incident.id,
          subjectResourceId: other.id,
          decision: "Keep holding",
        }),
      "INCIDENT_SUBJECT_NOT_MEMBER",
    );
    expect(error.message).toContain(incident.id);
    expect(error.message).toContain(other.id);
    expect(listResolutions(dir).map((r) => r.id).sort()).toEqual(["res:a", "res:b"]);
    expect(getIncident(dir, incident.id).resolutionIds).toEqual(["res:a", "res:b"]);
  });

  test("mixed --incident without --resource still INCIDENT_SUBJECT_AMBIGUOUS", () => {
    const subjectA = seedSubject("645");
    const subjectB = seedSubject("646");
    const incident = seedIncident([
      { id: "res:a", subject: subjectA },
      { id: "res:b", subject: subjectB },
    ]);
    const error = expectCode(
      () =>
        recordResolution({
          baseDir: dir,
          incidentId: incident.id,
          decision: "Keep holding",
        }),
      "INCIDENT_SUBJECT_AMBIGUOUS",
    );
    expect(error.message).toContain(incident.id);
    expect(listResolutions(dir).map((r) => r.id).sort()).toEqual(["res:a", "res:b"]);
  });

  test("homogeneous --incident without --resource still copies the shared subject", () => {
    const subject = seedSubject("647");
    const incident = seedIncident([
      { id: "res:a", subject },
      { id: "res:b", subject },
    ]);
    const recorded = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      decision: "Keep holding",
    });
    expect(recorded.subjectResourceId).toBe(subject.id);
  });

  test("homogeneous --incident --resource matching the shared subject succeeds; mismatch fails", () => {
    const subject = seedSubject("648");
    const other = seedSubject("649");
    const incident = seedIncident([
      { id: "res:a", subject },
      { id: "res:b", subject },
    ]);
    const recorded = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      subjectResourceId: subject.id,
      decision: "Named same subject",
    });
    expect(recorded.subjectResourceId).toBe(subject.id);
    expect(getIncident(dir, incident.id).resolutionIds).toContain(recorded.id);
    const error = expectCode(
      () =>
        recordResolution({
          baseDir: dir,
          incidentId: incident.id,
          subjectResourceId: other.id,
          decision: "Wrong subject",
        }),
      "INCIDENT_SUBJECT_NOT_MEMBER",
    );
    expect(error.message).toContain(other.id);
    expect(
      listResolutions(dir).filter((r) => r.decision === "Wrong subject"),
    ).toEqual([]);
  });

  test("--incident with --investigation still XOR; nothing inserted", () => {
    const subjectA = seedSubject("650");
    const subjectB = seedSubject("651");
    const incident = seedIncident([
      { id: "res:a", subject: subjectA },
      { id: "res:b", subject: subjectB },
    ]);
    const error = expectCode(
      () =>
        recordResolution({
          baseDir: dir,
          incidentId: incident.id,
          investigationId: "inv:missing",
          decision: "Both",
        }),
      "RESOLUTION_ANCHOR_CONFLICT",
    );
    expect(error.message).toMatch(/--incident/);
    expect(listResolutions(dir).map((r) => r.id).sort()).toEqual(["res:a", "res:b"]);
  });

  test("unknown Resource with --incident is RESOURCE_NOT_FOUND; unknown inc: is INCIDENT_NOT_FOUND", () => {
    const subjectA = seedSubject("652");
    const subjectB = seedSubject("653");
    const incident = seedIncident([
      { id: "res:a", subject: subjectA },
      { id: "res:b", subject: subjectB },
    ]);
    const missingResource = expectCode(
      () =>
        recordResolution({
          baseDir: dir,
          incidentId: incident.id,
          subjectResourceId: "sentry:project:never",
          decision: "Keep holding",
        }),
      "RESOURCE_NOT_FOUND",
    );
    expect(missingResource.message).toContain("sentry:project:never");
    const missingIncident = expectCode(
      () =>
        recordResolution({
          baseDir: dir,
          incidentId: "inc:missing",
          subjectResourceId: subjectA.id,
          decision: "Keep holding",
        }),
      "INCIDENT_NOT_FOUND",
    );
    expect(missingIncident.message).toContain("inc:missing");
    expect(listResolutions(dir).map((r) => r.id).sort()).toEqual(["res:a", "res:b"]);
  });

  test("--evidence validates against the named subject's live compose", () => {
    const subject = seedVercelSubject();
    const other = seedSubject("655");
    seedVercelEvidence(["dpl_abc"]);
    const incident = seedIncident([
      { id: "res:a", subject },
      { id: "res:b", subject: other },
    ]);
    const recorded = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      subjectResourceId: subject.id,
      decision: "Rollback",
      evidenceIds: ["dpl_abc"],
    });
    expect(recorded.evidenceIds).toEqual(["dpl_abc"]);
    expect(recorded.subjectResourceId).toBe(subject.id);
  });

  test("057 --resource without --incident and 062/063 surfaces stay unchanged", () => {
    const subjectA = seedSubject("656");
    const subjectB = seedSubject("657");
    const incident = seedIncident([
      { id: "res:a", subject: subjectA },
      { id: "res:b", subject: subjectB },
    ]);
    const viaResource = recordResolution({
      baseDir: dir,
      subjectResourceId: subjectA.id,
      decision: "Ungrouped",
    });
    expect(viaResource.investigationId).toBeUndefined();
    expect(getIncident(dir, incident.id).resolutionIds).toEqual(["res:a", "res:b"]);
    expect(listIncidents(dir).map((row) => row.id)).toEqual([incident.id]);
  });

  test("missing member rows: named subject matches remaining loadable members", () => {
    const subjectA = seedSubject("658");
    const subjectB = seedSubject("659");
    const incident = seedIncident([
      { id: "res:a", subject: subjectA },
      { id: "res:b", subject: subjectB },
    ]);
    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resolutions WHERE id = 'res:a'`);
    db.close();
    const error = expectCode(
      () =>
        recordResolution({
          baseDir: dir,
          incidentId: incident.id,
          subjectResourceId: subjectA.id,
          decision: "Gone member",
        }),
      "INCIDENT_SUBJECT_NOT_MEMBER",
    );
    expect(error.message).toContain(subjectA.id);
    const recorded = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      subjectResourceId: subjectB.id,
      decision: "Still loaded",
    });
    expect(recorded.subjectResourceId).toBe(subjectB.id);
  });
});
