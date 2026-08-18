import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  compareInvestigationToCurrent,
  formatInvestigationCompare,
} from "../../src/app/compare-investigation.ts";
import { initCombie } from "../../src/app/init.ts";
import { CombieError } from "../../src/app/errors.ts";
import {
  appendIncidentResolutions,
  formatIncident,
  formatIncidentAppendConfirmation,
  formatIncidentConfirmation,
  formatIncidentRemoveConfirmation,
  formatIncidentRetitleConfirmation,
  formatIncidentClearTitleConfirmation,
  formatIncidentList,
  formatIncidentMemorySection,
  formatWithIncidentMemory,
  getIncident,
  listIncidents,
  listIncidentsFiltered,
  listIncidentsForInvestigation,
  listIncidentsForResolution,
  listIncidentsForSubject,
  recordIncident,
  removeIncidentResolutions,
  retitleIncident,
  clearIncidentTitle,
} from "../../src/app/incidents.ts";
import {
  formatInvestigationContext,
  getInvestigationContext,
} from "../../src/app/investigate.ts";
import {
  formatSavedInvestigation,
  getSavedInvestigation,
  saveInvestigation,
  serializeInvestigationSnapshot,
} from "../../src/app/investigations.ts";
import {
  formatResolution,
  formatWithResolutionMemory,
  getResolution,
  listResolutions,
  recordResolution,
} from "../../src/app/resolutions.ts";
import { createResource } from "../../src/domain/resource.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-incident-"));
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

function seedResolution(
  id: string,
  subjectResourceId: string,
  options?: {
    investigationId?: string;
    decision?: string;
    action?: string;
    outcome?: string;
    recordedAt?: string;
  },
): void {
  const store = new Store(dir);
  store.init();
  store.insertResolution({
    id,
    ...(options?.investigationId
      ? { investigationId: options.investigationId }
      : {}),
    subjectResourceId,
    recordedAt: options?.recordedAt ?? "2026-08-16T12:00:00.000Z",
    ...(options?.decision ? { decision: options.decision } : {}),
    ...(options?.action ? { action: options.action } : {}),
    ...(options?.outcome ? { outcome: options.outcome } : {}),
  });
  store.close();
}

function seedInvestigation(id: string, subjectResourceId: string): void {
  const store = new Store(dir);
  store.init();
  store.insertInvestigation({
    id,
    subjectResourceId,
    composedAt: "2026-08-16T12:00:00.000Z",
    snapshotJson: "{}",
  });
  store.close();
}

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

