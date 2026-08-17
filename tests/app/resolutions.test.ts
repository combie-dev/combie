import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
