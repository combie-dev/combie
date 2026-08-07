import { Store } from "../storage/store.ts";
import { CredentialsStore } from "../storage/credentials.ts";
import { getProvider } from "../provider/registry.ts";
import {
  notInitialized,
  unknownProvider,
  CombieError,
} from "./errors.ts";

export interface ConnectOptions {
  baseDir: string;
  providerId: string;
  /** Explicit token from user (prompt or flag). */
  token?: string;
  /** When true, use process.env.CLOUDFLARE_API_TOKEN after user consent. */
  useEnvToken?: boolean;
  env?: NodeJS.ProcessEnv;
}

export interface ConnectResult {
  provider: string;
  accountId?: string;
  accountName?: string;
  message: string;
}

function resolveCloudflareToken(
  options: ConnectOptions,
): string {
  if (options.token && options.token.trim().length > 0) {
    return options.token.trim();
  }
  if (options.useEnvToken) {
    const env = options.env ?? process.env;
    const fromEnv = env.CLOUDFLARE_API_TOKEN?.trim();
    if (fromEnv) return fromEnv;
    throw new CombieError(
      "MISSING_TOKEN",
      "CLOUDFLARE_API_TOKEN is not set.\nExport a token with account read permissions, or pass --token.",
    );
  }
  throw new CombieError(
    "MISSING_TOKEN",
    "No Cloudflare API token provided.\n" +
      "Options:\n" +
      "  1. Export CLOUDFLARE_API_TOKEN and run: combie connect cloudflare --use-env\n" +
      "  2. Run: combie connect cloudflare --token <token>",
  );
}

/**
 * Explicitly connect a provider. Requires prior `combie init`.
 * Credentials are stored separately from domain data (0600 file).
 */
export async function connectProvider(
  options: ConnectOptions,
): Promise<ConnectResult> {
  const providerId = options.providerId.toLowerCase();
  const provider = getProvider(providerId);
  if (!provider) {
    throw unknownProvider(providerId);
  }

  const store = new Store(options.baseDir);
  try {
    if (!store.isInitialized()) {
      throw notInitialized();
    }

    let token: string;
    if (providerId === "cloudflare") {
      token = resolveCloudflareToken(options);
    } else {
      throw unknownProvider(providerId);
    }

    const auth = await provider.authenticate(token);
    if (!auth.ok) {
      throw new CombieError(
        "AUTH_FAILED",
        `Cloudflare authentication failed: ${auth.message}`,
      );
    }

    const creds = new CredentialsStore(options.baseDir);
    creds.setCredential(providerId, token);

    store.upsertProvider({
      id: providerId,
      name: provider.name,
      status: "connected",
      lastSyncAt: null,
      config: {
        accountId: auth.accountId ?? null,
        accountName: auth.accountName ?? null,
      },
    });

    const accountPart = auth.accountName
      ? ` (account: ${auth.accountName})`
      : auth.accountId
        ? ` (account: ${auth.accountId})`
        : "";

    return {
      provider: provider.name,
      accountId: auth.accountId,
      accountName: auth.accountName,
      message: `Connected ${provider.name}${accountPart}.\nCredentials stored securely for local use.`,
    };
  } finally {
    store.close();
  }
}
