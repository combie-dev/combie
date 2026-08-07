/**
 * Format GitHub API errors without leaking credentials or Authorization headers.
 */

export class GitHubApiError extends Error {
  readonly status: number;
  readonly endpoint: string;

  constructor(options: {
    message: string;
    status: number;
    endpoint: string;
  }) {
    super(options.message);
    this.name = "GitHubApiError";
    this.status = options.status;
    this.endpoint = options.endpoint;
  }

  get isAuthError(): boolean {
    return this.status === 401;
  }

  get isPermissionError(): boolean {
    return this.status === 403;
  }
}

/** Strip anything that looks like a bearer/token from free-form text. */
export function redactSecrets(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(/token\s+[A-Za-z0-9._\-]+/gi, "token [REDACTED]")
    .replace(/\b(gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, "[REDACTED]")
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, "[REDACTED]");
}

export function githubErrorMessage(
  context: string,
  status: number,
  detail?: string,
): string {
  const safeDetail = detail ? redactSecrets(detail.trim()) : "";
  if (status === 401) {
    return (
      `${context}: authentication failed` +
      (safeDetail ? ` — ${safeDetail}` : "") +
      ". Check that the token is valid and not expired."
    );
  }
  if (status === 403) {
    return (
      `${context}: permission denied` +
      (safeDetail ? ` — ${safeDetail}` : "") +
      ". Ensure the token can list repositories for this identity."
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
