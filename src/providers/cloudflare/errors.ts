/**
 * Format Cloudflare API errors without leaking credentials or Authorization headers.
 */

export interface CloudflareApiErrorBody {
  code?: number;
  message?: string;
}

export class CloudflareApiError extends Error {
  readonly status: number;
  readonly codes: number[];
  readonly endpoint: string;

  constructor(options: {
    message: string;
    status: number;
    codes?: number[];
    endpoint: string;
  }) {
    super(options.message);
    this.name = "CloudflareApiError";
    this.status = options.status;
    this.codes = options.codes ?? [];
    this.endpoint = options.endpoint;
  }

  get isPermissionError(): boolean {
    if (this.status === 403) return true;
    // Cloudflare common authz codes
    return this.codes.some((c) => c === 10000 || c === 9109 || c === 100000);
  }

  get isAuthError(): boolean {
    if (this.status === 401) return true;
    return this.codes.some((c) => c === 10000 || c === 9106 || c === 9107);
  }
}

/** Strip anything that looks like a bearer token from free-form text. */
export function redactSecrets(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, "[REDACTED]");
}

export function formatCloudflareErrors(
  errors: CloudflareApiErrorBody[] | undefined,
  fallback: string,
): string {
  if (!errors || errors.length === 0) {
    return fallback;
  }
  const parts = errors
    .map((e) => {
      const code = e.code != null ? ` (code ${e.code})` : "";
      const msg = e.message?.trim() || "unknown error";
      return `${redactSecrets(msg)}${code}`;
    })
    .filter(Boolean);
  return parts.length > 0 ? parts.join("; ") : fallback;
}

export function cloudflareErrorMessage(
  context: string,
  status: number,
  errors: CloudflareApiErrorBody[] | undefined,
): string {
  const detail = formatCloudflareErrors(errors, `HTTP ${status}`);
  if (status === 401) {
    return `${context}: authentication failed — ${detail}. Check that the API token is valid and not expired.`;
  }
  if (status === 403) {
    return `${context}: permission denied — ${detail}. Ensure the token has the required Cloudflare permissions for this resource type.`;
  }
  return `${context}: request failed (HTTP ${status}) — ${detail}`;
}
