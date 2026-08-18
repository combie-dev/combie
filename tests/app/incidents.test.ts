import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initCombie } from "../../src/app/init.ts";
import { CombieError } from "../../src/app/errors.ts";
import {
  formatIncident,
  formatIncidentConfirmation,
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
  formatWithResolutionMemory,
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
