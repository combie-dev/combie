import type { Provider } from "./types.ts";
import { cloudflareProvider } from "../providers/cloudflare/adapter.ts";
import { githubProvider } from "../providers/github/adapter.ts";
import { vercelProvider } from "../providers/vercel/adapter.ts";
import { sentryProvider } from "../providers/sentry/adapter.ts";
import { neonProvider } from "../providers/neon/adapter.ts";

const providers: Record<string, Provider> = {
  cloudflare: cloudflareProvider,
  github: githubProvider,
  vercel: vercelProvider,
  sentry: sentryProvider,
  neon: neonProvider,
};

export function getProvider(id: string): Provider | undefined {
  return providers[id];
}

export function listProviders(): Provider[] {
  return Object.values(providers);
}

/** Supported provider ids for user-facing messages. */
export function supportedProviderIds(): string[] {
  return Object.keys(providers);
}
