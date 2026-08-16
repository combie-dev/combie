import { describe, expect, test } from "bun:test";
import {
  composeIssueAuthority,
  normalizeSentryIssue,
  sentryProjectResourceId,
} from "../../../src/providers/sentry/issue.ts";
import issuesFixture from "./fixtures/issues.json";

const OBSERVED = "2026-08-15T16:00:00.000Z";
const PROJECT_ID = "450";

describe("normalizeSentryIssue", () => {
  test("maps stable issue id, exact project binding, times, and counts", () => {
    const evidence = normalizeSentryIssue(issuesFixture[0]!, PROJECT_ID, OBSERVED);
    expect(evidence).not.toBeNull();
    expect(evidence!.provider).toBe("sentry");
    expect(evidence!.issueId).toBe("1001");
    expect(evidence!.projectId).toBe(PROJECT_ID);
    expect(evidence!.resourceId).toBe(sentryProjectResourceId(PROJECT_ID));
    expect(evidence!.shortId).toBe("COMBIE-1");
    expect(evidence!.status).toBe("unresolved");
    expect(evidence!.level).toBe("error");
    expect(evidence!.count).toBe(42);
    expect(evidence!.userCount).toBe(7);
    expect(evidence!.issueCategory).toBe("error");
    expect(evidence!.firstSeen).toBe("2026-08-15T14:37:00.000Z");
    expect(evidence!.lastSeen).toBe("2026-08-15T15:08:00.000Z");
    expect(evidence!.observedAt).toBe(OBSERVED);
  });

  test("rejects wrong project id (no slug/name matching)", () => {
    expect(normalizeSentryIssue(issuesFixture[0]!, "999", OBSERVED)).toBeNull();
  });

  test("rejects missing id or timestamps", () => {
    expect(
      normalizeSentryIssue(
        { project: { id: "450" }, firstSeen: "2026-01-01T00:00:00Z", lastSeen: "2026-01-01T00:00:00Z" },
        PROJECT_ID,
        OBSERVED,
      ),
    ).toBeNull();
    expect(
      normalizeSentryIssue(
        { id: "1", project: { id: "450" }, lastSeen: "2026-01-01T00:00:00Z" },
        PROJECT_ID,
        OBSERVED,
      ),
    ).toBeNull();
  });

  test("excludes title, culprit, assignee, metadata, tags, stats, and URLs", () => {
    const evidence = normalizeSentryIssue(issuesFixture[0]!, PROJECT_ID, OBSERVED)!;
    const json = JSON.stringify(evidence);
    expect(json).not.toContain("ada@example.com");
    expect(json).not.toContain("should-not-persist");
    expect(json).not.toContain("user.email is undefined");
    expect(json).not.toContain("checkout.ts");
    expect(json).not.toContain("https://example.invalid");
    expect(json).not.toContain("deadbeef");
    expect(Object.keys(evidence).sort()).toEqual(
      [
        "count",
        "firstSeen",
        "issueCategory",
        "issueId",
        "lastSeen",
        "level",
        "observedAt",
        "projectId",
        "provider",
        "resourceId",
        "shortId",
        "status",
        "userCount",
      ].sort(),
    );
  });
});

describe("composeIssueAuthority", () => {
  test("success with resultCount 0 is empty; failure with prior rows is unknown", () => {
    expect(
      composeIssueAuthority("github", "repository", null, []).kind,
    ).toBe("not_applicable");
    expect(
      composeIssueAuthority(
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
      ).kind,
    ).toBe("empty");
    expect(
      composeIssueAuthority(
        "sentry",
        "project",
        {
          resourceId: "sentry:project:450",
          status: "failure",
          observedAt: OBSERVED,
          message: "403",
          resultCount: 2,
          lastSuccessfulObservedAt: "2026-08-15T12:00:00.000Z",
        },
        [],
      ).kind,
    ).toBe("unknown");
  });
});
