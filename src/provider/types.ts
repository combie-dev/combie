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

export interface DiscoverResult {
  resources: Resource[];
}

export interface Provider {
  readonly id: string;
  readonly name: string;
  authenticate(token: string): Promise<ProviderAuthResult>;
  discoverResources(
    token: string,
    context: { accountId: string },
  ): Promise<DiscoverResult>;
}
