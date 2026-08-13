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

export function cursorConfigPath(): string {
  return join(homeDir(), ".cursor", "mcp.json");
}

export function readCursorEntry(): McpEntry | null {
  return readJsonMcpEntry(new JsonConfigFile(cursorConfigPath()), SERVER_NAME);
}

export function setupCursor(baseDir: string): boolean {
  const file = new JsonConfigFile(cursorConfigPath());
  const invocation = buildMcpInvocation(baseDir);
  const current = readCursorEntry();
  if (current && entryMatchesInvocation(current, invocation)) {
    return false;
  }
  return writeJsonMcpEntry(file, SERVER_NAME, invocation, {});
}

export function removeCursor(): boolean {
  return deleteJsonMcpEntry(new JsonConfigFile(cursorConfigPath()), SERVER_NAME);
}
