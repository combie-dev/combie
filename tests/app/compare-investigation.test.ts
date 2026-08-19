import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initCombie } from "../../src/app/init.ts";
import {
  compareInvestigationContexts,
  compareInvestigationToCurrent,
  formatInvestigationCompare,
  type CompareAuthorityClocksSection,
  type CompareKnownFactsSection,
  type CompareMissingContextSection,
  type CompareRelationshipsSection,
  type CompareRelatedResourcesSection,
  type CompareSubjectSection,
  type InvestigationCompare,
  type InvestigationCompareSection,
} from "../../src/app/compare-investigation.ts";
import {
  getSavedInvestigation,
  saveInvestigation,
} from "../../src/app/investigations.ts";
import { recordResolution } from "../../src/app/resolutions.ts";
import { recordIncident } from "../../src/app/incidents.ts";
import { createRelationship } from "../../src/domain/relationship.ts";
import { createResource } from "../../src/domain/resource.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";
import type { SentryReleaseEvidence } from "../../src/providers/sentry/release.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-inv-compare-"));
  initCombie(dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function seedSentryProject(): string {
  const store = new Store(dir);
  store.init();
  store.applyResource(
    createResource({
      provider: "sentry",
      providerResourceId: "450",
      kind: "project",
      name: "combie",
      metadata: { slug: "combie", organization_slug: "acme" },
    }),
    { id: "obs-1", observedAt: "2026-08-16T00:00:00.000Z" },
  );
  store.close();
  return "sentry:project:450";
}

function seedRelease(
  resourceId: string,
  version: string,
  observedAt: string,
  dateCreated: string,
): SentryReleaseEvidence {
  const store = new Store(dir);
  store.init();
  store.upsertSentryRelease({
    provider: "sentry",
    version,
    resourceId,
    projectId: "450",
    shortVersion: null,
    status: null,
    dateCreated,
    dateReleased: null,
    observedAt,
    gitCommitSha: null,
  });
  store.close();
  return {
    provider: "sentry",
    version,
    resourceId,
    projectId: "450",
    shortVersion: null,
    status: null,
    dateCreated,
    dateReleased: null,
    observedAt,
    gitCommitSha: null,
  };
}

function setReleaseRefresh(
  resourceId: string,
  refresh: {
    status: "success" | "failure";
    observedAt: string;
    resultCount: number | null;
    lastSuccessfulObservedAt: string | null;
    message?: string | null;
  },
): void {
  const store = new Store(dir);
  store.init();
  store.setSentryReleaseRefresh({
    resourceId,
    status: refresh.status,
    observedAt: refresh.observedAt,
    message: refresh.message ?? null,
    resultCount: refresh.resultCount,
    lastSuccessfulObservedAt: refresh.lastSuccessfulObservedAt,
  });
  store.close();
}

function section<T extends InvestigationCompareSection["name"]>(
  compare: InvestigationCompare,
  name: T,
): Extract<InvestigationCompareSection, { name: T }> {
  const found = compare.sections.find((section) => section.name === name);
  if (!found) throw new Error(`missing section ${name}`);
  return found as Extract<InvestigationCompareSection, { name: T }>;
}

describe("snapshot-to-current compare", () => {
  test("unchanged store reports SAME across every section", () => {
    const subjectResourceId = seedSentryProject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectResourceId,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const compare = compareInvestigationToCurrent({
      baseDir: dir,
      investigationId: saved.record.id,
      comparedAt: "2026-08-16T13:00:00.000Z",
    });

    expect(compare.snapshotId).toBe(saved.record.id);
    expect(compare.subjectResourceId).toBe(subjectResourceId);
    expect(compare.snapshotComposedAt).toBe("2026-08-16T12:00:00.000Z");
    expect(compare.comparedAt).toBe("2026-08-16T13:00:00.000Z");
    expect(compare.currentStatus).toBe("available");
    expect(compare.sections.map((s) => s.name)).toEqual([
      "SUBJECT",
      "RELATIONSHIPS",
      "RELATED RESOURCES",
      "KNOWN FACTS",
      "MISSING CONTEXT",
      "SHARED COMMIT CONTEXT",
      "SHARED COMMIT CORRESPONDENCE",
      "AUTHORITY CLOCKS",
    ]);

    const subject = section(compare, "SUBJECT");
    expect(subject.fields.every((field) => field.status === "unchanged")).toBe(
      true,
    );
    for (const name of [
      "RELATIONSHIPS",
      "RELATED RESOURCES",
      "KNOWN FACTS",
      "MISSING CONTEXT",
      "SHARED COMMIT CONTEXT",
      "SHARED COMMIT CORRESPONDENCE",
      "AUTHORITY CLOCKS",
    ] as const) {
      expect(
        section(compare, name).items.every(
          (item) => item.status === "unchanged",
        ),
      ).toBe(true);
    }
  });

  test("provider-sync clocks do not add a compare section or rewrite snapshot JSON (Sprint 079)", () => {
    const subjectResourceId = seedSentryProject();
    const store = new Store(dir);
    store.init();
    store.upsertProvider({
      id: "sentry",
      name: "Sentry",
      status: "connected",
      lastSyncAt: "2026-08-18T10:00:00.000Z",
      lastAttemptAt: "2026-08-18T10:00:00.000Z",
    });
    store.close();

    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectResourceId,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    expect(saved.record.snapshot.providerSyncClocks).toBeDefined();
    expect(JSON.stringify(getSavedInvestigation(dir, saved.record.id).snapshot)).not.toContain(
      "providerSyncClocks",
    );

    const later = new Store(dir);
    later.init();
    later.setLastAttempt("sentry", "2026-08-19T09:00:00.000Z");
    later.close();

    const compare = compareInvestigationToCurrent({
      baseDir: dir,
      investigationId: saved.record.id,
      comparedAt: "2026-08-16T13:00:00.000Z",
    });
    expect(compare.sections.map((s) => s.name)).toEqual([
      "SUBJECT",
      "RELATIONSHIPS",
      "RELATED RESOURCES",
      "KNOWN FACTS",
      "MISSING CONTEXT",
      "SHARED COMMIT CONTEXT",
      "SHARED COMMIT CORRESPONDENCE",
      "AUTHORITY CLOCKS",
    ]);
    const missing = section(compare, "MISSING CONTEXT") as CompareMissingContextSection;
    expect(
      missing.items.some(
        (item) =>
          item.kind === "unknown_provider_sync_authority" &&
          item.status === "current_only",
      ),
    ).toBe(true);
    const clocks = section(compare, "AUTHORITY CLOCKS") as CompareAuthorityClocksSection;
    expect(clocks.items).toEqual([]);
  });

  test("subject rename reports SUBJECT name CHANGED and nothing else", () => {
    seedSentryProject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });

    const store = new Store(dir);
    store.init();
    store.applyResource(
      createResource({
        provider: "sentry",
        providerResourceId: "450",
        kind: "project",
        name: "combie-renamed",
        metadata: { slug: "combie-renamed", organization_slug: "acme" },
      }),
      { id: "obs-2", observedAt: "2026-08-16T13:00:00.000Z" },
    );
    store.close();

    const compare = compareInvestigationToCurrent({
      baseDir: dir,
      investigationId: saved.record.id,
      comparedAt: "2026-08-16T14:00:00.000Z",
    });
    const subject = section(compare, "SUBJECT") as CompareSubjectSection;
    const nameField = subject.fields.find((field) => field.field === "name")!;
    expect(nameField.status).toBe("changed");
    expect(nameField.snapshotValue).toBe("combie");
    expect(nameField.currentValue).toBe("combie-renamed");
    for (const field of subject.fields.filter((f) => f.field !== "name")) {
      expect(field.status).toBe("unchanged");
    }
    for (const name of [
      "RELATIONSHIPS",
      "RELATED RESOURCES",
      "SHARED COMMIT CONTEXT",
      "SHARED COMMIT CORRESPONDENCE",
      "AUTHORITY CLOCKS",
    ] as const) {
      expect(section(compare, name).items).toEqual([]);
    }
    const missing = section(compare, "MISSING CONTEXT");
    expect(missing.items.every((item) => item.status === "unchanged")).toBe(
      true,
    );
    // The rename itself is a recorded Change, so the current side gains a
    // resource_change_summary fact; nothing else moves.
    const facts = section(compare, "KNOWN FACTS") as CompareKnownFactsSection;
    for (const item of facts.items) {
      expect(item.status === "unchanged" || item.status === "current_only").toBe(
        true,
      );
      if (item.status === "current_only") {
        expect(item.kind).toBe("resource_change_summary");
      }
    }
  });

  test("new relationship reports RELATIONSHIPS and RELATED RESOURCES CURRENT ONLY", () => {
    seedSentryProject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });

    const store = new Store(dir);
    store.init();
    store.applyResource(
      createResource({
        provider: "github",
        providerResourceId: "1001",
        kind: "repository",
        name: "combie",
        metadata: { fullName: "acme/combie" },
      }),
      { id: "obs-repo", observedAt: "2026-08-16T12:00:00.000Z" },
    );
    store.upsertRelationship(
      createRelationship({
        sourceResourceId: "github:repository:1001",
        kind: "code_mapped_to",
        targetResourceId: "sentry:project:450",
        evidence: {
          source: "sentry",
          mechanism: "code_mapping",
          repository: "acme/combie",
          sentryRepoId: "1",
        },
      }),
    );
    store.close();

    const compare = compareInvestigationToCurrent({
      baseDir: dir,
      investigationId: saved.record.id,
      comparedAt: "2026-08-16T13:00:00.000Z",
    });
    const relationships = section(compare, "RELATIONSHIPS") as CompareRelationshipsSection;
    expect(relationships.items).toEqual([
      expect.objectContaining({
        status: "current_only",
        relationshipId: "rel:github:repository:1001:code_mapped_to:sentry:project:450",
      }),
    ]);
    const related = section(compare, "RELATED RESOURCES") as CompareRelatedResourcesSection;
    expect(related.items).toEqual([
      expect.objectContaining({ status: "current_only", resourceId: "github:repository:1001" }),
    ]);
  });

  test("removed relationship reports RELATIONSHIPS and RELATED RESOURCES SNAPSHOT ONLY", () => {
    seedSentryProject();
    const store = new Store(dir);
    store.init();
    store.applyResource(
      createResource({
        provider: "github",
        providerResourceId: "1001",
        kind: "repository",
        name: "combie",
        metadata: { fullName: "acme/combie" },
      }),
      { id: "obs-repo", observedAt: "2026-08-16T12:00:00.000Z" },
    );
    const relationship = createRelationship({
      sourceResourceId: "github:repository:1001",
      kind: "code_mapped_to",
      targetResourceId: "sentry:project:450",
      evidence: {
        source: "sentry",
        mechanism: "code_mapping",
        repository: "acme/combie",
        sentryRepoId: "1",
      },
    });
    store.upsertRelationship(relationship);
    store.close();

    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: "sentry:project:450",
      composedAt: "2026-08-16T12:00:00.000Z",
    });

    const store2 = new Store(dir);
    store2.init();
    store2.deleteRelationship(relationship.id);
    store2.close();

    const compare = compareInvestigationToCurrent({
      baseDir: dir,
      investigationId: saved.record.id,
      comparedAt: "2026-08-16T13:00:00.000Z",
    });
    const relationships = section(compare, "RELATIONSHIPS") as CompareRelationshipsSection;
    expect(relationships.items).toEqual([
      expect.objectContaining({ status: "snapshot_only", relationshipId: relationship.id }),
    ]);
    const related = section(compare, "RELATED RESOURCES") as CompareRelatedResourcesSection;
    expect(related.items).toEqual([
      expect.objectContaining({ status: "snapshot_only", resourceId: "github:repository:1001" }),
    ]);
  });

  test("new evidence identity reports KNOWN FACTS CHANGED, bounded at MAX_INVESTIGATION_FACTS", () => {
    const subjectResourceId = seedSentryProject();
    seedRelease(subjectResourceId, "combie@1.0.0", "2026-08-16T10:00:00.000Z", "2026-08-16T10:00:00.000Z");
    setReleaseRefresh(subjectResourceId, {
      status: "failure",
      observedAt: "2026-08-16T10:00:00.000Z",
      resultCount: null,
      lastSuccessfulObservedAt: null,
    });
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectResourceId,
      composedAt: "2026-08-16T12:00:00.000Z",
    });

    seedRelease(subjectResourceId, "combie@1.1.0", "2026-08-16T11:00:00.000Z", "2026-08-16T11:00:00.000Z");
    setReleaseRefresh(subjectResourceId, {
      status: "failure",
      observedAt: "2026-08-16T11:00:00.000Z",
      resultCount: null,
      lastSuccessfulObservedAt: null,
    });

    const compare = compareInvestigationToCurrent({
      baseDir: dir,
      investigationId: saved.record.id,
      comparedAt: "2026-08-16T13:00:00.000Z",
    });
    const facts = section(compare, "KNOWN FACTS") as CompareKnownFactsSection;
    expect(facts.items.length).toBeLessThanOrEqual(5);
    const authority = facts.items.find(
      (item) =>
        item.kind === "provider_evidence_authority" &&
        item.family === "sentry_release",
    )!;
    expect(authority.status).toBe("changed");
    expect(authority.scopeResourceId).toBe(subjectResourceId);
    const newest = facts.items.find(
      (item) => item.kind === "newest_provider_activity",
    )!;
    expect(newest.status).toBe("current_only");
    const clocks = section(compare, "AUTHORITY CLOCKS") as CompareAuthorityClocksSection;
    expect(clocks.items).toEqual([]);
  });

  test("authority-clock-only drift reports AUTHORITY CLOCKS and never marks facts changed", () => {
    const subjectResourceId = seedSentryProject();
    seedRelease(subjectResourceId, "combie@1.0.0", "2026-08-16T10:00:00.000Z", "2026-08-16T10:00:00.000Z");
    seedRelease(subjectResourceId, "combie@1.1.0", "2026-08-16T11:00:00.000Z", "2026-08-16T11:00:00.000Z");
    setReleaseRefresh(subjectResourceId, {
      status: "success",
      observedAt: "2026-08-16T11:00:00.000Z",
      resultCount: 2,
      lastSuccessfulObservedAt: "2026-08-16T11:00:00.000Z",
    });
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectResourceId,
      composedAt: "2026-08-16T12:00:00.000Z",
    });

    setReleaseRefresh(subjectResourceId, {
      status: "success",
      observedAt: "2026-08-16T12:30:00.000Z",
      resultCount: 2,
      lastSuccessfulObservedAt: "2026-08-16T12:30:00.000Z",
    });

    const compare = compareInvestigationToCurrent({
      baseDir: dir,
      investigationId: saved.record.id,
      comparedAt: "2026-08-16T13:00:00.000Z",
    });
    const clocks = section(compare, "AUTHORITY CLOCKS") as CompareAuthorityClocksSection;
    expect(clocks.items).toHaveLength(1);
    expect(clocks.items[0]!.family).toBe("sentry_release");
    expect(clocks.items[0]!.scopeResourceId).toBe(subjectResourceId);
    expect(clocks.items[0]!.scopeRole).toBe("subject");
    expect(clocks.items[0]!.snapshotClocks.refreshObservedAt).toBe(
      "2026-08-16T11:00:00.000Z",
    );
    expect(clocks.items[0]!.currentClocks.refreshObservedAt).toBe(
      "2026-08-16T12:30:00.000Z",
    );
    expect(clocks.items[0]!.snapshotClocks.resultCount).toBe(2);
    expect(clocks.items[0]!.currentClocks.resultCount).toBe(2);
    const facts = section(compare, "KNOWN FACTS") as CompareKnownFactsSection;
    expect(facts.items.every((item) => item.status === "unchanged")).toBe(true);
  });

  test("deleted subject reports subject_missing and keeps the snapshot reopenable", () => {
    const subjectResourceId = seedSentryProject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectResourceId,
      composedAt: "2026-08-16T12:00:00.000Z",
    });

    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resources WHERE id = '${subjectResourceId}'`);
    db.close();

    const compare = compareInvestigationToCurrent({
      baseDir: dir,
      investigationId: saved.record.id,
      comparedAt: "2026-08-16T13:00:00.000Z",
    });
    expect(compare.currentStatus).toBe("subject_missing");
    expect(compare.sections.map((s) => s.name)).toEqual(["SUBJECT"]);
    const subject = section(compare, "SUBJECT");
    expect(subject.fields.every((field) => field.status === "unavailable")).toBe(
      true,
    );

    const reopened = getSavedInvestigation(dir, saved.record.id);
    expect(reopened.snapshot.subject.name).toBe("combie");
  });

  test("compare persists nothing and never rewrites the snapshot", () => {
    const subjectResourceId = seedSentryProject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectResourceId,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const store = new Store(dir);
    store.init();
    const changesBefore = store.listChanges().length;
    const relationshipsBefore = store.listRelationships().length;
    const investigationsBefore = store.listInvestigationSummaries().length;
    const resolutionsBefore = store.listResolutionSummaries().length;
    store.close();
    const frozen = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
        comparedAt: "2026-08-16T13:00:00.000Z",
      }),
    );

    const store2 = new Store(dir);
    store2.init();
    expect(store2.listChanges()).toHaveLength(changesBefore);
    expect(store2.listRelationships()).toHaveLength(relationshipsBefore);
    expect(store2.listInvestigationSummaries()).toHaveLength(investigationsBefore);
    expect(store2.listResolutionSummaries()).toHaveLength(resolutionsBefore);
    store2.close();
    const reopened = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
        comparedAt: "2026-08-16T13:00:00.000Z",
      }),
    );
    expect(reopened).toBe(frozen);
  });

  test("compare ignores resolution records", () => {
    const subjectResourceId = seedSentryProject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectResourceId,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const withoutResolution = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
        comparedAt: "2026-08-16T13:00:00.000Z",
      }),
    );
    recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback 1.4.2",
      action: "Reverted deployment",
      outcome: "Errors returned to baseline",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    const withResolution = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
        comparedAt: "2026-08-16T13:00:00.000Z",
      }),
    );
    expect(withResolution).toBe(withoutResolution);
    expect(withResolution).not.toContain("Rollback 1.4.2");
    expect(withResolution).not.toContain("RESOLUTION");
  });

  test("compare ignores resolution evidence references", () => {
    const subjectResourceId = seedSentryProject();
    const store = new Store(dir);
    store.init();
    store.upsertSentryRelease({
      provider: "sentry",
      version: "frontend@1.2.0",
      resourceId: subjectResourceId,
      projectId: "450",
      shortVersion: "1.2.0",
      status: "open",
      dateCreated: "2026-08-16T10:00:00.000Z",
      dateReleased: null,
      observedAt: "2026-08-16T12:00:00.000Z",
      gitCommitSha: null,
    });
    store.close();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectResourceId,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const withoutEvidence = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
        comparedAt: "2026-08-16T13:00:00.000Z",
      }),
    );
    recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback 1.4.2",
      evidenceIds: ["frontend@1.2.0"],
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    const withEvidence = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
        comparedAt: "2026-08-16T13:00:00.000Z",
      }),
    );
    expect(withEvidence).toBe(withoutEvidence);
    expect(withEvidence).not.toContain("frontend@1.2.0");
    expect(withEvidence).not.toContain("EVIDENCE");
    expect(withEvidence).not.toContain("RESOLUTION");
  });

  test("compare ignores resource-anchored resolution records", () => {
    const subjectResourceId = seedSentryProject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectResourceId,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const withoutResolution = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
        comparedAt: "2026-08-16T13:00:00.000Z",
      }),
    );
    recordResolution({
      baseDir: dir,
      subjectResourceId,
      decision: "Resource-anchored rollback",
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    const withResolution = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
        comparedAt: "2026-08-16T13:00:00.000Z",
      }),
    );
    expect(withResolution).toBe(withoutResolution);
    expect(withResolution).not.toContain("Resource-anchored rollback");
    expect(withResolution).not.toContain("RESOLUTION");
  });

  test("compare ignores incident grouping records", () => {
    const subjectResourceId = seedSentryProject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectResourceId,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const first = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const second = recordResolution({
      baseDir: dir,
      subjectResourceId,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    const withoutIncident = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
        comparedAt: "2026-08-16T14:00:00.000Z",
      }),
    );
    recordIncident({
      baseDir: dir,
      resolutionIds: [first.id, second.id],
      title: "API error spike",
      recordedAt: "2026-08-16T15:00:00.000Z",
    });
    const withIncident = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
        comparedAt: "2026-08-16T14:00:00.000Z",
      }),
    );
    expect(withIncident).toBe(withoutIncident);
    expect(withIncident).not.toContain("API error spike");
    expect(withIncident).not.toContain("INCIDENT");
  });

  test("missing ids and uninitialized state fail without inventing a compare", () => {
    expect(() =>
      compareInvestigationToCurrent({ baseDir: dir, investigationId: "" }),
    ).toThrow(/Investigation id is required/);
    expect(() =>
      compareInvestigationToCurrent({ baseDir: dir, investigationId: "inv:missing" }),
    ).toThrow(/Investigation not found/);

    const otherDir = mkdtempSync(join(tmpdir(), "combie-inv-compare-raw-"));
    try {
      expect(() =>
        compareInvestigationToCurrent({
          baseDir: otherDir,
          investigationId: "inv:any",
        }),
      ).toThrow(/not initialized/);
    } finally {
      rmSync(otherDir, { recursive: true, force: true });
    }
  });

  test("pure compare accepts an explicit null current as subject_missing", () => {
    const subjectResourceId = seedSentryProject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectResourceId,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const compare = compareInvestigationContexts(
      saved.record,
      null,
      "2026-08-16T13:00:00.000Z",
    );
    expect(compare.currentStatus).toBe("subject_missing");
    expect(compare.sections.map((s) => s.name)).toEqual(["SUBJECT"]);
  });

  test("formatted output identifies snapshot, subject, times, and boundaries", () => {
    const subjectResourceId = seedSentryProject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectResourceId,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const rendered = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
        comparedAt: "2026-08-16T13:00:00.000Z",
      }),
    );
    expect(rendered).toContain("INVESTIGATION COMPARE");
    expect(rendered).toContain(`Snapshot: ${saved.record.id}`);
    expect(rendered).toContain(`Subject: ${subjectResourceId}`);
    expect(rendered).toContain(
      "Snapshot composed at 2026-08-16T12:00:00.000Z (retained composition)",
    );
    expect(rendered).toContain("Compared at 2026-08-16T13:00:00.000Z");
    expect(rendered).toContain("not current provider truth");
    expect(rendered).toContain("SUBJECT");
    expect(rendered).toContain("AUTHORITY CLOCKS");
  });

  test("formatted output renders subject_missing with the snapshot still identifiable", () => {
    const subjectResourceId = seedSentryProject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectResourceId,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resources WHERE id = '${subjectResourceId}'`);
    db.close();

    const rendered = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
        comparedAt: "2026-08-16T13:00:00.000Z",
      }),
    );
    expect(rendered).toContain(`Snapshot: ${saved.record.id}`);
    expect(rendered).toContain("subject_missing");
    expect(rendered).toContain("not present in the current local store");
    expect(rendered).toContain("remains reopenable");
    expect(rendered).not.toContain("RELATIONSHIPS");
  });

  test("fact identity keys are stable across re-composition", () => {
    const subjectResourceId = seedSentryProject();
    seedRelease(subjectResourceId, "combie@1.0.0", "2026-08-16T10:00:00.000Z", "2026-08-16T10:00:00.000Z");
    setReleaseRefresh(subjectResourceId, {
      status: "failure",
      observedAt: "2026-08-16T10:00:00.000Z",
      resultCount: null,
      lastSuccessfulObservedAt: null,
    });
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectResourceId,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const first = compareInvestigationToCurrent({
      baseDir: dir,
      investigationId: saved.record.id,
      comparedAt: "2026-08-16T13:00:00.000Z",
    });
    const second = compareInvestigationToCurrent({
      baseDir: dir,
      investigationId: saved.record.id,
      comparedAt: "2026-08-16T13:00:00.000Z",
    });
    const facts = section(second, "KNOWN FACTS") as CompareKnownFactsSection;
    expect(facts.items.every((item) => item.status === "unchanged")).toBe(true);
    expect(
      JSON.stringify(
        (section(first, "KNOWN FACTS") as CompareKnownFactsSection).items.map(
          (item) => item.factKey,
        ),
      ),
    ).toBe(
      JSON.stringify(
        facts.items.map((item) => item.factKey),
      ),
    );
  });
});