import { join } from "node:path";
import {
  homeDir,
  parseTomlSectionLines,
  TomlConfigFile,
  tomlString,
} from "./config.ts";
import { buildMcpInvocation, entryMatchesInvocation } from "./invocation.ts";
import type { McpEntry } from "./types.ts";

const MAIN_HEADER = "[mcp_servers.combie]";
const ENV_HEADER = "[mcp_servers.combie.env]";

export function codexConfigPath(): string {
  return join(homeDir(), ".codex", "config.toml");
}

export function readCodexEntry(): McpEntry | null {
  const file = new TomlConfigFile(codexConfigPath());
  if (!file.exists()) {
    return null;
  }
  const text = file.read();
  const main = parseTomlSectionLines(text, MAIN_HEADER);
  if (typeof main.command !== "string" || !Array.isArray(main.args)) {
    return null;
  }
  let env: Record<string, unknown> = {};
  if (typeof main.env === "object" && main.env !== null && !Array.isArray(main.env)) {
    env = main.env as Record<string, unknown>;
  }
  const envSection = parseTomlSectionLines(text, ENV_HEADER);
  const merged: Record<string, string> = {};
  for (const [key, value] of Object.entries({ ...env, ...envSection })) {
    if (typeof value === "string") {
      merged[key] = value;
    }
  }
  return {
    command: main.command,
    args: main.args.filter((a): a is string => typeof a === "string"),
    env: merged,
    cwd: typeof main.cwd === "string" ? main.cwd : undefined,
  };
}

export function setupCodex(baseDir: string): boolean {
  const invocation = buildMcpInvocation(baseDir);
  const current = readCodexEntry();
  if (current && entryMatchesInvocation(current, invocation)) {
    return false;
  }
  const file = new TomlConfigFile(codexConfigPath());
  file.setSection(MAIN_HEADER, [
    `command = ${tomlString(invocation.command)}`,
    `args = [${invocation.args.map((a) => tomlString(a)).join(", ")}]`,
    `env = { COMBIE_HOME = ${tomlString(invocation.env.COMBIE_HOME ?? "")} }`,
  ]);
  if (file.hasSection(ENV_HEADER)) {
    file.deleteSection(ENV_HEADER);
  }
  return true;
}

export function removeCodex(): boolean {
  const file = new TomlConfigFile(codexConfigPath());
  if (!file.exists()) {
    return false;
  }
  const main = file.deleteSection(MAIN_HEADER);
  const env = file.deleteSection(ENV_HEADER);
  return main || env;
}
