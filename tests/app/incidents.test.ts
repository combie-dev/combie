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
  getIncident,
  listIncidents,
  recordIncident,
} from "../../src/app/incidents.ts";
import {
  getSavedInvestigation,
  saveInvestigation,
  serializeInvestigationSnapshot,
} from "../../src/app/investigations.ts";
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
