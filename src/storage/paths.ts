import { join } from "node:path";

/**
 * Resolves the Combie state root.
 * Priority: explicit baseDir → COMBIE_HOME → `<cwd>/.combie`
 */
export function getCombieRoot(baseDir?: string): string {
  if (baseDir !== undefined) {
    return baseDir;
  }
  if (process.env.COMBIE_HOME) {
    return process.env.COMBIE_HOME;
  }
  return join(process.cwd(), ".combie");
}

/**
 * Resolve the state directory used by the CLI and app layer.
 * Optional override is typically `--dir`.
 */
export function resolveBaseDir(override?: string): string {
  return getCombieRoot(override);
}

/** State directory (same as combie root for Sprint 001). */
export function stateDir(baseDir?: string): string {
  return getCombieRoot(baseDir);
}

export function dbPath(baseDir?: string): string {
  return join(stateDir(baseDir), "combie.db");
}

export function credentialsPath(baseDir?: string): string {
  return join(stateDir(baseDir), "credentials");
}
