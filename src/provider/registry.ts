import type { Provider } from "./types.ts";
import { cloudflareProvider } from "../providers/cloudflare/adapter.ts";

const providers: Record<string, Provider> = {
  cloudflare: cloudflareProvider,
};

export function getProvider(id: string): Provider | undefined {
  return providers[id];
}

export function listProviders(): Provider[] {
  return Object.values(providers);
}