describe("Incident grouping (Sprint 058)", () => {
  test("records an incident grouping two resolutions, title omitted when absent", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id, { decision: "Rollback" });
    seedResolution("res:b", subject.id, { decision: "Hold deploys" });
    const recorded = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    expect(recorded.id).toMatch(/^inc:/);
    expect(recorded.resolutionIds).toEqual(["res:a", "res:b"]);
    expect(recorded.recordedAt).toBe("2026-08-17T09:00:00.000Z");
    expect(recorded.title).toBeUndefined();
    const stored = listIncidents(dir);
    expect(stored).toHaveLength(1);
    expect(stored[0]!.id).toBe(recorded.id);
    expect(stored[0]!.resolutionIds).toEqual(["res:a", "res:b"]);
    const resolutions = new Store(dir);
    resolutions.init();
    expect(resolutions.getResolutionRow("res:a")).not.toHaveProperty(
      "incidentId",
    );
    expect(resolutions.getResolutionRow("res:b")).not.toHaveProperty(
      "incidentId",
    );
    resolutions.close();
  });

  test("duplicate member ids collapse first-seen", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const recorded = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:b", "res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    expect(recorded.resolutionIds).toEqual(["res:b", "res:a"]);
  });

  test("two copies of one id fail as fewer than two unique", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    const error = expectCode(
      () =>
        recordIncident({
          baseDir: dir,
          resolutionIds: ["res:a", "res:a"],
        }),
      "INCIDENT_MEMBERS_REQUIRED",
    );
    expect(error.message).toMatch(/at least two distinct/i);
    expect(listIncidents(dir)).toHaveLength(0);
  });

  test("one member fails; nothing inserted", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    expectCode(
      () =>
        recordIncident({
          baseDir: dir,
          resolutionIds: ["res:a"],
        }),
      "INCIDENT_MEMBERS_REQUIRED",
    );
    expect(listIncidents(dir)).toHaveLength(0);
  });

  test("zero members fails; nothing inserted", () => {
    expectCode(
      () => recordIncident({ baseDir: dir, resolutionIds: [] }),
      "INCIDENT_MEMBERS_REQUIRED",
    );
    expect(listIncidents(dir)).toHaveLength(0);
  });

  test("unknown resolution id fails the whole record with RESOLUTION_NOT_FOUND", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    const error = expectCode(
      () =>
        recordIncident({
          baseDir: dir,
          resolutionIds: ["res:a", "res:missing"],
        }),
      "RESOLUTION_NOT_FOUND",
    );
    expect(error.message).toMatch(/Resolution not found: res:missing/);
    expect(listIncidents(dir)).toHaveLength(0);
  });

  test("member already grouped in another incident fails exclusive membership", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:c", subject.id);
    recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const error = expectCode(
      () =>
        recordIncident({
          baseDir: dir,
          resolutionIds: ["res:a", "res:c"],
        }),
      "INCIDENT_MEMBERSHIP_CONFLICT",
    );
    expect(error.message).toMatch(/already belongs to another Incident/);
    expect(listIncidents(dir)).toHaveLength(1);
  });

  test("mix of investigation-anchored and resource-anchored members is allowed", () => {
    const subject = seedSubject();
    seedInvestigation("inv:x", subject.id);
    seedResolution("res:a", subject.id, { investigationId: "inv:x" });
    seedResolution("res:b", subject.id);
    const recorded = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    expect(recorded.resolutionIds).toEqual(["res:a", "res:b"]);
  });

  test("title persists; blank title omits the field; omitted title omits the field", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:c", subject.id);
    seedResolution("res:d", subject.id);
    seedResolution("res:e", subject.id);
    seedResolution("res:f", subject.id);
    const titled = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "Production API error spike",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    expect(titled.title).toBe("Production API error spike");
    const blank = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:c", "res:d"],
      title: "   ",
      recordedAt: "2026-08-17T09:01:00.000Z",
    });
    expect(blank.title).toBeUndefined();
    const omitted = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:e", "res:f"],
      recordedAt: "2026-08-17T09:02:00.000Z",
    });
    expect(omitted.title).toBeUndefined();
  });

  test("list orders recordedAt DESC then id DESC", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:c", subject.id);
    seedResolution("res:d", subject.id);
    const first = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const second = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:c", "res:d"],
      recordedAt: "2026-08-17T08:00:00.000Z",
    });
    const listed = listIncidents(dir);
    expect(listed.map((i) => i.id)).toEqual([first.id, second.id]);
  });

  test("list member column is the count, not the ids, and never dumps essays", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id, { decision: "Rollback 1.4.2" });
    seedResolution("res:b", subject.id, { outcome: "Errors returned to baseline" });
    recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "Prod spike",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const output = formatIncidentList(listIncidents(dir));
    expect(output).toContain("INCIDENT");
    expect(output).toContain("TITLE");
    expect(output).toContain("RESOLUTIONS");
    expect(output).toContain("Prod spike");
    expect(output).not.toContain("res:a");
    expect(output).not.toContain("res:b");
    expect(output).not.toContain("Rollback 1.4.2");
    expect(output).not.toContain("Errors returned to baseline");
  });

  test("list uses - for omitted title and shows the count", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:c", subject.id);
    seedResolution("res:d", subject.id);
    recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    recordIncident({
      baseDir: dir,
      resolutionIds: ["res:c", "res:d"],
      title: "Two incidents",
      recordedAt: "2026-08-17T08:00:00.000Z",
    });
    const output = formatIncidentList(listIncidents(dir));
    expect(output).toContain("-");
    expect(output).toContain("2");
    expect(output).toContain("Two incidents");
  });

  test("show lists member ids in stored order, not bodies; omits TITLE line when absent", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id, { decision: "Rollback 1.4.2" });
    seedResolution("res:b", subject.id, { outcome: "Errors returned to baseline" });
    const recorded = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:b", "res:a"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const output = formatIncident(getIncident(dir, recorded.id));
    expect(output).toContain("INCIDENT");
    expect(output).toContain(`ID: ${recorded.id}`);
    expect(output).toContain("RESOLUTIONS");
    expect(output.indexOf("res:b")).toBeLessThan(output.indexOf("res:a"));
    expect(output).not.toContain("TITLE");
    expect(output).not.toContain("Rollback 1.4.2");
    expect(output).not.toContain("Errors returned to baseline");
    expect(output).toMatch(/not current provider truth/);
  });

  test("show includes the TITLE block when present", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const recorded = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "Production API error spike",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const output = formatIncident(getIncident(dir, recorded.id));
    expect(output).toContain("TITLE");
    expect(output).toContain("Production API error spike");
  });

  test("confirmation lists the incident id, optional title, member ids, and show pointer", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const titled = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "Prod spike",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const output = formatIncidentConfirmation(titled);
    expect(output).toContain(`Recorded incident ${titled.id}`);
    expect(output).toContain("Prod spike");
    expect(output).toContain("res:a");
    expect(output).toContain("res:b");
    expect(output).toContain(`incident ${titled.id}`);
  });

  test("confirmation omits the title line when absent", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const recorded = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    expect(formatIncidentConfirmation(recorded)).not.toContain("title");
  });

  test("empty list is known-empty and suggests grouping", () => {
    const output = formatIncidentList([]);
    expect(output).toMatch(/No incidents recorded/i);
    expect(output).toContain("--resolution");
  });

  test("unknown show id is INCIDENT_NOT_FOUND", () => {
    const error = expectCode(() => getIncident(dir, "inc:missing"), "INCIDENT_NOT_FOUND");
    expect(error.message).toMatch(/Incident not found: inc:missing/);
    expectCode(() => getIncident(dir, "   "), "INCIDENT_ID_REQUIRED");
  });

  test("subject Resource deletion survives: incidents still list and show", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const recorded = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resources WHERE id = '${subject.id}'`);
    db.close();
    expect(listIncidents(dir)).toHaveLength(1);
    const shown = getIncident(dir, recorded.id);
    expect(shown.resolutionIds).toEqual(["res:a", "res:b"]);
  });

  test("pre-058 DB: init() creates the empty incidents table; resolution rows still load", () => {
    const subject = seedSubject();
    seedInvestigation("inv:x", subject.id);
    seedResolution("res:a", subject.id, { investigationId: "inv:x" });
    seedResolution("res:b", subject.id);
    const db = new Database(dbPath(dir));
    db.exec(`DROP TABLE incidents`);
    db.close();
    const store = new Store(dir);
    store.init();
    store.close();
    expect(listIncidents(dir)).toHaveLength(0);
    expect(listIncidents(dir)).toEqual([]);
    const listed = listIncidents(dir);
    expect(listed).toHaveLength(0);
    const store2 = new Store(dir);
    store2.init();
    expect(store2.getResolutionRow("res:a")!.investigationId).toBe("inv:x");
    expect(store2.getResolutionRow("res:b")).not.toBeNull();
    store2.close();
  });

  test("recording an incident never rewrites snapshot JSON", () => {
    const subject = seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const frozen = serializeInvestigationSnapshot(saved.record.snapshot);
    seedResolution("res:a", subject.id, { investigationId: saved.record.id });
    seedResolution("res:b", subject.id);
    recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "Prod spike",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    expect(
      serializeInvestigationSnapshot(
        getSavedInvestigation(dir, saved.record.id).snapshot,
      ),
    ).toBe(frozen);
  });

  test("blank member ids are trimmed and dropped before uniqueness", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const recorded = recordIncident({
      baseDir: dir,
      resolutionIds: ["  res:a  ", "", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    expect(recorded.resolutionIds).toEqual(["res:a", "res:b"]);
  });
});

describe("exact-id incident recall (Sprint 059)", () => {
  test("empty membership omits the section and leaves compose / snapshot formatters unchanged", () => {
    const subject = seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const live = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: subject.id }),
    );
    const snapshot = formatSavedInvestigation(
      getSavedInvestigation(dir, saved.record.id),
    );

    expect(formatIncidentMemorySection([], "investigation")).toBe("");
    expect(formatIncidentMemorySection([], "subject")).toBe("");
    expect(formatWithIncidentMemory(live, [], "subject")).toBe(live);
    expect(formatWithIncidentMemory(snapshot, [], "investigation")).toBe(
      snapshot,
    );
    expect(live).not.toContain("INCIDENT MEMORY");
    expect(snapshot).not.toContain("INCIDENT MEMORY");
    expect(serializeInvestigationSnapshot(saved.record.snapshot)).not.toContain(
      "INCIDENT MEMORY",
    );
    expect(listIncidentsForSubject(dir, subject.id)).toEqual([]);
    expect(listIncidentsForInvestigation(dir, saved.record.id)).toEqual([]);
  });

  test("subject membership matches any member, dedups, and does not dump resolution essays", () => {
    const subjectA = seedSubject("451");
    const subjectB = seedSubject("452");
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectA.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const first = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback 1.4.2",
      action: "Reverted deployment",
      outcome: "Errors returned to baseline",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const second = recordResolution({
      baseDir: dir,
      subjectResourceId: subjectB.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    const older = recordIncident({
      baseDir: dir,
      resolutionIds: [first.id, second.id],
      title: "API error spike",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const laterResA = recordResolution({
      baseDir: dir,
      subjectResourceId: subjectA.id,
      decision: "Keep holding",
      recordedAt: "2026-08-17T10:00:00.000Z",
    });
    const laterResB = recordResolution({
      baseDir: dir,
      subjectResourceId: subjectB.id,
      decision: "Page on-call",
      recordedAt: "2026-08-17T10:01:00.000Z",
    });
    const later = recordIncident({
      baseDir: dir,
      resolutionIds: [laterResA.id, laterResB.id],
      recordedAt: "2026-08-17T11:00:00.000Z",
    });

    const forA = listIncidentsForSubject(dir, subjectA.id);
    expect(forA.map((row) => row.id)).toEqual([later.id, older.id]);
    const forB = listIncidentsForSubject(dir, subjectB.id);
    expect(forB.map((row) => row.id)).toEqual([later.id, older.id]);

    const section = formatIncidentMemorySection(forA, "subject");
    expect(section).toContain("INCIDENT MEMORY");
    expect(section).toContain("organizational grouping");
    expect(section).toContain("for this subject");
    expect(section).toContain("not current provider truth");
    expect(section).toContain("It is not a recommendation");
    expect(section).not.toMatch(/you should/i);
    expect(section).not.toMatch(/similar incidents/i);
    expect(section).not.toMatch(/this Resource is now an Incident/i);
    expect(section).not.toMatch(/resolved: true/i);
    expect(section).not.toContain("KNOWN FACTS");
    expect(section).not.toContain("MISSING CONTEXT");
    expect(section).not.toContain("RESOLUTION MEMORY");
    expect(section).not.toContain("Rollback 1.4.2");
    expect(section).not.toContain("Hold deploys");
    expect(section).not.toContain("Keep holding");
    expect(section).toContain(later.id);
    expect(section).toContain(older.id);
    expect(section.indexOf(later.id)).toBeLessThan(section.indexOf(older.id));
    expect(section).toContain("API error spike");
    expect(section).toContain(first.id);
    expect(section).toContain(second.id);
    expect(section).toContain("Show:");
    expect(section).toContain(`incident ${later.id}`);
    expect(section).not.toContain(`incident ${older.id}`);

    const live = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: subjectA.id }),
    );
    const rendered = formatWithIncidentMemory(
      formatWithResolutionMemory(
        live,
        listResolutions(dir, { subjectResourceId: subjectA.id }),
        "subject",
      ),
      forA,
      "subject",
    );
    expect(rendered.indexOf("RESOLUTION MEMORY")).toBeLessThan(
      rendered.indexOf("INCIDENT MEMORY"),
    );
    expect(serializeInvestigationSnapshot(saved.record.snapshot)).not.toContain(
      "INCIDENT MEMORY",
    );
    expect(serializeInvestigationSnapshot(saved.record.snapshot)).not.toContain(
      older.id,
    );
  });

  test("investigation membership includes mixed members and excludes resource-anchored-only groupings", () => {
    const subject = seedSubject("453");
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const invMember = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const resourceMember = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    const mixed = recordIncident({
      baseDir: dir,
      resolutionIds: [invMember.id, resourceMember.id],
      title: "Mixed grouping",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const onlyA = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Scale up",
      recordedAt: "2026-08-17T10:00:00.000Z",
    });
    const onlyB = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Scale down",
      recordedAt: "2026-08-17T10:01:00.000Z",
    });
    const resourceOnly = recordIncident({
      baseDir: dir,
      resolutionIds: [onlyA.id, onlyB.id],
      title: "Resource only",
      recordedAt: "2026-08-17T11:00:00.000Z",
    });

    const forInv = listIncidentsForInvestigation(dir, saved.record.id);
    expect(forInv.map((row) => row.id)).toEqual([mixed.id]);
    expect(forInv.map((row) => row.id)).not.toContain(resourceOnly.id);

    const forSubject = listIncidentsForSubject(dir, subject.id);
    expect(forSubject.map((row) => row.id)).toEqual([
      resourceOnly.id,
      mixed.id,
    ]);

    const section = formatIncidentMemorySection(forInv, "investigation");
    expect(section).toContain("for this investigation");
    expect(section).toContain(mixed.id);
    expect(section).not.toContain(resourceOnly.id);
    expect(section).not.toContain("Rollback");
    expect(section).not.toContain("Scale up");
  });

  test("missing member rows are skipped; unmatched incidents are omitted", () => {
    const subject = seedSubject("454");
    seedResolution("res:keep", subject.id, { decision: "Keep" });
    seedResolution("res:gone", subject.id, { decision: "Gone" });
    const recorded = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:keep", "res:gone"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resolutions WHERE id = 'res:gone'`);
    db.close();
    expect(listIncidentsForSubject(dir, subject.id).map((row) => row.id)).toEqual(
      [recorded.id],
    );

    const db2 = new Database(dbPath(dir));
    db2.exec(`DELETE FROM resolutions WHERE id = 'res:keep'`);
    db2.close();
    expect(listIncidentsForSubject(dir, subject.id)).toEqual([]);
  });

  test("pre-058 missing incidents table omits recall without crashing", () => {
    const subject = seedSubject("455");
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const db = new Database(dbPath(dir));
    db.exec(`DROP TABLE incidents`);
    db.close();
    expect(listIncidentsForSubject(dir, subject.id)).toEqual([]);
    const live = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: subject.id }),
    );
    expect(
      formatWithIncidentMemory(
        live,
        listIncidentsForSubject(dir, subject.id),
        "subject",
      ),
    ).toBe(live);
  });
});

