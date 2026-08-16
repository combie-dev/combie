import { describe, expect, test } from "bun:test";
import {
  composeReleaseAuthority,
  normalizeSentryRelease,
  sentryProjectResourceId,
} from "../../../src/providers/sentry/release.ts";
import releasesFixture from "./fixtures/releases.json";

const OBSERVED = "2026-08-09T14:00:00.000Z";
const PROJECT_ID = "450";

describe("normalizeSentryRelease", () => {
  test("maps stable version identity, exact project binding, and provider times", () => {
    const raw = releasesFixture[0]!;
    const evidence = normalizeSentryRelease(raw, PROJECT_ID, OBSERVED);
    expect(evidence).not.toBeNull();
    expect(evidence!.provider).toBe("sentry");
    expect(evidence!.version).toBe("frontend@1.2.0");
    expect(evidence!.projectId).toBe(PROJECT_ID);
    expect(evidence!.resourceId).toBe(sentryProjectResourceId(PROJECT_ID));
    expect(evidence!.resourceId).toBe("sentry:project:450");
    expect(evidence!.shortVersion).toBe("1.2.0");
    expect(evidence!.status).toBe("open");
    expect(evidence!.dateCreated).toBe("2026-08-09T12:00:00.000Z");
    expect(evidence!.dateReleased).toBe("2026-08-09T12:05:00.000Z");
    expect(evidence!.observedAt).toBe(OBSERVED);
  });

  test("rejects wrong project id (no slug/name matching)", () => {
    expect(normalizeSentryRelease(releasesFixture[0]!, "999", OBSERVED)).toBeNull();
  });

  test("rejects missing version or dateCreated", () => {
    expect(
      normalizeSentryRelease(
        { projects: [{ id: 450 }], dateCreated: "2026-01-01T00:00:00Z" },
        PROJECT_ID,
        OBSERVED,
      ),
    ).toBeNull();
    expect(
      normalizeSentryRelease(
        { version: "1.0.0", projects: [{ id: 450 }] },
        PROJECT_ID,
        OBSERVED,
      ),
    ).toBeNull();
  });

  test("binds a multi-project release only when the exact project id is listed", () => {
    const raw = releasesFixture[1]!;
    const for450 = normalizeSentryRelease(raw, "450", OBSERVED);
    const for451 = normalizeSentryRelease(raw, "451", OBSERVED);
    expect(for450?.resourceId).toBe("sentry:project:450");
    expect(for451?.resourceId).toBe("sentry:project:451");
    expect(normalizeSentryRelease(raw, "452", OBSERVED)).toBeNull();
  });

  test("excludes authors, commits, deploys, URLs, data, and issue fields", () => {
    const evidence = normalizeSentryRelease(releasesFixture[0]!, PROJECT_ID, OBSERVED)!;
    const json = JSON.stringify(evidence);
    expect(json).not.toContain("ada@example.com");
    expect(json).not.toContain("should-not-persist");
    expect(json).not.toContain("ship it");
    expect(json).not.toContain("https://example.invalid");
    expect(json).not.toContain("newGroups");
    expect(json).not.toContain("commitCount");
    expect(Object.keys(evidence).sort()).toEqual(
      [
        "dateCreated",
        "dateReleased",
        "gitCommitSha",
        "observedAt",
        "projectId",
        "provider",
        "resourceId",
        "shortVersion",
        "status",
        "version",
      ].sort(),
    );
  });

  test("preserves optional dateReleased absence", () => {
    const evidence = normalizeSentryRelease(releasesFixture[1]!, PROJECT_ID, OBSERVED)!;
    expect(evidence.dateReleased).toBeNull();
    expect(evidence.shortVersion).toBeNull();
  });
});

