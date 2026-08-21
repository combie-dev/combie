import { describe, expect, test } from "bun:test";
import {
  formatRelationshipClockLines,
  lastAttemptAtByProvider,
  lastRequiredProviderAttemptAt,
  relationshipAuthorityIsUnknown,
  requiredProvidersForKind,
} from "../../src/app/relationship-verification-clocks.ts";

describe("relationship verification clocks (Sprint 084)", () => {
  test("required providers are pinned to the three shipped kinds", () => {
    expect(requiredProvidersForKind("source_for")).toEqual([
      "github",
      "vercel",
    ]);
    expect(requiredProvidersForKind("uses_domain_in")).toEqual([
      "vercel",
      "cloudflare",
    ]);
    expect(requiredProvidersForKind("code_mapped_to")).toEqual([
      "github",
      "sentry",
    ]);
  });

  test("last required-provider attempt is the max of non-null pair clocks", () => {
    expect(
      lastRequiredProviderAttemptAt("source_for", {
        github: "2026-08-19T12:30:00.000Z",
        vercel: "2026-08-19T12:00:00.000Z",
      }),
    ).toBe("2026-08-19T12:30:00.000Z");
    expect(
      lastRequiredProviderAttemptAt("source_for", {
        github: "2026-08-19T12:30:00.000Z",
      }),
    ).toBe("2026-08-19T12:30:00.000Z");
    expect(
      lastRequiredProviderAttemptAt("source_for", {
        github: null,
        vercel: null,
        sentry: "2026-08-19T13:00:00.000Z",
      }),
    ).toBeNull();
  });

  test("unknown is true only when a required-provider attempt is after last verified", () => {
    const verified = "2026-08-19T12:00:00.000Z";
    expect(
      relationshipAuthorityIsUnknown(verified, "2026-08-19T12:30:00.000Z"),
    ).toBe(true);
    expect(relationshipAuthorityIsUnknown(verified, verified)).toBe(false);
    expect(
      relationshipAuthorityIsUnknown(verified, "2026-08-19T11:00:00.000Z"),
    ).toBe(false);
    expect(relationshipAuthorityIsUnknown(verified, null)).toBe(false);
  });

  test("RELATED shows both clock lines when they are equal and omits a null attempt", () => {
    const at = "2026-08-19T12:00:00.000Z";
    expect(formatRelationshipClockLines(at, at)).toBe(
      `last verified by Combie at: ${at}\n` +
        `last required-provider sync attempt: ${at}`,
    );
    expect(formatRelationshipClockLines(at, null)).toBe(
      `last verified by Combie at: ${at}`,
    );
  });

  test("lastAttemptAtByProvider copies persisted provider clocks", () => {
    expect(
      lastAttemptAtByProvider([
        { id: "github", lastAttemptAt: "2026-08-19T12:30:00.000Z" },
        { id: "vercel", lastAttemptAt: null },
      ]),
    ).toEqual({
      github: "2026-08-19T12:30:00.000Z",
      vercel: null,
    });
  });
});
