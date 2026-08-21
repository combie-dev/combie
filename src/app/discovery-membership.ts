/**
 * Last-successful discovery membership (Sprint 085). Distinct from
 * Resource CURRENT clocks and from evidence-family refresh tables.
 *
 * lastDiscoveryResourceIds = providers.last_discovery_resource_ids
 * (JSON array replaced only on successful discoverResources).
 * null = never recorded; [] = known-empty success.
 */
export type LastSuccessfulDiscovery =
  | "included"
  | "not_in_last_successful_discovery";

export function lastSuccessfulDiscovery(
  resourceId: string,
  lastDiscoveryResourceIds: readonly string[] | null | undefined,
): LastSuccessfulDiscovery | null {
  if (lastDiscoveryResourceIds == null) return null;
  return lastDiscoveryResourceIds.includes(resourceId)
    ? "included"
    : "not_in_last_successful_discovery";
}

/**
 * CURRENT membership line. Omit only when the set has never been recorded.
 * Known-empty `[]` is not-in-last-successful-discovery, not omit.
 */
export function formatDiscoveryMembershipLine(
  membership: LastSuccessfulDiscovery | null,
): string | null {
  if (membership == null) return null;
  if (membership === "included") {
    return "last successful discovery: included";
  }
  return "last successful discovery: not in last successful discovery";
}