describe("incident list retrieve (Sprint 060)", () => {
  test("--resolution lists the grouping that named that exact id; omits others; at most one row", () => {
    const subjectA = seedSubject("460");
    const subjectB = seedSubject("461");
    seedResolution("res:r1", subjectA.id);
    seedResolution("res:r2", subjectB.id);
    seedResolution("res:r3", subjectA.id);
    seedResolution("res:r4", subjectB.id);
    const targeted = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:r1", "res:r2"],
      title: "Named r1",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const other = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:r3", "res:r4"],
      title: "Not r1",
      recordedAt: "2026-08-17T10:00:00.000Z",
    });

    const forR1 = listIncidentsForResolution(dir, "res:r1");
    expect(forR1.map((row) => row.id)).toEqual([targeted.id]);
    expect(forR1.map((row) => row.id)).not.toContain(other.id);
    expect(forR1).toHaveLength(1);

    const forR2 = listIncidentsForResolution(dir, "res:r2");
    expect(forR2.map((row) => row.id)).toEqual([targeted.id]);
    expect(forR2).toHaveLength(1);
  });

  test("--resolution is exact membership: substring or prefix does not match", () => {
    const subject = seedSubject("462");
    seedResolution("res:abc", subject.id);
    seedResolution("res:abd", subject.id);
    recordIncident({
      baseDir: dir,
      resolutionIds: ["res:abc", "res:abd"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    expect(listIncidentsForResolution(dir, "res:ab")).toEqual([]);
    expect(listIncidentsForResolution(dir, "res")).toEqual([]);
    expect(listIncidentsForResolution(dir, "abc")).toEqual([]);
    expect(listIncidentsForResolution(dir, "res:abc ")).toEqual([]);
  });

  test("unknown resolution id is known-empty, never RESOLUTION_NOT_FOUND", () => {
    const subject = seedSubject("463");
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    expect(listIncidentsForResolution(dir, "res:missing")).toEqual([]);
    const empty = formatIncidentList(
      listIncidentsForResolution(dir, "res:missing"),
      { resolutionId: "res:missing" },
    );
    expect(empty).toContain("No incidents recorded for resolution res:missing.");
    expect(empty).not.toContain("No incidents recorded yet.");
    expect(empty).not.toMatch(/RESOLUTION_NOT_FOUND/i);
  });

  test("--resource matches 059 subject membership; cross-subject grouping appears on either subject", () => {
    const subjectA = seedSubject("464");
    const subjectB = seedSubject("465");
    const resA = recordResolution({
      baseDir: dir,
      subjectResourceId: subjectA.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const resB = recordResolution({
      baseDir: dir,
      subjectResourceId: subjectB.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    const cross = recordIncident({
      baseDir: dir,
      resolutionIds: [resA.id, resB.id],
      title: "Cross-subject",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });

    expect(
      listIncidentsFiltered(dir, { subjectResourceId: subjectA.id }).map(
        (row) => row.id,
      ),
    ).toEqual([cross.id]);
    expect(
      listIncidentsFiltered(dir, { subjectResourceId: subjectB.id }).map(
        (row) => row.id,
      ),
    ).toEqual([cross.id]);
    expect(
      listIncidentsFiltered(dir, { subjectResourceId: subjectA.id }).map(
        (row) => row.id,
      ),
    ).toEqual(listIncidentsForSubject(dir, subjectA.id).map((row) => row.id));
  });

  test("unknown subject is known-empty, never RESOURCE_NOT_FOUND", () => {
    const subject = seedSubject("466");
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    expect(
      listIncidentsFiltered(dir, { subjectResourceId: "sentry:project:never" }),
    ).toEqual([]);
    const empty = formatIncidentList(
      listIncidentsFiltered(dir, {
        subjectResourceId: "sentry:project:never",
      }),
      { subjectResourceId: "sentry:project:never" },
    );
    expect(empty).toContain(
      "No incidents recorded for subject sentry:project:never.",
    );
    expect(empty).not.toContain("No incidents recorded yet.");
    expect(empty).not.toMatch(/RESOURCE_NOT_FOUND/i);
  });

  test("subject Resource deleted: --resource still lists when member rows keep that subject id", () => {
    const subject = seedSubject("467");
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const recorded = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resources WHERE id = '${subject.id}'`);
    db.close();
    expect(
      listIncidentsFiltered(dir, { subjectResourceId: subject.id }).map(
        (row) => row.id,
      ),
    ).toEqual([recorded.id]);
    expect(
      listIncidentsFiltered(dir, { subjectResourceId: subject.id }).map(
        (row) => row.id,
      ),
    ).toEqual(listIncidentsForSubject(dir, subject.id).map((row) => row.id));
  });

  test("AND of --resolution and --resource: cross-resource grouping matches when another member has the subject", () => {
    const subjectA = seedSubject("468");
    const subjectB = seedSubject("469");
    seedResolution("res:a1", subjectA.id);
    seedResolution("res:b1", subjectB.id);
    const cross = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a1", "res:b1"],
      title: "Cross",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });

    const andResult = listIncidentsFiltered(dir, {
      resolutionId: "res:a1",
      subjectResourceId: subjectB.id,
    });
    expect(andResult.map((row) => row.id)).toEqual([cross.id]);

    const noMatch = listIncidentsFiltered(dir, {
      resolutionId: "res:a1",
      subjectResourceId: "sentry:project:never",
    });
    expect(noMatch).toEqual([]);
  });

  test("missing member Resolution rows: --resolution still matches stored id; --resource skips missing members", () => {
    const subject = seedSubject("470");
    seedResolution("res:keep", subject.id);
    seedResolution("res:gone", subject.id);
    const recorded = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:keep", "res:gone"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resolutions WHERE id = 'res:gone'`);
    db.close();
    expect(
      listIncidentsForResolution(dir, "res:gone").map((row) => row.id),
    ).toEqual([recorded.id]);
    expect(
      listIncidentsFiltered(dir, { subjectResourceId: subject.id }).map(
        (row) => row.id,
      ),
    ).toEqual([recorded.id]);
  });

  test("filtered lists keep recordedAt DESC, id DESC ordering", () => {
    const subjectA = seedSubject("471");
    const subjectB = seedSubject("472");
    seedResolution("res:a1", subjectA.id);
    seedResolution("res:b1", subjectB.id);
    seedResolution("res:a2", subjectA.id);
    seedResolution("res:b2", subjectB.id);
    const older = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a1", "res:b1"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const later = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a2", "res:b2"],
      recordedAt: "2026-08-17T10:00:00.000Z",
    });
    const byResolution = listIncidentsForResolution(dir, "res:a1");
    expect(byResolution.map((row) => row.id)).toEqual([older.id]);
    const bySubject = listIncidentsFiltered(dir, {
      subjectResourceId: subjectB.id,
    });
    expect(bySubject.map((row) => row.id)).toEqual([later.id, older.id]);
  });

  test("list summaries stay 058-shaped: count column, never member essays", () => {
    const subject = seedSubject("473");
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const recorded = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "API error spike",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const output = formatIncidentList(
      listIncidentsForResolution(dir, "res:a"),
      { resolutionId: "res:a" },
    );
    expect(output).toContain("INCIDENT");
    expect(output).toContain("TITLE");
    expect(output).toContain("RESOLUTIONS");
    expect(output).toContain("RECORDED AT");
    expect(output).toContain(recorded.id);
    expect(output).toContain("API error spike");
    expect(output).toContain("2");
    expect(output).not.toContain("res:b");
    expect(output).not.toMatch(/res:a\s+res:b/);
  });

  test("unfiltered formatIncidentList and empty copy unchanged", () => {
    expect(formatIncidentList([])).toMatch(/No incidents recorded/i);
    expect(formatIncidentList([])).toContain("--resolution");
    expect(formatIncidentList([], undefined)).toBe(
      formatIncidentList([]),
    );
  });

  test("known-empty copies are distinct per filter", () => {
    const resolutionEmpty = formatIncidentList([], {
      resolutionId: "res:none",
    });
    const subjectEmpty = formatIncidentList([], {
      subjectResourceId: "sentry:project:none",
    });
    const bothEmpty = formatIncidentList([], {
      resolutionId: "res:none",
      subjectResourceId: "sentry:project:none",
    });
    expect(resolutionEmpty).toContain(
      "No incidents recorded for resolution res:none.",
    );
    expect(subjectEmpty).toContain(
      "No incidents recorded for subject sentry:project:none.",
    );
    expect(bothEmpty).toContain("res:none");
    expect(bothEmpty).toContain("sentry:project:none");
    expect(bothEmpty).not.toContain("No incidents recorded yet.");
    expect(resolutionEmpty).not.toBe(subjectEmpty);
    expect(bothEmpty).not.toBe(resolutionEmpty);
    expect(bothEmpty).not.toBe(subjectEmpty);
  });

  test("pre-058 missing incidents table: filtered retrieve is known-empty, no crash", () => {
    const subject = seedSubject("474");
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const db = new Database(dbPath(dir));
    db.exec(`DROP TABLE incidents`);
    db.close();
    expect(listIncidentsForResolution(dir, "res:a")).toEqual([]);
    expect(
      listIncidentsFiltered(dir, { subjectResourceId: subject.id }),
    ).toEqual([]);
    const empty = formatIncidentList(
      listIncidentsForResolution(dir, "res:a"),
      { resolutionId: "res:a" },
    );
    expect(empty).toContain("No incidents recorded for resolution res:a.");
  });
});

describe("incident list retrieve by investigation (Sprint 063)", () => {
  test("--investigation lists mixed 051+057 grouping and omits resource-anchored-only", () => {
    const subject = seedSubject("630");
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const invMember = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const resourceMember = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    const mixed = recordIncident({
      baseDir: dir,
      resolutionIds: [invMember.id, resourceMember.id],
      title: "Mixed grouping",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const onlyA = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Scale up",
      recordedAt: "2026-08-17T10:00:00.000Z",
    });
    const onlyB = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Scale down",
      recordedAt: "2026-08-17T10:01:00.000Z",
    });
    const resourceOnly = recordIncident({
      baseDir: dir,
      resolutionIds: [onlyA.id, onlyB.id],
      title: "Resource only",
      recordedAt: "2026-08-17T11:00:00.000Z",
    });

    const listed = listIncidentsFiltered(dir, {
      investigationId: saved.record.id,
    });
    expect(listed.map((row) => row.id)).toEqual([mixed.id]);
    expect(listed.map((row) => row.id)).not.toContain(resourceOnly.id);
    expect(
      listIncidentsForInvestigation(dir, saved.record.id).map((row) => row.id),
    ).toEqual([mixed.id]);

    const output = formatIncidentList(listed, {
      investigationId: saved.record.id,
    });
    expect(output).toContain(mixed.id);
    expect(output).toContain("Mixed grouping");
    expect(output).toContain("2");
    expect(output).not.toContain(resourceOnly.id);
    expect(output).not.toContain(invMember.id);
    expect(output).not.toContain("Rollback");
    expect(output).not.toContain("Hold deploys");
  });

  test("061 incident-anchored-only grouping does not match --investigation", () => {
    const subject = seedSubject("631");
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      decision: "Keep holding",
      recordedAt: "2026-08-18T10:00:00.000Z",
    });

    expect(
      listIncidentsFiltered(dir, { investigationId: saved.record.id }),
    ).toEqual([]);
    const empty = formatIncidentList([], {
      investigationId: saved.record.id,
    });
    expect(empty).toContain(
      `No incidents recorded for investigation ${saved.record.id}.`,
    );
    expect(empty).toContain(
      "This is known-empty for that exact investigation id — no retained grouping has a member recorded against it.",
    );
    expect(empty).not.toContain("No incidents recorded yet.");
    expect(empty).not.toMatch(/INVESTIGATION_NOT_FOUND/i);
  });

  test("unknown investigation id is known-empty, never INVESTIGATION_NOT_FOUND", () => {
    const subject = seedSubject("632");
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    expect(
      listIncidentsFiltered(dir, { investigationId: "inv:missing" }),
    ).toEqual([]);
    const empty = formatIncidentList([], { investigationId: "inv:missing" });
    expect(empty).toContain(
      "No incidents recorded for investigation inv:missing.",
    );
    expect(empty).not.toContain("No incidents recorded yet.");
    expect(empty).not.toMatch(/INVESTIGATION_NOT_FOUND/i);
    expect(empty).not.toMatch(/RESOURCE_NOT_FOUND/i);
    expect(empty).not.toMatch(/RESOLUTION_NOT_FOUND/i);
  });

  test("deleted Investigation snapshot: matching rows still list", () => {
    const subject = seedSubject("633");
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const invMember = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const resourceMember = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    const mixed = recordIncident({
      baseDir: dir,
      resolutionIds: [invMember.id, resourceMember.id],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM investigations WHERE id = '${saved.record.id}'`);
    db.close();
    expect(
      listIncidentsFiltered(dir, { investigationId: saved.record.id }).map(
        (row) => row.id,
      ),
    ).toEqual([mixed.id]);
  });

  test("missing member Resolution rows: skip investigation match; unmatched omitted", () => {
    const subject = seedSubject("634");
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    seedResolution("res:keep", subject.id, {
      investigationId: saved.record.id,
    });
    seedResolution("res:gone", subject.id, {
      investigationId: saved.record.id,
    });
    const recorded = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:keep", "res:gone"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    expect(
      listIncidentsFiltered(dir, { investigationId: saved.record.id }).map(
        (row) => row.id,
      ),
    ).toEqual([recorded.id]);
    const db = new Database(dbPath(dir));
    db.exec(`DELETE FROM resolutions WHERE id = 'res:gone'`);
    db.close();
    expect(
      listIncidentsFiltered(dir, { investigationId: saved.record.id }).map(
        (row) => row.id,
      ),
    ).toEqual([recorded.id]);
    const db2 = new Database(dbPath(dir));
    db2.exec(`DELETE FROM resolutions WHERE id = 'res:keep'`);
    db2.close();
    expect(
      listIncidentsFiltered(dir, { investigationId: saved.record.id }),
    ).toEqual([]);
  });

  test("AND with --resolution / --resource / both; 060 unchanged when --investigation absent", () => {
    const subjectA = seedSubject("635");
    const subjectB = seedSubject("636");
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subjectA.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const invMember = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const otherSubject = recordResolution({
      baseDir: dir,
      subjectResourceId: subjectB.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    const mixed = recordIncident({
      baseDir: dir,
      resolutionIds: [invMember.id, otherSubject.id],
      title: "Cross",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const onlyA = recordResolution({
      baseDir: dir,
      subjectResourceId: subjectA.id,
      decision: "Scale up",
      recordedAt: "2026-08-17T10:00:00.000Z",
    });
    const onlyB = recordResolution({
      baseDir: dir,
      subjectResourceId: subjectB.id,
      decision: "Scale down",
      recordedAt: "2026-08-17T10:01:00.000Z",
    });
    const resourceOnly = recordIncident({
      baseDir: dir,
      resolutionIds: [onlyA.id, onlyB.id],
      title: "Resource only",
      recordedAt: "2026-08-17T11:00:00.000Z",
    });

    expect(
      listIncidentsFiltered(dir, {
        investigationId: saved.record.id,
        resolutionId: invMember.id,
      }).map((row) => row.id),
    ).toEqual([mixed.id]);
    expect(
      listIncidentsFiltered(dir, {
        investigationId: saved.record.id,
        resolutionId: onlyA.id,
      }),
    ).toEqual([]);
    expect(
      listIncidentsFiltered(dir, {
        investigationId: saved.record.id,
        subjectResourceId: subjectB.id,
      }).map((row) => row.id),
    ).toEqual([mixed.id]);
    expect(
      listIncidentsFiltered(dir, {
        investigationId: saved.record.id,
        resolutionId: invMember.id,
        subjectResourceId: subjectB.id,
      }).map((row) => row.id),
    ).toEqual([mixed.id]);
    expect(
      listIncidentsFiltered(dir, {
        investigationId: saved.record.id,
        resolutionId: invMember.id,
        subjectResourceId: "sentry:project:never",
      }),
    ).toEqual([]);

    expect(
      listIncidentsFiltered(dir, { resolutionId: invMember.id }).map(
        (row) => row.id,
      ),
    ).toEqual([mixed.id]);
    expect(
      listIncidentsFiltered(dir, { subjectResourceId: subjectA.id }).map(
        (row) => row.id,
      ),
    ).toEqual([resourceOnly.id, mixed.id]);
    expect(listIncidents(dir).map((row) => row.id)).toEqual([
      resourceOnly.id,
      mixed.id,
    ]);
  });

  test("known-empty copies are distinct per investigation filter and AND", () => {
    const investigationEmpty = formatIncidentList([], {
      investigationId: "inv:none",
    });
    const withResolution = formatIncidentList([], {
      investigationId: "inv:none",
      resolutionId: "res:none",
    });
    const withSubject = formatIncidentList([], {
      investigationId: "inv:none",
      subjectResourceId: "sentry:project:none",
    });
    const withBoth = formatIncidentList([], {
      investigationId: "inv:none",
      resolutionId: "res:none",
      subjectResourceId: "sentry:project:none",
    });
    const resolutionOnly = formatIncidentList([], {
      resolutionId: "res:none",
    });
    expect(investigationEmpty).toContain(
      "No incidents recorded for investigation inv:none.",
    );
    expect(withResolution).toContain("inv:none");
    expect(withResolution).toContain("res:none");
    expect(withResolution).toContain("matches both");
    expect(withSubject).toContain("inv:none");
    expect(withSubject).toContain("sentry:project:none");
    expect(withBoth).toContain("inv:none");
    expect(withBoth).toContain("res:none");
    expect(withBoth).toContain("sentry:project:none");
    expect(withBoth).toContain("matches all");
    expect(investigationEmpty).not.toContain("No incidents recorded yet.");
    expect(investigationEmpty).not.toBe(resolutionOnly);
    expect(withResolution).not.toBe(investigationEmpty);
    expect(withSubject).not.toBe(investigationEmpty);
    expect(withBoth).not.toBe(withResolution);
  });

  test("reopen INCIDENT MEMORY, compare, and snapshot JSON stay unchanged", () => {
    const subject = seedSubject("637");
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const invMember = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const resourceMember = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    const mixed = recordIncident({
      baseDir: dir,
      resolutionIds: [invMember.id, resourceMember.id],
      title: "Mixed grouping",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });

    const reopened = formatSavedInvestigation(
      getSavedInvestigation(dir, saved.record.id),
    );
    const rendered = formatWithIncidentMemory(
      reopened,
      listIncidentsForInvestigation(dir, saved.record.id),
      "investigation",
    );
    expect(rendered).toContain("INCIDENT MEMORY");
    expect(rendered).toContain(mixed.id);
    expect(rendered).toContain("for this investigation");
    expect(serializeInvestigationSnapshot(saved.record.snapshot)).not.toContain(
      "INCIDENT MEMORY",
    );
    expect(serializeInvestigationSnapshot(saved.record.snapshot)).not.toContain(
      mixed.id,
    );
    const compared = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
      }),
    );
    expect(compared).toContain("INVESTIGATION COMPARE");
    expect(compared).not.toContain("INCIDENT MEMORY");
    expect(compared).not.toContain(mixed.id);
  });

  test("pre-058 missing incidents table: investigation retrieve is known-empty, no crash", () => {
    const subject = seedSubject("638");
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    seedResolution("res:a", subject.id, {
      investigationId: saved.record.id,
    });
    seedResolution("res:b", subject.id);
    recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const db = new Database(dbPath(dir));
    db.exec(`DROP TABLE incidents`);
    db.close();
    expect(
      listIncidentsFiltered(dir, { investigationId: saved.record.id }),
    ).toEqual([]);
    expect(listIncidentsForInvestigation(dir, saved.record.id)).toEqual([]);
  });

  test("Resolution rows still have no incident_id", () => {
    const subject = seedSubject("639");
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const invMember = recordResolution({
      baseDir: dir,
      investigationId: saved.record.id,
      decision: "Rollback",
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const resourceMember = recordResolution({
      baseDir: dir,
      subjectResourceId: subject.id,
      decision: "Hold deploys",
      recordedAt: "2026-08-16T13:01:00.000Z",
    });
    recordIncident({
      baseDir: dir,
      resolutionIds: [invMember.id, resourceMember.id],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    listIncidentsFiltered(dir, { investigationId: saved.record.id });
    const store = new Store(dir);
    store.init();
    expect(store.getResolutionRow(invMember.id)).not.toHaveProperty(
      "incidentId",
    );
    store.close();
  });
});

describe("incident-anchored resolution membership (Sprint 061)", () => {
  test("recordResolution with incidentId appends the new id only; count increments", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id, { decision: "Rollback" });
    seedResolution("res:b", subject.id, { decision: "Hold deploys" });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "API error spike",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });

    const recorded = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      decision: "Keep holding",
      recordedAt: "2026-08-18T10:00:00.000Z",
    });

    const listed = listIncidents(dir);
    expect(listed).toHaveLength(1);
    expect(listed[0]!.id).toBe(incident.id);
    expect(listed[0]!.resolutionIds).toEqual([
      "res:a",
      "res:b",
      recorded.id,
    ]);
    expect(listed[0]!.recordedAt).toBe("2026-08-17T09:00:00.000Z");
    expect(listed[0]!.title).toBe("API error spike");

    const shown = formatIncident(getIncident(dir, incident.id));
    expect(shown).toContain(recorded.id);
    expect(shown).not.toContain(recorded.decision!);
  });

  test("incidents --resolution <new res> lists that Incident; count column increments", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const recorded = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      decision: "Keep holding",
      recordedAt: "2026-08-18T10:00:00.000Z",
    });

    const forNew = listIncidentsForResolution(dir, recorded.id);
    expect(forNew.map((row) => row.id)).toEqual([incident.id]);
    expect(forNew).toHaveLength(1);
    expect(forNew[0]!.resolutionIds).toHaveLength(3);

    const listed = formatIncidentList(listIncidents(dir));
    expect(listed).toContain(incident.id);
    expect(listed).toContain("3");
    expect(listed).not.toMatch(/res:[a-f0-9-]+/);
  });

  test("exclusive membership: the new id is not on another Incident", () => {
    const subjectA = seedSubject("470");
    const subjectB = seedSubject("471");
    seedResolution("res:r1", subjectA.id);
    seedResolution("res:r2", subjectB.id);
    seedResolution("res:r3", subjectA.id);
    seedResolution("res:r4", subjectB.id);
    const targeted = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:r1", "res:r3"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const other = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:r2", "res:r4"],
      recordedAt: "2026-08-17T10:00:00.000Z",
    });

    const recorded = recordResolution({
      baseDir: dir,
      incidentId: targeted.id,
      decision: "Keep holding",
      recordedAt: "2026-08-18T10:00:00.000Z",
    });

    expect(listIncidentsForResolution(dir, recorded.id).map((r) => r.id)).toEqual(
      [targeted.id],
    );
    const otherRow = getIncident(dir, other.id);
    expect(otherRow.resolutionIds).not.toContain(recorded.id);
    expect(otherRow.resolutionIds).toHaveLength(2);
  });

  test("investigation reopen excludes the incident-anchored row; live subject memory includes it", () => {
    const subject = seedSubject();
    seedInvestigation("inv:061", subject.id);
    seedResolution("res:a", subject.id, { investigationId: "inv:061" });
    seedResolution("res:b", subject.id, { investigationId: "inv:061" });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const recorded = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      decision: "Keep holding",
      recordedAt: "2026-08-18T10:00:00.000Z",
    });

    expect(
      listResolutions(dir, { investigationId: "inv:061" }).map((r) => r.id),
    ).toEqual(["res:b", "res:a"]);
    expect(
      listResolutions(dir, { investigationId: "inv:061" }).map((r) => r.id),
    ).not.toContain(recorded.id);
    expect(
      listResolutions(dir, { subjectResourceId: subject.id }).map((r) => r.id),
    ).toContain(recorded.id);
  });

  test("058 incident --resolution still cannot add existing members after record (leftover[1])", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:d", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const recorded = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      decision: "Keep holding",
    });
    const error = expectCode(
      () =>
        recordIncident({
          baseDir: dir,
          resolutionIds: [recorded.id, "res:d"],
        }),
      "INCIDENT_MEMBERSHIP_CONFLICT",
    );
    expect(error.message).toMatch(/already belongs to another Incident/);
    expect(getIncident(dir, incident.id).resolutionIds).toEqual([
      "res:a",
      "res:b",
      recorded.id,
    ]);
    expect(listIncidents(dir)).toHaveLength(1);
  });

  test("live INCIDENT MEMORY lists the appended member; snapshot JSON stays frozen", () => {
    const subject = seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const frozen = serializeInvestigationSnapshot(saved.record.snapshot);
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "API error spike",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const recorded = recordResolution({
      baseDir: dir,
      incidentId: incident.id,
      decision: "Keep holding",
      recordedAt: "2026-08-18T10:00:00.000Z",
    });

    const live = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: subject.id }),
    );
    const rendered = formatWithIncidentMemory(
      formatWithResolutionMemory(
        live,
        listResolutions(dir, { subjectResourceId: subject.id }),
        "subject",
      ),
      listIncidentsForSubject(dir, subject.id),
      "subject",
    );
    expect(rendered).toContain("RESOLUTION MEMORY");
    expect(rendered).toContain(recorded.id);
    expect(rendered).toContain("INCIDENT MEMORY");
    expect(rendered).toContain(incident.id);
    expect(rendered).toContain("RESOLUTIONS");
    const resolutionsBlock = rendered.slice(rendered.indexOf("RESOLUTIONS"));
    expect(resolutionsBlock).toContain(recorded.id);

    expect(
      serializeInvestigationSnapshot(
        getSavedInvestigation(dir, saved.record.id).snapshot,
      ),
    ).toBe(frozen);
    expect(frozen).not.toContain("INCIDENT MEMORY");
    expect(frozen).not.toContain(recorded.id);

    const compared = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
      }),
    );
    expect(compared).toContain("INVESTIGATION COMPARE");
    expect(compared).not.toContain("INCIDENT MEMORY");
    expect(compared).not.toContain(recorded.id);
    expect(compared).not.toContain(incident.id);
  });
});

describe("add existing members after Incident record (Sprint 062)", () => {
  test("appends one ungrouped id; recordedAt/title and Resolution row unchanged", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id, { decision: "Rollback" });
    seedResolution("res:b", subject.id, { decision: "Hold deploys" });
    seedResolution("res:d", subject.id, { decision: "Scale up" });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "API error spike",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });

    const result = appendIncidentResolutions({
      baseDir: dir,
      incidentId: incident.id,
      resolutionIds: ["res:d"],
    });
    expect(result.appendedIds).toEqual(["res:d"]);
    expect(result.record.id).toBe(incident.id);
    expect(result.record.resolutionIds).toEqual(["res:a", "res:b", "res:d"]);
    expect(result.record.recordedAt).toBe("2026-08-17T09:00:00.000Z");
    expect(result.record.title).toBe("API error spike");

    const stored = getIncident(dir, incident.id);
    expect(stored.resolutionIds).toEqual(["res:a", "res:b", "res:d"]);
    expect(stored.recordedAt).toBe("2026-08-17T09:00:00.000Z");
    expect(stored.title).toBe("API error spike");

    const resolution = getResolution(dir, "res:d");
    expect(resolution).not.toHaveProperty("incidentId");
    expect(resolution.decision).toBe("Scale up");
    expect(resolution.investigationId).toBeUndefined();

    const probe = new Database(dbPath(dir));
    const columns = probe
      .query(`PRAGMA table_info(resolutions)`)
      .all() as Array<{ name: string }>;
    probe.close();
    expect(columns.map((c) => c.name)).not.toContain("incident_id");
  });

  test("confirmation names the inc: and appended ids; resolution show has no INCIDENT heading", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:d", subject.id, { decision: "Scale up" });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const result = appendIncidentResolutions({
      baseDir: dir,
      incidentId: incident.id,
      resolutionIds: ["res:d"],
    });
    const confirm = formatIncidentAppendConfirmation(
      result.record,
      result.appendedIds,
    );
    expect(confirm).toContain(`Updated incident ${incident.id}`);
    expect(confirm).toContain("res:d");
    expect(confirm).not.toMatch(/^Recorded incident/);
    expect(confirm).not.toContain("res:a");
    const shown = formatIncident(result.record);
    expect(shown).toContain("res:d");
    expect(formatResolution(getResolution(dir, "res:d"))).not.toMatch(
      /INCIDENT|incident/i,
    );
  });

  test("two named ids append in first-seen order", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:d", subject.id);
    seedResolution("res:e", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const result = appendIncidentResolutions({
      baseDir: dir,
      incidentId: incident.id,
      resolutionIds: ["res:e", "res:d", "res:e"],
    });
    expect(result.appendedIds).toEqual(["res:e", "res:d"]);
    expect(result.record.resolutionIds).toEqual([
      "res:a",
      "res:b",
      "res:e",
      "res:d",
    ]);
  });

  test("already-on-this ids collapse; leftover new ids still append", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:d", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const result = appendIncidentResolutions({
      baseDir: dir,
      incidentId: incident.id,
      resolutionIds: ["res:a", "res:d"],
    });
    expect(result.appendedIds).toEqual(["res:d"]);
    expect(result.record.resolutionIds).toEqual(["res:a", "res:b", "res:d"]);
  });

  test("named set already on this Incident is INCIDENT_MEMBERS_UNCHANGED", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const error = expectCode(
      () =>
        appendIncidentResolutions({
          baseDir: dir,
          incidentId: incident.id,
          resolutionIds: ["res:b", "res:a"],
        }),
      "INCIDENT_MEMBERS_UNCHANGED",
    );
    expect(error.message).toContain(incident.id);
    expect(getIncident(dir, incident.id).resolutionIds).toEqual([
      "res:a",
      "res:b",
    ]);
  });

  test("named id on another Incident is MEMBERSHIP_CONFLICT; nothing appended", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:c", subject.id);
    seedResolution("res:d", subject.id);
    const targeted = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const other = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:c", "res:d"],
      recordedAt: "2026-08-17T10:00:00.000Z",
    });
    const error = expectCode(
      () =>
        appendIncidentResolutions({
          baseDir: dir,
          incidentId: targeted.id,
          resolutionIds: ["res:c"],
        }),
      "INCIDENT_MEMBERSHIP_CONFLICT",
    );
    expect(error.message).toContain("res:c");
    expect(error.message).toContain(other.id);
    expect(getIncident(dir, targeted.id).resolutionIds).toEqual([
      "res:a",
      "res:b",
    ]);
    expect(getIncident(dir, other.id).resolutionIds).toEqual(["res:c", "res:d"]);
  });

  test("unknown inc: is INCIDENT_NOT_FOUND; unknown res: is RESOLUTION_NOT_FOUND", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:d", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    expectCode(
      () =>
        appendIncidentResolutions({
          baseDir: dir,
          incidentId: "inc:missing",
          resolutionIds: ["res:d"],
        }),
      "INCIDENT_NOT_FOUND",
    );
    const missingRes = expectCode(
      () =>
        appendIncidentResolutions({
          baseDir: dir,
          incidentId: incident.id,
          resolutionIds: ["res:missing"],
        }),
      "RESOLUTION_NOT_FOUND",
    );
    expect(missingRes.message).toContain("res:missing");
    expect(getIncident(dir, incident.id).resolutionIds).toEqual([
      "res:a",
      "res:b",
    ]);
  });

  test("cross-resource append is allowed; 061 --incident stays homogeneous-only", () => {
    const subjectA = seedSubject("470");
    const subjectB = seedSubject("471");
    seedResolution("res:a", subjectA.id);
    seedResolution("res:b", subjectA.id);
    seedResolution("res:d", subjectB.id, { decision: "Repo hold" });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    const result = appendIncidentResolutions({
      baseDir: dir,
      incidentId: incident.id,
      resolutionIds: ["res:d"],
    });
    expect(result.record.resolutionIds).toEqual(["res:a", "res:b", "res:d"]);
    const error = expectCode(
      () =>
        recordResolution({
          baseDir: dir,
          incidentId: incident.id,
          decision: "Keep holding",
        }),
      "INCIDENT_SUBJECT_AMBIGUOUS",
    );
    expect(error.message).toMatch(/spans different subjects/);
    expect(listResolutions(dir).map((r) => r.id).sort()).toEqual([
      "res:a",
      "res:b",
      "res:d",
    ]);
  });

  test("058 create unchanged when positional is absent", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const created = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "Create still works",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    expect(created.id.startsWith("inc:")).toBe(true);
    expect(created.resolutionIds).toEqual(["res:a", "res:b"]);
    expect(created.title).toBe("Create still works");
  });

  test("incidents --resolution lists the grouping; count increments; INCIDENT MEMORY includes the id", () => {
    const subject = seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const frozen = serializeInvestigationSnapshot(saved.record.snapshot);
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:d", subject.id, { decision: "Scale up" });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "API error spike",
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    appendIncidentResolutions({
      baseDir: dir,
      incidentId: incident.id,
      resolutionIds: ["res:d"],
    });

    expect(listIncidentsForResolution(dir, "res:d").map((r) => r.id)).toEqual([
      incident.id,
    ]);
    const listed = formatIncidentList(listIncidents(dir));
    expect(listed).toContain(incident.id);
    expect(listed).toContain("3");
    expect(listed).not.toMatch(/res:[a-f0-9-]+/);

    const live = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: subject.id }),
    );
    const rendered = formatWithIncidentMemory(
      live,
      listIncidentsForSubject(dir, subject.id),
      "subject",
    );
    expect(rendered).toContain("INCIDENT MEMORY");
    expect(rendered).toContain("res:d");

    expect(
      serializeInvestigationSnapshot(
        getSavedInvestigation(dir, saved.record.id).snapshot,
      ),
    ).toBe(frozen);
    const compared = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
      }),
    );
    expect(compared).not.toContain("INCIDENT MEMORY");
    expect(compared).not.toContain("res:d");
  });

  test("061 leftover: incident --resolution create still cannot steal grouped ids", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:d", subject.id);
    seedResolution("res:e", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-17T09:00:00.000Z",
    });
    appendIncidentResolutions({
      baseDir: dir,
      incidentId: incident.id,
      resolutionIds: ["res:d"],
    });
    const error = expectCode(
      () =>
        recordIncident({
          baseDir: dir,
          resolutionIds: ["res:d", "res:e"],
        }),
      "INCIDENT_MEMBERSHIP_CONFLICT",
    );
    expect(error.message).toMatch(/already belongs to another Incident/);
    expect(listIncidents(dir)).toHaveLength(1);
  });
});

describe("remove existing members after Incident record (Sprint 065)", () => {
  test("drops one current member; remaining ≥2; Resolution row still loads", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id, { decision: "Rollback" });
    seedResolution("res:b", subject.id, { decision: "Hold deploys" });
    seedResolution("res:c", subject.id, { decision: "Scale up" });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b", "res:c"],
      title: "API error spike",
      recordedAt: "2026-08-18T09:00:00.000Z",
    });

    const result = removeIncidentResolutions({
      baseDir: dir,
      incidentId: incident.id,
      resolutionIds: ["res:c"],
    });
    expect(result.removedIds).toEqual(["res:c"]);
    expect(result.record.id).toBe(incident.id);
    expect(result.record.resolutionIds).toEqual(["res:a", "res:b"]);
    expect(result.record.recordedAt).toBe("2026-08-18T09:00:00.000Z");
    expect(result.record.title).toBe("API error spike");

    const stored = getIncident(dir, incident.id);
    expect(stored.resolutionIds).toEqual(["res:a", "res:b"]);
    expect(stored.recordedAt).toBe("2026-08-18T09:00:00.000Z");
    expect(stored.title).toBe("API error spike");

    const resolution = getResolution(dir, "res:c");
    expect(resolution).not.toHaveProperty("incidentId");
    expect(resolution.decision).toBe("Scale up");

    const probe = new Database(dbPath(dir));
    const resolutionColumns = probe
      .query(`PRAGMA table_info(resolutions)`)
      .all() as Array<{ name: string }>;
    const incidents = probe
      .query(`SELECT id FROM incidents`)
      .all() as Array<{ id: string }>;
    probe.close();
    expect(resolutionColumns.map((c) => c.name)).not.toContain("incident_id");
    expect(incidents.map((row) => row.id)).toEqual([incident.id]);
    expect(stored.resolutionIds.some((id) => id.startsWith("inv:"))).toBe(
      false,
    );
  });

  test("confirmation names the inc: and removed ids; resolution show has no INCIDENT heading", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:c", subject.id, { decision: "Scale up" });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b", "res:c"],
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    const result = removeIncidentResolutions({
      baseDir: dir,
      incidentId: incident.id,
      resolutionIds: ["res:c"],
    });
    const confirm = formatIncidentRemoveConfirmation(
      result.record,
      result.removedIds,
    );
    expect(confirm).toContain(`Removed from incident ${incident.id}`);
    expect(confirm).toContain("res:c");
    expect(confirm).not.toMatch(/^Recorded incident/);
    expect(confirm).not.toMatch(/^Updated incident/);
    expect(confirm).not.toContain("res:a");
    const shown = formatIncident(result.record);
    expect(shown).toContain("res:a");
    expect(shown).toContain("res:b");
    expect(shown).not.toContain("res:c");
    expect(formatResolution(getResolution(dir, "res:c"))).not.toMatch(
      /INCIDENT|incident/i,
    );
  });

  test("two named ids remove in first-seen order; remaining keep order", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:c", subject.id);
    seedResolution("res:d", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b", "res:c", "res:d"],
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    const result = removeIncidentResolutions({
      baseDir: dir,
      incidentId: incident.id,
      resolutionIds: ["res:c", "res:a", "res:c"],
    });
    expect(result.removedIds).toEqual(["res:c", "res:a"]);
    expect(result.record.resolutionIds).toEqual(["res:b", "res:d"]);
  });

  test("duplicates collapse first-seen", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:c", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b", "res:c"],
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    const result = removeIncidentResolutions({
      baseDir: dir,
      incidentId: incident.id,
      resolutionIds: ["res:c", "res:c"],
    });
    expect(result.removedIds).toEqual(["res:c"]);
    expect(result.record.resolutionIds).toEqual(["res:a", "res:b"]);
  });

  test("named id not on this Incident fails; nothing removed", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:c", subject.id);
    seedResolution("res:d", subject.id);
    seedResolution("res:e", subject.id);
    const targeted = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b", "res:c"],
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    const other = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:d", "res:e"],
      recordedAt: "2026-08-18T10:00:00.000Z",
    });
    const onOther = expectCode(
      () =>
        removeIncidentResolutions({
          baseDir: dir,
          incidentId: targeted.id,
          resolutionIds: ["res:d"],
        }),
      "INCIDENT_MEMBER_NOT_ON_INCIDENT",
    );
    expect(onOther.message).toContain("res:d");
    expect(onOther.message).toContain(targeted.id);
    seedResolution("res:f", subject.id, { decision: "Later" });
    const ungrouped = expectCode(
      () =>
        removeIncidentResolutions({
          baseDir: dir,
          incidentId: targeted.id,
          resolutionIds: ["res:f"],
        }),
      "INCIDENT_MEMBER_NOT_ON_INCIDENT",
    );
    expect(ungrouped.message).toContain("res:f");
    expect(getIncident(dir, targeted.id).resolutionIds).toEqual([
      "res:a",
      "res:b",
      "res:c",
    ]);
    expect(getIncident(dir, other.id).resolutionIds).toEqual(["res:d", "res:e"]);
  });

  test("unknown inc: is INCIDENT_NOT_FOUND; unknown res: is RESOLUTION_NOT_FOUND", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:c", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b", "res:c"],
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    expectCode(
      () =>
        removeIncidentResolutions({
          baseDir: dir,
          incidentId: "inc:missing",
          resolutionIds: ["res:c"],
        }),
      "INCIDENT_NOT_FOUND",
    );
    const missingRes = expectCode(
      () =>
        removeIncidentResolutions({
          baseDir: dir,
          incidentId: incident.id,
          resolutionIds: ["res:missing"],
        }),
      "RESOLUTION_NOT_FOUND",
    );
    expect(missingRes.message).toContain("res:missing");
    expect(getIncident(dir, incident.id).resolutionIds).toEqual([
      "res:a",
      "res:b",
      "res:c",
    ]);
  });

  test("named set that would leave fewer than two fails; Incident and members unchanged", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:c", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b", "res:c"],
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    const error = expectCode(
      () =>
        removeIncidentResolutions({
          baseDir: dir,
          incidentId: incident.id,
          resolutionIds: ["res:a", "res:b"],
        }),
      "INCIDENT_MEMBERS_REQUIRED",
    );
    expect(error.message).toMatch(/at least two/);
    expect(getIncident(dir, incident.id).resolutionIds).toEqual([
      "res:a",
      "res:b",
      "res:c",
    ]);
    expect(listResolutions(dir).map((r) => r.id).sort()).toEqual([
      "res:a",
      "res:b",
      "res:c",
    ]);
  });

  test("detached id may later append onto the same or another Incident", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:c", subject.id);
    seedResolution("res:d", subject.id);
    seedResolution("res:e", subject.id);
    const first = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b", "res:c"],
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    const second = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:d", "res:e"],
      recordedAt: "2026-08-18T10:00:00.000Z",
    });
    removeIncidentResolutions({
      baseDir: dir,
      incidentId: first.id,
      resolutionIds: ["res:c"],
    });
    const reappend = appendIncidentResolutions({
      baseDir: dir,
      incidentId: first.id,
      resolutionIds: ["res:c"],
    });
    expect(reappend.record.resolutionIds).toEqual(["res:a", "res:b", "res:c"]);
    removeIncidentResolutions({
      baseDir: dir,
      incidentId: first.id,
      resolutionIds: ["res:c"],
    });
    const ontoOther = appendIncidentResolutions({
      baseDir: dir,
      incidentId: second.id,
      resolutionIds: ["res:c"],
    });
    expect(ontoOther.record.resolutionIds).toEqual(["res:d", "res:e", "res:c"]);
    expect(getIncident(dir, first.id).resolutionIds).toEqual(["res:a", "res:b"]);
  });

  test("062 append / 058 create unchanged when the remove flag is absent", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:d", subject.id);
    const created = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "Create still works",
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    expect(created.resolutionIds).toEqual(["res:a", "res:b"]);
    const appended = appendIncidentResolutions({
      baseDir: dir,
      incidentId: created.id,
      resolutionIds: ["res:d"],
    });
    expect(appended.record.resolutionIds).toEqual(["res:a", "res:b", "res:d"]);
  });

  test("incidents count decrements; --resolution of removed is known-empty; INCIDENT MEMORY observes remaining", () => {
    const subject = seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const frozen = serializeInvestigationSnapshot(saved.record.snapshot);
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    seedResolution("res:c", subject.id, { decision: "Scale up" });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b", "res:c"],
      title: "API error spike",
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    removeIncidentResolutions({
      baseDir: dir,
      incidentId: incident.id,
      resolutionIds: ["res:c"],
    });

    expect(listIncidentsForResolution(dir, "res:c")).toEqual([]);
    expect(listIncidentsForResolution(dir, "res:a").map((r) => r.id)).toEqual([
      incident.id,
    ]);
    const listed = formatIncidentList(listIncidents(dir));
    expect(listed).toContain(incident.id);
    expect(listed).toContain("2");
    expect(listed).not.toMatch(/res:[a-c]/);

    const live = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: subject.id }),
    );
    const rendered = formatWithIncidentMemory(
      live,
      listIncidentsForSubject(dir, subject.id),
      "subject",
    );
    expect(rendered).toContain("INCIDENT MEMORY");
    expect(rendered).toContain("res:a");
    expect(rendered).toContain("res:b");
    expect(rendered).not.toContain("res:c");

    expect(
      serializeInvestigationSnapshot(
        getSavedInvestigation(dir, saved.record.id).snapshot,
      ),
    ).toBe(frozen);
    const compared = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
      }),
    );
    expect(compared).not.toContain("INCIDENT MEMORY");
    expect(compared).not.toContain("res:c");
  });
});

describe("retitle an existing Incident (Sprint 066)", () => {
  test("replaces the stored title; members and recordedAt unchanged", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id, { decision: "Rollback" });
    seedResolution("res:b", subject.id, { decision: "Hold deploys" });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "API error spike",
      recordedAt: "2026-08-18T09:00:00.000Z",
    });

    const renamed = retitleIncident({
      baseDir: dir,
      incidentId: incident.id,
      title: "Better name",
    });
    expect(renamed.id).toBe(incident.id);
    expect(renamed.title).toBe("Better name");
    expect(renamed.recordedAt).toBe("2026-08-18T09:00:00.000Z");
    expect(renamed.resolutionIds).toEqual(["res:a", "res:b"]);

    const stored = getIncident(dir, incident.id);
    expect(stored.title).toBe("Better name");
    expect(stored.recordedAt).toBe("2026-08-18T09:00:00.000Z");
    expect(stored.resolutionIds).toEqual(["res:a", "res:b"]);

    const probe = new Database(dbPath(dir));
    const columns = probe
      .query(`PRAGMA table_info(resolutions)`)
      .all() as Array<{ name: string }>;
    probe.close();
    expect(columns.map((c) => c.name)).not.toContain("incident_id");
    expect(stored.resolutionIds.some((id) => id.startsWith("inv:"))).toBe(
      false,
    );
  });

  test("grouping that omitted title at create can gain a first title", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    expect(incident.title).toBeUndefined();
    const renamed = retitleIncident({
      baseDir: dir,
      incidentId: incident.id,
      title: "Named later",
    });
    expect(renamed.title).toBe("Named later");
    expect(formatIncident(renamed)).toContain("Named later");
    expect(getIncident(dir, incident.id).recordedAt).toBe(
      "2026-08-18T09:00:00.000Z",
    );
  });

  test("confirmation names the inc: and the new title; distinct from create/append/remove", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "API error spike",
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    const renamed = retitleIncident({
      baseDir: dir,
      incidentId: incident.id,
      title: "Better name",
    });
    const confirm = formatIncidentRetitleConfirmation(renamed);
    expect(confirm).toContain(`Renamed incident ${incident.id}`);
    expect(confirm).toContain("Better name");
    expect(confirm).not.toContain("API error spike");
    expect(confirm).not.toMatch(/^Recorded incident/);
    expect(confirm).not.toMatch(/^Updated incident/);
    expect(confirm).not.toMatch(/^Removed from incident/);
    const shown = formatIncident(renamed);
    expect(shown).toContain("TITLE");
    expect(shown).toContain("Better name");
    expect(shown).not.toContain("API error spike");
  });

  test("same text as stored title is INCIDENT_TITLE_UNCHANGED; nothing written", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "API error spike",
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    const error = expectCode(
      () =>
        retitleIncident({
          baseDir: dir,
          incidentId: incident.id,
          title: "  API error spike  ",
        }),
      "INCIDENT_TITLE_UNCHANGED",
    );
    expect(error.message).toContain(incident.id);
    expect(getIncident(dir, incident.id).title).toBe("API error spike");
  });

  test("unknown inc: is INCIDENT_NOT_FOUND", () => {
    expectCode(
      () =>
        retitleIncident({
          baseDir: dir,
          incidentId: "inc:missing",
          title: "Better name",
        }),
      "INCIDENT_NOT_FOUND",
    );
  });

  test("058 create with title unchanged when positional is absent", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const created = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "Create still works",
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    expect(created.title).toBe("Create still works");
    expect(created.resolutionIds).toEqual(["res:a", "res:b"]);
  });

  test("incidents list TITLE column and INCIDENT MEMORY observe the new title", () => {
    const subject = seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const frozen = serializeInvestigationSnapshot(saved.record.snapshot);
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "API error spike",
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    retitleIncident({
      baseDir: dir,
      incidentId: incident.id,
      title: "Better name",
    });

    const listed = formatIncidentList(listIncidents(dir));
    expect(listed).toContain("Better name");
    expect(listed).not.toContain("API error spike");

    const live = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: subject.id }),
    );
    const rendered = formatWithIncidentMemory(
      live,
      listIncidentsForSubject(dir, subject.id),
      "subject",
    );
    expect(rendered).toContain("INCIDENT MEMORY");
    expect(rendered).toContain("Better name");
    expect(rendered).not.toContain("API error spike");

    expect(
      serializeInvestigationSnapshot(
        getSavedInvestigation(dir, saved.record.id).snapshot,
      ),
    ).toBe(frozen);
    const compared = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
      }),
    );
    expect(compared).not.toContain("INCIDENT MEMORY");
    expect(compared).not.toContain("Better name");
  });
});

describe("clear an existing Incident title (Sprint 067)", () => {
  test("omits a stored title; members and recordedAt unchanged", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id, { decision: "Rollback" });
    seedResolution("res:b", subject.id, { decision: "Hold deploys" });
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "API error spike",
      recordedAt: "2026-08-18T09:00:00.000Z",
    });

    const cleared = clearIncidentTitle({
      baseDir: dir,
      incidentId: incident.id,
    });
    expect(cleared.id).toBe(incident.id);
    expect(cleared.title).toBeUndefined();
    expect(cleared.recordedAt).toBe("2026-08-18T09:00:00.000Z");
    expect(cleared.resolutionIds).toEqual(["res:a", "res:b"]);

    const stored = getIncident(dir, incident.id);
    expect(stored.title).toBeUndefined();
    expect(stored.recordedAt).toBe("2026-08-18T09:00:00.000Z");
    expect(stored.resolutionIds).toEqual(["res:a", "res:b"]);
    expect(formatIncident(stored)).not.toContain("TITLE");
    expect(formatIncident(stored)).not.toContain("API error spike");

    const probe = new Database(dbPath(dir));
    const columns = probe
      .query(`PRAGMA table_info(resolutions)`)
      .all() as Array<{ name: string }>;
    const row = probe
      .query(`SELECT title FROM incidents WHERE id = ?`)
      .get(incident.id) as { title: string | null };
    probe.close();
    expect(columns.map((c) => c.name)).not.toContain("incident_id");
    expect(row.title).toBeNull();
    expect(stored.resolutionIds.some((id) => id.startsWith("inv:"))).toBe(
      false,
    );
  });

  test("confirmation names the inc: and is distinct from create/append/remove/retitle", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "API error spike",
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    const cleared = clearIncidentTitle({
      baseDir: dir,
      incidentId: incident.id,
    });
    const confirm = formatIncidentClearTitleConfirmation(cleared);
    expect(confirm).toContain(`Cleared incident title ${incident.id}`);
    expect(confirm).not.toMatch(/^Recorded incident/);
    expect(confirm).not.toMatch(/^Updated incident/);
    expect(confirm).not.toMatch(/^Removed from incident/);
    expect(confirm).not.toMatch(/^Renamed incident/);
    expect(confirm).not.toContain("API error spike");
  });

  test("already-omitted title is INCIDENT_TITLE_UNCHANGED; nothing written", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    const error = expectCode(
      () =>
        clearIncidentTitle({
          baseDir: dir,
          incidentId: incident.id,
        }),
      "INCIDENT_TITLE_UNCHANGED",
    );
    expect(error.message).toContain(incident.id);
    expect(getIncident(dir, incident.id).title).toBeUndefined();
  });

  test("unknown inc: is INCIDENT_NOT_FOUND", () => {
    expectCode(
      () =>
        clearIncidentTitle({
          baseDir: dir,
          incidentId: "inc:missing",
        }),
      "INCIDENT_NOT_FOUND",
    );
  });

  test("after clear, retitle can set a first title again", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "API error spike",
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    clearIncidentTitle({ baseDir: dir, incidentId: incident.id });
    const renamed = retitleIncident({
      baseDir: dir,
      incidentId: incident.id,
      title: "Named again",
    });
    expect(renamed.title).toBe("Named again");
    expect(renamed.recordedAt).toBe("2026-08-18T09:00:00.000Z");
  });

  test("066 retitle unchanged when clear is absent", () => {
    const subject = seedSubject();
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "API error spike",
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    const renamed = retitleIncident({
      baseDir: dir,
      incidentId: incident.id,
      title: "Better name",
    });
    expect(renamed.title).toBe("Better name");
  });

  test("list TITLE column is -; INCIDENT MEMORY omits TITLE", () => {
    const subject = seedSubject();
    const saved = saveInvestigation({
      baseDir: dir,
      resourceRef: subject.id,
      composedAt: "2026-08-16T12:00:00.000Z",
    });
    const frozen = serializeInvestigationSnapshot(saved.record.snapshot);
    seedResolution("res:a", subject.id);
    seedResolution("res:b", subject.id);
    const incident = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:a", "res:b"],
      title: "API error spike",
      recordedAt: "2026-08-18T09:00:00.000Z",
    });
    clearIncidentTitle({ baseDir: dir, incidentId: incident.id });

    const listed = formatIncidentList(listIncidents(dir));
    expect(listed).toContain("-");
    expect(listed).not.toContain("API error spike");

    const live = formatInvestigationContext(
      getInvestigationContext({ baseDir: dir, resourceRef: subject.id }),
    );
    const rendered = formatWithIncidentMemory(
      live,
      listIncidentsForSubject(dir, subject.id),
      "subject",
    );
    expect(rendered).toContain("INCIDENT MEMORY");
    expect(rendered).not.toContain("TITLE");
    expect(rendered).not.toContain("API error spike");

    expect(
      serializeInvestigationSnapshot(
        getSavedInvestigation(dir, saved.record.id).snapshot,
      ),
    ).toBe(frozen);
    const compared = formatInvestigationCompare(
      compareInvestigationToCurrent({
        baseDir: dir,
        investigationId: saved.record.id,
      }),
    );
    expect(compared).not.toContain("INCIDENT MEMORY");
  });
});
