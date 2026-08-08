export class VercelApiError extends Error {
  readonly status: number;
  readonly endpoint: string;

  constructor(options: {
    message: string;
    status: number;
    endpoint: string;
  }) {
    super(options.message);
    this.name = "VercelApiError";
    this.status = options.status;
    this.endpoint = options.endpoint;
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

export function redactSecrets(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(/token\s+[A-Za-z0-9._\-]+/gi, "token [REDACTED]")
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, "[REDACTED]");
}

export function vercelErrorMessage(
  context: string,
  status: number,
  detail?: string,
): string {
  const safeDetail = detail ? redactSecrets(detail.trim()) : "";
  if (status === 401 || status === 403) {
    return (
      `${context}: authentication failed` +
      (safeDetail ? ` — ${safeDetail}` : "") +
      ". Check that the token is valid and not expired."
    );
  }
  if (status === 404) {
    return (
      `${context}: resource not found` +
      (safeDetail ? ` — ${safeDetail}` : "") +
      "."
    );
  }
  return (
    `${context}: request failed (HTTP ${status})` +
    (safeDetail ? ` — ${safeDetail}` : "")
  );
}
