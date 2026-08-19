import { describe, expect, test } from "bun:test";
import { createResource } from "../../src/domain/resource.ts";
import {
  clocksFromProvider,
  formatCurrentClockLines,
  providerSyncIsUnknown,
} from "../../src/app/provider-sync-clocks.ts";

const resource = createResource({
  provider: "github",
  providerResourceId: "1",
  kind: "repository",
  name: "combie",
  metadata: {},
  createdAt: "2026-08-18T08:00:00.000Z",
  updatedAt: "2026-08-18T08:00:00.000Z",
});

describe("provider sync clocks (Sprint 079)", () => {
  test("providerSyncIsUnknown is true only when attempt is after success", () => {
    expect(
      providerSyncIsUnknown({
        lastSuccessfulSyncAt: "2026-08-18T10:00:00.000Z",
        lastAttemptAt: "2026-08-19T09:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      providerSyncIsUnknown({
        lastSuccessfulSyncAt: "2026-08-18T10:00:00.000Z",
        lastAttemptAt: "2026-08-18T10:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      providerSyncIsUnknown({
        lastSuccessfulSyncAt: "2026-08-18T10:00:00.000Z",
        lastAttemptAt: null,
      }),
    ).toBe(false);
    expect(
      providerSyncIsUnknown({
        lastSuccessfulSyncAt: null,
        lastAttemptAt: "2026-08-19T09:00:00.000Z",
      }),
    ).toBe(false);
  });

  test("CURRENT shows both provider clocks when they are equal", () => {
    const at = "2026-08-18T10:00:00.000Z";
    const output = formatCurrentClockLines(resource, {
      lastSuccessfulSyncAt: at,
      lastAttemptAt: at,
    });
    expect(output).toContain("observed by Combie at: 2026-08-18T08:00:00.000Z");
    expect(output).toContain(`last successful provider sync: ${at}`);
    expect(output).toContain(`last provider sync attempt: ${at}`);
  });

  test("CURRENT omits a provider clock line only when that timestamp is null", () => {
    const output = formatCurrentClockLines(
      resource,
      clocksFromProvider(null),
    );
    expect(output).toBe("observed by Combie at: 2026-08-18T08:00:00.000Z");
    expect(output).not.toContain("last successful provider sync");
    expect(output).not.toContain("last provider sync attempt");
  });
});
