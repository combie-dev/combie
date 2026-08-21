import { describe, expect, test } from "bun:test";
import {
  formatDiscoveryMembershipLine,
  lastSuccessfulDiscovery,
} from "../../src/app/discovery-membership.ts";

describe("discovery membership (Sprint 085)", () => {
  const id = "github:repository:1";

  test("null set is unknown membership, not absent", () => {
    expect(lastSuccessfulDiscovery(id, null)).toBeNull();
    expect(lastSuccessfulDiscovery(id, undefined)).toBeNull();
    expect(formatDiscoveryMembershipLine(null)).toBeNull();
  });

  test("known-empty success is not in last successful discovery", () => {
    expect(lastSuccessfulDiscovery(id, [])).toBe(
      "not_in_last_successful_discovery",
    );
    expect(
      formatDiscoveryMembershipLine("not_in_last_successful_discovery"),
    ).toBe("last successful discovery: not in last successful discovery");
  });

  test("included when the exact Resource id is in the set", () => {
    expect(lastSuccessfulDiscovery(id, [id, "github:repository:2"])).toBe(
      "included",
    );
    expect(formatDiscoveryMembershipLine("included")).toBe(
      "last successful discovery: included",
    );
  });

  test("does not treat a metadata-clock sibling as membership", () => {
    expect(
      lastSuccessfulDiscovery(id, ["github:repository:2"]),
    ).toBe("not_in_last_successful_discovery");
  });
});
