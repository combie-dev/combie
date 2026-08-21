import type { RelationshipKind } from "../domain/relationship.ts";

/**
 * Relationship verification clocks (Sprint 084). Distinct from Resource
 * CURRENT clocks in provider-sync-clocks.ts.
 *
 * lastVerifiedAt = Relationship.updatedAt after a successful same-run pair
 * upsert. lastRequiredProviderAttemptAt = max(non-null last_attempt_at of
 * the two required providers for that kind).
 */
const REQUIRED_PROVIDERS: Record<
  RelationshipKind,
  readonly [string, string]
> = {
  source_for: ["github", "vercel"],
  uses_domain_in: ["vercel", "cloudflare"],
  code_mapped_to: ["github", "sentry"],
};

export function requiredProvidersForKind(
  kind: RelationshipKind,
): readonly [string, string] {
  return REQUIRED_PROVIDERS[kind];
}

export function lastAttemptAtByProvider(
  providers: ReadonlyArray<{ id: string; lastAttemptAt: string | null }>,
): Record<string, string | null> {
  const attempts: Record<string, string | null> = {};
  for (const provider of providers) {
    attempts[provider.id] = provider.lastAttemptAt;
  }
  return attempts;
}

/** Max of non-null required-provider last_attempt_at values. */
export function lastRequiredProviderAttemptAt(
  kind: RelationshipKind,
  attempts: Readonly<Record<string, string | null | undefined>>,
): string | null {
  let latest: string | null = null;
  for (const providerId of REQUIRED_PROVIDERS[kind]) {
    const attempt = attempts[providerId];
    if (attempt == null) continue;
    if (latest == null || attempt > latest) latest = attempt;
  }
  return latest;
}

/** True when any required provider was attempted after last verified. */
export function relationshipAuthorityIsUnknown(
  lastVerifiedAt: string,
  lastRequiredProviderAttemptAt: string | null,
): boolean {
  return (
    lastRequiredProviderAttemptAt != null &&
    lastRequiredProviderAttemptAt > lastVerifiedAt
  );
}

/**
 * RELATED verification clocks. Omit the attempt line only when that
 * timestamp is null. Show both lines when they are equal.
 */
export function formatRelationshipClockLines(
  lastVerifiedAt: string,
  lastRequiredProviderAttemptAt: string | null,
): string {
  const lines = [`last verified by Combie at: ${lastVerifiedAt}`];
  if (lastRequiredProviderAttemptAt != null) {
    lines.push(
      `last required-provider sync attempt: ${lastRequiredProviderAttemptAt}`,
    );
  }
  return lines.join("\n");
}
