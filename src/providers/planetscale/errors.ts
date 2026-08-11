export class PlanetScaleApiError extends Error {
  readonly status: number;
  readonly endpoint: string;

  constructor(options: {
    message: string;
    status: number;
    endpoint: string;
  }) {
    super(options.message);
    this.name = "PlanetScaleApiError";
    this.status = options.status;
    this.endpoint = options.endpoint;
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

/**
 * Redact both PlanetScale service-token components and common secret shapes.
 * Pass every known secret fragment via `explicitSecrets` (id, secret, and the
 * composite `id:secret` Authorization material).
 */
export function redactSecrets(
  text: string,
  explicitSecrets: readonly string[] = [],
): string {
  const explicitlyRedacted = explicitSecrets.reduce(
    (safe, secret) =>
      secret.length > 0 ? safe.split(secret).join("[REDACTED]") : safe,
    text,
  );
  return explicitlyRedacted
    .replace(
      /Authorization:\s*[A-Za-z0-9._\-]+[:|][A-Za-z0-9._\-]+/gi,
      "Authorization: [REDACTED]",
    )
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(/token\s+[A-Za-z0-9._\-]+/gi, "token [REDACTED]")
    .replace(/password\s*[=:]\s*\S+/gi, "password=[REDACTED]")
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, "[REDACTED]");
}

export function planetScaleErrorMessage(
  context: string,
  status: number,
  detail?: string,
  explicitSecrets: readonly string[] = [],
): string {
  const safeDetail = detail
    ? redactSecrets(detail.trim(), explicitSecrets)
    : "";
  if (status === 401) {
    return (
      `${context}: authentication failed` +
      (safeDetail ? ` — ${safeDetail}` : "") +
      ". Check that the service-token ID and secret are valid and not revoked."
    );
  }
  if (status === 403) {
    return (
      `${context}: request forbidden` +
      (safeDetail ? ` — ${safeDetail}` : "") +
      ". Check the service token's organization and database permissions."
    );
  }
  if (status === 404) {
    return (
      `${context}: resource not found` +
      (safeDetail ? ` — ${safeDetail}` : "") +
      "."
    );
  }
  if (status === 429) {
    return (
      `${context}: rate limit exceeded` +
      (safeDetail ? ` — ${safeDetail}` : "") +
      ". Wait a moment and try again."
    );
  }
  return (
    `${context}: request failed (HTTP ${status})` +
    (safeDetail ? ` — ${safeDetail}` : "")
  );
}
