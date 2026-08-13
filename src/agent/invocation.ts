import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import type { McpEntry } from "./types.ts";

export interface McpInvocation {
  command: string;
  args: string[];
  env: Record<string, string>;
}

function findProjectRoot(): string | null {
  let dir = dirname(import.meta.dir);
  for (let i = 0; i < 10; i++) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
          name?: unknown;
        };
        if (pkg.name === "combie") {
          return dir;
        }
      } catch {
        return null;
      }
      return null;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
  return null;
}

export function buildMcpInvocation(baseDir: string): McpInvocation {
  const combieHome = resolve(baseDir);
  const root = findProjectRoot();
  if (root) {
    return {
      command: "bun",
      args: ["run", "--cwd", root, "combie", "mcp"],
      env: { COMBIE_HOME: combieHome },
    };
  }
  return {
    command: process.execPath,
    args: ["mcp"],
    env: { COMBIE_HOME: combieHome },
  };
}

function envMatches(
  entryEnv: unknown,
  expected: Record<string, string>,
): boolean {
  if (typeof entryEnv !== "object" || entryEnv === null || Array.isArray(entryEnv)) {
    return false;
  }
  const env = entryEnv as Record<string, unknown>;
  for (const [key, value] of Object.entries(expected)) {
    if (env[key] !== value) {
      return false;
    }
  }
  return true;
}

function commandMatches(actual: string, expected: string): boolean {
  if (actual === expected) {
    return true;
  }
  if (isAbsolute(expected)) {
    return basename(actual) === basename(expected);
  }
  return false;
}

export function entryMatchesInvocation(
  entry: McpEntry,
  expected: McpInvocation,
): boolean {
  if (!commandMatches(entry.command, expected.command)) {
    return false;
  }
  if (
    entry.args.length === expected.args.length &&
    entry.args.every((arg, i) => arg === expected.args[i])
  ) {
    return envMatches(entry.env, expected.env);
  }
  const cwd = expected.args[1] === "--cwd" ? expected.args[2] : undefined;
  if (
    cwd !== undefined &&
    entry.cwd === cwd &&
    entry.args.length === 2 &&
    entry.args[0] === "combie" &&
    entry.args[1] === "mcp"
  ) {
    return envMatches(entry.env, expected.env);
  }
  if (
    entry.cwd !== undefined &&
    entry.args.length === 3 &&
    entry.args[0] === "run" &&
    entry.args[1] === "combie" &&
    entry.args[2] === "mcp" &&
    entry.cwd === cwd
  ) {
    return envMatches(entry.env, expected.env);
  }
  return false;
}
