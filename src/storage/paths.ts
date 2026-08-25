import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

function userHomeDir(): string {
  return process.env.HOME ?? homedir();
}

/**
 * Resolves the Combie state root.
 * Priority: explicit baseDir → COMBIE_HOME → `<cwd>/.combie`
 */
export function getCombieRoot(baseDir?: string): string {
  if (baseDir !== undefined) {
    return resolve(baseDir);
  }
  if (process.env.COMBIE_HOME) {
    return resolve(process.env.COMBIE_HOME);
  }
  return resolve(process.cwd(), ".combie");
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

export interface AgentCombieHomeResolution {
  baseDir: string;
  usedHomeFallback: boolean;
}

/**
 * Resolves the Combie home for agent setup/status only.
 * Priority: explicit --dir → COMBIE_HOME → initialized cwd store → $HOME/.combie
 */
export function resolveAgentCombieHome(flags: {
  dir?: string | boolean;
}): AgentCombieHomeResolution {
  const dir = flags.dir;
  if (typeof dir === "string" && dir.length > 0) {
    return { baseDir: resolve(dir), usedHomeFallback: false };
  }
  if (process.env.COMBIE_HOME) {
    return {
      baseDir: resolve(process.env.COMBIE_HOME),
      usedHomeFallback: false,
    };
  }
  const cwdStore = resolve(process.cwd(), ".combie");
  if (existsSync(dbPath(cwdStore))) {
    return { baseDir: cwdStore, usedHomeFallback: false };
  }
  return { baseDir: join(userHomeDir(), ".combie"), usedHomeFallback: true };
}

export function credentialsPath(baseDir?: string): string {
  return join(stateDir(baseDir), "credentials");
}
