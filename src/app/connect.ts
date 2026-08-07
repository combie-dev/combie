import { spawnSync } from "node:child_process";
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
  /**
   * When true, use a provider-specific environment variable after user consent.
   * Cloudflare: CLOUDFLARE_API_TOKEN
   * GitHub: GITHUB_TOKEN or GH_TOKEN
   */
  useEnvToken?: boolean;
  /**
   * When true (GitHub only), use `gh auth token` after explicit user authorization.
   * Does not parse private credential files.
   */
  useGh?: boolean;
  env?: NodeJS.ProcessEnv;
  /** Injected for tests: resolve a token from `gh auth token`. */
  ghTokenResolver?: () => string;
}

export interface ConnectResult {
  provider: string;
  accountId?: string;
  accountName?: string;
  message: string;
}

function resolveCloudflareToken(options: ConnectOptions): string {
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
 * Resolve a GitHub token via explicit authorization only:
 * --token, --use-env (GITHUB_TOKEN / GH_TOKEN), or --use-gh (`gh auth token`).
 */
function resolveGitHubToken(options: ConnectOptions): string {
  if (options.token && options.token.trim().length > 0) {
    return options.token.trim();
  }

  if (options.useGh) {
    if (options.ghTokenResolver) {
      const token = options.ghTokenResolver().trim();
      if (!token) {
        throw new CombieError(
          "GH_AUTH_FAILED",
          "GitHub connection failed: GitHub CLI returned an empty token.\nRun `gh auth login` and retry.",
        );
      }
      return token;
    }
    return resolveTokenFromGhCli();
  }

  if (options.useEnvToken) {
    const env = options.env ?? process.env;
    const fromEnv =
      env.GITHUB_TOKEN?.trim() ||
      env.GH_TOKEN?.trim() ||
      undefined;
    if (fromEnv) return fromEnv;
    throw new CombieError(
      "MISSING_TOKEN",
      "GITHUB_TOKEN (or GH_TOKEN) is not set.\n" +
        "Export a token with repo read access, or use --token / --use-gh.",
    );
  }

  throw new CombieError(
    "MISSING_TOKEN",
    "No GitHub token provided.\n" +
      "Options:\n" +
      "  1. Run: combie connect github --use-gh   (reuse authenticated GitHub CLI)\n" +
      "  2. Export GITHUB_TOKEN and run: combie connect github --use-env\n" +
      "  3. Run: combie connect github --token <token>",
  );
}

function resolveTokenFromGhCli(): string {
  let result: ReturnType<typeof spawnSync>;
  try {
    result = spawnSync("gh", ["auth", "token"], {
      encoding: "utf8",
      timeout: 15_000,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    throw new CombieError(
      "GH_UNAVAILABLE",
      `GitHub connection failed: could not run GitHub CLI (${reason}).\nInstall gh from https://cli.github.com/ or pass --token / --use-env.`,
    );
  }

  if (result.error) {
    const code = (result.error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new CombieError(
        "GH_UNAVAILABLE",
        "GitHub connection failed: GitHub CLI (`gh`) is not installed.\nInstall it from https://cli.github.com/ or pass --token / --use-env.",
      );
    }
    throw new CombieError(
      "GH_UNAVAILABLE",
      `GitHub connection failed: could not run GitHub CLI (${result.error.message}).\nInstall gh or pass --token / --use-env.`,
    );
  }

  if (result.status !== 0) {
    const stderr = String(result.stderr ?? "").trim();
    const hint =
      stderr.toLowerCase().includes("not logged") ||
      stderr.toLowerCase().includes("auth login")
        ? "GitHub CLI is not authenticated. Run `gh auth login` and retry."
        : "GitHub CLI could not produce a token. Run `gh auth login` and retry.";
    throw new CombieError("GH_AUTH_FAILED", `GitHub connection failed: ${hint}`);
  }

  const token = String(result.stdout ?? "").trim();
  if (!token) {
    throw new CombieError(
      "GH_AUTH_FAILED",
      "GitHub connection failed: GitHub CLI returned an empty token.\nRun `gh auth login` and retry.",
    );
  }
  return token;
}

function resolveToken(providerId: string, options: ConnectOptions): string {
  switch (providerId) {
    case "cloudflare":
      return resolveCloudflareToken(options);
    case "github":
      return resolveGitHubToken(options);
    default:
      throw unknownProvider(providerId);
  }
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

    const token = resolveToken(providerId, options);

    const auth = await provider.authenticate(token);
    if (!auth.ok) {
      throw new CombieError(
        "AUTH_FAILED",
        `${provider.name} authentication failed: ${auth.message}`,
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
