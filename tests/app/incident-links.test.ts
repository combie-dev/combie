import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { CombieError } from "../../src/app/errors.ts";
import {
  formatIncidentLink,
  formatIncidentLinkConfirmation,
  formatIncidentLinks,
  getIncidentLink,
  listIncidentLinks,
  recordIncidentLink,
} from "../../src/app/incident-links.ts";
import { initCombie } from "../../src/app/init.ts";
import { getIncident, recordIncident } from "../../src/app/incidents.ts";
import { incidentLinkId } from "../../src/domain/incident-link.ts";
import { createResource } from "../../src/domain/resource.ts";
import { dbPath } from "../../src/storage/paths.ts";
import { Store } from "../../src/storage/store.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "combie-ilink-app-"));
  initCombie(dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function seedSubject(
  providerResourceId = "450",
): ReturnType<typeof createResource> {
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
  recordedAt = "2026-08-16T12:00:00.000Z",
): void {
  const store = new Store(dir);
  store.init();
  store.insertResolution({
    id,
    subjectResourceId,
    recordedAt,
    decision: "decide",
  });
  store.close();
}

function seedIncidentPair(
  resA: string,
  resB: string,
  resC: string,
  resD: string,
  subjectResourceId: string,
): { first: ReturnType<typeof recordIncident>; second: ReturnType<typeof recordIncident> } {
  seedResolution(resA, subjectResourceId);
  seedResolution(resB, subjectResourceId);
  seedResolution(resC, subjectResourceId);
  seedResolution(resD, subjectResourceId);
  const first = recordIncident({
    baseDir: dir,
    resolutionIds: [resA, resB],
    title: "First",
    recordedAt: "2026-08-16T13:00:00.000Z",
  });
  const second = recordIncident({
    baseDir: dir,
    resolutionIds: [resC, resD],
    title: "Second",
    recordedAt: "2026-08-16T14:00:00.000Z",
  });
  return { first, second };
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

describe("incident link application", () => {
  test("incidentLinkId produces stable ilink: identity", () => {
    expect(incidentLinkId("abc")).toBe("ilink:abc");
    expect(incidentLinkId("00000000-0000-0000-0000-000000000001")).toBe(
      "ilink:00000000-0000-0000-0000-000000000001",
    );
  });

  test("create requires exactly two distinct existing Incident ids and a non-blank reason", () => {
    const subject = seedSubject();
    const { first, second } = seedIncidentPair(
      "res:1",
      "res:2",
      "res:3",
      "res:4",
      subject.id,
    );

    expectCode(
      () =>
        recordIncidentLink({
          baseDir: dir,
          incidentIds: [first.id],
          reason: "only one",
        }),
      "INCIDENT_LINK_PAIR_REQUIRED",
    );

    expectCode(
      () =>
        recordIncidentLink({
          baseDir: dir,
          incidentIds: [first.id, first.id],
          reason: "same twice",
        }),
      "INCIDENT_LINK_PAIR_REQUIRED",
    );

    expectCode(
      () =>
        recordIncidentLink({
          baseDir: dir,
          incidentIds: [first.id, second.id, "inc:extra"],
          reason: "three",
        }),
      "INCIDENT_LINK_PAIR_REQUIRED",
    );

    expectCode(
      () =>
        recordIncidentLink({
          baseDir: dir,
          incidentIds: [first.id, second.id],
          reason: "   ",
        }),
      "INCIDENT_LINK_REASON_REQUIRED",
    );

    expectCode(
      () =>
        recordIncidentLink({
          baseDir: dir,
          incidentIds: [first.id, "inc:missing"],
          reason: "unknown partner",
        }),
      "INCIDENT_NOT_FOUND",
    );

    // Atomic: nothing inserted after failures.
    expect(listIncidentLinks(dir)).toEqual([]);
  });

  test("input order canonicalizes and reverse duplicate fails with INCIDENT_LINK_EXISTS", () => {
    const subject = seedSubject();
    const { first, second } = seedIncidentPair(
      "res:1",
      "res:2",
      "res:3",
      "res:4",
      subject.id,
    );
    const [lexicalA, lexicalB] =
      first.id < second.id ? [first.id, second.id] : [second.id, first.id];

    const recorded = recordIncidentLink({
      baseDir: dir,
      incidentIds: [lexicalB, lexicalA],
      reason: "Same customer-visible failure mode",
      recordedAt: "2026-08-26T12:00:00.000Z",
    });

    expect(recorded.id.startsWith("ilink:")).toBe(true);
    expect(recorded.incidentIds).toEqual([lexicalA, lexicalB]);
    expect(recorded.reason).toBe("Same customer-visible failure mode");
    expect(recorded.recordedAt).toBe("2026-08-26T12:00:00.000Z");

    expectCode(
      () =>
        recordIncidentLink({
          baseDir: dir,
          incidentIds: [lexicalA, lexicalB],
          reason: "retry same order",
        }),
      "INCIDENT_LINK_EXISTS",
    );
    expectCode(
      () =>
        recordIncidentLink({
          baseDir: dir,
          incidentIds: [lexicalB, lexicalA],
          reason: "retry reverse order",
        }),
      "INCIDENT_LINK_EXISTS",
    );

    expect(listIncidentLinks(dir)).toHaveLength(1);
    expect(listIncidentLinks(dir)[0]!.id).toBe(recorded.id);
  });

  test("link write leaves both Incident bodies, members, title, and clocks unchanged", () => {
    const subject = seedSubject();
    const { first, second } = seedIncidentPair(
      "res:1",
      "res:2",
      "res:3",
      "res:4",
      subject.id,
    );
    const beforeFirst = structuredClone(getIncident(dir, first.id));
    const beforeSecond = structuredClone(getIncident(dir, second.id));

    recordIncidentLink({
      baseDir: dir,
      incidentIds: [first.id, second.id],
      reason: "organizational claim",
    });

    expect(getIncident(dir, first.id)).toEqual(beforeFirst);
    expect(getIncident(dir, second.id)).toEqual(beforeSecond);
  });

  test("show/list/filter is deterministic; empty exact filter is known-empty", () => {
    const subject = seedSubject();
    seedResolution("res:1", subject.id);
    seedResolution("res:2", subject.id);
    seedResolution("res:3", subject.id);
    seedResolution("res:4", subject.id);
    seedResolution("res:5", subject.id);
    seedResolution("res:6", subject.id);
    const a = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:1", "res:2"],
      recordedAt: "2026-08-16T13:00:00.000Z",
    });
    const b = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:3", "res:4"],
      recordedAt: "2026-08-16T14:00:00.000Z",
    });
    const c = recordIncident({
      baseDir: dir,
      resolutionIds: ["res:5", "res:6"],
      recordedAt: "2026-08-16T15:00:00.000Z",
    });

    const older = recordIncidentLink({
      baseDir: dir,
      incidentIds: [a.id, b.id],
      reason: "older link",
      recordedAt: "2026-08-26T10:00:00.000Z",
    });
    const newer = recordIncidentLink({
      baseDir: dir,
      incidentIds: [b.id, c.id],
      reason: "newer link",
      recordedAt: "2026-08-26T11:00:00.000Z",
    });

    const listed = listIncidentLinks(dir);
    expect(listed.map((r) => r.id)).toEqual([newer.id, older.id]);

    const filtered = listIncidentLinks(dir, { incidentId: b.id });
    expect(filtered.map((r) => r.id)).toEqual([newer.id, older.id]);

    const empty = listIncidentLinks(dir, { incidentId: "inc:nobody" });
    expect(empty).toEqual([]);
    const emptyText = formatIncidentLinks(empty, { incidentId: "inc:nobody" });
    expect(emptyText).toContain("inc:nobody");
    expect(emptyText.toLowerCase()).toContain("known-empty");

    const shown = getIncidentLink(dir, older.id);
    expect(shown.id).toBe(older.id);
    expect(formatIncidentLink(shown)).toContain(older.id);
    expect(formatIncidentLink(shown)).toContain("older link");
    expect(formatIncidentLinkConfirmation(older)).toContain(older.id);

    expectCode(
      () => getIncidentLink(dir, "ilink:missing"),
      "INCIDENT_LINK_NOT_FOUND",
    );
  });

  test("pre-112 databases return no links on read without creating a table or changing bytes; init upgrades additively", () => {
    const legacyDir = mkdtempSync(join(tmpdir(), "combie-ilink-legacy-"));
    try {
      const path = dbPath(legacyDir);
      const legacy = new Database(path, { create: true });
      legacy.exec(`
        CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        INSERT INTO meta (key, value) VALUES ('initialized', 'true');
        CREATE TABLE incidents (
          id TEXT PRIMARY KEY,
          recorded_at TEXT NOT NULL,
          occurred_at TEXT,
          title TEXT,
          resolution_ids TEXT NOT NULL
        );
        INSERT INTO incidents (id, recorded_at, title, resolution_ids)
        VALUES
          ('inc:keep', '2026-08-16T12:00:00.000Z', 'keep', '["res:1","res:2"]'),
          ('inc:other', '2026-08-16T13:00:00.000Z', 'other', '["res:3","res:4"]');
      `);
      legacy.close();

      const digest = () =>
        createHash("sha256").update(readFileSync(path)).digest("hex");
      const before = digest();

      expect(listIncidentLinks(legacyDir)).toEqual([]);
      expect(listIncidentLinks(legacyDir, { incidentId: "inc:keep" })).toEqual(
        [],
      );
      expect(digest()).toBe(before);

      const check = new Database(path, { readonly: true });
      const tablesBefore = (
        check
          .query(
            "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
          )
          .all() as Array<{ name: string }>
      ).map((row) => row.name);
      check.close();
      expect(tablesBefore).not.toContain("incident_links");

      const link = recordIncidentLink({
        baseDir: legacyDir,
        incidentIds: ["inc:keep", "inc:other"],
        reason: "additive upgrade",
      });
      expect(link.id.startsWith("ilink:")).toBe(true);
      expect(getIncidentLink(legacyDir, link.id).reason).toBe(
        "additive upgrade",
      );
      expect(getIncident(legacyDir, "inc:keep").title).toBe("keep");
      expect(getIncident(legacyDir, "inc:other").title).toBe("other");
    } finally {
      rmSync(legacyDir, { recursive: true, force: true });
    }
  });
});