describe("normalizeSentryRelease gitCommitSha (Sprint 046)", () => {
  const SHA = "abc123def4567890abc123def4567890abc123de";

  function rawWith(
    overrides: { lastCommit?: unknown; ref?: unknown } & Record<string, unknown>,
  ) {
    return {
      version: "frontend@2.0.0",
      dateCreated: "2026-08-10T12:00:00Z",
      projects: [{ id: 450 }],
      ...overrides,
    };
  }

  test("full SHA in lastCommit.id persists", () => {
    const evidence = normalizeSentryRelease(
      rawWith({ lastCommit: { id: SHA, message: "ship it" } }),
      PROJECT_ID,
      OBSERVED,
    )!;
    expect(evidence.gitCommitSha).toBe(SHA);
  });

  test("ref fallback applies when lastCommit.id is absent or not a full SHA", () => {
    const absent = normalizeSentryRelease(
      rawWith({ lastCommit: { id: "abc123" }, ref: SHA }),
      PROJECT_ID,
      OBSERVED,
    )!;
    expect(absent.gitCommitSha).toBe(SHA);

    const missing = normalizeSentryRelease(
      rawWith({ ref: SHA }),
      PROJECT_ID,
      OBSERVED,
    )!;
    expect(missing.gitCommitSha).toBe(SHA);
  });

  test("ref branch/tag never persists", () => {
    const evidence = normalizeSentryRelease(
      rawWith({ lastCommit: null, ref: "main" }),
      PROJECT_ID,
      OBSERVED,
    )!;
    expect(evidence.gitCommitSha).toBeNull();
  });

  test("fixture row 0 abbreviated lastCommit.id is null, never a SHA", () => {
    const evidence = normalizeSentryRelease(releasesFixture[0]!, PROJECT_ID, OBSERVED)!;
    expect(evidence.gitCommitSha).toBeNull();
  });

  test("version and shortVersion never become a SHA", () => {
    const evidence = normalizeSentryRelease(releasesFixture[1]!, PROJECT_ID, OBSERVED)!;
    expect(evidence.version).toBe("frontend@1.1.0");
    expect(evidence.gitCommitSha).toBeNull();
  });

  test("lastCommit message, author, and email never persist alongside a full SHA", () => {
    const evidence = normalizeSentryRelease(
      rawWith({
        lastCommit: {
          id: SHA,
          message: "ship it",
          author: { name: "Ada", email: "ada@example.com" },
          releases: ["r1"],
        },
      }),
      PROJECT_ID,
      OBSERVED,
    )!;
    expect(evidence.gitCommitSha).toBe(SHA);
    const json = JSON.stringify(evidence);
    expect(json).not.toContain("ship it");
    expect(json).not.toContain("Ada");
    expect(json).not.toContain("ada@example.com");
    expect(Object.keys(evidence).sort()).toEqual(
      [
        "dateCreated",
        "dateReleased",
        "gitCommitSha",
        "observedAt",
        "projectId",
        "provider",
        "resourceId",
        "shortVersion",
        "status",
        "version",
      ].sort(),
    );
  });
});

describe("composeReleaseAuthority", () => {
  test("distinguishes not-applicable, unknown, empty, populated, and stale", () => {
    expect(composeReleaseAuthority("vercel", "project", null, [])).toEqual({
      kind: "not_applicable",
    });
    expect(composeReleaseAuthority("sentry", "project", null, []).kind).toBe(
      "unknown",
    );
    const empty = composeReleaseAuthority(
      "sentry",
      "project",
      {
        resourceId: "sentry:project:450",
        status: "success",
        observedAt: OBSERVED,
        message: null,
        resultCount: 0,
        lastSuccessfulObservedAt: OBSERVED,
      },
      [],
    );
    expect(empty.kind).toBe("empty");
    const populated = composeReleaseAuthority(
      "sentry",
      "project",
      {
        resourceId: "sentry:project:450",
        status: "success",
        observedAt: OBSERVED,
        message: null,
        resultCount: 1,
        lastSuccessfulObservedAt: OBSERVED,
      },
      [
        normalizeSentryRelease(releasesFixture[0]!, PROJECT_ID, OBSERVED)!,
      ],
    );
    expect(populated.kind).toBe("populated");
    const failed = composeReleaseAuthority(
      "sentry",
      "project",
      {
        resourceId: "sentry:project:450",
        status: "failure",
        observedAt: OBSERVED,
        message: "forbidden",
        resultCount: 1,
        lastSuccessfulObservedAt: "2026-08-09T10:00:00.000Z",
      },
      [normalizeSentryRelease(releasesFixture[0]!, PROJECT_ID, OBSERVED)!],
    );
    expect(failed.kind).toBe("unknown");
    if (failed.kind === "unknown") {
      expect(failed.releases).toHaveLength(1);
      expect(failed.resultCount).toBe(1);
    }
  });
});
