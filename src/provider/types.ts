import type { Resource } from "../domain/resource.ts";

export type ProviderAuthResult =
  | {
      ok: true;
      accountId?: string;
      accountName?: string;
    }
  | {
      ok: false;
      /** User-facing message; must never include secrets. */
      message: string;
    };

/** Optional auth hints for providers that need explicit scope selection. */
export interface ProviderAuthOptions {
  /**
   * Provider-native organization slug/name when a credential can see multiple
   * organizations (PlanetScale). Ignored by providers with a single scope.
   */
  organization?: string;
}

export interface DiscoverResult {
  resources: Resource[];
}

export interface Provider {
  readonly id: string;
  readonly name: string;
  authenticate(
    token: string,
    options?: ProviderAuthOptions,
  ): Promise<ProviderAuthResult>;
  discoverResources(
    token: string,
    context: { accountId: string },
  ): Promise<DiscoverResult>;
}
