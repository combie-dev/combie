import type { Resource } from "../domain/resource.ts";
import type { ProviderRecord } from "../storage/store.ts";

/**
 * Provider discovery clocks (Sprint 079). Distinct from provider-native
 * event time and from evidence-family refresh tables.
 *
 * lastSuccessfulSyncAt = providers.last_sync_at (success only)
 * lastAttemptAt = providers.last_attempt_at (every try)
 */
export interface ProviderSyncClocks {
  lastSuccessfulSyncAt: string | null;
  lastAttemptAt: string | null;
}

export function clocksFromProvider(
  provider: ProviderRecord | null,
): ProviderSyncClocks {
  return {
    lastSuccessfulSyncAt: provider?.lastSyncAt ?? null,
    lastAttemptAt: provider?.lastAttemptAt ?? null,
  };
}

/** True when a later attempt exists after the last successful sync. */
export function providerSyncIsUnknown(clocks: ProviderSyncClocks): boolean {
  const attempt = clocks.lastAttemptAt;
  const success = clocks.lastSuccessfulSyncAt;
  return attempt != null && success != null && attempt > success;
}

/**
 * CURRENT observation clocks. Omit a provider clock line only when that
 * timestamp is null. Show both provider clocks when they are equal.
 * Resource.updatedAt is Combie observation time, not provider-native.
 */
export function formatCurrentClockLines(
  resource: Resource,
  clocks: ProviderSyncClocks,
): string {
  const lines = [`observed by Combie at: ${resource.updatedAt}`];
  if (clocks.lastSuccessfulSyncAt != null) {
    lines.push(
      `last successful provider sync: ${clocks.lastSuccessfulSyncAt}`,
    );
  }
  if (clocks.lastAttemptAt != null) {
    lines.push(`last provider sync attempt: ${clocks.lastAttemptAt}`);
  }
  return lines.join("\n");
}
