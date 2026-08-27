import { describe, expect, test } from "bun:test";
import { resolveSentryRequestUrl } from "../../../src/providers/sentry/client.ts";

const DEFAULT_BASE = "https://sentry.io/api/0";

describe("resolveSentryRequestUrl", () => {
  test("relative path concatenates onto default-style base", () => {
    expect(
      resolveSentryRequestUrl("/organizations/acme/issues/", DEFAULT_BASE),
    ).toBe("https://sentry.io/api/0/organizations/acme/issues/");
  });

  test("same-origin absolute https URL on sentry.io is returned as-is including query", () => {
    const absolute =
      "https://sentry.io/api/0/organizations/acme/issues/?cursor=2&project=450";
    expect(resolveSentryRequestUrl(absolute, DEFAULT_BASE)).toBe(absolute);
  });

  test("https://sentry.io:443 is same origin as https://sentry.io/api/0", () => {
    const withPort =
      "https://sentry.io:443/api/0/organizations/acme/issues/?cursor=2";
    expect(resolveSentryRequestUrl(withPort, DEFAULT_BASE)).toBe(withPort);
  });

  test("http://sentry.io is rejected against https://sentry.io/api/0", () => {
    expect(() =>
      resolveSentryRequestUrl(
        "http://sentry.io/api/0/organizations/acme/issues/",
        DEFAULT_BASE,
      ),
    ).toThrow();
  });

  test("http://169.254.169.254/latest/meta-data/ is rejected", () => {
    expect(() =>
      resolveSentryRequestUrl(
        "http://169.254.169.254/latest/meta-data/",
        DEFAULT_BASE,
      ),
    ).toThrow();
  });

  test("https://evil.example/steal is rejected", () => {
    expect(() =>
      resolveSentryRequestUrl("https://evil.example/steal", DEFAULT_BASE),
    ).toThrow();
  });

  test("https://sentry.io.evil.example/api/0/organizations/ is rejected", () => {
    expect(() =>
      resolveSentryRequestUrl(
        "https://sentry.io.evil.example/api/0/organizations/",
        DEFAULT_BASE,
      ),
    ).toThrow();
  });

  test("custom self-hosted base accepts same-origin Link and rejects sentry.io", () => {
    const selfHosted = "https://sentry.example.internal/api/0";
    const sameOrigin =
      "https://sentry.example.internal/api/0/organizations/acme/issues/?cursor=2";
    expect(resolveSentryRequestUrl(sameOrigin, selfHosted)).toBe(sameOrigin);
    expect(() =>
      resolveSentryRequestUrl(
        "https://sentry.io/api/0/organizations/acme/issues/",
        selfHosted,
      ),
    ).toThrow();
  });
});
