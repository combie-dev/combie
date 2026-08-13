import { join } from "node:path";
import { homeDir, JsonConfigFile } from "./config.ts";
import {
  deleteJsonMcpEntry,
  readJsonMcpEntry,
  writeJsonMcpEntry,
} from "./json-mcp.ts";
import { buildMcpInvocation, entryMatchesInvocation } from "./invocation.ts";
import type { McpEntry } from "./types.ts";

const SERVER_NAME = "combie";

export function claudeConfigPath(): string {
  return join(homeDir(), ".claude.json");
}

export function readClaudeEntry(): McpEntry | null {
  return readJsonMcpEntry(new JsonConfigFile(claudeConfigPath()), SERVER_NAME);
}

export function setupClaude(baseDir: string): boolean {
  const file = new JsonConfigFile(claudeConfigPath());
  const invocation = buildMcpInvocation(baseDir);
  const current = readClaudeEntry();
  if (current && entryMatchesInvocation(current, invocation)) {
    return false;
  }
  return writeJsonMcpEntry(file, SERVER_NAME, invocation, { type: "stdio" });
}

export function removeClaude(): boolean {
  return deleteJsonMcpEntry(new JsonConfigFile(claudeConfigPath()), SERVER_NAME);
}
