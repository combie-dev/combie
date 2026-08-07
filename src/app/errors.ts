/**
 * User-facing application errors with actionable messages.
 * Never include secrets in messages.
 */
export class CombieError extends Error {
  readonly code: string;
  readonly exitCode: number;

  constructor(code: string, message: string, exitCode = 1) {
    super(message);
    this.name = "CombieError";
    this.code = code;
    this.exitCode = exitCode;
  }
}

export function notInitialized(): CombieError {
  return new CombieError(
    "NOT_INITIALIZED",
    "Combie is not initialized in this directory.\nRun: combie init",
  );
}

export function providerNotConnected(provider: string): CombieError {
  return new CombieError(
    "PROVIDER_NOT_CONNECTED",
    `${provider} is not connected.\nRun: combie connect ${provider}`,
  );
}

export function unknownProvider(provider: string): CombieError {
  return new CombieError(
    "UNKNOWN_PROVIDER",
    `Unknown provider: ${provider}.\nSupported providers: cloudflare`,
  );
}

export function alreadyInitialized(): CombieError {
  return new CombieError(
    "ALREADY_INITIALIZED",
    "Combie is already initialized in this directory.",
    0,
  );
}
