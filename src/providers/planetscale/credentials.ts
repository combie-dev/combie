/**
 * PlanetScale service tokens are a two-part credential:
 *   PLANETSCALE_SERVICE_TOKEN_ID + PLANETSCALE_SERVICE_TOKEN
 *
 * Combie stores them as one opaque provider-scoped string so CredentialsStore
 * and the Provider contract stay single-token. The encoding matches the
 * official Authorization header form: `<id>:<secret>`.
 */

export interface PlanetScaleCredentialPair {
  id: string;
  secret: string;
}

/** Encode a service-token pair for CredentialStore / Provider.token. */
export function encodePlanetScaleCredential(
  id: string,
  secret: string,
): string {
  return `${id}:${secret}`;
}

/**
 * Decode a composite PlanetScale credential. Splits on the first `:` so
 * secrets that happen to contain `:` remain intact. Returns null when either
 * component is missing.
 */
export function decodePlanetScaleCredential(
  token: string,
): PlanetScaleCredentialPair | null {
  if (!token || token.trim() === "") return null;
  const idx = token.indexOf(":");
  if (idx <= 0 || idx >= token.length - 1) return null;
  const id = token.slice(0, idx).trim();
  const secret = token.slice(idx + 1).trim();
  if (!id || !secret) return null;
  return { id, secret };
}

/** Secrets that must never appear in logs or error text. */
export function planetScaleSecretFragments(token: string): string[] {
  const fragments = new Set<string>();
  if (token.length >= 4) fragments.add(token);
  const pair = decodePlanetScaleCredential(token);
  if (pair) {
    if (pair.id.length >= 4) fragments.add(pair.id);
    if (pair.secret.length >= 4) fragments.add(pair.secret);
  }
  return [...fragments];
}
